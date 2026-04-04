import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const inLoginPage = segments[0] === 'login';
    if (!isSignedIn && !inLoginPage) {
      router.replace('/login');
    } else if (isSignedIn && inLoginPage) {
      router.replace('/');
    }
  }, [isLoaded, isSignedIn, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="compra" />
      <Stack.Screen name="venda" />
      <Stack.Screen name="inventario" />
      <Stack.Screen name="fluxo-de-caixa" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <InitialLayout />
    </ClerkProvider>
  );
} 