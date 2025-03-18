import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { verificationService } from '../services/verificationService';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      // Redirect to sign in if user is not authenticated
      router.replace('/auth/sign-in');
    } else if (user && inAuthGroup) {
      // Redirect to home if user is authenticated and in auth group
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function verifyApp() {
      try {
        const verified = await verificationService.verifyOwnership();
        setIsVerified(verified);
      } catch (e) {
        console.warn(e);
        setIsVerified(false);
      }
    }

    if (fontsLoaded) {
      SplashScreen.hideAsync();
      verifyApp();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || isVerified === null) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
      </ThemedView>
    );
  }

  if (!isVerified) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ThemedText type="title" style={{ textAlign: 'center', marginBottom: 10 }}>
          Unauthorized Application
        </ThemedText>
        <ThemedText style={{ textAlign: 'center' }}>
          This appears to be an unauthorized copy of the application. Please use the official version.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootLayoutNav />
        <Stack.Screen
          name="challenge/[id]"
          options={{
            headerShown: false,
          }}
        />
      </ThemeProvider>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </AuthProvider>
  );
}
