import { BaseItem, BaseNode } from '../tree/base';
import { explorerTreeDataProvider } from '../tree/explorer/explorer.provider';
import { Command } from './command';

export const itemRefreshCommand = new Command('itemRefresh', async (_, item?: BaseNode | BaseItem) => {
    if (item) {
        explorerTreeDataProvider.refreshItem(item);
    } else {
        explorerTreeDataProvider.refresh();
    }
});