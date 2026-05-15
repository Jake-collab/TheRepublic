import React from 'react';
import {
  TouchableOpacity,
  Text,
  Image,
  View,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface PillTabProps {
  name: string;
  color?: string;
  isSelected: boolean;
  onPress: () => void;
}

export const PillTab: React.FC<PillTabProps> = ({
  name,
  color,
  isSelected,
  onPress,
}) => {
  const { colors } = useTheme();

  const backgroundColor = isSelected
    ? color || colors.primary
    : colors.surface;

  const textColor = isSelected
    ? colors.white
    : colors.text;

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        { backgroundColor },
        isSelected && { opacity: 1 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.text,
          { color: textColor },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    opacity: 0.7,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 120,
  },
});