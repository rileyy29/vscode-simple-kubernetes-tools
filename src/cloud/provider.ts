import { azureProvider } from './azure';
import { type Cluster, type ClusterIdentity } from './cluster';
import { ExternalProvider, type ProviderAuthenticationToken, type ProviderSubscription } from './models';

export interface CloudProvider {
    /**
     * Authenticate with the cloud provider.
     */
    authenticate(): Promise<ProviderAuthenticationToken>;

    /**
     * Retrieve list of subscriptions from the provider.
     */
    getSubscriptions(): Promise<ProviderSubscription[]>;

    /**
     * Retrieve list of clusters from the provider, relevant to the subscription id.
     * @param subscriptionId 
     */
    getClusters(subscriptionId: string): Promise<Cluster[]>;

    /**
     * Retrieve detailed info about a single cluster, including the config data.
     * @param cluster 
     */
    getCluster(cluster: Cluster | ClusterIdentity): Promise<Cluster>;

    /**
     * Start/stop cluster. Only valid for providers that support this type of operation.
     */
    startCluster?(identifier: ClusterIdentity, wait?: boolean): Promise<void>;
    stopCluster?(identifier: ClusterIdentity, wait?: boolean): Promise<void>;
}

//! Static Functions

export async function getAccessToken(provider: ExternalProvider) {
    switch (provider) {
        case 'Azure':
            const response = await azureProvider.authenticate();
            return response;
    }
}