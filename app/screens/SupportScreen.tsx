import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components';
import * as supabaseService from '../services/supabase';
import { SUPPORT_CATEGORIES } from '../constants';
import type { SupportTicket } from '../types/supabase';

export const SupportScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [category, setCategory] = useState<'support' | 'bug' | 'feature'>(SUPPORT_CATEGORIES.SUPPORT);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  React.useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    try {
      const data = await supabaseService.fetchSupportTickets(user.id);
      if (data) {
        setTickets(data);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be signed in to submit a support request');
      return;
    }

    setIsLoading(true);
    try {
      await supabaseService.createSupportTicket(user.id, category, subject, message);
      Alert.alert('Success', 'Your support request has been submitted. We will get back to you soon.');
      setSubject('');
      setMessage('');
      loadTickets();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit support request');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case SUPPORT_CATEGORIES.SUPPORT:
        return colors.info;
      case SUPPORT_CATEGORIES.BUG:
        return colors.error;
      case SUPPORT_CATEGORIES.FEATURE:
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return colors.warning;
      case 'pending':
        return colors.info;
      case 'resolved':
      case 'closed':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Category Selection */}
        <View style={styles.categorySection}>
          <Text style={[styles.label, { color: colors.text }]}>What can we help you with?</Text>
          
          <View style={styles.categoryButtons}>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                { 
                  backgroundColor: category === SUPPORT_CATEGORIES.SUPPORT ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setCategory(SUPPORT_CATEGORIES.SUPPORT)}
            >
              <Text 
                style={[
                  styles.categoryButtonText,
                  { color: category === SUPPORT_CATEGORIES.SUPPORT ? colors.white : colors.text },
                ]}
              >
                Support
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.categoryButton,
                { 
                  backgroundColor: category === SUPPORT_CATEGORIES.BUG ? colors.error : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setCategory(SUPPORT_CATEGORIES.BUG)}
            >
              <Text 
                style={[
                  styles.categoryButtonText,
                  { color: category === SUPPORT_CATEGORIES.BUG ? colors.white : colors.text },
                ]}
              >
                Bug Report
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.categoryButton,
                { 
                  backgroundColor: category === SUPPORT_CATEGORIES.FEATURE ? colors.success : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setCategory(SUPPORT_CATEGORIES.FEATURE)}
            >
              <Text 
                style={[
                  styles.categoryButtonText,
                  { color: category === SUPPORT_CATEGORIES.FEATURE ? colors.white : colors.text },
                ]}
              >
                Feature Request
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Subject</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief description of your issue"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Message</Text>
            <TextInput
              style={[
                styles.textArea,
                { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue in detail"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <Button
            title="Submit"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading || !subject.trim() || !message.trim()}
            style={styles.submitButton}
          />
        </View>

        {/* Previous Tickets */}
        {tickets.length > 0 && (
          <View style={styles.ticketsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Previous Requests
            </Text>
            
            {tickets.map((ticket) => (
              <TouchableOpacity
                key={ticket.id}
                style={[styles.ticketCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('SupportThread', { ticketId: ticket.id })}
              >
                <View style={styles.ticketHeader}>
                  <View 
                    style={[
                      styles.ticketCategory, 
                      { backgroundColor: getCategoryColor(ticket.category) },
                    ]}
                  >
                    <Text style={styles.ticketCategoryText}>
                      {ticket.category.toUpperCase()}
                    </Text>
                  </View>
                  
                  <View 
                    style={[
                      styles.ticketStatus, 
                      { backgroundColor: getStatusColor(ticket.status) },
                    ]}
                  >
                    <Text style={styles.ticketStatusText}>
                      {ticket.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <Text style={[styles.ticketSubject, { color: colors.text }]}>
                  {ticket.subject}
                </Text>
                
                <Text style={[styles.ticketDate, { color: colors.textTertiary }]}>
                  {new Date(ticket.created_at).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    height: 150,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 16,
  },
  submitButton: {
    marginTop: 8,
  },
  ticketsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  ticketCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ticketCategory: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  ticketCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ticketStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ticketStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ticketDate: {
    fontSize: 12,
  },
});