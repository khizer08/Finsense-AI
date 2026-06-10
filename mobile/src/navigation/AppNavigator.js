import React, { useState, useEffect } from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text, View, ActivityIndicator} from 'react-native';
import {useAuth} from '../services/AuthContext';
import {useCallNavigation} from '../hooks/useCallNavigation';
import {hasCompletedOnboarding, markOnboardingCompleted} from '../services/PermissionService';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import TimelineScreen from '../screens/TimelineScreen';
import RecordScreen from '../screens/RecordScreen';
import SummaryScreen from '../screens/SummaryScreen';
import FinancialPlanScreen from '../screens/FinancialPlanScreen';
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
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await hasCompletedOnboarding();
        setOnboardingCompleted(completed);
      } catch (error) {
        console.warn('[AppNavigator] Onboarding check failed:', error);
        setOnboardingCompleted(false);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, []);

  if (loading || checkingOnboarding) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background}}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false, animation: 'fade'}}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : !onboardingCompleted ? (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{animationEnabled: false}}
            listeners={{
              focus: () => {
                // OnboardingScreen will call its onComplete callback
                // which will trigger markOnboardingCompleted
              },
            }}
            initialParams={{
              onComplete: async () => {
                try {
                  await markOnboardingCompleted();
                  setOnboardingCompleted(true);
                } catch (error) {
                  console.warn('[AppNavigator] Mark onboarding failed:', error);
                }
              },
            }}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Summary"
              component={SummaryScreen}
              options={{animation: 'slide_from_right'}}
            />
            <Stack.Screen
              name="FinancialPlan"
              component={FinancialPlanScreen}
              options={{animation: 'slide_from_right'}}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
