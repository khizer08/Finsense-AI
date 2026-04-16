import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text, View} from 'react-native';
import {useAuth} from '../services/AuthContext';
import {useCallNavigation} from '../hooks/useCallNavigation';
import AuthScreen from '../screens/AuthScreen';
import TimelineScreen from '../screens/TimelineScreen';
import RecordScreen from '../screens/RecordScreen';
import SummaryScreen from '../screens/SummaryScreen';
import {colors, typography} from '../components/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Tab icon ────────────────────────────────────────────────────────────────
function TabIcon({emoji, label, focused}) {
  return (
    <View style={{alignItems: 'center', gap: 2}}>
      <Text style={{fontSize: 22, opacity: focused ? 1 : 0.45}}>{emoji}</Text>
    </View>
  );
}

// ─── Main tab navigator ──────────────────────────────────────────────────────
function MainTabs() {
  // Wire notification → RecordScreen navigation (foreground events)
  useCallNavigation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {...typography.caption, marginBottom: 4},
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 6,
          paddingTop: 4,
          height: 60,
        },
      }}>
      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{
          tabBarLabel: 'Timeline',
          tabBarIcon: ({focused}) => (
            <TabIcon emoji="📋" label="Timeline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Record"
        component={RecordScreen}
        options={{
          tabBarLabel: 'Record',
          tabBarIcon: ({focused}) => (
            <TabIcon emoji="🎙️" label="Record" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root navigator ──────────────────────────────────────────────────────────
export default function AppNavigator() {
  const {user, loading} = useAuth();

  // Don't render anything while restoring session
  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false, animation: 'fade'}}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Summary"
              component={SummaryScreen}
              options={{animation: 'slide_from_right'}}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
