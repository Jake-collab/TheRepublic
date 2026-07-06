import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useAppStore } from '../contexts/store';
import {
  SplashScreen,
  HomeScreen,
  WebViewScreen,
  ProfileScreen,
  SettingsScreen,
  MembershipScreen,
  SupportScreen,
  NotificationsScreen,
} from '../screens';
import type { Website } from '../types/supabase';

export type RootStackParamList = {
  Main: undefined;
  WebView: { website: Website };
  Membership: undefined;
  Settings: undefined;
  Profile: undefined;
  Support: undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const HomeStack = () => {
  const { colors } = useAppStore();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="Main"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WebView"
        component={WebViewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Membership"
        component={MembershipScreen}
        options={{ title: 'Membership' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  const { colors } = useAppStore();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="Membership"
        component={MembershipScreen}
        options={{ title: 'Membership' }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ title: 'Support' }}
      />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  const { colors } = useAppStore();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

// Demo version - shows home directly without login
export const AppNavigator: React.FC = () => {
  return <MainTabs />;
};
