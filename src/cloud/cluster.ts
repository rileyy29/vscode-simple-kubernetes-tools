import { KubeConfig } from '@kubernetes/client-node';
import { type Client } from '../kubernetes/client';
import { type ProviderCluster } from './models';

export interface ClusterIdentity {
    subscriptionId: string;
    resourceGroupName: string;
    clusterName: string;
}

export class Cluster {
    public client: Client;
    public config: { raw: string; value: KubeConfig; };

    constructor(
        public provider: ProviderCluster,
        public identity: ClusterIdentity,
        public isRunning: boolean = false,
        public _config: string | KubeConfig = null
    ) {
        if (!_config) {
            return;
        }

        if (_config instanceof KubeConfig) {
            this.config = { raw: _config.exportConfig(), value: _config };
        } else {
            const kubeConfig = new KubeConfig();
            kubeConfig.loadFromString(_config);
            this.config = { raw: _config, value: kubeConfig };
        }
    }

    get id() {
        switch (this.provider.name) {
            case 'Azure':
                return this.provider.id;
            default:
                return 'Unsupported';
        }
    }
}
