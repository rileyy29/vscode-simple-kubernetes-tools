import { languages, window, workspace } from 'vscode';
import { ClientPod } from '../kubernetes/models';
import { logManager } from '../manager/log-manager';
import { LogSession } from '../manager/helpers/log-session';
import { ResourceItem } from '../tree/explorer/item/resource';
import { withLoadingSpinner } from '../util';
import { Command } from './command';

export const podInspectLogsCommand = new Command('podInspectLogs', async (_, item: ResourceItem) => {
    const pod = item.resource as ClientPod;
    const uri = logManager.createUri(item.cluster.id, item.namespace, pod.name, pod.containerName);

    await withLoadingSpinner('Loading...', async () => {
        const session = new LogSession(uri, item.cluster, item.namespace, pod.name, pod.containerName);
        logManager.start(session);

        const document = await workspace.openTextDocument(uri);
        await languages.setTextDocumentLanguage(document, 'simpleKubernetesLogs');
        await window.showTextDocument(uri, { preview: false });
        await session.start();

        window.showInformationMessage(`Successfully started inspecting logs for ${pod.name}.`);
    });
});