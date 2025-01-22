import { ConfigurationTarget, EventEmitter, TextDocumentContentProvider, Uri, workspace } from 'vscode';
import { LOG_CONFIG } from '../../config';
import { logManager } from '../log-manager';

class LogContentProvider implements TextDocumentContentProvider {
    private onDidChangeEmitter = new EventEmitter<Uri>();
    public onDidChange = this.onDidChangeEmitter.event;

    constructor() {
        this.onDidChange((uri) => {
            const session = logManager.getSession(uri);
            if (session) {
                session.scroll();
            }
        }, this);

        workspace.onDidCloseTextDocument(document => {
            const session = logManager.getSession(document.uri);
            if (session && document.languageId === LOG_CONFIG.LANGUAGE_ID) {
                session.dispose();
            }
        }, this);

        this.setupColorCustomizations();
    }

    provideTextDocumentContent(uri: Uri): string {
        return logManager.getSession(uri)?.getData() || 'Connection closed.';
    }

    triggerChangeContent(uri: Uri) {
        this.onDidChangeEmitter.fire(uri);
    }

    private setupColorCustomizations() {
        workspace.getConfiguration('editor').update('tokenColorCustomizations', {
            textMateRules: [
                {
                    scope: 'constant.numeric.timestamp.simpleKubernetesLogs',
                    settings: { foreground: '#9AA5B5', fontStyle: 'italic' }
                },
                {
                    scope: 'keyword.debug.simpleKubernetesLogs',
                    settings: { foreground: '#A0AEC0' }
                },
                {
                    scope: 'keyword.info.simpleKubernetesLogs',
                    settings: { foreground: '#10B981', fontStyle: 'bold' }
                },
                {
                    scope: 'keyword.warn.simpleKubernetesLogs',
                    settings: { foreground: '#FACC15', fontStyle: 'bold' }
                },
                {
                    scope: 'keyword.error.simpleKubernetesLogs',
                    settings: { foreground: '#EF4444', fontStyle: 'bold underline' }
                },
                {
                    scope: 'keyword.method.simpleKubernetesLogs',
                    settings: { foreground: '#3B82F6', fontStyle: 'bold' }
                },
                {
                    scope: 'constant.numeric.status.simpleKubernetesLogs',
                    settings: { foreground: '#22C55E', fontStyle: 'italic' }
                },
                {
                    scope: 'keyword.important.simpleKubernetesLogs',
                    settings: { foreground: '#F59E0B', fontStyle: 'bold' }
                }
            ]
        }, ConfigurationTarget.Global);
    }
}

export const logContentProvider = new LogContentProvider();