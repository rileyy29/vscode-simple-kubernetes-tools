import { Uri } from 'vscode';
import { type ExternalProvider } from './cloud/models';
import path from 'path';

export const ID = 'simple-kubernetes-tools';
export const ID_CONFIG = 'simpleKubernetesTools';

export const STATE_CLUSTERS_KEY = 'clusters';

export const ABORT_CODE = 'MANUAL';
export const ABORT_ERRORS = ['Premature close', 'AbortError', 'aborted a request']

export const BEACON_CONFIG = {
    SILENT_ERRORS: [
        'ETIMEDOUT',
        'ECONNRESET'
    ],
    NO_RETRY_ERRORS: [
        'ENOTFOUND',
        ...ABORT_ERRORS
    ],
    URL: '/api/v1/pods',
    RECONNECT_TIME: 2,
    RETRY_ATTEMPTS: 3,
    DEBOUNCE_TIME: 6,
    EXPIRE_TIME: 5
};

export const LOG_CONFIG = {
    MAX_BUFFER_SIZE: 512,
    LANGUAGE_ID: 'simpleKubernetesLogs',
    PARAMS: { follow: true, tailLines: 250, timestamps: true }
};

export const SVG_ICONS = {
    AddPlug: Uri.file(path.join(__dirname, '..', 'resources', 'AddPlug.svg')),
    Azure: Uri.file(path.join(__dirname, '..', 'resources', 'Azure.svg')),
    Azure_Cluster: Uri.file(path.join(__dirname, '..', 'resources', 'Azure_Cluster.svg')),
};

export const PROVIDERS = [
    { id: 'Azure', name: 'Azure Kubernetes Service (AKS)' }
] satisfies { id: ExternalProvider, name: string; }[];