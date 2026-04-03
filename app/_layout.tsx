import { Stack } from 'expo-router';
import React from 'react';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="compra" />
      <Stack.Screen name="venda" />
      <Stack.Screen name="inventario" />
      <Stack.Screen name="fluxo-de-caixa" />
    </Stack>
  );
} 