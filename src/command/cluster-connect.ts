import { beacon } from '../manager/beacon';
import { stateManager } from '../manager/state-manager';
import { explorerTreeDataProvider } from '../tree/explorer/explorer.provider';
import { ClusterNode } from '../tree/explorer/item/cluster';
import { Command } from './command';

export const clusterConnectCommand = new Command('clusterConnect', async (_, item: ClusterNode) => {
    item._isConnecting = true;
    item._isConnected = false;
    explorerTreeDataProvider.refreshItem(item);

    const cluster = await item.setClient();
    await beacon.start(cluster);

    item._isConnecting = false;
    item._isConnected = true;
    explorerTreeDataProvider.refreshItem(item);

    item.subscription = beacon
        .getStatusForCluster(cluster)
        .subscribe((isRunning) => {
            item._isRunning = isRunning;
            item.cluster.isRunning = isRunning;
            explorerTreeDataProvider.refreshItem(item);
        });
});