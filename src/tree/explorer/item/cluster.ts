import { Subscription } from 'rxjs';
import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Cluster } from '../../../cloud/cluster';
import { Command } from '../../../command/command';
import { SVG_ICONS } from '../../../config';
import { configManager } from '../../../manager/config-manager';
import { stateManager } from '../../../manager/state-manager';
import { BaseItem, BaseNode } from '../../base';
import { NamespaceItem } from './namespace';

export class ClusterNode extends BaseNode {
    public subscription?: Subscription;
    public _isRunning: boolean;
    public _isConnecting: boolean;
    public _isConnected: boolean;

    constructor(public cluster: Cluster) {
        super(cluster.identity.clusterName);

        this._isRunning = cluster.isRunning;

        if (configManager.get<boolean>('general.autoConnect', false)) {
            Command.execute('clusterConnect', this);
        }
    }

    async getChildren(): Promise<BaseItem[]> {
        const namespaces = await this.cluster.client.getNamespaces();
        return namespaces.map(namespace => new NamespaceItem(this.cluster, namespace.name));
    }

    async setClient(): Promise<Cluster> {
        if (!this.cluster.client) {
            this.cluster.client = await stateManager.reconstructClusterClient(this.cluster);
        }

        return this.cluster;
    }

    dispose(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    toTreeItem(): TreeItem {
        const treeItem = new TreeItem(this.label);

        treeItem.collapsibleState = !this._isConnected ? TreeItemCollapsibleState.None :
            this._isRunning
                ? TreeItemCollapsibleState.Collapsed
                : TreeItemCollapsibleState.None;

        treeItem.contextValue = !this._isConnected ? 'explorer-clusterDisconnected' :
            this._isRunning
                ? 'explorer-clusterRunning'
                : 'explorer-clusterOffline';

        treeItem.iconPath = this._isConnecting ? new ThemeIcon('sync~spin') : SVG_ICONS.Azure_Cluster;

        return treeItem;
    }
}