import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useAppStore } from '../contexts/store';
import { useAuth } from '../contexts/AuthContext';
import {
  SplashScreen,
  LoginScreen,
  SignUpScreen,
  TermsScreen,
  PrivacyScreen,
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
  Login: undefined;
  SignUp: undefined;
  Terms: undefined;
  Privacy: undefined;
  WebView: { website: Website };
  Membership: undefined;
  Settings: undefined;
  Profile: undefined;
  Support: undefined;
  Notifications: undefined;
  SupportThread: { ticketId: string };
  ColorCustomization: undefined;
  ReorderCategories: undefined;
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
        headerTitleStyle: { fontWeight: '600' },
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
        name="Terms"
        component={TermsScreen}
        options={{ title: 'Terms of Agreement' }}
      />
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ title: 'Privacy Policy' }}
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
        headerTitleStyle: { fontWeight: '600' },
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
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{ title: 'Terms of Agreement' }}
      />
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ title: 'Privacy Policy' }}
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

const AuthStackNavigator = () => {
  const { colors } = useAppStore();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen 
        name="Terms" 
        component={TermsScreen}
        options={{
          headerShown: true,
          title: 'Terms of Agreement',
        }}
      />
      <Stack.Screen 
        name="Privacy" 
        component={PrivacyScreen}
        options={{
          headerShown: true,
          title: 'Privacy Policy',
        }}
      />
    </Stack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { resolvedTheme } = useAppStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Give time for auth to initialize
    const timer = setTimeout(() => {
      setInitializing(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSplashFinish = () => {
    setInitializing(false);
  };

  // Show splash while initializing
  if (initializing || isLoading) {
    return (
      <View style={{ flex: 1 }}>
        <SplashScreen onFinish={handleSplashFinish} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
};