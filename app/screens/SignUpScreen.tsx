import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Checkbox } from '../components';
import { APP_NAME, DEEPLINK_SCHEME } from '../constants';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type SignUpScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { signUp } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!acceptTerms || !acceptPrivacy) {
      setError('Please accept Terms and Privacy Policy');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signUp(email, password);
      // Note: Terms acceptance is handled via profile trigger after email confirmation
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const openTerms = () => {
    // Navigate to Terms screen or open external link
    navigation.navigate('Terms');
  };

  const openPrivacy = () => {
    // Navigate to Privacy screen or open external link
    navigation.navigate('Privacy');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.text }]}>{APP_NAME}</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Create your account
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
          />
          
          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
          />

          <View style={styles.agreements}>
            <Checkbox
              checked={acceptTerms}
              onChange={setAcceptTerms}
              label={
                <Text style={{ color: colors.text }}>
                  I agree to the{' '}
                  <Text 
                    style={{ color: colors.primary }}
                    onPress={openTerms}
                  >
                    Terms of Agreement
                  </Text>
                </Text>
              }
            />
            <Checkbox
              checked={acceptPrivacy}
              onChange={setAcceptPrivacy}
              label={
                <Text style={{ color: colors.text }}>
                  I agree to the{' '}
                  <Text 
                    style={{ color: colors.primary }}
                    onPress={openPrivacy}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              }
            />
          </View>

          {error ? (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          ) : null}

          <Button
            title="Create Account"
            onPress={handleSignUp}
            loading={loading}
            disabled={loading}
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.link, { color: colors.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  agreements: {
    marginTop: 8,
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
  },
  error: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
});