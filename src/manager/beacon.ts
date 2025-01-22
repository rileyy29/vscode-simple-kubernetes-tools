import { Watch } from '@kubernetes/client-node';
import { BehaviorSubject, debounceTime, filter, interval, Observable, Subject, Subscription } from 'rxjs';
import { Disposable } from 'vscode';
import { Cluster } from '../cloud/cluster';
import { ABORT_CODE, BEACON_CONFIG } from '../config';
import { type NamespacedClusterObject } from '../kubernetes/models';
import { logger } from '../logger';
import { calculateExponentialBackoff, isError } from '../util';
import { configManager } from './config-manager';

type EventAction = 'ADDED' | 'MODIFIED' | 'DELETED';

interface Event {
    metadata: { resourceVersion: string; namespace: NamespacedClusterObject; name: string; };
    spec: { containers: { name: string; }[]; };
}

interface EventClusterOutput {
    action: EventAction;
    namespace: NamespacedClusterObject;
    name: string;
    container: string;
}

interface EventFilter {
    action?: EventAction | EventAction[];
    name?: string | string[];
    container?: string | string[];
    namespace?: NamespacedClusterObject | NamespacedClusterObject[];
}

class Beacon implements Disposable {
    private events: Map<string, Subject<EventClusterOutput>> = new Map();
    private statuses: Map<string, BehaviorSubject<boolean>> = new Map();
    private reconnectTimers: Map<string, Subscription> = new Map();
    private resourceVersions: Map<string, string> = new Map();
    private watchControllers: Map<string, AbortController> = new Map();

    private retryLocks: Set<string> = new Set();

    async start(cluster: Cluster) {
        if (this.events.has(cluster.id)) {
            logger.warn('Events have already been started, ignoring start request.', cluster.id);
            return;
        }

        const stream = new Subject<EventClusterOutput>();
        this.events.set(cluster.id, stream);

        this.setStatusForCluster(cluster, cluster.isRunning);

        await this.listAndWatch(cluster);
    }

    async stop(cluster: Cluster) {
        logger.log('Attempting to force-stop cluster.', cluster.id);

        const events = this.events.get(cluster.id);
        if (events) {
            events.complete();
            this.events.delete(cluster.id);
        }

        const status = this.statuses.get(cluster.id);
        if (status) {
            status.complete();
            this.statuses.delete(cluster.id);
        }

        this.retryLocks.delete(cluster.id);
        this.clearReconnectTimer(cluster);

        const controller = this.watchControllers.get(cluster.id);
        if (controller) {
            controller.abort(ABORT_CODE);
            this.watchControllers.delete(cluster.id);
        }

        logger.log('Successfully stopped cluster.', cluster.id);
    }

    getEventsForCluster(cluster: Cluster) {
        return this.events.get(cluster.id)?.asObservable();
    }

    getStatusForCluster(cluster: Cluster) {
        return this.statuses.get(cluster.id)?.asObservable();
    }

    pipe(observable: Observable<EventClusterOutput>, filters: EventFilter) {
        return observable.pipe(
            filter(event => {
                let matches = true;

                if (filters.action) {
                    matches =
                        matches &&
                        (Array.isArray(filters.action)
                            ? filters.action.includes(event.action)
                            : filters.action === event.action);
                }

                if (filters.namespace) {
                    matches =
                        matches &&
                        (Array.isArray(filters.namespace)
                            ? filters.namespace.includes(event.namespace)
                            : filters.namespace === event.namespace || filters.namespace === 'all');
                }

                if (filters.name) {
                    matches =
                        matches &&
                        (Array.isArray(filters.name)
                            ? filters.name.includes(event.name)
                            : filters.name === event.name);
                }

                if (filters.container) {
                    matches =
                        matches &&
                        (Array.isArray(filters.container)
                            ? filters.container.includes(event.container)
                            : filters.container === event.container);
                }

                return matches;
            }),
            debounceTime(configManager.get<number>('beacon.debounceTime', BEACON_CONFIG.DEBOUNCE_TIME) * 1000)
        );
    }

    dispose() {
        this.events.forEach(stream => stream.complete());
        this.events.clear();

        this.statuses.forEach(stream => stream.complete());
        this.statuses.clear();

        this.reconnectTimers.forEach(timer => timer.unsubscribe());
        this.reconnectTimers.clear();

        this.resourceVersions.clear();
        this.retryLocks.clear();

        this.watchControllers.forEach(controller => controller.abort(ABORT_CODE));
        this.watchControllers.clear();
    }

    private async list(cluster: Cluster) {
        try {
            const resourceVersion = await cluster.client.getPodsResourceVersion();

            if (resourceVersion) {
                this.resourceVersions.set(cluster.id, resourceVersion);
                logger.log('Initial list completed successfully.', cluster.id, resourceVersion);
                return;
            }

            logger.warn('No resourceVersion found in pod list.', cluster.id);
        } catch (error) {
            logger.error('Error in retrieving resourceVersion from list.', cluster.id, error);
        }
    }

    private async watch(cluster: Cluster, retryInterval: number = 0) {
        this.clearReconnectTimer(cluster);

        const subject = this.events.get(cluster.id);
        if (!subject) {
            logger.error('No event subject found, aborting watch.', cluster.id);
            return;
        }

        const api = new Watch(cluster.client.getConfig());
        const resourceVersion = this.resourceVersions.get(cluster.id);
        let controller: AbortController | undefined;

        const handleSuccess = (phase: string, apiObj: Event) => {
            const incomingVersion = apiObj.metadata.resourceVersion;
            const currentVersion = this.resourceVersions.get(cluster.id);

            if (!currentVersion || Number.parseInt(incomingVersion) > Number.parseInt(currentVersion)) {
                this.resourceVersions.set(cluster.id, incomingVersion);
            }

            subject.next({
                action: phase as EventAction,
                name: apiObj.metadata.name,
                namespace: apiObj.metadata.namespace,
                container: apiObj.spec?.containers[0]?.name
            });
        };

        const handleError = (error: any) => {
            this.watchControllers.delete(cluster.id);

            if (controller) {
                if (controller.signal && controller.signal.reason === ABORT_CODE) {
                    logger.log('Triggered a manual abortion, not continuing to error state');
                    return;
                }
            }

            if (isError(BEACON_CONFIG.NO_RETRY_ERRORS, error)) {
                logger.error('Non-retryable error.', cluster.id, error.message);

                this.setStatusForCluster(cluster, false);
                this.setReconnectTimer(cluster);
                return;
            }

            if (error?.statusCode === 410 || error?.message?.includes('410 Gone')) {
                logger.error(`'410 Gone' error.`, cluster.id);

                this.listAndWatch(cluster);
                return;
            }

            this.retry(cluster, retryInterval);

            if (isError(BEACON_CONFIG.SILENT_ERRORS, error)) {
                logger.warn('Silent error.', cluster.id, error.message);
                return;
            }

            logger.error('Critical error.', cluster.id, error.message);
        };

        try {
            logger.log('Starting watch for cluster', cluster.id, resourceVersion);

            controller = await api.watch(
                BEACON_CONFIG.URL,
                { resourceVersion },
                handleSuccess,
                handleError
            );

            this.watchControllers.set(cluster.id, controller);
            this.retryLocks.delete(cluster.id);

            if (controller && !controller.signal.aborted) {
                retryInterval = 0;

                this.setStatusForCluster(cluster, true);
                logger.log('Successful watch connection.', cluster.id);
            }

            setTimeout(() => {
                if (!controller.signal.aborted) {
                    logger.warn('Watch has expired, restarting.', cluster.id);
                    controller.abort(ABORT_CODE);
                    this.watch(cluster, 0);
                }
            }, (BEACON_CONFIG.EXPIRE_TIME * 60 * 1000));
        } catch (error) {
            handleError(error);
        }
    }

    private async listAndWatch(cluster: Cluster) {
        await this.list(cluster);
        this.watch(cluster, 0);
    }

    private async retry(cluster: Cluster, interval: number = 0) {
        if (this.retryLocks.has(cluster.id)) {
            logger.warn('A retry is already in progress, skipping attempt.', cluster.id, interval);
            return;
        }

        this.retryLocks.add(cluster.id);
        interval += 1;

        if (interval >= configManager.get<number>('beacon.maxRetryAttempts'), BEACON_CONFIG.RETRY_ATTEMPTS) {
            logger.error('Exceeded max retries, marking as offline and setting up reconnect timer.', cluster.id);
            this.setStatusForCluster(cluster, false);

            this.retryLocks.delete(cluster.id);
            this.events.delete(cluster.id);
            this.setReconnectTimer(cluster);
            return;
        }

        const backoffTime = calculateExponentialBackoff(interval);
        logger.log(`Setup retry attempt ${interval} in ${backoffTime / 1000}s`, cluster.id);

        setTimeout(() => this.watch(cluster, interval), backoffTime);
    }

    private setReconnectTimer(cluster: Cluster) {
        if (this.reconnectTimers.has(cluster.id)) {
            return;
        }

        const reconnectionTime = configManager.get<number>('beacon.reconnectionTime', BEACON_CONFIG.RECONNECT_TIME);
        const timer = interval(reconnectionTime * 60 * 1000).subscribe(async () => {
            logger.log('Attempting to reconnect to cluster.', cluster.id);

            if (!this.events.get(cluster.id)) {
                this.events.set(cluster.id, new Subject<EventClusterOutput>());
            }

            await this.listAndWatch(cluster);
        });

        logger.log(`Scheduled reconnection for ${reconnectionTime} minutes.`, cluster.id);
        this.reconnectTimers.set(cluster.id, timer);
    }

    private clearReconnectTimer(cluster: Cluster) {
        const timer = this.reconnectTimers.get(cluster.id);
        if (timer) {
            timer.unsubscribe();
        }

        this.reconnectTimers.delete(cluster.id);
    }

    private setStatusForCluster(cluster: Cluster, isRunning: boolean) {
        let subject = this.statuses.get(cluster.id);
        if (!subject) {
            subject = new BehaviorSubject<boolean>(isRunning);
            this.statuses.set(cluster.id, subject);
        }

        const status = subject.getValue();
        if (status != isRunning) {
            subject.next(isRunning);
        }
    }
}

export const beacon = new Beacon();