export type ExternalProvider = 'Azure';

export interface ProviderSubscription {
    provider: ExternalProvider;
    subscriptionId: string;
    displayName: string;
}

export interface ProviderCluster {
    name: ExternalProvider;
    id: string;
}

export interface ProviderAuthenticationToken {
    token: string;
    expiresOnTimestamp: number;
    refreshAfterTimestamp?: number;
    tokenType?: "Bearer" | "pop";
}