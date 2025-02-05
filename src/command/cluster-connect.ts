import { window } from 'vscode';
import { beacon } from '../manager/beacon';
import { explorerTreeDataProvider } from '../tree/explorer/explorer.provider';
import { ClusterNode } from '../tree/explorer/item/cluster';
import { Command } from './command';

export const clusterConnectCommand = new Command('clusterConnect', async (_, item: ClusterNode) => {
    const updateItemStatus = (isConnecting: boolean, isConnected: boolean) => {
        item._isConnecting = isConnecting;
        item._isConnected = isConnected;
        explorerTreeDataProvider.refreshItem(item);
    };

    updateItemStatus(true, false);

    try {
        const cluster = await item.setClient();
        await beacon.start(cluster);

        updateItemStatus(false, true);

        item.subscription = beacon
            .getStatusForCluster(cluster)
            .subscribe((isRunning) => {
                item._isRunning = isRunning;
                item.cluster.isRunning = isRunning;
                explorerTreeDataProvider.refreshItem(item);
            });
    } catch (error: any) {
        updateItemStatus(false, false);
        window.showErrorMessage(`Failed to connect to ${item.cluster.identity.clusterName}: ${error.message}`);
    }
});