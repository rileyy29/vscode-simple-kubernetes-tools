import { TreeItemCollapsibleState } from 'vscode';
import { Cluster } from '../../../cloud/cluster';
import { ClientRunnableResource } from '../../../kubernetes/models';
import { BaseItem } from '../../base';

export class ResourceItem extends BaseItem {
    constructor(
        public cluster: Cluster,
        public namespace: string,
        public category: string,
        public resource: ClientRunnableResource
    ) {
        super(resource.name, TreeItemCollapsibleState.None, 'explorer-resource-' + category + '_' + (resource.isRunning ? 'running' : 'not_running'))
        this.tooltip = `${namespace}: ${resource.name}`;
    }

    async getChildren(): Promise<BaseItem[]> {
        return [];
    }
}