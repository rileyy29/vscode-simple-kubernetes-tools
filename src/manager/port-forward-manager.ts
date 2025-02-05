import { PortForward } from '@kubernetes/client-node';
import { createServer } from 'net';
import { Disposable, window } from 'vscode';
import { type Cluster } from '../cloud/cluster';
import { type NamespacedClusterObject } from '../kubernetes/models';
import { logger } from '../logger';
import { PortForwardSession } from './helpers/port-forward-session';
import { portForwardingTreeDataProvider } from '../tree/port-forwarding/port-forwarding.provider';
import { configManager } from './config-manager';

class PortForwardManager implements Disposable {
    private sessions: Map<string, PortForwardSession> = new Map();

    async start(cluster: Cluster, namespace: NamespacedClusterObject, service: string) {
        try {
            const forwarder = new PortForward(cluster.client.getConfig(), true);
            const response = await cluster.client.getServiceWithPortForwardInfo(service, namespace);

            const server = createServer({
                allowHalfOpen: true,
                noDelay: true,
                keepAlive: true
            }, function (socket) {
                forwarder.portForward(namespace, response.pod, [response.targetPort], socket, socket, socket);
            });

            const session = new PortForwardSession(cluster.id, cluster.identity, server, response)
            if (this.sessions.has(session.uniqueKey)) {
                throw new Error('That unique key is already in use.');
            }

            server.listen(response.port, configManager.get<boolean>('portForwarding.useServiceName', true) ? response.service : 'localhost');
            this.sessions.set(session.uniqueKey, session);
            portForwardingTreeDataProvider.refresh();

            logger.log('Successfully setup port forwarder.', session.uniqueKey, response);
            return session;
        } catch (error: any) {
            logger.error('Failed to setup port forwarder.', cluster.id, error.message);
            window.showErrorMessage(`Failed to setup port forwarder: ${error.message}`);
        }
    }

    stop(session: PortForwardSession) {
        const record = this.sessions.get(session.uniqueKey);

        if (record) {
            record.dispose();
        }

        this.sessions.delete(session.uniqueKey);
        portForwardingTreeDataProvider.refresh();

        logger.log('Stopped port forwarding.', session.uniqueKey);
    }

    getSessions() {
        return this.sessions;
    }

    getSessionsForClusterId(clusterId: string) {
        return Array.from(this.sessions.values()).filter(session => session.clusterId === clusterId);
    }

    dispose() {
        this.sessions.forEach(session => session.dispose());
        this.sessions.clear();
    }
}

export const portForwardManager = new PortForwardManager();