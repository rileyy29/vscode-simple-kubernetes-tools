import { StatusBarAlignment, Tab, TabInputText, Uri, window } from 'vscode';

export function stringifyTextBeforeSeparator(text: string, separator: string = '\n') {
    return `${text}${separator}`;
}

export function stringifyTextAfterSeparator(text: string, separator: string = '\n') {
    return `${separator}${text}`;
}

export function calculateExponentialBackoff(interval: number, max: number = 60) {
    const base = 5 * 1000;
    const jitter = Math.random() * 250;
    return Math.min(base * Math.pow(2, interval), (max * 1000)) + jitter;
}

export function isError(errors: string[], error: any) {
    return errors.includes(error.code) || errors.some((msg) => error.message?.includes(msg));
}

export async function closeUri(file: Uri | string): Promise<void> {
    const uri = file instanceof Uri ? file.toString() : file;
    const tabs: Tab[] = window.tabGroups.all.map(tg => tg.tabs).flat();
    const index = tabs.findIndex(tab => tab.input instanceof TabInputText && tab.input.uri.toString() === uri);
    if (index !== -1) {
        await window.tabGroups.close(tabs[index]);
    }
}

export async function withLoadingSpinner<T>(
    message: string,
    task: () => Promise<T>
): Promise<T> {
    const loadingItem = window.createStatusBarItem(StatusBarAlignment.Left, 9999);
    loadingItem.text = `$(sync~spin) ${message}`;
    loadingItem.tooltip = 'Please wait...';
    loadingItem.show();

    try {
        const result = await task();
        return result;
    } finally {
        loadingItem.dispose();
    }
}