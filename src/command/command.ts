import { commands, Disposable, window } from 'vscode';

export class Command {
    constructor(
        private id: string,
        private callback: (...args: any[]) => any
    ) { }

    register(...args: any[]): Disposable {
        return commands.registerCommand('simple-kubernetes-tools.' + this.id, async (...commandArgs) => {
            try {
                await this.callback(...args, ...commandArgs);
            } catch (error: any) {
                console.error(error);
                window.showErrorMessage(`Command '${this.id}' failed: ${error.message}`);
            }
        });
    }

    static execute(id: string, ...args: any[]) {
        return commands.executeCommand('simple-kubernetes-tools.' + id, ...args);
    }
}