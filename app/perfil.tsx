import { UserProfile } from '@clerk/clerk-react';
import { useRouter } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function PerfilScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>
      <UserProfile routing="hash" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  backButton: {
    backgroundColor: '#b8934b',
    paddingVertical: 10,
    paddingHorizontal: 20,
    margin: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  backText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});
