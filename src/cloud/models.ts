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