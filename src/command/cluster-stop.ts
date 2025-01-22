import { window } from 'vscode';
import { azureProvider } from '../cloud/azure';
import { logger } from '../logger';
import { ClusterNode } from '../tree/explorer/item/cluster';
import { Command } from './command';

export const clusterStopCommand = new Command('clusterStop', async (_, item: ClusterNode) => {
    try {
        await azureProvider.stopCluster(item.cluster.identity, false);

        window.showInformationMessage(`Successfully queued 'stop' for ${item.cluster.identity.clusterName}.`);
    } catch (error: any) {
        logger.error('Error when attempting to stop cluster.', item.cluster.id, error.message);
        window.showErrorMessage(`Failed to stop ${item.cluster.identity.clusterName}: ${error.message}`);
    }
});