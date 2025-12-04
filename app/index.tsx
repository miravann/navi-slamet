// File: app/index.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
// Perhatikan path ini: cukup '../src' karena kita ada di folder 'app'
import { COLORS } from '../src/config/theme'; 
import { auth } from '../src/config/firebase'; 

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
        // Cek apakah user sudah login atau belum (Opsional, tapi bagus UX-nya)
        if (auth.currentUser) {
            router.replace('/(tabs)');// Ke Peta jika sudah login
        } else {
            router.replace('/(auth)/login'); // Ke Login jika belum
        }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <View style={styles.logoWrapper}>
        {/* Pastikan file logo.png ada di folder assets */}
        <Image 
          source={require('../assets/images/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.welcomeText}>Selamat Datang di</Text>
        <Text style={styles.appName}>slamet-navi</Text>
      </View>
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.accentGreen || '#4CAF50'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center' },
  logoWrapper: { marginBottom: 20 },
  logo: { width: 150, height: 150 },
  textContainer: { alignItems: 'center', marginBottom: 50 },
  welcomeText: { fontSize: 16, color: '#B0B3B8', marginBottom: 8 },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#4CAF50' },
  loaderContainer: { position: 'absolute', bottom: 60 }
});