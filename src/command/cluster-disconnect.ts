import { beacon } from '../manager/beacon';
import { logManager } from '../manager/log-manager';
import { portForwardManager } from '../manager/port-forward-manager';
import { explorerTreeDataProvider } from '../tree/explorer/explorer.provider';
import { ClusterNode } from '../tree/explorer/item/cluster';
import { closeUri } from '../util';
import { Command } from './command';

export const clusterDisconnectCommand = new Command('clusterDisconnect', async (_, item: ClusterNode) => {
    item._isConnected = false;
    item.dispose();

    await beacon.stop(item.cluster);
    explorerTreeDataProvider.refreshItem(item);
    
    logManager.getSessionsForClusterId(item.cluster.id).forEach(async session => {
        await closeUri(session.getUri());
        logManager.stop(session);
    })

    portForwardManager.getSessionsForClusterId(item.cluster.id).forEach(session => portForwardManager.stop(session));
});