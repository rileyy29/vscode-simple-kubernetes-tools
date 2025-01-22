import { ContainerServiceClient } from '@azure/arm-containerservice';
import { SubscriptionClient } from '@azure/arm-subscriptions';
import { AzureCliCredential, type TokenCredential } from '@azure/identity';
import { window } from 'vscode';
import { Cluster, type ClusterIdentity } from './cluster';
import { type ProviderSubscription } from './models';
import { type CloudProvider } from './provider';
import { logger } from '../logger';

const ENDPOINT_TOKEN_AZURE = 'https://management.azure.com/.default';

class AzureProvider implements CloudProvider {
    private credential: TokenCredential = null;

    async authenticate(): Promise<void> {
        await this.getCredential();
    }

    async getSubscriptions(): Promise<ProviderSubscription[]> {
        const client = new SubscriptionClient(await this.getCredential());
        const subscriptions: ProviderSubscription[] = [];

        for await (const subscription of client.subscriptions.list()) {
            subscriptions.push(subscription as ProviderSubscription);
        }

        return subscriptions;
    }

    async getClusters(subscriptionId: string): Promise<Cluster[]> {
        const client = await this.getContainerServiceClient(subscriptionId);
        const clusters: Cluster[] = [];

        for await (const cluster of client.managedClusters.list()) {
            const resourceGroupName = this.deriveResourceGroup(cluster.id!);
            clusters.push(new Cluster(
                { name: 'Azure', id: cluster.id },
                { subscriptionId, resourceGroupName, clusterName: cluster.name },
                this.deriveState(cluster.powerState.code, cluster.provisioningState)
            ));
        }

        return clusters;
    }

    async getCluster(identifier: Cluster | ClusterIdentity): Promise<Cluster> {
        const { subscriptionId, resourceGroupName, clusterName } = identifier instanceof Cluster ? identifier.identity : identifier;
        const client = await this.getContainerServiceClient(subscriptionId);
        const rawCluster = await client.managedClusters.get(resourceGroupName, clusterName);

        const creds = await client.managedClusters.listClusterUserCredentials(resourceGroupName, clusterName);
        const kubeBuf = creds?.kubeconfigs?.[0]?.value;
        if (!kubeBuf) {
            throw new Error("Unable to retrieve remote credentials");
        }

        return new Cluster(
            { name: 'Azure', id: rawCluster.id },
            { subscriptionId, resourceGroupName, clusterName },
            this.deriveState(rawCluster.powerState.code, rawCluster.provisioningState),
            new TextDecoder().decode(kubeBuf)
        );
    }

    async startCluster(identifier: ClusterIdentity, wait: boolean = true): Promise<void> {
        const { subscriptionId, resourceGroupName, clusterName } = identifier;
        const client = await this.getContainerServiceClient(subscriptionId);
        await client.managedClusters[wait ? 'beginStartAndWait' : 'beginStart'](resourceGroupName, clusterName);
    }

    async stopCluster(identifier: ClusterIdentity, wait: boolean = true): Promise<void> {
        const { subscriptionId, resourceGroupName, clusterName } = identifier;
        const client = await this.getContainerServiceClient(subscriptionId);
        await client.managedClusters[wait ? 'beginStopAndWait' : 'beginStop'](resourceGroupName, clusterName);
    }

    private async getContainerServiceClient(subscriptionId: string): Promise<ContainerServiceClient> {
        const credential = await this.getCredential();
        return new ContainerServiceClient(credential, subscriptionId);
    }

    private async getCredential(): Promise<TokenCredential> {
        if (this.credential) {
            try {
                await this.credential.getToken(ENDPOINT_TOKEN_AZURE);
                return this.credential;
            } catch (error: any) {
                logger.error('Unable to authenticate using cached credential.', error.message);
            }
        }

        try {
            const newCredential = new AzureCliCredential();
            await newCredential.getToken(ENDPOINT_TOKEN_AZURE);
    
            this.credential = newCredential;
            return newCredential;
        } catch (error: any) {
            logger.error('Unable to authenticate via the Azure CLI.', error.message);
            window.showWarningMessage('Unable to authenticate via the Azure CLI. Run `az login`.');
            throw error;
        }
    }    

    private deriveResourceGroup(spec: string): string | null {
        return spec.match(/resourcegroups\/([^\/]+)/)[1];
    }

    private deriveState(powerState: string, provisioningState: string): boolean {
        return powerState === 'Running' && (provisioningState !== 'Starting' && provisioningState !== 'Stopping');
    }
}

export const azureProvider = new AzureProvider();