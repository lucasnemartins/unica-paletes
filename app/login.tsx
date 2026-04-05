import { useSignIn } from '@clerk/clerk-react';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'totp' | 'email_code'>('credentials');
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<'totp' | 'email_code'>('totp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!isLoaded || !email || !password) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else if (result.status === 'needs_second_factor') {
        const factors = result.supportedSecondFactors ?? [];
        const hasTotp = factors.some((f: any) => f.strategy === 'totp');
        const hasEmailCode = factors.some((f: any) => f.strategy === 'email_code');
        if (hasTotp) {
          setSecondFactorStrategy('totp');
          setStep('totp');
        } else if (hasEmailCode) {
          setSecondFactorStrategy('email_code');
          await signIn.prepareSecondFactor({ strategy: 'email_code' });
          setStep('email_code');
        } else {
          setError('Método de verificação não suportado. Contacta o administrador.');
        }
      } else {
        setError(`Erro inesperado: ${result.status}`);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Email ou senha inválidos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTotp = async () => {
    if (!isLoaded || !totpCode) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: secondFactorStrategy,
        code: totpCode,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setError(`Erro inesperado: ${result.status}`);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Código inválido.';
      setError(msg);
      setTotpCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('./assets/fundo_com_logo.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.card}>
          {step === 'credentials' ? (
            <>
              <Text style={styles.title}>Entrar</Text>

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#999"
                secureTextEntry
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>ENTRAR</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Verificação</Text>
              <Text style={styles.subtitle}>
                {secondFactorStrategy === 'email_code'
                  ? 'Enviámos um código para o teu email. Insere o código abaixo.'
                  : 'Abre o teu autenticador e insere o código de 6 dígitos.'}
              </Text>

              <Text style={styles.label}>Código</Text>
              <TextInput
                style={styles.input}
                value={totpCode}
                onChangeText={setTotpCode}
                placeholder="000000"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={6}
                autoFocus
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleTotp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>VERIFICAR</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStep('credentials'); setError(''); }}>
                <Text style={styles.back}>← Voltar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, paddingTop: 120 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#b8934b',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  error: { color: '#e53e3e', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  back: { color: '#b8934b', textAlign: 'center', marginTop: 16, fontSize: 14 },
});
