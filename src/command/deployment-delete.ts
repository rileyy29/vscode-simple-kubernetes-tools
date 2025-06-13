import { window } from 'vscode';
import { logger } from '../logger';
import { ResourceItem } from '../tree/explorer/item/resource';
import { Command } from './command';

export const deploymentDeleteCommand = new Command('deploymentDelete', async (_, item: ResourceItem) => {
    try {
        const status = await item.cluster.client.deleteDeployment(item.namespace, item.resource.name);
        if (status?.status === 'Success') {
            window.showInformationMessage(`Successfully queued 'delete' for deployment: ${item.resource.name}.`);
        } else {
            throw new Error(status.message);
        }
    } catch (error: any) {
        logger.error('Error when attempting to delete deployment.', item.cluster.id, item.resource.name, error.message);
        window.showErrorMessage(`Failed to delete deployment ${item.resource.name}: ${error.message}`);
    }
});