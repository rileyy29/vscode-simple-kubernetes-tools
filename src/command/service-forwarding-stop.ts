import { window } from 'vscode';
import { portForwardManager } from '../manager/port-forward-manager';
import { ForwardingSessionItem } from '../tree/port-forwarding/item/forwarding-session';
import { Command } from './command';

export const serviceForwardingStopCommand = new Command('serviceForwardingStop', async (_, item: ForwardingSessionItem) => {
    portForwardManager.stop(item.session);
    window.showInformationMessage(`Successfully stopped port forwarding for ${item.session.info.service}.`);
});