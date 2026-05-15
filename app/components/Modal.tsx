import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from './Button';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  primaryAction?: {
    label: string;
    onPress: () => void;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  message,
  primaryAction,
  secondaryAction,
}) => {
  const { colors } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {message}
              </Text>
              
              <View style={styles.actions}>
                {primaryAction && (
                  <Button
                    title={primaryAction.label}
                    onPress={primaryAction.onPress}
                    variant="primary"
                    style={styles.primaryButton}
                  />
                )}
                {secondaryAction && (
                  <Button
                    title={secondaryAction.label}
                    onPress={secondaryAction.onPress}
                    variant="ghost"
                    style={styles.secondaryButton}
                  />
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onMaybeLater: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onClose,
  onUpgrade,
  onMaybeLater,
}) => {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Upgrade to Pro"
      message="Upgrade to Pro for access to all websites and customization features."
      primaryAction={{
        label: 'Upgrade to Pro',
        onPress: onUpgrade,
      }}
      secondaryAction={{
        label: 'Maybe later',
        onPress: onMaybeLater,
      }}
    />
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
  },
});