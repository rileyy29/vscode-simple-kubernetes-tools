import { env, Uri } from 'vscode';
import { ClusterNode } from '../tree/explorer/item/cluster';
import { Command } from './command';

export const clusterOpenWebCommand = new Command('clusterOpenInWeb', async (_, item: ClusterNode) => {
    switch (item.cluster.provider.name) {
        case 'Azure':
            env.openExternal(Uri.parse(`https://portal.azure.com/#resource${item.cluster.provider.id}`));
            break;
        default:
            break;
    }
});