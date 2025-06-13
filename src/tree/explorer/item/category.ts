import { Subscription } from 'rxjs';
import { TreeItemCollapsibleState } from 'vscode';
import { Cluster } from '../../../cloud/cluster';
import { type ClientRunnableResource } from '../../../kubernetes/models';
import { logger } from '../../../logger';
import { beacon } from '../../../manager/beacon';
import { BaseItem } from '../../base';
import { explorerTreeDataProvider } from '../explorer.provider';
import { ResourceItem } from './resource';

export enum Category {
    Deployments = 'Deployments',
    Pods = 'Pods',
    Services = 'Services'
};

export class CategoryItem extends BaseItem {
    private subscription: Subscription;

    constructor(
        public cluster: Cluster,
        public namespace: string,
        private category: Category
    ) {
        super(/^[a-z]/.test(namespace) ? category.toLowerCase() : category, TreeItemCollapsibleState.Collapsed, 'explorer-category-' + category);
    }

    setupSubscription() {
        if (this.subscription) {
            return;
        }

        switch (this.category) {
            case Category.Deployments:
            case Category.Pods:
                this.subscription = beacon.pipe(beacon.getEventsForCluster(this.cluster), {
                    action: ['ADDED', 'DELETED'],
                    namespace: this.namespace
                }).subscribe(_ => {
                    logger.log('Triggered refresh of category item.', this.cluster.id, this.category);
                    explorerTreeDataProvider.refreshItem(this);
                });
                break;
            default:
                break;
        }
    }

    async getChildren(): Promise<BaseItem[]> {
        let resources: ClientRunnableResource[] = [];

        switch (this.category) {
            case Category.Deployments:
                resources = await this.cluster.client.getDeployments(this.namespace);
                break;
            case Category.Pods:
                resources = await this.cluster.client.getPods(this.namespace);
                break;
            case Category.Services:
                resources = await this.cluster.client.getServices(this.namespace);
                break;
        }

        this.setupSubscription();

        return resources.map(resource => new ResourceItem(this.cluster, this.namespace, this.category, resource));
    }
}