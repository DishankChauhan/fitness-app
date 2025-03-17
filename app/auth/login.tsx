import React, { useState } from 'react';
import { StyleSheet, Image, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/ui/TextInput';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/app/hooks/useColorScheme';
import { useAuth } from '@/app/hooks/useAuth';
import { ErrorView } from '@/components/ErrorView';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ThemedView style={styles.content}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
        />
        
        <ThemedText type="title" style={styles.title}>
          Welcome Back
        </ThemedText>

        {error && (
          <ErrorView
            error={error}
            onRetry={handleEmailLogin}
            showRetry={false}
          />
        )}

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          style={styles.input}
        />

        <Button
          onPress={handleEmailLogin}
          loading={loading}
          disabled={loading || !email || !password}
          style={styles.button}
        >
          Sign In
        </Button>

        <ThemedText style={styles.orText}>or continue with</ThemedText>

        <ThemedView style={styles.socialButtons}>
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#DB4437' }]}
            disabled={loading}
          >
            <IconSymbol name="person.circle" size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#4267B2' }]}
            disabled={loading}
          >
            <IconSymbol name="person.2" size={24} color="white" />
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.footer}>
          <ThemedText>Don't have an account? </ThemedText>
          <TouchableOpacity onPress={() => router.push({ pathname: "/(auth)/signup" } as any)}>
            <ThemedText style={{ color: colors.tint }}>Sign Up</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    marginBottom: 16,
  },
  button: {
    width: '100%',
    marginTop: 8,
  },
  orText: {
    marginVertical: 16,
    textAlign: 'center',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
  },
  error: {
    marginBottom: 16,
    width: '100%',
  },
}); 