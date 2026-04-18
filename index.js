import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import notifee, {EventType} from '@notifee/react-native';
import {
  handleNotificationAction,
  storePendingNotificationRoute,
} from './src/services/NotificationService';

/**
 * Notifee background event handler MUST be registered before AppRegistry.
 * Handles notification action button presses when app is backgrounded/killed.
 */
notifee.onBackgroundEvent(async ({type, detail}) => {
  if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
    const route = await handleNotificationAction(detail, {persistRoute: true});
    if (route?.screen) {
      await storePendingNotificationRoute(route);
    }
  }
});

AppRegistry.registerComponent(appName, () => App);
