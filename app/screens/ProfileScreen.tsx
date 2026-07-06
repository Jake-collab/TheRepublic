import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../contexts/store';
import * as supabaseService from '../services/supabase';

type ProfileScreenProps = {
  navigation: any;
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { colors, spacing } = useTheme();
  const { user, signOut } = useAuth();
  const { categoryPreferences, setCategoryPreferences, theme, setTheme } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        },
      ]
    );
  };

  const handleManageSubscription = () => {
    navigation.navigate('Membership');
  };

  const handleSupport = () => {
    navigation.navigate('Support');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleColorCustomization = () => {
    if (user?.membership_active) {
      navigation.navigate('ColorCustomization');
    } else {
      Alert.alert(
        'Upgrade Required',
        'Color customization is available for Pro members. Upgrade to access this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade', 
            onPress: () => navigation.navigate('Membership')
          },
        ]
      );
    }
  };

  const handleReorderCategories = () => {
    if (user?.membership_active) {
      navigation.navigate('ReorderCategories');
    } else {
      Alert.alert(
        'Upgrade Required',
        'Reordering categories is available for Pro members. Upgrade to access this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade', 
            onPress: () => navigation.navigate('Membership')
          },
        ]
      );
    }
  };

  const handleResetPreferences = () => {
    Alert.alert(
      'Reset Preferences',
      'This will reset all your category preferences to defaults. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Reset preferences logic here
              Alert.alert('Success', 'Preferences have been reset to defaults.');
            } catch (error) {
              console.error('Error resetting preferences:', error);
            }
          }
        },
      ]
    );
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
      default: return 'System';
    }
  };

  const toggleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: colors.surface }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.white }]}>
            {user?.display_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </Text>
        </View>
        
        <Text style={[styles.displayName, { color: colors.text }]}>
          {user?.display_name || 'User'}
        </Text>
        
        <Text style={[styles.email, { color: colors.textSecondary }]}>
          {user?.email}
        </Text>
        
        {/* Membership Status */}
        <View style={styles.membershipBadge}>
          <Text style={[
            styles.membershipText, 
            { 
              color: user?.membership_active ? colors.success : colors.textSecondary,
              borderColor: user?.membership_active ? colors.success : colors.border,
            }
          ]}>
            {user?.membership_active ? 'Pro Member' : 'Free'}
          </Text>
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Preferences
        </Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleColorCustomization}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Customize Colors
          </Text>
          <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleReorderCategories}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Reorder Categories
          </Text>
          <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={toggleTheme}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Appearance
          </Text>
          <Text style={[styles.menuValue, { color: colors.textSecondary }]}>
            {getThemeLabel()}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleResetPreferences}
        >
          <Text style={[styles.menuText, { color: colors.error }]}>
            Reset to Default
          </Text>
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Account
        </Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleManageSubscription}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Membership
          </Text>
          <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleSettings}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Settings
          </Text>
          <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleSupport}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Contact Support
          </Text>
          <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Legal Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Legal
        </Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Terms')}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Terms of Agreement
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Privacy')}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity 
        style={[styles.signOutButton, { backgroundColor: colors.surface }]}
        onPress={handleLogout}
      >
        <Text style={[styles.signOutText, { color: colors.error }]}>
          Sign Out
        </Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={[styles.version, { color: colors.textTertiary }]}>
        The Republic v1.0.0
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    marginBottom: 12,
  },
  membershipBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
  },
  membershipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  menuText: {
    fontSize: 16,
  },
  menuArrow: {
    fontSize: 16,
  },
  menuValue: {
    fontSize: 16,
  },
  signOutButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 48,
  },
});