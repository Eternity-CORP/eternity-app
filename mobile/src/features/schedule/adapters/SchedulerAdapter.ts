/**
 * Scheduler Adapter Interface
 * 
 * Abstraction for background/foreground scheduling
 */

/**
 * Scheduler adapter for triggering JobRunner
 */
export interface SchedulerAdapter {
  /**
   * Initialize the adapter
   */
  init(): Promise<void>;

  /**
   * Schedule periodic execution
   * 
   * @param minutes - Interval in minutes
   */
  scheduleEvery(minutes: number): void;

  /**
   * Cancel all scheduled tasks
   */
  cancel(): void;

  /**
   * Get adapter name (for debugging)
   */
  getName(): string;
}
