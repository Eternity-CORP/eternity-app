/**
 * Scheduler Manager
 * 
 * Manages JobRunner lifecycle with mutex to prevent duplicate instances
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SchedulerAdapter } from './adapters/SchedulerAdapter';
import { AppLaunchAdapter } from './adapters/AppLaunchAdapter';
import { BackgroundFetchAdapter } from './adapters/BackgroundFetchAdapter';
import { getJobRunner, JobRunner } from './JobRunner';

// ============================================================================
// Configuration
// ============================================================================

const STORAGE_KEY_BACKGROUND_ENABLED = '@scheduler:background_enabled';
const DEFAULT_INTERVAL_MINUTES = 20;

// ============================================================================
// Mutex for Singleton
// ============================================================================

let isInitialized = false;
let currentAdapter: SchedulerAdapter | null = null;

/**
 * Mutex to prevent duplicate initialization
 */
class InitializationMutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}

const mutex = new InitializationMutex();

// ============================================================================
// Scheduler Manager
// ============================================================================

export class SchedulerManager {
  private jobRunner: JobRunner;
  private adapter: SchedulerAdapter | null = null;
  private backgroundEnabled: boolean = false;

  constructor() {
    this.jobRunner = getJobRunner();
  }

  /**
   * Initialize scheduler
   * 
   * Uses mutex to prevent duplicate initialization
   */
  async initialize(): Promise<void> {
    // Acquire mutex
    await mutex.acquire();

    try {
      if (isInitialized) {
        console.log('SchedulerManager: Already initialized');
        return;
      }

      console.log('SchedulerManager: Initializing...');

      // Load settings
      await this.loadSettings();

      // Choose adapter
      this.adapter = await this.createAdapter();

      // Initialize adapter
      await this.adapter.init();

      // Schedule periodic execution
      this.adapter.scheduleEvery(DEFAULT_INTERVAL_MINUTES);

      // Start JobRunner
      this.jobRunner.start();

      // Mark as initialized
      isInitialized = true;
      currentAdapter = this.adapter;

      console.log(
        `SchedulerManager: Initialized with ${this.adapter.getName()} adapter`
      );
    } finally {
      // Release mutex
      mutex.release();
    }
  }

  /**
   * Shutdown scheduler
   */
  async shutdown(): Promise<void> {
    console.log('SchedulerManager: Shutting down...');

    // Stop JobRunner
    this.jobRunner.stop();

    // Cancel adapter
    if (this.adapter) {
      this.adapter.cancel();
      this.adapter = null;
    }

    // Reset state
    isInitialized = false;
    currentAdapter = null;

    console.log('SchedulerManager: Shutdown complete');
  }

  /**
   * Enable/disable background execution
   */
  async setBackgroundEnabled(enabled: boolean): Promise<void> {
    console.log(`SchedulerManager: Setting background enabled: ${enabled}`);

    this.backgroundEnabled = enabled;

    // Save setting
    await AsyncStorage.setItem(
      STORAGE_KEY_BACKGROUND_ENABLED,
      JSON.stringify(enabled)
    );

    // Restart with new adapter
    await this.shutdown();
    await this.initialize();
  }

  /**
   * Check if background execution is enabled
   */
  isBackgroundEnabled(): boolean {
    return this.backgroundEnabled;
  }

  /**
   * Get current adapter name
   */
  getAdapterName(): string {
    return this.adapter?.getName() || 'None';
  }

  /**
   * Manual tick (for testing or manual trigger)
   */
  async tick(): Promise<void> {
    console.log('SchedulerManager: Manual tick requested');
    await this.jobRunner.tick();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Load settings from storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY_BACKGROUND_ENABLED);
      if (value !== null) {
        this.backgroundEnabled = JSON.parse(value);
      }
    } catch (error) {
      console.error('SchedulerManager: Failed to load settings:', error);
    }

    console.log(
      `SchedulerManager: Background enabled: ${this.backgroundEnabled}`
    );
  }

  /**
   * Create appropriate adapter
   */
  private async createAdapter(): Promise<SchedulerAdapter> {
    // Try background fetch if enabled
    if (this.backgroundEnabled) {
      try {
        console.log('SchedulerManager: Attempting BackgroundFetchAdapter...');
        const adapter = new BackgroundFetchAdapter();
        return adapter;
      } catch (error) {
        console.warn(
          'SchedulerManager: BackgroundFetch not available, falling back to AppLaunch:',
          error
        );
      }
    }

    // Fallback to app launch adapter
    console.log('SchedulerManager: Using AppLaunchAdapter');
    return new AppLaunchAdapter();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let schedulerManagerInstance: SchedulerManager | null = null;

/**
 * Get or create scheduler manager instance
 */
export function getSchedulerManager(): SchedulerManager {
  if (!schedulerManagerInstance) {
    schedulerManagerInstance = new SchedulerManager();
  }
  return schedulerManagerInstance;
}

/**
 * Check if scheduler is initialized
 */
export function isSchedulerInitialized(): boolean {
  return isInitialized;
}

/**
 * Get current adapter (for debugging)
 */
export function getCurrentAdapter(): SchedulerAdapter | null {
  return currentAdapter;
}
