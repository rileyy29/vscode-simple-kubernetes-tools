import { Server } from 'net';
import { Disposable } from 'vscode';
import { type ClusterIdentity } from '../../cloud/cluster';
import { type ClusterPortForwardableService } from '../../kubernetes/models';

export class PortForwardSession implements Disposable {
    constructor(
        public clusterId: string,
        public identity: ClusterIdentity,
        public server: Server,
        public info: ClusterPortForwardableService
    ) { }

    dispose() {
        if (this.server) {
            this.server.removeAllListeners();
            this.server.close();
        }
    }

    get uniqueKey() {
        return `${this.clusterId}_${this.info.namespace}/${this.info.pod}:${this.info.targetPort}`;
    }
}