import { window } from 'vscode';
import { azureProvider } from '../cloud/azure';
import { logger } from '../logger';
import { ClusterNode } from '../tree/explorer/item/cluster';
import { Command } from './command';

export const clusterStartCommand = new Command('clusterStart', async (_, item: ClusterNode) => {
    try {
        await azureProvider.startCluster(item.cluster.identity, false);

        window.showInformationMessage(`Successfully queued 'start' for ${item.cluster.identity.clusterName}.`);
    } catch (error: any) {
        logger.error('Error when attempting to start cluster.', item.cluster.id, error.message);
        window.showErrorMessage(`Failed to start ${item.cluster.identity.clusterName}: ${error.message}`);
    }
});