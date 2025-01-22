import { Uri, window } from 'vscode';
import { logManager } from '../manager/log-manager';
import { Command } from './command';
import { closeUri } from '../util';

export const logStopCommand = new Command('logStop', async (_, uri: Uri) => {
    const session = logManager.getSession(uri);
    if (!session) {
        const exit = await window.showWarningMessage('Your log session has already been stopped.', 'Close Tab');
        if (!exit) {
            return;
        }

        await closeUri(uri);
        return;
    }

    logManager.stop(session);
    window.showInformationMessage('Successfully stopped log session.');
});