import { TreeItemCollapsibleState } from 'vscode';
import { Cluster } from '../../../cloud/cluster';
import { BaseItem } from '../../base';
import { Category, CategoryItem } from './category';

export class NamespaceItem extends BaseItem {
    constructor(
        private cluster: Cluster,
        private namespace: string
    ) {
        super(namespace, TreeItemCollapsibleState.Collapsed, 'explorer-namespace');
    }

    async getChildren(): Promise<BaseItem[]> {
        return [
            new CategoryItem(this.cluster, this.namespace, Category.ConfigMaps),
            new CategoryItem(this.cluster, this.namespace, Category.CronJobs),
            new CategoryItem(this.cluster, this.namespace, Category.DaemonSets),
            new CategoryItem(this.cluster, this.namespace, Category.Deployments),
            new CategoryItem(this.cluster, this.namespace, Category.Jobs),
            new CategoryItem(this.cluster, this.namespace, Category.Pods),
            new CategoryItem(this.cluster, this.namespace, Category.ReplicaSets),
            new CategoryItem(this.cluster, this.namespace, Category.Secrets),
            new CategoryItem(this.cluster, this.namespace, Category.Services),
            new CategoryItem(this.cluster, this.namespace, Category.StatefulSets)
        ];
    }
}