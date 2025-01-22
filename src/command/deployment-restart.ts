import { window } from 'vscode';
import { logger } from '../logger';
import { CategoryItem } from '../tree/explorer/item/category';
import { ResourceItem } from '../tree/explorer/item/resource';
import { Command } from './command';

export const deploymentRestartCommand = new Command('deploymentRestart', async (_, item: ResourceItem) => {
    try {
        await item.cluster.client.restartDeployment(item.namespace, item.resource.name);
        window.showInformationMessage(`Successfully restarted deployment: ${item.resource.name}.`);
    } catch (error: any) {
        logger.error('Error when attempting to restart deployment.', item.cluster.id, item.resource.name, error.message);
        window.showErrorMessage(`Failed to restart deployment ${item.resource.name}: ${error.message}`);
    }
});

export const deploymentsRestartCommand = new Command('deploymentsRestart', async (_, item: CategoryItem) => {
    try {
        await item.cluster.client.restartDeployments(item.namespace);
        window.showInformationMessage(`Successfully restarted all deployments in ${item.namespace}.`);
    } catch (error: any) {
        logger.error('Error when attempting to restart all deployments in namespace.', item.cluster.id, item.namespace, error.message);
        window.showErrorMessage(`Failed to restart all deployments in namespace ${item.namespace}: ${error.message}`);
    }
});