import { useUser } from '@clerk/clerk-react';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import QRCode from 'react-qr-code';

export default function ConfigurarMFAScreen() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [totpUri, setTotpUri] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [alreadySetup, setAlreadySetup] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    setupTotp();
  }, [isLoaded, user]);

  const setupTotp = async () => {
    try {
      const totp = await (user as any).createTOTP();
      setTotpUri(totp.uri ?? '');
      setSecret(totp.secret ?? '');
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || err?.message || '';
      if (msg.toLowerCase().includes('already')) {
        setAlreadySetup(true);
      } else {
        setError('Erro ao gerar QR code: ' + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length < 6) return;
    setVerifying(true);
    setError('');
    try {
      await (user as any).verifyTOTP({ code });
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Código inválido.';
      setError(msg);
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#b8934b" />
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.center}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Autenticador configurado!</Text>
        <Text style={styles.successText}>
          Nos próximos logins, usa o código do Google Authenticator ou Authy.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>VOLTAR AO MENU</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (alreadySetup) {
    return (
      <View style={styles.center}>
        <Text style={styles.successIcon}>🔐</Text>
        <Text style={styles.successTitle}>Autenticador já configurado</Text>
        <Text style={styles.successText}>
          O teu autenticador já está ativo. Usa o app para gerar códigos no login.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>VOLTAR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Configurar Autenticador</Text>
      <Text style={styles.subtitle}>
        Instala o <Text style={styles.bold}>Google Authenticator</Text> ou{' '}
        <Text style={styles.bold}>Authy</Text> no teu telemóvel e escaneia o código abaixo.
      </Text>

      {totpUri ? (
        <View style={styles.qrContainer}>
          <QRCode value={totpUri} size={200} />
        </View>
      ) : null}

      {secret ? (
        <View style={styles.secretBox}>
          <Text style={styles.secretLabel}>Ou insere manualmente:</Text>
          <Text style={styles.secretCode}>{secret}</Text>
        </View>
      ) : null}

      <Text style={styles.step}>
        Após escanear, insere o código de 6 dígitos gerado pelo app:
      </Text>

      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="000000"
        placeholderTextColor="#999"
        keyboardType="numeric"
        maxLength={6}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, verifying && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={verifying}
      >
        {verifying ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>CONFIRMAR</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/')}>
        <Text style={styles.skipText}>Ignorar por agora →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    padding: 24,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#b8934b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  backText: { color: 'white', fontWeight: 'bold' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  bold: { fontWeight: 'bold', color: '#333' },
  qrContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  secretBox: {
    backgroundColor: '#fff8e7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0d070',
    width: '100%',
  },
  secretLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  secretCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 2,
  },
  step: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 20,
    color: '#333',
    backgroundColor: 'white',
    marginBottom: 16,
    width: '100%',
    maxWidth: 200,
    textAlign: 'center',
    letterSpacing: 6,
  },
  button: {
    backgroundColor: '#b8934b',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  error: { color: '#e53e3e', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  skipText: { color: '#999', textAlign: 'center', marginTop: 16, fontSize: 13 },
  successIcon: { fontSize: 60, marginBottom: 16 },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
});
