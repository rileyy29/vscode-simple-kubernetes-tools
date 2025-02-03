import { AppsV1Api, CoreV1Api, KubeConfig, type V1Deployment } from '@kubernetes/client-node';
import { ProviderAuthenticationToken } from '../cloud/models';
import { type ClientPod, type ClientResource, type ClientRunnableResource, type ClusterPortForwardableService, type NamespacedClusterObject } from './models';

export class Client {
    private config: KubeConfig = new KubeConfig();

    constructor(_config: string | KubeConfig, token: ProviderAuthenticationToken = null) {
        if (_config instanceof KubeConfig) {
            this.config = _config;
        } else {
            this.config.loadFromString(_config);
        }

        this.setToken(token);
    }

    getConfig() {
        return this.config;
    }

    private setToken(_token: ProviderAuthenticationToken) {
        if (!_token || !_token.token) {
            this.config.applyToHTTPSOptions({ headers: { Authorization: null } });
            return;
        }

        this.config.applyToHTTPSOptions({ headers: { Authorization: `Bearer ${_token.token}` } });
    }

    async hasConnection(): Promise<boolean> {
        try {
            await this.config.makeApiClient(CoreV1Api).listNode();
            return true;
        } catch (error) {
            return false;
        }
    }

    async getNamespaces(): Promise<ClientResource[]> {
        const api = this.config.makeApiClient(CoreV1Api);
        const response = await api.listNamespace();
        return response.items.map(namespace => ({ id: namespace.metadata.uid, name: namespace.metadata.name }));
    }

    async getDeployments(namespace?: NamespacedClusterObject): Promise<ClientRunnableResource[]> {
        const api = this.config.makeApiClient(AppsV1Api);
        const response = !namespace || namespace === 'all' ?
            await api.listDeploymentForAllNamespaces() :
            await api.listNamespacedDeployment({
                namespace
            });

        return response.items.map(deployment => ({ id: deployment.metadata.uid, name: deployment.metadata.name, isRunning: deployment.status.conditions?.some(condition => condition.type === 'Available' && condition.status === 'True') }));
    }

    async getPods(): Promise<ClientPod[]>
    async getPods(namespace?: NamespacedClusterObject, container?: string): Promise<ClientPod[]>
    async getPods(namespace?: NamespacedClusterObject, container?: string): Promise<ClientPod[]> {
        const api = this.config.makeApiClient(CoreV1Api);
        const response = !namespace || namespace === 'all' ?
            await api.listPodForAllNamespaces() :
            await api.listNamespacedPod({
                namespace
            });

        const data = response.items.map(pod => ({
            pod,
            id: pod.metadata.uid,
            name: pod.metadata.name,
            containerName: pod.spec?.containers?.[0]?.name,
            isRunning: pod.status?.phase === 'Running'
        }));

        if (container) {
            return data.filter(pod => pod.containerName === container);
        }

        return data;
    }

    async getPodsResourceVersion(namespace?: NamespacedClusterObject): Promise<string | undefined> {
        const api = this.config.makeApiClient(CoreV1Api);
        const response = !namespace || namespace === 'all' ?
            await api.listPodForAllNamespaces() :
            await api.listNamespacedPod({
                namespace
            });

        return response?.metadata?.resourceVersion;
    }

    async getServices(namespace?: NamespacedClusterObject): Promise<ClientRunnableResource[]> {
        const api = this.config.makeApiClient(CoreV1Api);
        const response = !namespace || namespace === 'all' ?
            await api.listServiceForAllNamespaces() :
            await api.listNamespacedService({
                namespace
            });

        //Services have no stateful status' - so here we assume they are running if the networking is setup
        return response.items.map(service => ({ id: service.metadata.uid, name: service.metadata.name, isRunning: (service.spec.clusterIP ?? service.status.loadBalancer?.ingress) != null }));
    }

    async getServiceWithPortForwardInfo(service: string, namespace: NamespacedClusterObject): Promise<ClusterPortForwardableService> {
        const api = this.config.makeApiClient(CoreV1Api);
        const response = await api.readNamespacedService({ name: service, namespace });
        const endpoints = await api.readNamespacedEndpoints({ name: service, namespace });

        if (!endpoints.subsets || endpoints.subsets.length === 0) {
            throw new Error(`No endpoints found for service ${service} in ${namespace}.`);
        }

        const firstSubset = endpoints.subsets[0];
        if (!firstSubset.addresses || firstSubset.addresses.length === 0) {
            throw new Error(`No ready addresses in the first subset for service ${service}.`);
        }

        const firstAddress = firstSubset.addresses[0];
        if (!firstAddress.targetRef || !firstAddress.targetRef.name) {
            throw new Error(`Endpoint address does not have a targetRef pod name.`);
        }

        const firstPort = response.spec.ports.filter(port => port.protocol === 'TCP')[0];
        if (!firstPort || !firstPort?.port || !firstPort?.targetPort) {
            throw new Error(`Incorrect port configuration for service ${service}.`);
        }

        return {
            targetPort: firstPort.targetPort as number,
            port: firstPort.port as number,
            pod: firstAddress.targetRef.name,
            service,
            namespace
        };
    }

    async restartDeployments(): Promise<ClientResource[]>
    async restartDeployments(namespace?: NamespacedClusterObject, deployments?: string[] | ClientResource[]): Promise<ClientResource[]>
    async restartDeployments(namespace?: NamespacedClusterObject, deployments?: string[] | ClientResource[]): Promise<ClientResource[]> {
        const response: ClientResource[] = [];
        const normalisedDeployments = deployments
            ? deployments.map(deployment => typeof deployment === 'string' ? deployment : deployment.name)
            : null;

        for await (const deployment of await this.getDeployments(namespace)) {
            const name = deployment.name;

            if (normalisedDeployments && !normalisedDeployments.includes(name)) {
                continue;
            }

            await this.restartDeployment(namespace, deployment);
            response.push(deployment);
        }

        return response;
    }

    async restartDeployment(namespace: NamespacedClusterObject, deployment: string | ClientResource): Promise<V1Deployment> {
        const api = this.config.makeApiClient(AppsV1Api);
        const name = typeof deployment === 'string' ? deployment : deployment.name;
        const body = [{
            op: 'add',
            path: '/spec/template/metadata/annotations/restartedAt',
            value: new Date().toISOString(),
        }];

        return await api.patchNamespacedDeployment({
            namespace,
            body,
            name
        });
    }
}