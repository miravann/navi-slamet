import { Stack, useRouter, Segments } from 'expo-router';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../src/config/firebase';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../src/config/theme';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (user) => {
      if (initializing) setInitializing(false);
    });
    return subscriber;
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgPrimary }}>
        <ActivityIndicator size="large" color={COLORS.accentGreen} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={COLORS.bgPrimary} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bgPrimary } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}