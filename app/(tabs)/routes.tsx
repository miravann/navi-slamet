import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, Dimensions } from 'react-native';
import { COLORS, STYLES } from '../../src/config/theme';
import { MOUNTAIN_ROUTES } from '../../src/data/routes';
import { API_KEYS } from '../../src/config/keys';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from "react-native-chart-kit";

interface WeatherResponse {
  weather: {
    icon: string;
    description: string;
  }[];
  main: {
    temp: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
}

export default function RoutesScreen() {
  const route = MOUNTAIN_ROUTES[0];
  
  
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      const { latitude, longitude } = route.basecampLocation;
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEYS.WEATHER_API_KEY}&units=metric&lang=id`
      );
      const data = await response.json();
      setWeather(data);
    } catch (error) {
      console.error("Gagal ambil cuaca", error);
    } finally {
      setLoadingWeather(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{route.name}</Text>
        <View style={styles.badgeContainer}>
           <View style={[styles.badge, { backgroundColor: COLORS.accentGreen }]}>
             <Text style={styles.badgeText}>Buka</Text>
           </View>
           <View style={[styles.badge, { backgroundColor: '#FFA500' }]}>
             <Text style={styles.badgeText}>Rp 25.000</Text>
           </View>
        </View>
      </View>

      <View style={styles.weatherCard}>
        <Text style={styles.sectionTitle}>Cuaca di Basecamp</Text>
        {loadingWeather ? (
          <ActivityIndicator color={COLORS.accentGreen} />
        ) : weather && weather.weather ? (
          <View style={styles.weatherContent}>
            <Image 
              source={{ uri: `http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png` }} 
              style={{ width: 60, height: 60 }} 
            />
            <View>
              {/* TypeScript sekarang mengenali properti .main, .weather, dll */}
              <Text style={styles.tempText}>{Math.round(weather.main.temp)}°C</Text>
              <Text style={styles.weatherDesc}>{weather.weather[0].description}</Text>
              <Text style={styles.subWeather}>Angin: {weather.wind.speed} m/s | Hum: {weather.main.humidity}%</Text>
            </View>
          </View>
        ) : (
          <Text style={{color: COLORS.textSecondary}}>Gagal memuat cuaca.</Text>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Informasi Basecamp Bambangan</Text>
        <View style={styles.infoRow}><Ionicons name="time-outline" size={24} color={COLORS.accentGreen} /><View style={styles.infoTextWrapper}><Text style={styles.infoLabel}>Jam Operasional</Text><Text style={styles.infoValue}>07.00 - 17.00 WIB (Registrasi)</Text></View></View>
        <View style={styles.infoRow}><Ionicons name="document-text-outline" size={24} color={COLORS.accentGreen} /><View style={styles.infoTextWrapper}><Text style={styles.infoLabel}>Persyaratan</Text><Text style={styles.infoValue}>KTP Asli, Surat Sehat, Logistik</Text></View></View>
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Grafik Elevasi</Text>
        <LineChart
            data={{ labels: route.elevationLabels, datasets: [{ data: route.elevationData }] }}
            width={Dimensions.get("window").width - 40}
            height={200}
            yAxisSuffix="m"
            chartConfig={{ backgroundColor: COLORS.bgSecondary, backgroundGradientFrom: COLORS.bgSecondary, backgroundGradientTo: COLORS.bgTertiary, decimalPlaces: 0, color: (opacity = 1) => `rgba(255, 69, 0, ${opacity})`, labelColor: (opacity = 1) => `rgba(176, 179, 184, ${opacity})`, style: { borderRadius: 16 }, propsForDots: { r: "4", strokeWidth: "2", stroke: "#ffa726" } }}
            bezier
            style={{ borderRadius: 8, marginVertical: 8 }}
          />
      </View>
      <View style={{height: 100}} /> 
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary, padding: 20, paddingTop: 50 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 10 },
  badgeContainer: { flexDirection: 'row', gap: 10 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  weatherCard: { backgroundColor: COLORS.bgSecondary, padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  weatherContent: { flexDirection: 'row', alignItems: 'center' },
  tempText: { fontSize: 32, fontWeight: 'bold', color: COLORS.textPrimary },
  weatherDesc: { color: COLORS.accentGreen, textTransform: 'capitalize', fontWeight: '600' },
  subWeather: { color: COLORS.textSecondary, fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 15 },
  infoSection: { backgroundColor: COLORS.bgSecondary, padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  infoRow: { flexDirection: 'row', marginBottom: 15 },
  infoTextWrapper: { marginLeft: 15, flex: 1 },
  infoLabel: { color: COLORS.textPrimary, fontWeight: 'bold', marginBottom: 2 },
  infoValue: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
  chartSection: { marginBottom: 20 }
});