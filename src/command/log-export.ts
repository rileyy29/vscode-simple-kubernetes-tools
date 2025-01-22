import { Uri, window, workspace } from 'vscode';
import { logManager } from '../manager/log-manager';
import { Command } from './command';
import * as fs from 'fs';

export const logExportCommand = new Command('logExport', async (_, uri: Uri) => {
    const session = logManager.getSession(uri);
    if (!session) {
        return;
    }

    const dialog = await window.showSaveDialog({ filters: { 'Log Files': ['txt'] } });
    if (!dialog) {
        return;
    }

    await fs.promises.writeFile(dialog.fsPath, session.getData(), 'utf-8');
    
    const action = await window.showInformationMessage('Successfully exported logs to file.', 'Open File');
    if (!action) {
        return;
    }

    const document = await workspace.openTextDocument(dialog);
    await window.showTextDocument(document);
});