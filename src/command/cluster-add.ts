import { window } from 'vscode';
import { azureProvider } from '../cloud/azure';
import { type ExternalProvider } from '../cloud/models';
import { logger } from '../logger';
import { stateManager } from '../manager/state-manager';
import { explorerTreeDataProvider } from '../tree/explorer/explorer.provider';
import { withLoadingSpinner } from '../util';
import { Command } from './command';

export const clusterAddCommand = new Command('clusterAdd', async (_, provider: ExternalProvider) => {
    if (provider) {
        await startProcess(provider);
        return;
    }

    const providers = await window.showQuickPick(explorerTreeDataProvider.providers.map(provider => ({ label: provider.id, description: provider.name })), {
        placeHolder: 'Select a cloud provider'
    });

    if (!providers) {
        return;
    }

    await startProcess(providers.label);
});

async function startProcess(provider: ExternalProvider) {
    switch (provider) {
        case 'Azure':
            await startAzureProcess();
            break;
        default:
            break;
    }
}

async function startAzureProcess() {
    try {
        const subscriptions = await withLoadingSpinner('Loading subscriptions...', async () => await azureProvider.getSubscriptions());
        const subscription = await window.showQuickPick(subscriptions.map(sub => ({ label: sub.displayName, description: sub.subscriptionId })), {
            placeHolder: 'Select a subscription'
        });

        if (!subscription) {
            return;
        }

        const clusters = await withLoadingSpinner('Loading clusters...', async () => {
            const azureClusters = await azureProvider.getClusters(subscription.description);
            const existingClusters = stateManager.getStoredClusters('Azure');
            return azureClusters.filter(cluster => !existingClusters.some(ex => ex.provider.id === cluster.id));
        });

        if (clusters.length == 0) {
            await window.showErrorMessage('No new clusters found in this subscription.');
            return;
        }

        const cluster = await window.showQuickPick(clusters.map(cls => ({ label: cls.identity.clusterName, description: cls.identity.resourceGroupName })), {
            placeHolder: 'Select a cluster'
        });

        if (!cluster) {
            return;
        }

        const azureCluster = await azureProvider.getCluster({ subscriptionId: subscription.description, resourceGroupName: cluster.description, clusterName: cluster.label });

        if (!azureCluster) {
            return;
        }

        await withLoadingSpinner('Adding cluster', async () => {
            await stateManager.storeCluster(azureCluster);
            explorerTreeDataProvider.refresh();

            window.showInformationMessage(`Successfully added ${azureCluster.identity.clusterName}.`);
        });
    } catch (error: any) {
        logger.error('Error when attempting to add cluster.', error.message);
        window.showErrorMessage(`Failed to add cluster: ${error.message}`);
    }
}