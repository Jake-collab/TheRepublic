import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  error?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  error,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.checkbox,
          {
            borderColor: error ? colors.error : colors.border,
            backgroundColor: checked ? colors.primary : 'transparent',
          },
        ]}
        onPress={() => onChange(!checked)}
        activeOpacity={0.7}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      {label && (
        <TouchableOpacity onPress={() => onChange(!checked)}>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        </TouchableOpacity>
      )}
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    flex: 1,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 36,
  },
});