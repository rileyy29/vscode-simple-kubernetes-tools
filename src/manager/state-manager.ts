import { ExtensionContext } from 'vscode';
import { Cluster, ClusterIdentity } from '../cloud/cluster';
import { ExternalProvider, type ProviderCluster } from '../cloud/models';
import { STATE_CLUSTERS_KEY } from '../config';
import { Client } from '../kubernetes/client';
import { cloudManager } from './cloud-manager';

interface StoredCluster extends ClusterIdentity {
    provider: ProviderCluster;
    secretKey: string;
}

class StateManager {
    private _extensionContext: ExtensionContext;

    get context(): ExtensionContext {
        return this._extensionContext;
    }
    set context(extensionContext: ExtensionContext) {
        this._extensionContext = extensionContext;
    }

    getStoredClusters(provider?: ExternalProvider): StoredCluster[] {
        const clusters = this.context.globalState.get<StoredCluster[]>(STATE_CLUSTERS_KEY) || [];

        if (provider) {
            return clusters.filter(cluster => cluster.provider.name === provider);
        }

        return clusters;
    }

    async storeCluster(cluster: Cluster) {
        const clusters = this.getStoredClusters();
        const exists = clusters.some(cls => cls.secretKey === cluster.id);

        if (!exists) {
            clusters.push({ provider: cluster.provider, secretKey: cluster.id, ...cluster.identity });
            await this.context.globalState.update(STATE_CLUSTERS_KEY, clusters);
        }

        await this.context.secrets.store(`kubeconfig-${cluster.id}`, cluster.config.raw);
    }

    async removeCluster(cluster: Cluster) {
        const clusters = this.getStoredClusters();
        const exists = clusters.find(cls => cls.secretKey === cluster.id);

        if (exists) {
            await this.context.globalState.update(STATE_CLUSTERS_KEY, clusters.filter(cls => cls.secretKey !== cluster.id));
            await this.context.secrets.delete(`kubeconfig-${exists.secretKey}`);
        }
    }

    async reconstructClusterClient(cluster: Cluster) {
        const kubeYAML = await this.context.secrets.get(`kubeconfig-${cluster.id}`);
        if (!kubeYAML) {
            throw new Error(`No stored kubeconfig found for cluster ${cluster.id}`);
        }

        return new Client(kubeYAML, await cloudManager.getAccessToken(cluster.provider.name));
    }

    async wipeClusters() {
        const existing = this.getStoredClusters();

        for await (const item of existing) {
            await this.context.secrets.delete(`kubeconfig-${item.secretKey}`);
        }

        await this.context.globalState.update(STATE_CLUSTERS_KEY, []);
    }
}

export const stateManager = new StateManager();