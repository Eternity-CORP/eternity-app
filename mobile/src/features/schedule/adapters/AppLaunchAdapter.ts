/**
 * App Launch Adapter
 * 
 * Executes JobRunner.tick() on app launch and screen unlock
 */

import { AppState, AppStateStatus } from 'react-native';
import type { SchedulerAdapter } from './SchedulerAdapter';
import { getJobRunner } from '../JobRunner';

/**
 * App launch adapter
 * 
 * Triggers tick() when:
 * - App launches
 * - App comes to foreground
 * - Screen unlocks
 */
export class AppLaunchAdapter implements SchedulerAdapter {
  private appStateSubscription?: { remove: () => void };
  private lastTickTime: number = 0;
  private minTickInterval: number = 60 * 1000; // 1 minute minimum between ticks

  async init(): Promise<void> {
    console.log('AppLaunchAdapter: Initializing...');

    // Execute tick on init (app launch)
    await this.executeTick('app_launch');

    // Subscribe to app state changes
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );

    console.log('AppLaunchAdapter: Initialized');
  }

  scheduleEvery(minutes: number): void {
    // Update minimum interval
    this.minTickInterval = minutes * 60 * 1000;
    console.log(
      `AppLaunchAdapter: Min interval set to ${minutes} minutes`
    );
  }

  cancel(): void {
    console.log('AppLaunchAdapter: Cancelling...');

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = undefined;
    }

    console.log('AppLaunchAdapter: Cancelled');
  }

  getName(): string {
    return 'AppLaunch';
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    console.log('AppLaunchAdapter: App state changed to:', nextAppState);

    // Execute tick when app comes to foreground
    if (nextAppState === 'active') {
      this.executeTick('app_foreground');
    }
  };

  /**
   * Execute tick with throttling
   */
  private async executeTick(reason: string): Promise<void> {
    const now = Date.now();

    // Throttle: don't tick too frequently
    if (now - this.lastTickTime < this.minTickInterval) {
      console.log(
        `AppLaunchAdapter: Skipping tick (${reason}), too soon (${
          (now - this.lastTickTime) / 1000
        }s ago)`
      );
      return;
    }

    console.log(`AppLaunchAdapter: Executing tick (${reason})...`);
    this.lastTickTime = now;

    try {
      const jobRunner = getJobRunner();
      await jobRunner.tick(now);

      console.log(`AppLaunchAdapter: Tick completed (${reason})`);
    } catch (error) {
      console.error(`AppLaunchAdapter: Tick failed (${reason}):`, error);
    }
  }
}
