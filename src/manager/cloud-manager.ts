import { azureProvider } from '../cloud/azure';
import { ExternalProvider, ProviderAuthenticationToken } from '../cloud/models';
import { CloudProvider } from '../cloud/provider';

class CloudManager {
    private providers: Record<ExternalProvider, CloudProvider> = {
        Azure: azureProvider
    };

    private getProvider(providerName: ExternalProvider): CloudProvider {
        const provider = this.providers[providerName];
        if (!provider) throw new Error(`Provider "${providerName}" is not registered.`);
        return provider;
    }

    async getAccessToken(providerName: ExternalProvider): Promise<ProviderAuthenticationToken> {
        return await this.getProvider(providerName).authenticate();
    }
}

export const cloudManager = new CloudManager();