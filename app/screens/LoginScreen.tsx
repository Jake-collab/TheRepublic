import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Button, Input } from '../components';
import { APP_NAME } from '../constants';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type LoginScreenProps = { navigation: NativeStackNavigationProp<any>; };

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter email and password'); return; }
    setError(''); setLoading(true);
    try { await new Promise(r => setTimeout(r, 1000)); } 
    catch (e: any) { setError(e.message || 'Login failed'); } 
    finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>Your curated directory</Text>
        <View style={styles.form}>
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="Enter password" secureTextEntry />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Sign In" onPress={handleLogin} loading={loading} />
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.link}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#000000' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 32, fontWeight: '700', color: '#FFF', textAlign: 'center', letterSpacing: 2 },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  form: { width: '100%' },
  error: { fontSize: 14, color: '#FF6B6B', textAlign: 'center', marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontSize: 14, color: '#888' },
  link: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
