import { window } from 'vscode';
import { portForwardManager } from '../manager/port-forward-manager';
import { ResourceItem } from '../tree/explorer/item/resource';
import { withLoadingSpinner } from '../util';
import { Command } from './command';

export const serviceForwardingStartCommand = new Command('serviceForwardingStart', async (_, item: ResourceItem) => {
    await withLoadingSpinner('Loading...', async () => {
        const session = await portForwardManager.start(item.cluster, item.namespace, item.resource.name);
        window.showInformationMessage(`Successfully started port forwarding for ${session.info.service}.`);
    });
});