/**
 * Kubernetes Job Spawner
 * 
 * VISION:
 * Enable cloud-native, scalable code execution by spawning Kubernetes Jobs
 * for each submission. Provides better resource isolation and scalability
 * compared to Docker-on-host approach.
 * 
 * WHY THIS EXISTS:
 * Docker-on-host has limitations:
 * - Limited horizontal scaling (bound to single host)
 * - Resource contention between judges
 * - Complex cleanup and monitoring
 * 
 * Kubernetes Jobs provide:
 * - Automatic pod scheduling across cluster nodes
 * - Built-in resource limits and quotas
 * - Automatic cleanup (ttlSecondsAfterFinished)
 * - Better observability (logs, metrics, events)
 * - Cloud-native deployment (works on GKE, EKS, AKS, OKE)
 * 
 * WHAT IT DOES:
 * - Creates Kubernetes Job for each submission
 * - Configures resource limits (CPU, memory)
 * - Passes submission data via environment variables
 * - Retrieves job logs for verdict determination
 * - Cleans up completed jobs automatically
 * 
 * DESIGN DECISIONS:
 * 1. Job per Submission (not long-running pods):
 *    - Simpler lifecycle management
 *    - Automatic cleanup via ttlSecondsAfterFinished
 *    - Better resource isolation
 * 
 * 2. Environment Variables for Data:
 *    - CODE passed as base64 (handles special characters)
 *    - Simpler than ConfigMaps or Secrets
 *    - Sufficient for short-lived jobs
 * 
 * 3. Resource Limits:
 *    - Limits prevent resource exhaustion
 *    - Requests ensure guaranteed resources
 *    - Requests = 50% of limits (standard practice)
 * 
 * 4. TTL Cleanup (300 seconds):
 *    - Automatic cleanup after 5 minutes
 *    - Keeps cluster clean
 *    - Logs still available during TTL window
 * 
 * 5. No Retries (backoffLimit: 0):
 *    - Judge failures should not retry automatically
 *    - User can resubmit if needed
 *    - Prevents infinite retry loops
 * 
 * USAGE:
 * ```javascript
 * const { spawnJudgeJob, getJobLogs, deleteJob } = require('./jobs/k8s.spawner');
 * 
 * // Spawn judge job
 * const job = await spawnJudgeJob({
 *   submissionId: '507f1f77bcf86cd799439011',
 *   code: 'print("Hello World")',
 *   language: 'python',
 *   problemId: '507f1f77bcf86cd799439012',
 *   timeLimit: 2000,
 *   memoryLimit: 256
 * });
 * 
 * // Wait for job completion (poll job status)
 * // ...
 * 
 * // Get logs to determine verdict
 * const logs = await getJobLogs('judge-507f1f77bcf86cd799439011');
 * 
 * // Manual cleanup (optional, TTL handles this automatically)
 * await deleteJob('judge-507f1f77bcf86cd799439011');
 * ```
 * 
 * NOTE: This is currently unused in favor of Docker-on-host approach.
 * Enable by modifying submission.worker.js to use spawnJudgeJob instead of runJudge.
 */

const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();

// Load kubeconfig from default location or in-cluster config
// In-cluster: Running inside Kubernetes pod (production)
// Default: Running locally with ~/.kube/config (development)
if (process.env.KUBERNETES_SERVICE_HOST) {
  // Running inside Kubernetes cluster
  kc.loadFromCluster();
} else {
  // Running locally - load from ~/.kube/config
  kc.loadFromDefault();
}

// Create Kubernetes API clients
const batchV1Api = kc.makeApiClient(k8s.BatchV1Api); // For Job operations
const coreV1Api = kc.makeApiClient(k8s.CoreV1Api); // For Pod/Log operations

const NAMESPACE = process.env.K8S_NAMESPACE || 'codecourt';

/**
 * Spawn Kubernetes Job for judge execution
 * 
 * Creates a Kubernetes Job that runs a judge container to execute user code.
 * The job is automatically cleaned up after 5 minutes via ttlSecondsAfterFinished.
 * 
 * @param {Object} params - Job parameters
 * @param {string} params.submissionId - MongoDB ObjectId of submission
 * @param {string} params.code - Source code to execute
 * @param {string} params.language - Programming language ('cpp' or 'python')
 * @param {string} params.problemId - MongoDB ObjectId of problem
 * @param {number} params.timeLimit - Time limit in milliseconds
 * @param {number} params.memoryLimit - Memory limit in MB
 * @returns {Promise<Object>} Kubernetes Job object
 * 
 * @example
 * const job = await spawnJudgeJob({
 *   submissionId: '507f1f77bcf86cd799439011',
 *   code: '#include <iostream>\nint main() { std::cout << "Hello"; }',
 *   language: 'cpp',
 *   problemId: '507f1f77bcf86cd799439012',
 *   timeLimit: 2000,
 *   memoryLimit: 256
 * });
 */
exports.spawnJudgeJob = async (params) => {
  const { submissionId, code, language, problemId, timeLimit, memoryLimit } = params;
  
  // Generate unique job name using submission ID
  const jobName = `judge-${submissionId}`;
  
  // Select judge container image based on language
  const image = language === 'cpp' 
    ? 'ghcr.io/codecourt/judge-cpp:latest'
    : 'ghcr.io/codecourt/judge-python:latest';
  
  // Define Kubernetes Job manifest
  const jobManifest = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: jobName,
      namespace: NAMESPACE
    },
    spec: {
      ttlSecondsAfterFinished: 300, // Auto-cleanup after 5 minutes
      backoffLimit: 0, // No retries on failure
      template: {
        spec: {
          restartPolicy: 'Never', // Don't restart failed pods
          containers: [{
            name: 'judge',
            image: image,
            resources: {
              limits: {
                cpu: '1', // Max 1 CPU core
                memory: `${memoryLimit}Mi` // Memory limit from problem
              },
              requests: {
                cpu: '500m', // Guaranteed 0.5 CPU cores
                memory: `${memoryLimit / 2}Mi` // Guaranteed 50% of memory limit
              }
            },
            env: [
              { name: 'SUBMISSION_ID', value: submissionId },
              { name: 'PROBLEM_ID', value: problemId },
              { name: 'TIME_LIMIT', value: timeLimit.toString() },
              // Base64 encode code to handle special characters
              { name: 'CODE', value: Buffer.from(code).toString('base64') }
            ]
          }]
        }
      }
    }
  };
  
  try {
    // Create job in Kubernetes cluster
    const response = await batchV1Api.createNamespacedJob(NAMESPACE, jobManifest);
    return response.body;
  } catch (error) {
    console.error('Failed to create K8s Job:', error);
    throw error;
  }
};

/**
 * Get job logs from completed pod
 * 
 * Retrieves logs from the pod created by a Kubernetes Job. Logs contain
 * the judge output which is used to determine the verdict.
 * 
 * @param {string} jobName - Name of the Kubernetes Job
 * @returns {Promise<string>} Pod logs as string
 * @throws {Error} If no pod found or logs unavailable
 * 
 * @example
 * const logs = await getJobLogs('judge-507f1f77bcf86cd799439011');
 * // Parse logs to extract verdict, execution time, memory usage
 */
exports.getJobLogs = async (jobName) => {
  try {
    // Find pod created by this job
    // Kubernetes automatically labels pods with job-name
    const pods = await coreV1Api.listNamespacedPod(
      NAMESPACE,
      undefined, // pretty
      undefined, // allowWatchBookmarks
      undefined, // continue
      undefined, // fieldSelector
      `job-name=${jobName}` // labelSelector
    );
    
    if (pods.body.items.length === 0) {
      throw new Error('No pod found for job');
    }
    
    // Get first pod (jobs create only one pod with backoffLimit: 0)
    const podName = pods.body.items[0].metadata.name;
    
    // Retrieve logs from pod
    const logs = await coreV1Api.readNamespacedPodLog(podName, NAMESPACE);
    return logs.body;
  } catch (error) {
    console.error('Failed to get job logs:', error);
    throw error;
  }
};

/**
 * Delete Kubernetes Job manually
 * 
 * Manually deletes a Kubernetes Job and its associated pods. This is optional
 * since ttlSecondsAfterFinished handles automatic cleanup. Useful for immediate
 * cleanup in testing or when TTL is disabled.
 * 
 * @param {string} jobName - Name of the Kubernetes Job to delete
 * 
 * Deletion propagation policy:
 * - 'Background': Delete job immediately, pods deleted asynchronously
 * - Alternative: 'Foreground' (wait for pods to delete first)
 * 
 * @example
 * await deleteJob('judge-507f1f77bcf86cd799439011');
 */
exports.deleteJob = async (jobName) => {
  try {
    await batchV1Api.deleteNamespacedJob(
      jobName,
      NAMESPACE,
      undefined, // pretty
      undefined, // dryRun
      undefined, // gracePeriodSeconds
      undefined, // orphanDependents
      'Background' // propagationPolicy: delete pods in background
    );
  } catch (error) {
    // Log error but don't throw - cleanup failures are non-critical
    console.error('Failed to delete job:', error);
  }
};
