/**
 * Background Fetch Adapter
 * 
 * Uses react-native-background-fetch for periodic background execution
 */

import BackgroundFetch from 'react-native-background-fetch';
import type { SchedulerAdapter } from './SchedulerAdapter';
import { getJobRunner } from '../JobRunner';

/**
 * Background fetch adapter
 * 
 * Executes JobRunner.tick() periodically in the background
 */
export class BackgroundFetchAdapter implements SchedulerAdapter {
  private isConfigured: boolean = false;

  async init(): Promise<void> {
    console.log('BackgroundFetchAdapter: Initializing...');

    try {
      // Configure background fetch
      const status = await BackgroundFetch.configure(
        {
          minimumFetchInterval: 15, // Minutes (iOS minimum is 15)
          stopOnTerminate: false,
          startOnBoot: true,
          enableHeadless: true,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
          requiresCharging: false,
          requiresDeviceIdle: false,
          requiresBatteryNotLow: false,
          requiresStorageNotLow: false,
        },
        async (taskId) => {
          console.log(`BackgroundFetch: Task ${taskId} fired`);
          await this.onBackgroundFetch(taskId);
        },
        (taskId) => {
          console.log(`BackgroundFetch: Task ${taskId} timeout`);
          BackgroundFetch.finish(taskId);
        }
      );

      this.isConfigured = true;
      console.log('BackgroundFetchAdapter: Configured, status:', status);
    } catch (error) {
      console.error('BackgroundFetchAdapter: Init failed:', error);
      throw error;
    }
  }

  scheduleEvery(minutes: number): void {
    if (!this.isConfigured) {
      console.warn('BackgroundFetchAdapter: Not configured, call init() first');
      return;
    }

    console.log(`BackgroundFetchAdapter: Scheduling every ${minutes} minutes`);
    // Note: Background fetch interval is set in configure()
    // This method is here for interface compatibility
  }

  cancel(): void {
    console.log('BackgroundFetchAdapter: Cancelling...');
    BackgroundFetch.stop();
    this.isConfigured = false;
  }

  getName(): string {
    return 'BackgroundFetch';
  }

  /**
   * Handle background fetch event
   */
  private async onBackgroundFetch(taskId: string): Promise<void> {
    console.log('BackgroundFetchAdapter: Executing tick...');

    try {
      const jobRunner = getJobRunner();
      await jobRunner.tick();

      console.log('BackgroundFetchAdapter: Tick completed');
      BackgroundFetch.finish(taskId);
    } catch (error) {
      console.error('BackgroundFetchAdapter: Tick failed:', error);
      BackgroundFetch.finish(taskId);
    }
  }
}

/**
 * Headless task for background execution (Android)
 */
export async function registerHeadlessTask(): Promise<void> {
  BackgroundFetch.registerHeadlessTask(async (event) => {
    console.log('BackgroundFetch: Headless task fired:', event.taskId);

    try {
      const jobRunner = getJobRunner();
      await jobRunner.tick();

      console.log('BackgroundFetch: Headless task completed');
    } catch (error) {
      console.error('BackgroundFetch: Headless task failed:', error);
    }
  });
}
