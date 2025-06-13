import { ExtensionContext, window, workspace } from 'vscode';
import { clusterAddCommand } from './command/cluster-add';
import { clusterConnectCommand } from './command/cluster-connect';
import { clusterDisconnectCommand } from './command/cluster-disconnect';
import { clusterOpenWebCommand } from './command/cluster-open-web';
import { clusterRemoveCommand } from './command/cluster-remove';
import { clusterRestartCommand } from './command/cluster-restart';
import { clusterStartCommand } from './command/cluster-start';
import { clusterStopCommand } from './command/cluster-stop';
import { deploymentRestartCommand, deploymentsRestartCommand } from './command/deployment-restart';
import { itemRefreshCommand } from './command/item-refresh';
import { beacon } from './manager/beacon';
import { logManager } from './manager/log-manager';
import { portForwardManager } from './manager/port-forward-manager';
import { stateManager } from './manager/state-manager';
import { explorerTreeDataProvider } from './tree/explorer/explorer.provider';
import { portForwardingTreeDataProvider } from './tree/port-forwarding/port-forwarding.provider';
import { serviceForwardingStartCommand } from './command/service-forwarding-start';
import { serviceForwardingStopCommand } from './command/service-forwarding-stop';
import { logContentProvider } from './manager/helpers/log-content-provider';
import { podInspectLogsCommand } from './command/pod-inspect-logs';
import { serviceForwardingClearCommand } from './command/service-forwarding-clear';
import { logExportCommand } from './command/log-export';
import { logStopCommand } from './command/log-stop';
import { itemCopyNameCommand } from './command/item-copy-name';
import { deploymentDeleteCommand } from './command/deployment-delete';

export function activate(context: ExtensionContext) {
	stateManager.context = context;

	window.createTreeView('explorerView', { treeDataProvider: explorerTreeDataProvider });
	window.createTreeView('portForwardingView', { treeDataProvider: portForwardingTreeDataProvider });

	context.subscriptions.push(workspace.registerTextDocumentContentProvider('simpleKubernetesLogs', logContentProvider));

	const commands = [
		itemCopyNameCommand,
		itemRefreshCommand,

		clusterAddCommand,
		clusterRemoveCommand,
		clusterOpenWebCommand,
		clusterStartCommand,
		clusterStopCommand,
		clusterRestartCommand,
		clusterConnectCommand,
		clusterDisconnectCommand,

		deploymentDeleteCommand,
		deploymentRestartCommand,
		deploymentsRestartCommand,

		podInspectLogsCommand,

		serviceForwardingStartCommand,
		serviceForwardingStopCommand,
		serviceForwardingClearCommand,

		logStopCommand,
		logExportCommand
	];

	commands.forEach(command =>
		context.subscriptions.push(command.register(context)));
}

export function deactivate() {
	portForwardManager.dispose();
	logManager.dispose();
	beacon.dispose();
}
