import { TreeItemCollapsibleState } from 'vscode';
import { BaseItem } from '../../base';
import { PortForwardSession } from '../../../manager/helpers/port-forward-session';

export class ForwardingSessionItem extends BaseItem {
    constructor(public session: PortForwardSession) {
        super(`${session.identity.clusterName} > ${session.info.service} [${session.info.port}]`, TreeItemCollapsibleState.None, 'portForwarding-forwarding-session_running');
        this.tooltip = `Active: ${session.info.pod} in ${session.info.namespace}`;
    }

    async getChildren(): Promise<BaseItem[]> {
        return [];
    }
}