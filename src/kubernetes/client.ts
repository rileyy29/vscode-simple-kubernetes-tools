import { AppsV1Api, BatchV1Api, CoreV1Api, KubeConfig, type V1Deployment } from '@kubernetes/client-node';
import { type ClusterPortForwardableService, type ClientPod, type ClientResource, type ClientRunnableResource, type NamespacedClusterObject, ClientViewableResource } from './models';

export class Client {
    private config: KubeConfig = new KubeConfig();

    constructor(_config: string | KubeConfig) {
        if (_config instanceof KubeConfig) {
            this.config = _config;
        } else {
            this.config.loadFromString(_config);
        }
    }

    getConfig() {
        return this.config;
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

    async getReplicaSets(namespace?: NamespacedClusterObject): Promise<ClientResource[]> {
        const api = this.config.makeApiClient(AppsV1Api);
        const response = !namespace || namespace === 'all' ?
            await api.listReplicaSetForAllNamespaces() :
            await api.listNamespacedReplicaSet({
                namespace
            });

        return response.items.map(replica => ({ id: replica.metadata.uid, name: replica.metadata.name }));
    }

    async getStatefulSets(namespace?: NamespacedClusterObject): Promise<ClientResource[]> {
        const api = this.config.makeApiClient(AppsV1Api);
        const response = !namespace || namespace === 'all' ?
            await api.listStatefulSetForAllNamespaces() :
            await api.listNamespacedStatefulSet({
                namespace
            });
            
        return response.items.map(stateful => ({ id: stateful.metadata.uid, name: stateful.metadata.name }));
    }

    async getDaemonSets(namespace?: NamespacedClusterObject): Promise<ClientResource[]> {
        const api = this.config.makeApiClient(AppsV1Api);
        const response = !namespace || namespace === 'all' ?
            await api.listDaemonSetForAllNamespaces() :
            await api.listNamespacedDaemonSet({
                namespace
            });
            
        return response.items.map(daemon => ({ id: daemon.metadata.uid, name: daemon.metadata.name }));
    }

    async getJobs(namespace?: NamespacedClusterObject): Promise<ClientResource[]> {
        const api = this.config.makeApiClient(BatchV1Api);
        const response = !namespace || namespace === 'all' ?
            await api.listJobForAllNamespaces() :
            await api.listNamespacedJob({
                namespace
            });
            
        return response.items.map(job => ({ id: job.metadata.uid, name: job.metadata.name }));
    }

    async getCronJobs(namespace?: NamespacedClusterObject): Promise<ClientResource[]> {
        const api = this.config.makeApiClient(BatchV1Api);
        const response = !namespace || namespace === 'all' ?
            await api.listCronJobForAllNamespaces() :
            await api.listNamespacedCronJob({
                namespace
            });
            
        return response.items.map(cjob => ({ id: cjob.metadata.uid, name: cjob.metadata.name }));
    }

    async getConfigMaps(namespace?: NamespacedClusterObject): Promise<ClientViewableResource[]> {
        const api = this.config.makeApiClient(CoreV1Api);
        const response = !namespace || namespace === 'all' ?
            await api.listConfigMapForAllNamespaces() :
            await api.listNamespacedConfigMap({
                namespace
            });

        return response.items.map(config => ({ id: config.metadata.uid, name: config.metadata.name, data: config.data }));
    }

    async getSecrets(namespace?: NamespacedClusterObject): Promise<ClientViewableResource[]> {
        const api = this.config.makeApiClient(CoreV1Api);
        const response = !namespace || namespace === 'all' ?
            await api.listSecretForAllNamespaces() :
            await api.listNamespacedSecret({
                namespace
            });

        return response.items.map(secret => ({ id: secret.metadata.uid, name: secret.metadata.name, data: secret.data }));
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