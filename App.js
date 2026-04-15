import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './src/services/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {setupNotifications} from './src/services/NotificationService';
import {startCallDetection} from './src/services/CallDetectionService';

export default function App() {
  useEffect(() => {
    // Setup notification channels (idempotent — safe to call every launch)
    setupNotifications();

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
