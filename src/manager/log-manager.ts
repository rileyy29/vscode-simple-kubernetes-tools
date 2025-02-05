import { Disposable, Uri, window } from 'vscode';
import { NamespacedClusterObject } from '../kubernetes/models';
import { logger } from '../logger';
import { type LogSession } from './helpers/log-session';

class LogManager implements Disposable {
    private sessions: Map<String, LogSession> = new Map();

    start(session: LogSession) {
        try {
            this.sessions.set(session.getUri(), session);
            logger.log('Successfully setup log session.', session.getUri());
        } catch (error: any) {
            logger.error('Failed to setup log session.', session.getUri(), error.message);
            window.showErrorMessage(`Failed to setup log session: ${error.message}`);
        }
    }

    stop(session: LogSession) {
        const record = this.sessions.get(session.getUri());

        if (record) {
            record.dispose();
        }

        this.sessions.delete(session.getUri());
        logger.log('Stopped log session.', session.getUri());
    }

    delete(uri: Uri | string) {
        this.sessions.delete(uri instanceof Uri ? uri.toString() : uri);
    }

    createUri(clusterId: string, namespace: NamespacedClusterObject, pod: string, container: string) {
        return Uri.parse(`simpleKubernetesLogs://${clusterId}/${namespace}/${pod}?container=${container}`);
    }

    getSession(uri: Uri | string) {
        return this.sessions.get(uri instanceof Uri ? uri.toString() : uri);
    }

    getSessions() {
        return this.sessions;
    }

    getSessionsForClusterId(clusterId: string) {
        return Array.from(this.sessions.values()).filter(session => session.cluster.id === clusterId);
    }

    dispose() {
        this.sessions.forEach(session => session.dispose());
        this.sessions.clear();
    }
}

export const logManager = new LogManager();