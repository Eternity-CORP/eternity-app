import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { requestNotificationPermissions } from './src/services/notificationService';
import { getJobRunner } from './src/features/schedule/JobRunner';
import './src/i18n/config'; // Initialize i18n

export default function App() {
  // Request notification permissions and start JobRunner on app startup
  useEffect(() => {
    const setupApp = async () => {
      try {
        // Request notification permissions
        const granted = await requestNotificationPermissions();
        if (granted) {
          console.log('✅ Notification permissions granted');
        } else {
          console.log('❌ Notification permissions denied');
        }

        // Start JobRunner for scheduled payments
        const jobRunner = getJobRunner();
        jobRunner.start();
        console.log('✅ JobRunner started');
      } catch (error) {
        console.error('Failed to setup app:', error);
      }
    };

    setupApp();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}
