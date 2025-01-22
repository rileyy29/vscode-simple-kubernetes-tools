import { TreeItemCollapsibleState } from 'vscode';
import { ID, SVG_ICONS } from '../../../config';
import { BaseItem } from '../../base';

export class ClusterAddItem extends BaseItem {
    constructor(private providerName: string) {
        super('Add Cluster...', TreeItemCollapsibleState.None, 'explorer-cluster-add');

        this.command = {
            command: ID + '.clusterAdd',
            title: 'Add Cluster',
            arguments: [this.providerName]
        };

        this.iconPath = SVG_ICONS.AddPlug;
    }

    public async getChildren(): Promise<BaseItem[]> {
        return [];
    }
}