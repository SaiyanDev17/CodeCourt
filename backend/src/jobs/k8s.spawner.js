// Kubernetes Job spawner for judge execution
const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();

// Load kubeconfig from default location or in-cluster config
if (process.env.KUBERNETES_SERVICE_HOST) {
  kc.loadFromCluster();
} else {
  kc.loadFromDefault();
}

const batchV1Api = kc.makeApiClient(k8s.BatchV1Api);
const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);

const NAMESPACE = process.env.K8S_NAMESPACE || 'codecourt';

/**
 * Spawn K8s Job for judge execution
 * @param {Object} params - { submissionId, code, language, problemId, timeLimit, memoryLimit }
 */
exports.spawnJudgeJob = async (params) => {
  const { submissionId, code, language, problemId, timeLimit, memoryLimit } = params;
  
  const jobName = `judge-${submissionId}`;
  const image = language === 'cpp' 
    ? 'ghcr.io/codecourt/judge-cpp:latest'
    : 'ghcr.io/codecourt/judge-python:latest';
  
  const jobManifest = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: jobName,
      namespace: NAMESPACE
    },
    spec: {
      ttlSecondsAfterFinished: 300, // Clean up after 5 minutes
      backoffLimit: 0, // No retries
      template: {
        spec: {
          restartPolicy: 'Never',
          containers: [{
            name: 'judge',
            image: image,
            resources: {
              limits: {
                cpu: '1',
                memory: `${memoryLimit}Mi`
              },
              requests: {
                cpu: '500m',
                memory: `${memoryLimit / 2}Mi`
              }
            },
            env: [
              { name: 'SUBMISSION_ID', value: submissionId },
              { name: 'PROBLEM_ID', value: problemId },
              { name: 'TIME_LIMIT', value: timeLimit.toString() },
              { name: 'CODE', value: Buffer.from(code).toString('base64') }
            ]
          }]
        }
      }
    }
  };
  
  try {
    const response = await batchV1Api.createNamespacedJob(NAMESPACE, jobManifest);
    return response.body;
  } catch (error) {
    console.error('Failed to create K8s Job:', error);
    throw error;
  }
};

/**
 * Get job logs
 */
exports.getJobLogs = async (jobName) => {
  try {
    // Get pod name from job
    const pods = await coreV1Api.listNamespacedPod(
      NAMESPACE,
      undefined,
      undefined,
      undefined,
      undefined,
      `job-name=${jobName}`
    );
    
    if (pods.body.items.length === 0) {
      throw new Error('No pod found for job');
    }
    
    const podName = pods.body.items[0].metadata.name;
    
    // Get logs
    const logs = await coreV1Api.readNamespacedPodLog(podName, NAMESPACE);
    return logs.body;
  } catch (error) {
    console.error('Failed to get job logs:', error);
    throw error;
  }
};

/**
 * Delete job
 */
exports.deleteJob = async (jobName) => {
  try {
    await batchV1Api.deleteNamespacedJob(
      jobName,
      NAMESPACE,
      undefined,
      undefined,
      undefined,
      undefined,
      'Background'
    );
  } catch (error) {
    console.error('Failed to delete job:', error);
  }
};
