import { window } from 'vscode';
import { azureProvider } from '../cloud/azure';
import { ClusterNode } from '../tree/explorer/item/cluster';
import { withLoadingSpinner } from '../util';
import { Command } from './command';
import { logger } from '../logger';

export const clusterRestartCommand = new Command('clusterRestart', async (_, item: ClusterNode) => {
    await withLoadingSpinner('Restarting cluster...', async () => {
        try {
            const cluster = await azureProvider.getCluster(item.cluster);
            if (!cluster.isRunning) {
                throw new Error('Cluster is not running.');
            }

            await azureProvider.stopCluster(item.cluster.identity, true);
            await azureProvider.startCluster(item.cluster.identity, false);

            window.showInformationMessage(`Successfully queued 'restart' for ${item.cluster.identity.clusterName}.`);
        } catch (error: any) {
            logger.error('Error when attempting to restart cluster.', item.cluster.id, error.message);
            window.showErrorMessage(`Failed to restart ${item.cluster.identity.clusterName}: ${error.message}`);
        }
    });
});