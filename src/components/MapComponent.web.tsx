import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../config/theme';
import { Ionicons } from '@expo/vector-icons';

export default function MapComponent() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="phone-portrait-outline" size={80} color={COLORS.accentGreen} />
        <Text style={styles.title}>Mode Mobile Diperlukan</Text>
        <Text style={styles.description}>
          Peta Interaktif menggunakan Google Maps Native. Silakan buka di HP Android/iOS menggunakan aplikasi Expo Go.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary, justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { alignItems: 'center', maxWidth: 500 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 20, textAlign: 'center' },
  description: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 24 }
});