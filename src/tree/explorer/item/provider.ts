import { TreeItemCollapsibleState } from 'vscode';
import { Cluster } from '../../../cloud/cluster';
import { ExternalProvider } from '../../../cloud/models';
import { SVG_ICONS } from '../../../config';
import { stateManager } from '../../../manager/state-manager';
import { BaseItem } from '../../base';
import { ClusterNode } from './cluster';
import { ClusterAddItem } from './cluster-add';

type ProviderChildren = ClusterNode | ClusterAddItem;

export class ProviderItem extends BaseItem {
    constructor(public name: ExternalProvider, description: string) {
        super(description, TreeItemCollapsibleState.Expanded, 'explorer-provider');
        this.iconPath = SVG_ICONS[name];
    }

    async getChildren(): Promise<BaseItem[]> {
        const addClusterItem = new ClusterAddItem(this.name);
        const clusters = stateManager.getStoredClusters(this.name);

        if (!clusters || clusters.length == 0) {
            return [addClusterItem];
        }

        const nodes: ProviderChildren[] = clusters.map(storedCluster => new ClusterNode(new Cluster(storedCluster.provider, { subscriptionId: storedCluster.subscriptionId, resourceGroupName: storedCluster.resourceGroupName, clusterName: storedCluster.clusterName })));
        nodes.push(addClusterItem);

        return nodes as BaseItem[];
    }
}