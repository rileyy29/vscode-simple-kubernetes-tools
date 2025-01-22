import { ConfigurationTarget, workspace } from 'vscode';
import { ID_CONFIG } from '../config';

type ConfigKey =
    'general.autoConnect' |
    'general.debugLogs' |
    'logViewer.maxSize' |
    'logViewer.rerouteOnPodKill' |
    'portForwarding.useServiceName' |
    'beacon.reconnectionTime' |
    'beacon.debounceTime' |
    'beacon.maxRetryAttempts';

class ConfigManager {
    private getSection() {
        return workspace.getConfiguration(ID_CONFIG);
    }

    async update(key: ConfigKey, value: string | undefined, scope: ConfigurationTarget = ConfigurationTarget.Workspace): Promise<void> {
        const config = this.getSection();
        await config.update(key, value, scope);
    }

    get<T = string>(key: ConfigKey, fallback: T): T;
    get<T = string>(key: ConfigKey, fallback?: T): T | undefined
    get<T = string>(key: ConfigKey, fallback?: T): T | undefined {
        return this.getSection().get<T>(key, fallback!);
    }
}

export const configManager = new ConfigManager();

