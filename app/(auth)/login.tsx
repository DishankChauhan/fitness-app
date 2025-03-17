import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedTextInput } from '../components/ThemedTextInput';
import { ThemedButton } from '../components/ThemedButton';
import * as authService from '@/services/authService';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = () => {
    setError('');
    
    // Email validation
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    // Password validation
    if (!password) {
      setError('Password is required');
      return false;
    }
    
    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    // Sign up specific validations
    if (!isLogin) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      
      if (!displayName.trim()) {
        setError('Display name is required');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      if (isLogin) {
        // Handle login
        const user = await authService.signIn(email, password);
        if (user) {
          router.replace('/(tabs)');
        }
      } else {
        // Handle signup
        const user = await authService.signUp(email, password, displayName);
        if (user) {
          // Show welcome message
          Alert.alert(
            'Account Created',
            `Welcome to Accountability App, ${displayName}!`,
            [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
          );
        }
      }
    } catch (err) {
      const error = err as Error;
      // Handle specific Firebase error codes
      if ('code' in error) {
        const { code } = error as any;
        
        if (code === 'auth/email-already-in-use') {
          setError('This email is already in use. Please try logging in instead.');
        } else if (code === 'auth/invalid-email') {
          setError('The email address is not valid.');
        } else if (code === 'auth/weak-password') {
          setError('The password is too weak. Please use at least 6 characters.');
        } else if (code === 'auth/wrong-password' || code === 'auth/user-not-found') {
          setError('Invalid email or password. Please try again.');
        } else {
          setError(error.message || 'An unknown error occurred');
        }
      } else {
        setError(error.message || 'An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </ThemedText>
          
          {error ? (
            <ThemedView style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </ThemedView>
          ) : null}
          
          <View style={styles.form}>
            <ThemedTextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
            
            <ThemedTextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
            
            {!isLogin && (
              <>
                <ThemedTextInput
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!loading}
                />
                
                <ThemedTextInput
                  placeholder="Display Name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </>
            )}

            {/* Login/Signup button */}
            {loading ? (
              <View style={[styles.loadingButton, styles.button]}>
                <ActivityIndicator size="small" color={colors.background} />
              </View>
            ) : (
              <ThemedButton
                title={isLogin ? 'Login' : 'Sign Up'}
                onPress={handleSubmit}
                style={styles.button}
              />
            )}
          </View>

          <ThemedButton
            title={isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
            onPress={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            type="secondary"
          />
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  button: {
    marginTop: 8,
  },
  loadingButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2f95dc',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
}); 