import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native-stack';

type TermsScreenProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

export const TermsScreen: React.FC<TermsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Terms of Agreement
      </Text>
      
      <Text style={[styles.date, { color: colors.textSecondary }]}>
        Last Updated: May 2026
      </Text>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          1. Acceptance of Terms
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          By accessing and using The Republic, you accept and agree to be bound by the terms and provisions of this agreement.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          2. The Republic is a Directory/Aggregator
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          The Republic is a curated directory that provides access to external third-party websites. We do not host, create, or control the content on these external websites. Each third-party website has its own terms of service and privacy policies that govern your use of those sites.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          3. Third-Party Content and Websites
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          Our app links to external websites operated by third parties. We do not endorse, guarantee, or assume responsibility for any third-party content, products, or services. Your use of third-party websites is subject to those websites' own terms and privacy policies.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          4. No Social Network or User Posting
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          The Republic is not a social network. We do not host user-generated content, comments, posts, or messages. The app provides a curated directory of external website links organized by category.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          5. Membership and Subscriptions
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          The Republic offers free access to a limited set of websites. Paid membership provides access to all listed websites and additional features. Membership subscriptions are processed through Stripe. By purchasing a membership, you agree to Stripe's terms of service.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          6. User Eligibility
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          You must be at least 18 years old to create an account and use The Republic. By creating an account, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into this agreement.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          7. Account Creation and Security
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          You agree to provide accurate and complete information when creating an account and to keep your credentials secure. You are responsible for all activities that occur under your account.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          8. Acceptable Use
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          You agree not to use the app for any unlawful purpose or in any manner that could damage, disable, overburden, or impair the app. You agree not to attempt to gain unauthorized access to any part of the app.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          9. Intellectual Property
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          The Republic name, logo, and all related content are the intellectual property of The Republic. You may not copy, modify, distribute, or use our intellectual property without prior written consent.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          10. Disclaimers
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          The Republic is provided "as is" without warranties of any kind. We do not guarantee the accuracy, completeness, or reliability of any content or links. Your use of third-party websites is at your own risk.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          11. Limitation of Liability
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          The Republic shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the app or third-party websites.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          12. Contact Support
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          If you have questions or need support, please contact us through the app's support feature or email contact@therepublic.it.com.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          13. Account Deletion
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          You may request deletion of your account at any time by contacting support or using the account deletion feature in Settings. We will process your request within a reasonable timeframe.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          14. Changes to Terms
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          We may modify these terms at any time. Your continued use of the app after modifications constitutes acceptance of the updated terms.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          15. Governing Law
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          These terms shall be governed by and construed in accordance with applicable law.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
});