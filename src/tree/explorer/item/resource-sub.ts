import { TreeItemCollapsibleState } from 'vscode';
import { BaseItem, BaseNode } from '../../base';

export class ResourceSubItem extends BaseItem {
    constructor(label: string) {
        super(label, TreeItemCollapsibleState.None, 'explorer-resource-sub-item');
    }

    async getChildren(): Promise<BaseNode[] | BaseItem[]> {
        return [];
    }
}