/**
 * useCallNavigation
 * Listens for foreground Notifee events and navigates to RecordScreen
 * when the user taps the "Record Summary" action button.
 *
 * Wire this into a component that has navigation context — e.g. AppNavigator.
 */
import {useEffect} from 'react';
import {useNavigation} from '@react-navigation/native';
import notifee, {EventType} from '@notifee/react-native';

export function useCallNavigation() {
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'record') {
        // Navigate to the Record tab inside MainTabs
        navigation.navigate('Main', {screen: 'Record'});
      }
    });
    return unsubscribe;
  }, [navigation]);
}
