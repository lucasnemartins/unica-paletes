import Constants from 'expo-constants';
import { Platform } from 'react-native';

const trimSlash = (s: string) => s.replace(/\/$/, '');

const envUrl = process.env.EXPO_PUBLIC_API_URL;
const extraUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;

/**
 * Base URL da API.
 * - Web em produção (build estático): string vazia → mesma origem; o Nginx faz proxy de /api e /uploads.
 * - Web em dev: use EXPO_PUBLIC_API_URL (ex.: http://localhost:3001) ou o padrão localhost:3001.
 * - Android/iOS: EXPO_PUBLIC_API_URL ou `extra.apiUrl` no app.json, senão fallback de produção.
 */
function resolveApiUrl(): string {
  if (envUrl !== undefined && envUrl !== '') {
    return trimSlash(envUrl);
  }
  if (Platform.OS === 'web') {
    if (__DEV__) {
      return trimSlash(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001');
    }
    return '';
  }
  if (extraUrl) {
    return trimSlash(extraUrl);
  }
  return 'https://api.app-unicapaletes.com';
}

export const API_URL = resolveApiUrl();
