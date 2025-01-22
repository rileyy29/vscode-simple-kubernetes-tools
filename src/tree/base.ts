import { TreeItem, TreeItemCollapsibleState } from 'vscode';

export abstract class BaseNode {
    protected children: BaseNode[] = [];

    constructor(
        public label: string
    ) { }

    abstract getChildren(): Promise<BaseNode[] | BaseItem[]>;

    dispose?(): void;

    toTreeItem?(): TreeItem;
}

export abstract class BaseItem extends TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: TreeItemCollapsibleState,
        public readonly contextValue: string
    ) {
        super(label, collapsibleState);
    }

    abstract getChildren(): Promise<BaseNode[] | BaseItem[]>;

    dispose?(): void;
}