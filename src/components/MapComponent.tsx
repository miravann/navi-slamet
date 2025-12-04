import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STYLES } from '../config/theme';
import { MOUNTAIN_ROUTES } from '../data/routes';
import { LineChart } from "react-native-chart-kit";

const INITIAL_REGION = {
  latitude: -7.4542,
  longitude: 110.4397,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export default function MapComponent() {
  const mapRef = useRef(null);
  const [mapType, setMapType] = useState('hybrid');
  const [selectedRoute, setSelectedRoute] = useState(null);

  const toggleMapType = () => {
    setMapType(prev => prev === 'standard' ? 'hybrid' : 'standard');
  };

  const handleRoutePress = (route) => {
    setSelectedRoute(route);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        mapType={mapType}
        showsUserLocation={true}
        showsCompass={true}
      >
        {MOUNTAIN_ROUTES.map((route) => (
          <React.Fragment key={route.id}>
            <Polyline
              coordinates={route.coordinates}
              strokeColor={route.color}
              strokeWidth={4}
              tappable={true}
              onPress={() => handleRoutePress(route)}
            />
            <Marker
              coordinate={route.coordinates[0]}
              title={route.name}
              description="Titik Awal Pendakian"
              pinColor={route.color}
              onPress={() => handleRoutePress(route)}
            />
          </React.Fragment>
        ))}
      </MapView>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={toggleMapType}>
            <Ionicons name="layers" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={() => mapRef.current?.animateToRegion(INITIAL_REGION)}>
            <Ionicons name="locate" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {selectedRoute && (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHeader}>
            <View>
                <Text style={styles.sheetTitle}>{selectedRoute.name}</Text>
                <Text style={styles.sheetSubtitle}>
                    Jarak: {selectedRoute.distance}km | Gain: {selectedRoute.elevationGain}m
                </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedRoute(null)}>
                <Ionicons name="close-circle" size={30} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <Text style={{color: COLORS.textSecondary, marginBottom: 10, fontSize: 12}}>Grafik Elevasi</Text>
          
          <LineChart
            data={{
              labels: selectedRoute.elevationLabels,
              datasets: [{ data: selectedRoute.elevationData }]
            }}
            width={Dimensions.get("window").width - 40}
            height={160}
            yAxisSuffix="m"
            chartConfig={{
              backgroundColor: COLORS.bgSecondary,
              backgroundGradientFrom: COLORS.bgSecondary,
              backgroundGradientTo: COLORS.bgTertiary,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 130, 60, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(176, 179, 184, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "4", strokeWidth: "2", stroke: COLORS.accentGreen }
            }}
            bezier
            style={{ borderRadius: 8, marginVertical: 8 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  map: { width: '100%', height: '100%' },
  controls: { position: 'absolute', top: 50, right: 20, gap: 10 },
  controlBtn: {
    backgroundColor: COLORS.bgSecondary, padding: 10, borderRadius: 8,
    ...STYLES.shadow, borderWidth: 1, borderColor: COLORS.border
  },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bgPrimary, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border, ...STYLES.shadow
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sheetTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: 'bold' },
  sheetSubtitle: { color: COLORS.accentGreen, fontSize: 14 }
});