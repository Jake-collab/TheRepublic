import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components';
import { CHECKOUT_SUCCESS, CHECKOUT_CANCEL } from '../constants';

const STRIPE_PRICE_ID = 'price_1TWzxMC4N3vruUgCwedpaajI';
const STRIPE_SUCCESS_URL = 'therepublic://checkout-success';
const STRIPE_CANCEL_URL = 'therepublic://checkout-cancel';
const STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/test'; // Replace with actual Stripe Checkout

export const MembershipScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const isPaid = user?.membership_active === true;

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      // In production, this would call your Supabase Edge Function
      // which creates a Stripe Checkout session
      // For now, simulate the flow
      
      // Create checkout session via Supabase Edge Function
      const response = await fetch('https://ucrxecloeewhyocnjghu.supabase.co/functions/v1/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Use the authenticated user's token
          'Authorization': `Bearer ${user?.id}`,
        },
        body: JSON.stringify({
          price_id: STRIPE_PRICE_ID,
          success_url: STRIPE_SUCCESS_URL,
          cancel_url: STRIPE_CANCEL_URL,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        // Open Stripe Checkout
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', 'Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = () => {
    Alert.alert(
      'Manage Subscription',
      'This will open the Stripe Customer Portal to manage your subscription.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Manage', 
          onPress: async () => {
            try {
              // Call customer portal Edge Function
              const response = await fetch('https://ucrxecloeewhyocnjghu.supabase.co/functions/v1/create-customer-portal-session', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  return_url: 'therepublic://settings',
                }),
              });

              const { url } = await response.json();
              
              if (url) {
                await Linking.openURL(url);
              }
            } catch (error) {
              console.error('Portal error:', error);
              Alert.alert('Error', 'Failed to open customer portal.');
            }
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isPaid ? 'Pro Member' : 'Upgrade to Pro'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isPaid 
            ? 'Thank you for being a Pro member!'
            : 'Unlock all websites and premium features'}
        </Text>
      </View>

      {/* Current Status (for paid members) */}
      {isPaid && (
        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.success }]}>
          <Text style={[styles.statusTitle, { color: colors.success }]}>
            ✓ Active Membership
          </Text>
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            You have full access to all websites and features.
          </Text>
          
          <TouchableOpacity 
            style={[styles.manageButton, { borderColor: colors.primary }]}
            onPress={handleManageSubscription}
          >
            <Text style={[styles.manageButtonText, { color: colors.primary }]}>
              Manage Subscription
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Benefits (for free users) */}
      {!isPaid && (
        <>
          <View style={styles.benefits}>
            <View style={[styles.benefitItem, { borderColor: colors.border }]}>
              <Text style={[styles.benefitIcon, { color: colors.success }]}>✓</Text>
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>
                  Access All Websites
                </Text>
                <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                  Unlock every website in the directory
                </Text>
              </View>
            </View>
            
            <View style={[styles.benefitItem, { borderColor: colors.border }]}>
              <Text style={[styles.benefitIcon, { color: colors.success }]}>✓</Text>
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>
                  Custom Colors
                </Text>
                <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                  Customize category pill colors
                </Text>
              </View>
            </View>
            
            <View style={[styles.benefitItem, { borderColor: colors.border }]}>
              <Text style={[styles.benefitIcon, { color: colors.success }]}>✓</Text>
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>
                  Reorder Categories
                </Text>
                <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                  Customize your category display
                </Text>
              </View>
            </View>
          </View>

          {/* Pricing */}
          <View style={[styles.pricingCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
              Pro Membership
            </Text>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.text }]}>$9.99</Text>
              <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
                /month
              </Text>
            </View>
            <Text style={[styles.priceDesc, { color: colors.textTertiary }]}>
              Cancel anytime. No commitments.
            </Text>
          </View>

          {/* Subscribe Button */}
          <Button
            title="Subscribe Now"
            onPress={handleSubscribe}
            loading={isLoading}
            disabled={isLoading}
            style={styles.subscribeButton}
          />

          <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
            By subscribing, you agree to our Terms of Service and Privacy Policy.
            {'\n'}
            Payments are processed by Stripe.
          </Text>
        </>
      )}

      {/* FAQ */}
      {!isPaid && (
        <View style={styles.faq}>
          <Text style={[styles.faqTitle, { color: colors.text }]}>
            Frequently Asked Questions
          </Text>
          
          <View style={[styles.faqItem, { borderColor: colors.border }]}>
            <Text style={[styles.faqQuestion, { color: colors.text }]}>
              Can I cancel anytime?
            </Text>
            <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </Text>
          </View>
          
          <View style={[styles.faqItem, { borderColor: colors.border }]}>
            <Text style={[styles.faqQuestion, { color: colors.text }]}>
              How do I get billed?
            </Text>
            <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
              You are billed monthly through Stripe. Your payment information is securely processed by Stripe, not stored on our servers.
            </Text>
          </View>
          
          <View style={[styles.faqItem, { borderColor: colors.border }]}>
            <Text style={[styles.faqQuestion, { color: colors.text }]}>
              Is there a free trial?
            </Text>
            <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
              We offer a limited set of websites for free. Try Pro risk-free with our 14-day money-back guarantee.
            </Text>
          </View>
        </View>
      )}
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 32,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 16,
  },
  manageButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  benefits: {
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 14,
  },
  pricingCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 48,
    fontWeight: '700',
  },
  pricePeriod: {
    fontSize: 18,
    marginLeft: 4,
  },
  priceDesc: {
    fontSize: 12,
  },
  subscribeButton: {
    marginBottom: 16,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  faq: {
    marginTop: 32,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  faqItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
});