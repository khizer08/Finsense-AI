import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import notifee, {EventType} from '@notifee/react-native';

/**
 * Notifee background event handler MUST be registered before AppRegistry.
 * Handles notification action button presses when app is backgrounded/killed.
 */
notifee.onBackgroundEvent(async ({type, detail}) => {
  if (type === EventType.ACTION_PRESS) {
    const actionId = detail.pressAction?.id;
    if (actionId === 'ignore') {
      await notifee.cancelNotification(detail.notification?.id);
    }
    // 'record' action uses launchActivity:'default' which brings the app
    // to front automatically. Navigation is handled in useCallNavigation hook.
  }
});

AppRegistry.registerComponent(appName, () => App);
