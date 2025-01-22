import { TreeItemCollapsibleState } from 'vscode';
import { BaseItem } from '../../base';

export class EmptySessionItem extends BaseItem {
    constructor() {
        super('No Active Sessions', TreeItemCollapsibleState.None, 'portForwarding-empty-session');
    }

    public async getChildren(): Promise<BaseItem[]> {
        return [];
    }
}