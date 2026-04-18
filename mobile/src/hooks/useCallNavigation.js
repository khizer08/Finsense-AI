/**
 * useCallNavigation
 * Handles Notifee foreground/background navigation targets.
 */
import {useEffect} from 'react';
import {useNavigation} from '@react-navigation/native';
import notifee, {EventType} from '@notifee/react-native';
import {
  consumePendingNotificationRoute,
  handleNotificationAction,
} from '../services/NotificationService';

export function useCallNavigation() {
  const navigation = useNavigation();

  useEffect(() => {
    consumePendingNotificationRoute().then(route => {
      if (route?.screen) {
        navigation.navigate(route.screen, route.params);
      }
    });

    const unsubscribe = notifee.onForegroundEvent(async ({type, detail}) => {
      if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) {
        return;
      }

      const route = await handleNotificationAction(detail);
      if (route?.screen) {
        navigation.navigate(route.screen, route.params);
      }
    });

    return unsubscribe;
  }, [navigation]);
}
