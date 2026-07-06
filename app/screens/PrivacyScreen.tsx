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

type PrivacyScreenProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Privacy Policy
      </Text>
      
      <Text style={[styles.date, { color: colors.textSecondary }]}>
        Last Updated: May 2026
      </Text>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          1. Introduction
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          The Republic ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          2. Information We Collect
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          We collect information you provide directly to us, such as:
          {'\n'}- Account information (email, display name)
          {'\n'}- Authentication credentials (handled securely by Supabase)
          {'\n'}- Profile preferences and settings
          {'\n'}- Support requests and messages
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          3. How We Use Your Information
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          We use the information we collect to:
          {'\n'}- Provide and improve our services
          {'\n'}- Authenticate your account
          {'\n'}- Process membership subscriptions
          {'\n'}- Send important notifications
          {'\n'}- Respond to support requests
          {'\n'}- Comply with legal obligations
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          4. Data Storage and Security
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          Your data is stored securely using Supabase (a Firebase alternative). We implement appropriate technical and organizational security measures to protect your personal information. Authentication is handled securely through Supabase Auth.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          5. Third-Party Services
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          We use third-party services to operate The Republic:
          {'\n'}- Supabase for authentication and database
          {'\n'}- Stripe for payment processing
          {'\n'}- Postmark for transactional emails
          {'\n'}
          Each third-party service has its own privacy policy governing how they handle your data.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          6. Information We Do Not Collect
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          The Republic does NOT collect:
          {'\n'}- Third-party website login credentials
          {'\n'}- Credit card information (processed by Stripe)
          {'\n'}- User-generated content or posts
          {'\n'}- Location data
          {'\n'}- Contact list information
          {'\n'}- Device identifiers for advertising
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          7. WebView and Third-Party Websites
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          When you open external websites through our in-app browser (WebView), those websites may collect their own information subject to their privacy policies. We do not track, store, or have access to your activity on third-party websites.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          8. Cookies and Tracking
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          We use minimal cookies for app functionality. Third-party websites opened in the WebView may use their own cookies, which are subject to those websites' policies.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          9. Data Sharing
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          We do NOT sell your personal information. We may share information with:
          {'\n'}- Service providers who assist our operations
          {'\n'}- Legal authorities when required by law
          {'\n'}- Payment processors (Stripe)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          10. Your Rights
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          You have the right to:
          {'\n'}- Access your personal information
          {'\n'}- Correct inaccurate data
          {'\n'}- Request deletion of your data
          {'\n'}- Export your data
          {'\n'}- Withdraw consent
          {'\n'}
          Contact support to exercise these rights.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          11. Data Retention
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          We retain your information as long as your account is active or as needed to provide services. You may request deletion at any time.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          12. Children's Privacy
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          Our service is not intended for children under 13. We do not knowingly collect information from children under 13.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          13. Changes to This Policy
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy in the app.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          14. Contact Us
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          If you have questions about this Privacy Policy, please contact us through the app's support feature or email contact@therepublic.it.com.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.text }]}>
          15. Aggregator Disclaimer
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          The Republic is a directory/aggregator app. We provide links to external third-party websites. We are not responsible for the privacy practices or content of these third-party websites. Please review the privacy policies of each website you visit.
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