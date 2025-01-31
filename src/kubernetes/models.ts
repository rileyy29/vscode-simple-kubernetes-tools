import { type V1Pod } from '@kubernetes/client-node';

export type NamespacedClusterObject = 'all' | string;
export interface ClientResource {
    id: string;
    name: string;
}

export interface ClientRunnableResource extends ClientResource {
    isRunning: boolean;
}

export interface ClientViewableResource extends ClientResource {
    data: { [key: string]: string; };
}

export interface ClientPod extends ClientRunnableResource {
    containerName: string;
    pod: V1Pod;
}

export interface ClusterPortForwardableService {
    targetPort: number;
    port: number;
    pod: string;
    service: string;
    namespace: string;
}