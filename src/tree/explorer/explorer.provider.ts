import { Event, EventEmitter, TreeDataProvider, TreeItem } from 'vscode';
import { type ExternalProvider } from '../../cloud/models';
import { BaseItem, BaseNode } from '../base';
import { ProviderItem } from './item/provider';
import { PROVIDERS } from '../../config';

type ExplorerItem = BaseItem | BaseNode;
type ExplorerProviderType = { id: ExternalProvider; name: string; };

class ExplorerTreeDataProvider implements TreeDataProvider<ExplorerItem> {
    private _onDidChangeTreeData: EventEmitter<ExplorerItem | undefined | void> = new EventEmitter<ExplorerItem | undefined | void>();
    public readonly onDidChangeTreeData: Event<ExplorerItem | undefined | void> = this._onDidChangeTreeData.event;

    constructor(
        public providers: ExplorerProviderType[]
    ) { }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    refreshItem(element: ExplorerItem) {
        this._onDidChangeTreeData.fire(element);
    }

    getTreeItem(element: ExplorerItem): ExplorerItem | TreeItem {
        if (element instanceof BaseNode) {
            return element.toTreeItem();
        }

        return element;
    }

    async getChildren(element?: ExplorerItem): Promise<ExplorerItem[]> {
        if (!element) {
            return this.providers.map(provider => new ProviderItem(provider.id, provider.name));
        } else {
            return element.getChildren();
        }
    }
}

export const explorerTreeDataProvider = new ExplorerTreeDataProvider(PROVIDERS);