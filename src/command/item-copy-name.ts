import { env, window } from 'vscode';
import { BaseItem, BaseNode } from '../tree/base';
import { Command } from './command';

export const itemCopyNameCommand = new Command('itemCopyName', async (_, item?: BaseNode | BaseItem) => {
    try {
        await env.clipboard.writeText(item.label);
        window.showInformationMessage('Copied to clipboard');
    } catch (error: any) {
        window.showErrorMessage(`Failed to copy text to clipboard: ${error.message}`);
    }
});