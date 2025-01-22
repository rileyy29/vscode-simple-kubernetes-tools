import { window } from 'vscode';
import { beacon } from '../manager/beacon';
import { stateManager } from '../manager/state-manager';
import { explorerTreeDataProvider } from '../tree/explorer/explorer.provider';
import { ClusterNode } from '../tree/explorer/item/cluster';
import { Command } from './command';

export const clusterRemoveCommand = new Command('clusterRemove', async (_, item: ClusterNode) => {
    item.dispose();
    await stateManager.removeCluster(item.cluster);
    explorerTreeDataProvider.refresh();

    await beacon.stop(item.cluster);
    window.showInformationMessage(`Successfully removed ${item.cluster.identity.clusterName}.`);
});