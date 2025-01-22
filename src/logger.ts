import { configManager } from './manager/config-manager';

class Logger {
    private isEnabled() {
        return configManager.get<boolean>('general.debugLogs', false);
    }

    log(message: string, ...optionalParams: any[]) {
        if (!this.isEnabled()) {
            return;
        }

        console.log(message, optionalParams);
    }

    warn(message: string, ...optionalParams: any[]) {
        if (!this.isEnabled()) {
            return;
        }

        console.warn(message, optionalParams);
    }

    error(message: string, ...optionalParams: any[]) {
        if (!this.isEnabled()) {
            return;
        }

        console.error(message, optionalParams);
    }
}

export const logger = new Logger();