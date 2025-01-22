import { Log } from '@kubernetes/client-node';
import { Subscription } from 'rxjs';
import { PassThrough } from 'stream';
import { Disposable, Position, Range, TextEditorRevealType, Uri, window } from 'vscode';
import { Cluster } from '../../cloud/cluster';
import { ABORT_CODE, ABORT_ERRORS, LOG_CONFIG } from '../../config';
import { isError, stringifyTextAfterSeparator, stringifyTextBeforeSeparator } from '../../util';
import { beacon } from '../beacon';
import { configManager } from '../config-manager';
import { logContentProvider } from './log-content-provider';

export class LogSession implements Disposable {
    private controller: AbortController = null;
    private stream: PassThrough = null;
    private data: string = stringifyTextBeforeSeparator('Waiting for logs...');

    private dataTimer: NodeJS.Timeout;
    private subscription: Subscription;

    constructor(
        private uri: Uri,
        public cluster: Cluster,
        public namespace: string,
        public pod: string,
        public container: string
    ) { }

    async start() {
        this.stop();

        try {
            this.initStream();
            this.initBeacon();

            const logs = new Log(this.cluster.client.getConfig());

            this.controller = await logs.log(this.namespace, this.pod, this.container, this.stream, LOG_CONFIG.PARAMS);
        } catch (error: any) {
            if (isError(ABORT_ERRORS, error) || (this.controller && this.controller.signal && this.controller.signal.reason === ABORT_CODE)) {
                return;
            }

            window.showErrorMessage(`Failed to start log provider: ${error.message}`, this.cluster.id, error.message);
        }
    }

    async reroute(newContainer: string | null, newPod: string | null) {
        if (this.stream) {
            this.stream.end();
            this.stream.destroy();
        }

        if (!newContainer || !newPod) {
            this.appendToBuffer(stringifyTextAfterSeparator('Unable to locate pod.'));
            return;
        }

        this.appendToBuffer(stringifyTextAfterSeparator('Located pod, preparing...'));
        this.appendToBuffer(stringifyTextAfterSeparator(stringifyTextBeforeSeparator(`Successfully routed logs to pod: ${newPod} in ${newContainer}.`)));

        this.container = newContainer;
        this.pod = newPod;

        await this.start();
    }

    stop() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        if (this.stream) {
            this.stream.destroy();
        }

        if (this.dataTimer) {
            clearTimeout(this.dataTimer);
        }

        this.stream = null;
        this.dataTimer = null;
        this.subscription = null;
    }

    scroll() {
        if (this.getEditor().selections.filter(selection => !selection.isEmpty).length > 0) {
            return;
        }

        if (this.dataTimer) {
            clearTimeout(this.dataTimer);
        }

        this.dataTimer = setTimeout(() => {
            const editor = this.getEditor();
            const bottomPosition = new Position(editor.document.lineCount - 1, 0);
            editor.revealRange(new Range(bottomPosition, bottomPosition), TextEditorRevealType.Default);
        }, 200);
    }

    dispose() {
        if (this.controller) {
            this.controller.abort(ABORT_CODE);
        }

        this.data = null;
        this.stop();
    }

    getUri() {
        return this.uri.toString();
    }

    getData() {
        return this.data;
    }

    private initStream() {
        this.stream = new PassThrough();
        this.stream.on('data', (chunk: Buffer) => this.appendToBuffer(this.processLog(chunk.toString())));
        this.stream.on('error', (error) => this.appendToBuffer(stringifyTextAfterSeparator(`Error when retrieving logs: ${error.message}`)));

        this.stream.on('end', () => {
            this.appendToBuffer(stringifyTextAfterSeparator('Connection ended. Reason: terminated.'));

            if (this.canReroute()) {
                this.appendToBuffer(stringifyTextAfterSeparator('Attemping to locate similar pod to reroute to...'));
            }
        });
    }

    private initBeacon() {
        const clusterStream = beacon.getEventsForCluster(this.cluster);
        if (!clusterStream) {
            throw new Error('No valid beacon session active.');
        }

        //TODO: Review the option of implementing a retry to current pod 3 times before attempting a reroute?
    
        this.subscription = beacon.pipe(clusterStream, {
            action: ['DELETED'],
            container: this.container,
            name: this.pod,
            namespace: this.namespace
        }).subscribe(async event => {
            if (!this.canReroute()) {
                return;
            }

            const pods = await this.cluster.client.getPods(this.namespace, event.container);
            if (pods && pods.length > 0) {
                await this.reroute(pods[0].containerName, pods[0].name);
            } else {
                await this.reroute(null, null);
            }
        });
    }

    private processLog(segment: string) {
        const timestampRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/g;
        const dateFormatter = new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });

        return segment
            .split('\n')
            .map((line) => line.replace(timestampRegex, (match) => dateFormatter.format(new Date(match)).replace(',', '')))
            .join('\n');
    }

    private appendToBuffer(segment: string) {
        const MAX_LOG_SIZE = configManager.get('logViewer.maxSize', LOG_CONFIG.MAX_BUFFER_SIZE) * 1024;
        this.data += segment;

        if (Buffer.byteLength(this.data, 'utf-8') > MAX_LOG_SIZE) {
            const excess = Buffer.byteLength(this.data, 'utf-8') - MAX_LOG_SIZE;
            const trimmed = this.data.substring(excess);
            const firstNewline = trimmed.indexOf('\n');
            this.data = firstNewline > 0 ? trimmed.substring(firstNewline + 1) : trimmed;
        }

        logContentProvider.triggerChangeContent(this.uri);
    }

    private canReroute() {
        return this.controller &&
            this.controller.signal &&
            !this.controller.signal.aborted &&
            configManager.get<boolean>('logViewer.rerouteOnPodKill', true);
    }

    private isSameUri(first: Uri, second: Uri) {
        return first.toString() === second.toString();
    }

    private getEditor() {
        const editor = window.visibleTextEditors.find((e) => this.isSameUri(e.document.uri, this.uri));

        if (!editor) {
            throw new Error('Invalid editor state');
        }

        return editor;
    }
}