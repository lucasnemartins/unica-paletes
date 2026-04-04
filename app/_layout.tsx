import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { Stack, useRouter, usePathname } from 'expo-router';
import React, { useEffect } from 'react';

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded) return;
    const inLoginPage = pathname === '/login';
    if (!isSignedIn && !inLoginPage) {
      router.replace('/login');
    } else if (isSignedIn && inLoginPage) {
      router.replace('/');
    }
  }, [isLoaded, isSignedIn, pathname]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="compra" />
      <Stack.Screen name="venda" />
      <Stack.Screen name="inventario" />
      <Stack.Screen name="fluxo-de-caixa" />
      <Stack.Screen name="perfil" />
    </Stack>
  );
}

export default function RootLayout() {
  if (!PUBLISHABLE_KEY) {
    console.error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY não definida');
  }
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <InitialLayout />
    </ClerkProvider>
  );
} 