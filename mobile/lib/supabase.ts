import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// iOS caps SecureStore item values at 2048 bytes. Supabase session JSON is typically
// 2–4 KB, so we chunk anything over 1800 bytes across multiple keyed entries.
const CHUNK_SIZE = 1800;

const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    // Try a single SecureStore entry first (covers small values + previously migrated)
    const single = await SecureStore.getItemAsync(key);
    if (single !== null) return single;

    // Try reassembling chunked value
    const chunkCountStr = await SecureStore.getItemAsync(`${key}.chunks`);
    if (chunkCountStr) {
      const count = parseInt(chunkCountStr, 10);
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await SecureStore.getItemAsync(`${key}.chunk.${i}`);
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join('');
    }

    // Legacy path: session was stored in AsyncStorage before the SecureStore migration.
    // Migrate transparently on first access so the user doesn't need to re-login.
    const legacy = await AsyncStorage.getItem(key);
    if (legacy !== null) {
      await SecureStoreAdapter.setItem(key, legacy).catch(() => {});
      await AsyncStorage.removeItem(key).catch(() => {});
      return legacy;
    }

    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      // Clean up any stale chunked entries from a previous large session
      await SecureStore.deleteItemAsync(`${key}.chunks`).catch(() => {});
    } else {
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}.chunk.${i}`, chunks[i]);
      }
      await SecureStore.setItemAsync(`${key}.chunks`, String(chunks.length));
      await SecureStore.deleteItemAsync(key).catch(() => {});
    }
  },

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key).catch(() => {});
    const chunkCountStr = await SecureStore.getItemAsync(`${key}.chunks`);
    if (chunkCountStr) {
      const count = parseInt(chunkCountStr, 10);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}.chunk.${i}`).catch(() => {});
      }
      await SecureStore.deleteItemAsync(`${key}.chunks`).catch(() => {});
    }
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
