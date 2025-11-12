/**
 * App Integration for Scheduler
 * 
 * Hook to initialize and cleanup scheduler in App.tsx
 */

import { useEffect } from 'react';
import { getSchedulerManager } from '../SchedulerManager';

/**
 * Hook to integrate scheduler into app lifecycle
 * 
 * Usage in App.tsx:
 * ```tsx
 * function App() {
 *   useSchedulerIntegration();
 *   
 *   return <YourApp />;
 * }
 * ```
 */
export function useSchedulerIntegration() {
  useEffect(() => {
    let isActive = true;

    // Initialize scheduler
    const initScheduler = async () => {
      try {
        console.log('App: Initializing scheduler...');
        const manager = getSchedulerManager();
        await manager.initialize();
        console.log('App: Scheduler initialized');
      } catch (error) {
        console.error('App: Failed to initialize scheduler:', error);
      }
    };

    if (isActive) {
      initScheduler();
    }

    // Cleanup on unmount
    return () => {
      isActive = false;

      const shutdownScheduler = async () => {
        try {
          console.log('App: Shutting down scheduler...');
          const manager = getSchedulerManager();
          await manager.shutdown();
          console.log('App: Scheduler shutdown complete');
        } catch (error) {
          console.error('App: Failed to shutdown scheduler:', error);
        }
      };

      shutdownScheduler();
    };
  }, []);
}

/**
 * Example App.tsx integration:
 * 
 * ```tsx
 * import React from 'react';
 * import { NavigationContainer } from '@react-navigation/native';
 * import { useSchedulerIntegration } from './features/schedule/integration/AppIntegration';
 * import { MainNavigator } from './navigation/MainNavigator';
 * 
 * export default function App() {
 *   // Initialize scheduler
 *   useSchedulerIntegration();
 * 
 *   return (
 *     <NavigationContainer>
 *       <MainNavigator />
 *     </NavigationContainer>
 *   );
 * }
 * ```
 */
