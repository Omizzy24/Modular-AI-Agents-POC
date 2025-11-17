import { Worker, NativeConnection } from '@temporalio/worker';
import { createLogger } from '@poc/shared';
import * as activities from './activities';
import dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('temporal:worker');

/**
 * Start the Temporal worker
 * Registers workflows and activities for execution
 */
async function run() {
  try {
    // Create connection to Temporal server
    const connection = await NativeConnection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233'
    });

    const worker = await Worker.create({
      workflowsPath: require.resolve('./workflows'),
      activities,
      taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'ai-orchestration-queue',
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
      connection
    });

    logger.info('Starting Temporal worker', {
      taskQueue: process.env.TEMPORAL_TASK_QUEUE,
      namespace: process.env.TEMPORAL_NAMESPACE,
      address: process.env.TEMPORAL_ADDRESS
    });

    await worker.run();
  } catch (err) {
    console.error('WORKER ERROR:', err);
    console.error('ERROR STACK:', err instanceof Error ? err.stack : 'No stack');
    console.error('ERROR MESSAGE:', err instanceof Error ? err.message : String(err));
    logger.error('Failed to start worker', { error: err });
    process.exit(1);
  }
}

run().catch(err => {
  logger.error('Worker crashed', { error: err });
  process.exit(1);
});
