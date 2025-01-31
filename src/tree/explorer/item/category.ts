import { Subscription } from 'rxjs';
import { TreeItemCollapsibleState } from 'vscode';
import { Cluster } from '../../../cloud/cluster';
import { ClientResource, type ClientRunnableResource } from '../../../kubernetes/models';
import { logger } from '../../../logger';
import { beacon } from '../../../manager/beacon';
import { BaseItem } from '../../base';
import { explorerTreeDataProvider } from '../explorer.provider';
import { ResourceItem } from './resource';

export enum Category {
    ConfigMaps = 'Config Maps',
    CronJobs = 'Cron Jobs',
    DaemonSets = 'Daemon Sets',
    Deployments = 'Deployments',
    Jobs = 'Jobs',
    Pods = 'Pods',
    ReplicaSets = 'Replica Sets',
    Secrets = 'Secrets',
    Services = 'Services',
    StatefulSets = 'Stateful Sets'
};

export class CategoryItem extends BaseItem {
    private subscription: Subscription;

    constructor(
        public cluster: Cluster,
        public namespace: string,
        private category: Category
    ) {
        super(category, TreeItemCollapsibleState.Collapsed, 'explorer-category-' + category);
    }

    setupSubscription() {
        if (this.subscription) {
            return;
        }

        switch (this.category) {
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
        let resources: ClientResource[] = [];

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
            case Category.ConfigMaps:
                resources = await this.cluster.client.getConfigMaps(this.namespace);
                break;
            case Category.Secrets:
                resources = await this.cluster.client.getSecrets(this.namespace);
                break;
            case Category.ReplicaSets:
                resources = await this.cluster.client.getReplicaSets(this.namespace);
                break;
            case Category.StatefulSets:
                resources = await this.cluster.client.getStatefulSets(this.namespace);
                break;
            case Category.DaemonSets:
                resources = await this.cluster.client.getDaemonSets(this.namespace);
                break;
            case Category.Jobs:
                resources = await this.cluster.client.getJobs(this.namespace);
                break;
            case Category.CronJobs:
                resources = await this.cluster.client.getCronJobs(this.namespace);
                break;
        }

        this.setupSubscription();

        return resources.map(resource => new ResourceItem(this.cluster, this.namespace, this.category, resource));
    }
}