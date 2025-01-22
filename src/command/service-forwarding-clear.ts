import { window } from 'vscode';
import { portForwardManager } from '../manager/port-forward-manager';
import { portForwardingTreeDataProvider } from '../tree/port-forwarding/port-forwarding.provider';
import { withLoadingSpinner } from '../util';
import { Command } from './command';

export const serviceForwardingClearCommand = new Command('serviceForwardingClear', async () => {
    if (portForwardManager.getSessions().size === 0) {
        return;
    }

    await withLoadingSpinner('Stopping...', async () => {
        portForwardManager.dispose();
        portForwardingTreeDataProvider.refresh();
        window.showInformationMessage(`Stopped all active port forwarding sessions.`);
    });
});