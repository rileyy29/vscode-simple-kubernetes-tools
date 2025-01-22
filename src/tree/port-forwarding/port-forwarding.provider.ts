import { Event, EventEmitter, TreeDataProvider, TreeItem } from 'vscode';
import { portForwardManager } from '../../manager/port-forward-manager';
import { BaseItem, BaseNode } from '../base';
import { EmptySessionItem } from './item/empty-session';
import { ForwardingSessionItem } from './item/forwarding-session';

type PortForwardingItem = BaseItem;

class PortForwardingTreeDataProvider implements TreeDataProvider<PortForwardingItem> {
    private _onDidChangeTreeData: EventEmitter<PortForwardingItem | undefined | void> = new EventEmitter<PortForwardingItem | undefined | void>();
    public readonly onDidChangeTreeData: Event<PortForwardingItem | undefined | void> = this._onDidChangeTreeData.event;

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    refreshItem(element: PortForwardingItem) {
        this._onDidChangeTreeData.fire(element);
    }

    getTreeItem(element: PortForwardingItem): PortForwardingItem | TreeItem {
        if (element instanceof BaseNode) {
            return element.toTreeItem();
        }

        return element;
    }

    async getChildren(): Promise<PortForwardingItem[]> {
        if (portForwardManager.getSessions().size === 0) {
            return [new EmptySessionItem()];
        }

        return Array.from(portForwardManager.getSessions().values()).map(session => new ForwardingSessionItem(session));
    }
}

export const portForwardingTreeDataProvider = new PortForwardingTreeDataProvider();