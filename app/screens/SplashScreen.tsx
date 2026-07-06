import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { APP_NAME } from '../constants';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(onFinish, 500);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>{APP_NAME}</Text>
      {isLoading && <Text style={styles.loading}>Loading...</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  logo: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  loading: {
    fontSize: 16,
    color: '#888888',
    marginTop: 20,
  },
});
