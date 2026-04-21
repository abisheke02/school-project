import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import useAuthStore from '../store/authStore';
import {
  initOfflineDB,
  cacheExercisesForOffline,
  syncPendingSessions,
} from '../services/offlineCache';

// Auth screens
import PhoneLoginScreen from '../screens/auth/PhoneLoginScreen';
import OTPVerifyScreen from '../screens/auth/OTPVerifyScreen';

// Onboarding screens
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import SchoolCodeScreen from '../screens/onboarding/SchoolCodeScreen';

// Student dashboard screens
import StudentDashboard from '../screens/dashboard/StudentDashboard';

// Screening screens
import ScreeningIntroScreen from '../screens/screening/ScreeningIntroScreen';
import ScreeningQuizScreen from '../screens/screening/ScreeningQuizScreen';
import ScreeningResultScreen from '../screens/screening/ScreeningResultScreen';

// Practice screens (Phase 3)
import PracticeHomeScreen from '../screens/practice/PracticeHomeScreen';
import ExerciseSessionScreen from '../screens/practice/ExerciseSessionScreen';

// Test screens (Phase 4)
import TestLevelScreen from '../screens/tests/TestLevelScreen';
import TestQuizScreen from '../screens/tests/TestQuizScreen';
import TestResultScreen from '../screens/tests/TestResultScreen';

// Recommendations screen (Phase 4)
import RecommendationsScreen from '../screens/recommendations/RecommendationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICON = {
  Home: '🏠',
  Practice: '📚',
  Tests: '📝',
  Tips: '💡',
};

const StudentTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#1976D2',
      tabBarInactiveTintColor: '#90A4AE',
      tabBarStyle: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E3F2FD' },
      tabBarLabel: ({ color }) => (
        <Text style={{ color, fontSize: 11, fontWeight: '600', marginBottom: 2 }}>
          {route.name}
        </Text>
      ),
      tabBarIcon: ({ color }) => (
        <Text style={{ fontSize: 20 }}>{TAB_ICON[route.name]}</Text>
      ),
    })}
  >
    <Tab.Screen name="Home" component={StudentDashboard} />
    <Tab.Screen name="Practice" component={PracticeHomeScreen} />
    <Tab.Screen name="Tests" component={TestLevelScreen} />
    <Tab.Screen name="Tips" component={RecommendationsScreen} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { token, user, isLoading, isNewUser } = useAuthStore();
  const wasConnected = useRef(null);

  // Init SQLite DB on first mount, then cache exercises + sync once online
  useEffect(() => {
    initOfflineDB().then(() => {
      // Attempt to cache exercises and flush queue immediately if online
      cacheExercisesForOffline().catch(() => {});
      syncPendingSessions().catch(() => {});
    }).catch(() => {});

    // Subscribe to network changes — sync queue whenever connectivity returns
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;
      if (isConnected && wasConnected.current === false) {
        // Just came back online
        syncPendingSessions().catch(() => {});
        cacheExercisesForOffline().catch(() => {});
      }
      wasConnected.current = isConnected;
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  const needsOnboarding = token && user && (!user.name || !user.school_id);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <>
            <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
            <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />
          </>
        ) : needsOnboarding || isNewUser ? (
          <>
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            <Stack.Screen name="SchoolCode" component={SchoolCodeScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={StudentTabs} />
            {/* Screening */}
            <Stack.Screen name="ScreeningIntro" component={ScreeningIntroScreen} />
            <Stack.Screen name="ScreeningQuiz" component={ScreeningQuizScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="ScreeningResult" component={ScreeningResultScreen} options={{ gestureEnabled: false }} />
            {/* Practice (Phase 3) */}
            <Stack.Screen name="PracticeHome" component={PracticeHomeScreen} />
            <Stack.Screen
              name="ExerciseSession"
              component={ExerciseSessionScreen}
              options={{ gestureEnabled: false }}
            />
            {/* Tests (Phase 4) */}
            <Stack.Screen name="TestLevel" component={TestLevelScreen} />
            <Stack.Screen
              name="TestQuiz"
              component={TestQuizScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="TestResult" component={TestResultScreen} />
            {/* Recommendations (Phase 4) */}
            <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
