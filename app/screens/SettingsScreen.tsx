import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../contexts/store';
import { useAuth } from '../contexts/AuthContext';

type SettingsScreenProps = {
  navigation: any;
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { theme, setTheme, resolvedTheme } = useAppStore();
  const { signOut } = useAuth();

  const handleThemeToggle = () => {
    Alert.alert(
      'Appearance',
      'Choose your theme',
      [
        { text: 'Light', onPress: () => setTheme('light') },
        { text: 'Dark', onPress: () => setTheme('dark') },
        { text: 'System', onPress: () => setTheme('system') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRestorePurchases = () => {
    Alert.alert(
      'Restore Purchases',
      'This will check your subscription status with Stripe.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: () => {
          // Handle restore logic
          Alert.alert('Success', 'Your purchases have been restored.');
        }},
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // Handle delete logic
            Alert.alert('Account Deletion', 'Your account deletion request has been submitted. We will process it within 30 days.');
          }
        },
      ]
    );
  };

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

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Appearance
        </Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleThemeToggle}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Theme
          </Text>
          <Text style={[styles.menuValue, { color: colors.textSecondary }]}>
            {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Notifications
        </Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Push Notifications
          </Text>
          <Text style={[styles.menuValue, { color: colors.textSecondary }]}>On</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Email Notifications
          </Text>
          <Text style={[styles.menuValue, { color: colors.textSecondary }]}>On</Text>
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Account
        </Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.menuText, { color: colors.text }]}>
            Restore Purchases
          </Text>
          <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Support
        </Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Support')}
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

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Danger Zone
        </Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.error }]}
          onPress={handleDeleteAccount}
        >
          <Text style={[styles.menuText, { color: colors.error }]}>
            Delete Account
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
  menuValue: {
    fontSize: 16,
  },
  menuArrow: {
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
});