import { Stack } from 'expo-router';
import React from 'react';

export default function InventarioLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
