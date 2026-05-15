import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { Website } from '../types/supabase';

interface WebsiteCardProps {
  website: Website;
  isLocked: boolean;
  onPress: () => void;
}

export const WebsiteCard: React.FC<WebsiteCardProps> = ({
  website,
  isLocked,
  onPress,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {website.icon_url ? (
            <View style={[styles.icon, { backgroundColor: colors.surface }]}>
              <Text style={[styles.iconText, { color: colors.text }]}>
                {website.name.charAt(0)}
              </Text>
            </View>
          ) : (
            <View style={[styles.icon, { backgroundColor: colors.surface }]}>
              <Text style={[styles.iconText, { color: colors.text }]}>
                {website.name.charAt(0)}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {website.name}
          </Text>
          {website.description && (
            <Text
              style={[styles.description, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {website.description}
            </Text>
          )}
        </View>
        
        {isLocked && (
          <View style={styles.lockIcon}>
            <Text style={{ color: colors.warning }}>🔒</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  lockIcon: {
    marginLeft: 8,
  },
});