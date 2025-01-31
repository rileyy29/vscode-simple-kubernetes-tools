import { TreeItemCollapsibleState } from 'vscode';
import { Cluster } from '../../../cloud/cluster';
import { SVG_ICONS } from '../../../config';
import { ClientPod, ClientResource, ClientRunnableResource } from '../../../kubernetes/models';
import { BaseItem } from '../../base';
import { Category } from './category';
import { ResourceSubItem } from './resource-sub';

export class ResourceItem extends BaseItem {
    constructor(
        public cluster: Cluster,
        public namespace: string,
        public category: Category,
        public resource: ClientRunnableResource | ClientResource
    ) {
        super(
            resource.name,
            category === Category.Pods ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None,
            'explorer-resource-' + category + '_' + ((resource as ClientRunnableResource)?.isRunning ? 'running' : 'not_running'));

        this.tooltip = `${namespace}: ${resource.name}`;
        this.setIconPath();
    }

    private getPod() {
        return (this.resource as ClientPod);
    }

    private setIconPath() {
        switch (this.category) {
            case Category.Pods:
                this.iconPath = this.getPod().isRunning ? SVG_ICONS.Pod.Online : SVG_ICONS.Pod.Offline;
                break;
            default:
                break;
        }
    }

    async getChildren(): Promise<BaseItem[]> {
        if (this.category !== Category.Pods) {
            return [];
        }

        const { pod, isRunning } = this.getPod();
        const status = isRunning ? 'Online' : 'Offline';

        return [
            new ResourceSubItem(`${status} (${pod.status.containerStatuses.filter(c => c.ready && c.started).length}/${pod.status.containerStatuses.length})`),
            new ResourceSubItem(pod.status.podIP)
        ];
    }
}