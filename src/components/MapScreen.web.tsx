import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// PERBAIKAN: Menggunakan ../ agar mengarah ke src/config
import { COLORS } from '../config/theme';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="navigate-circle-outline" size={80} color={COLORS.accentGreen} />
        <Text style={styles.title}>Slamet-Navi Mobile</Text>
        <Text style={styles.description}>
          Fitur Tracking GPS dan Mapbox Tileset hanya tersedia di aplikasi Android & iOS.
        </Text>
        <View style={styles.warningBox}>
          <Text style={styles.instruction}>
            Silakan buka menggunakan Expo Go di HP Android.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary, justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { alignItems: 'center', maxWidth: 400 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 20, textAlign: 'center' },
  description: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginVertical: 20 },
  warningBox: { backgroundColor: COLORS.bgSecondary, padding: 15, borderRadius: 10, width: '100%' },
  instruction: { color: COLORS.accentGreen, textAlign: 'center', fontWeight: 'bold' }
});