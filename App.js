import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './src/services/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {setupNotifications} from './src/services/NotificationService';
import {startCallDetection} from './src/services/CallDetectionService';
import {requestNotificationPermission} from './src/services/PermissionService';

export default function App() {
  useEffect(() => {
    // Setup notification channels (idempotent — safe to call every launch)
    setupNotifications().catch(error => {
      console.warn('[App] Notification setup failed:', error.message);
    });
    requestNotificationPermission().catch(error => {
      console.warn('[App] Notification permission request failed:', error.message);
    });

    // Start listening for phone call state changes (Android only)
    const stopCallDetection = startCallDetection();

    return () => {
      if (stopCallDetection) stopCallDetection();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
