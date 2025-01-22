import { TreeItemCollapsibleState } from 'vscode';
import { Cluster } from '../../../cloud/cluster';
import { BaseItem } from '../../base';
import { CategoryItem } from './category';

export class NamespaceItem extends BaseItem {
    constructor(
        private cluster: Cluster,
        private namespace: string
    ) {
        super(namespace, TreeItemCollapsibleState.Collapsed, 'explorer-namespace');
    }

    async getChildren(): Promise<BaseItem[]> {
        return [
            new CategoryItem(this.cluster, this.namespace, 'Deployments'),
            new CategoryItem(this.cluster, this.namespace, 'Pods'),
            new CategoryItem(this.cluster, this.namespace, 'Services')
        ];
    }
}