import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  Modal, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  Animated, 
  PanResponder,
  Dimensions
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline, Marker, MapType } from 'react-native-maps';
import * as Location from 'expo-location';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

// --- DATA & CONFIG ---
// Pastikan path ini sesuai dengan struktur folder Anda
import { REAL_GPX_XML } from '../data/real_gpx_file'; 
import { auth, db } from '../config/firebase';
import { ref, push, onValue } from 'firebase/database';

const INITIAL_REGION = {
  latitude: -7.2435,   
  longitude: 109.2312,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

const COLORS = {
  primary: '#2196F3',
  secondary: '#FF4444',
  accent: '#00E676', 
  white: '#FFFFFF',
  black: '#000000',
  darkGray: '#333333',
  bgOverlay: 'rgba(0,0,0,0.8)',
  panelBg: 'rgba(30, 30, 30, 0.95)',
  trackDefault: '#D500F9', 
  trackUpload: '#FF9100',
  chartBar: 'rgba(255, 145, 0, 0.8)', 
  chartBarMax: '#FFFFFF', // Warna putih untuk bar tertinggi
};

// --- TYPES ---
interface Coordinate {
  latitude: number;
  longitude: number;
  elevation?: number;
}

interface TrackStats {
  distance: number;
  elevationGain: number;
  eta: string;
}

interface Waypoint {
  id?: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  uid?: string;
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const timerRef = useRef<any>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // --- ANIMASI PANEL (PAN RESPONDER) ---
  const panY = useRef(new Animated.Value(0)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0 && gestureState.dy > -150) {
            panY.setValue(-gestureState.dy / 150); 
        } else if (gestureState.dy > 0 && gestureState.dy < 150) {
            panY.setValue(1 - (gestureState.dy / 150));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          Animated.spring(panY, { toValue: 1, useNativeDriver: false }).start();
        } else if (gestureState.dy > 50) {
          Animated.spring(panY, { toValue: 0, useNativeDriver: false }).start();
        } else {
             Animated.spring(panY, { toValue: 0, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  const panelHeight = panY.interpolate({
    inputRange: [0, 1],
    outputRange: [120, 280],
    extrapolate: 'clamp'
  });

  const chartOpacity = panY.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  // --- STATE ---
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  
  // Data Track
  const [gpxTrack, setGpxTrack] = useState<Coordinate[]>([]);
  const [uploadedTrack, setUploadedTrack] = useState<Coordinate[]>([]);
  const [trackStats, setTrackStats] = useState<TrackStats | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  
  // Tracking State
  const [isTracking, setIsTracking] = useState(false);
  const [trackPath, setTrackPath] = useState<Coordinate[]>([]);
  const [duration, setDuration] = useState(0);
  
  // Map Config
  const [mapType, setMapType] = useState<MapType>("satellite");
  const [is3DMode, setIs3DMode] = useState(false); // State untuk mode 3D

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [trackSaveModal, setTrackSaveModal] = useState(false);
  const [inputName, setInputName] = useState('');
  const [inputDesc, setInputDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTrack, setIsSavingTrack] = useState(false);
  
  const [userWaypoints, setUserWaypoints] = useState<Waypoint[]>([]);

  const getAuth = () => auth as any;
  const getDb = () => db as any;

  useEffect(() => {
    fetchUserWaypoints();
    // Load default GPX example (optional)
    setTimeout(() => {
        const { points } = parseGpxFast(REAL_GPX_XML);
        if (points.length > 0) setGpxTrack(points);
    }, 500);
  }, []);

  // --- ANIMASI KAMERA 3D (FITUR BARU) ---
  const animateTo3DTrack = (points: Coordinate[]) => {
    if (!mapRef.current || points.length === 0) return;

    // AMBIL TITIK AWAL (START POINT)
    const startPoint = points[0]; 

    // Langkah 1: Zoom ke area tengah jalur dulu (Overview)
    const midIndex = Math.floor(points.length / 2);
    
    mapRef.current.animateToRegion({
        latitude: points[midIndex].latitude,
        longitude: points[midIndex].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
    }, 1000);

    setIs3DMode(true); // Aktifkan indikator 3D

    // Langkah 2: Terbang masuk ke Titik Awal dengan efek 3D (Pitch)
    setTimeout(() => {
        mapRef.current?.animateCamera({
            center: {
                latitude: startPoint.latitude,
                longitude: startPoint.longitude,
            },
            pitch: 65,      // Miringkan kamera 65 derajat
            heading: 0,     // Menghadap Utara
            altitude: 200,  // Ketinggian rendah (Close up)
            zoom: 18        // Zoom sangat dekat ke titik start
        }, { duration: 2500 });
    }, 1200);
  };

  // --- TOGGLE MANUAL 2D / 3D ---
  const toggleViewMode = async () => {
    if (!mapRef.current) return;
    
    const camera = await mapRef.current.getCamera();
    
    if (is3DMode) {
        // Ganti ke 2D (Tegak Lurus)
        mapRef.current.animateCamera({
            pitch: 0,
            heading: 0,
            zoom: camera.zoom // Pertahankan zoom saat ini
        }, { duration: 1000 });
        setIs3DMode(false);
    } else {
        // Ganti ke 3D (Miring)
        mapRef.current.animateCamera({
            pitch: 65,
            zoom: camera.zoom < 16 ? 17 : camera.zoom
        }, { duration: 1000 });
        setIs3DMode(true);
    }
  };

  // --- MATEMATIKA ---
  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

  const deg2rad = (deg: number) => deg * (Math.PI/180);

  const calculateStats = (points: Coordinate[]): TrackStats => {
    let totalDist = 0;
    let elevationGain = 0;
    const hasElevation = points.some(p => p.elevation !== undefined && !isNaN(p.elevation));
    const step = points.length > 2000 ? 2 : 1; 

    for (let i = 0; i < points.length - step; i += step) {
        const p1 = points[i];
        const p2 = points[i+step];
        totalDist += getDistanceFromLatLonInKm(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
        if (hasElevation && p1.elevation !== undefined && p2.elevation !== undefined) {
            if (p2.elevation > p1.elevation) {
                if ((p2.elevation - p1.elevation) > 0.5) {
                    elevationGain += (p2.elevation - p1.elevation);
                }
            }
        }
    }
    const totalHours = (totalDist / 4) + (elevationGain / 600);
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);

    return {
        distance: parseFloat(totalDist.toFixed(2)),
        elevationGain: Math.round(elevationGain),
        eta: `${hours}j ${minutes}m`,
    };
  };

  // --- PARSER ---
  const parseGpxFast = (gpxString: string) => {
    try {
      const points: Coordinate[] = [];
      const segments = gpxString.split('<trkpt');
      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];
        const latStart = segment.indexOf('lat=');
        const lonStart = segment.indexOf('lon=');
        
        if (latStart !== -1 && lonStart !== -1) {
            const extractVal = (str: string, startIdx: number) => {
                const quoteChar = str[startIdx + 4]; 
                const endIdx = str.indexOf(quoteChar, startIdx + 5);
                if (endIdx !== -1) return parseFloat(str.substring(startIdx + 5, endIdx));
                return NaN;
            };
            const lat = extractVal(segment, latStart);
            const lon = extractVal(segment, lonStart);
            let ele = 0;
            const eleStart = segment.indexOf('<ele>');
            if (eleStart !== -1) {
                const eleEnd = segment.indexOf('</ele>', eleStart);
                if (eleEnd !== -1) ele = parseFloat(segment.substring(eleStart + 5, eleEnd));
            }
            if (!isNaN(lat) && !isNaN(lon)) points.push({ latitude: lat, longitude: lon, elevation: ele });
        }
      }
      if (points.length > 0) {
        const stats = calculateStats(points);
        return { points, stats };
      }
      return { points: [], stats: null };
    } catch (e) {
      console.log("Fast Parsing Error:", e);
      return { points: [], stats: null };
    }
  };

  // --- UPLOAD ---
  const handleUploadGpx = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      
      setIsLoadingFile(true); 

      const fileUri = result.assets[0].uri;
      
      setTimeout(async () => {
        try {
            const response = await fetch(fileUri);
            const fileContent = await response.text();
            if (!fileContent) { setIsLoadingFile(false); return Alert.alert("Error", "File kosong."); }

            const { points, stats } = parseGpxFast(fileContent);

            if (points.length > 0) {
                setUploadedTrack(points);
                setTrackStats(stats);
                panY.setValue(0);
                
                // Trigger Animasi 3D ke Titik Awal
                animateTo3DTrack(points);
            } else {
                Alert.alert("Gagal", "Tidak ada data koordinat.");
            }
        } catch (e: any) {
            Alert.alert("Error", "Gagal membaca file: " + e.message);
        } finally {
            setIsLoadingFile(false); 
        }
      }, 100);

    } catch (err: any) {
      setIsLoadingFile(false);
      Alert.alert("Error Upload", err.message);
    }
  };

  const handleClearGpx = () => {
    Alert.alert("Hapus GPX", "Hapus jalur dari peta?", [
        { text: "Batal", style: "cancel" },
        { text: "Hapus", style: 'destructive', onPress: () => {
            setUploadedTrack([]);
            setTrackStats(null);
            setIs3DMode(false);
        }}
    ]);
  };

  const cycleBasemap = () => {
    setMapType(prev => prev === "standard" ? "satellite" : "standard");
  };

  // --- FIREBASE & TRACKING ---
  const fetchUserWaypoints = () => {
    const _auth = getAuth();
    if (!_auth.currentUser) return;
    const pointsRef = ref(getDb(), 'waypoints');
    onValue(pointsRef, (snapshot) => {
        const data = snapshot.val();
        const list: Waypoint[] = [];
        if (data) Object.keys(data).forEach(k => { if (data[k].uid === _auth.currentUser?.uid) list.push({ id: k, ...data[k] }) });
        setUserWaypoints(list);
    });
  };

  const startTracking = async () => {
    const _auth = getAuth();
    if (!_auth.currentUser) return Alert.alert("Login", "Login diperlukan.");
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Izin', 'Aktifkan GPS.');
    
    setIsTracking(true);
    setTrackPath([]);
    setDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setDuration((p: number) => p + 1), 1000);
    locationSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5 }, 
      (loc) => {
        const newCoord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setTrackPath(p => [...p, newCoord]);
        mapRef.current?.animateCamera({ center: newCoord, zoom: 17 });
      }
    );
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (locationSubscription.current) locationSubscription.current.remove();
    if (trackPath.length > 2) {
        setInputName(`Jalur ${new Date().toLocaleDateString('id-ID')}`);
        setTrackSaveModal(true);
    } else setTrackPath([]);
  };

  const saveTrackToFirebase = async () => {
    const _auth = getAuth();
    if (!inputName) return;
    setIsSavingTrack(true);
    try {
        const cleanCoords = trackPath.map(c => ({ latitude: c.latitude, longitude: c.longitude }));
        await push(ref(getDb(), 'tracks'), {
            name: inputName, coordinates: cleanCoords, duration, date: new Date().toISOString(), uid: _auth.currentUser?.uid
        });
        setTrackSaveModal(false); setTrackPath([]); Alert.alert("Berhasil", "Data tersimpan!");
    } catch (e: any) { Alert.alert("Gagal", e.message); } finally { setIsSavingTrack(false); }
  };

  const handleAddPoint = async () => {
    const _auth = getAuth();
    if (!_auth.currentUser) return Alert.alert("Login", "Login dulu.");
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    let loc = await Location.getCurrentPositionAsync({});
    setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    setInputName(''); setInputDesc('');
    setModalVisible(true);
  };

  const saveWaypoint = async () => {
    const _auth = getAuth();
    if (!inputName || !currentLocation) return;
    setIsSaving(true);
    try {
        await push(ref(getDb(), 'waypoints'), {
            name: inputName, description: inputDesc, latitude: currentLocation.latitude, longitude: currentLocation.longitude, uid: _auth.currentUser?.uid
        });
        setModalVisible(false); Alert.alert("Berhasil", "Titik tersimpan!");
    } catch (e) { Alert.alert("Gagal", "Cek koneksi."); } finally { setIsSaving(false); }
  };

  // --- CHART ---
  const ElevationChart = ({ data }: { data: Coordinate[] }) => {
    if (!data || data.length < 5) return null;
    
    // Sampling Data agar chart tidak terlalu padat
    const MAX_BARS = 45;
    const step = Math.ceil(data.length / MAX_BARS);
    const sampledData = data.filter((_, i) => i % step === 0).slice(0, MAX_BARS);
    
    const elevations = sampledData.map(p => p.elevation || 0);
    const max = Math.max(...elevations);
    const min = Math.min(...elevations);
    const range = max - min || 1;
    
    const maxIndex = elevations.indexOf(max);
    const startEle = elevations[0];
    const endEle = elevations[elevations.length - 1];

    return (
        <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Profil Elevasi (mdpl)</Text>
            
            <View style={styles.chartRow}>
                {sampledData.map((pt, index) => {
                    const val = pt.elevation || 0;
                    const heightPercent = ((val - min) / range) * 100;
                    const barHeight = Math.max(heightPercent, 10); 
                    
                    const isMax = index === maxIndex; 

                    return (
                        <View key={index} style={styles.chartBarContainer}>
                            {isMax && (
                                <Text style={styles.peakLabel}>
                                    {Math.round(max)}m
                                </Text>
                            )}
                            <View 
                                style={[
                                    styles.chartBar, 
                                    { 
                                        height: `${barHeight}%`,
                                        backgroundColor: isMax ? COLORS.chartBarMax : COLORS.chartBar 
                                    }
                                ]} 
                            />
                        </View>
                    );
                })}
            </View>
            <View style={styles.chartLabels}>
                <Text style={styles.chartText}>Start: {Math.round(startEle)}m</Text>
                <Text style={styles.chartText}>End: {Math.round(endEle)}m</Text>
            </View>
        </View>
    );
  };

  return (
    <View style={styles.container}>
      <MapView 
        ref={mapRef} 
        style={styles.map} 
        provider={PROVIDER_GOOGLE} 
        initialRegion={INITIAL_REGION} 
        showsUserLocation={true} 
        mapType={mapType}
        // Aktifkan fitur 3D Map
        pitchEnabled={true} 
        rotateEnabled={true}
        zoomEnabled={true}
      >
        {uploadedTrack.length > 0 && (
            <Polyline coordinates={uploadedTrack} strokeColor={COLORS.trackUpload} strokeWidth={5} zIndex={100} />
        )}
        {trackPath.length > 0 && (
            <Polyline coordinates={trackPath} strokeColor={COLORS.accent} strokeWidth={5} zIndex={101} />
        )}
        {userWaypoints.map((wp, index) => (
            <Marker key={index} coordinate={{ latitude: wp.latitude, longitude: wp.longitude }} title={wp.name} description={wp.description} pinColor="blue" zIndex={102} />
        ))}
      </MapView>

      {isLoadingFile && (
        <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{color:'white', marginTop:10, fontWeight:'bold'}}>Memproses GPX...</Text>
        </View>
      )}

      {isTracking && (
        <View style={styles.timerContainer}>
            <View style={styles.redDot} />
            <Text style={styles.timerText}>{new Date(duration * 1000).toISOString().substr(14, 5)}</Text>
        </View>
      )}

      {/* Buttons Kanan */}
      <View style={styles.rightActionContainer}>
        {/* Toggle Map Type */}
        <TouchableOpacity style={styles.sideBtn} onPress={cycleBasemap}>
            <Ionicons name="map" size={24} color={COLORS.white} />
            <Text style={styles.btnLabel}>{mapType === 'standard' ? 'Jalan' : 'Satelit'}</Text>
        </TouchableOpacity>

        {/* Toggle 3D / 2D */}
        <TouchableOpacity 
            style={[styles.sideBtn, is3DMode ? { backgroundColor: COLORS.primary } : {}]} 
            onPress={toggleViewMode}
        >
            <Ionicons name={is3DMode ? "cube" : "cube-outline"} size={24} color={COLORS.white} />
            <Text style={styles.btnLabel}>{is3DMode ? '3D On' : '2D'}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Upload / Clear */}
        {uploadedTrack.length > 0 ? (
             <TouchableOpacity style={[styles.sideBtn, {backgroundColor: COLORS.secondary}]} onPress={handleClearGpx}>
                <Ionicons name="trash" size={24} color={COLORS.white} />
                <Text style={styles.btnLabel}>Hapus</Text>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity style={styles.sideBtn} onPress={handleUploadGpx}>
                {isLoadingFile ? <ActivityIndicator color="white" size="small"/> : <Ionicons name="cloud-upload" size={24} color={COLORS.white} />}
                <Text style={styles.btnLabel}>Upload</Text>
            </TouchableOpacity>
        )}

        <View style={styles.divider} />

        {/* Recording */}
        <TouchableOpacity 
            style={[styles.sideBtn, isTracking ? {backgroundColor: COLORS.secondary} : {}]} 
            onPress={isTracking ? stopTracking : startTracking}
        >
            <Ionicons name={isTracking ? "stop-circle" : "navigate-circle"} size={28} color={COLORS.white} />
            <Text style={styles.btnLabel}>{isTracking ? 'Stop' : 'Rec'}</Text>
        </TouchableOpacity>

        {/* Add Point */}
        <TouchableOpacity style={styles.sideBtn} onPress={handleAddPoint}>
            <Ionicons name="location" size={26} color={COLORS.white} />
            <Text style={styles.btnLabel}>Point</Text>
        </TouchableOpacity>
      </View>

      {/* --- PANEL STATISTIK SLIDING --- */}
      {uploadedTrack.length > 0 && trackStats && (
        <Animated.View 
            style={[styles.slidingPanel, { height: panelHeight }]} 
            {...panResponder.panHandlers}
        >
            <View style={styles.panelHandleContainer}>
                <View style={styles.panelHandle} />
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Jarak</Text>
                    <Text style={styles.statValue}>{trackStats.distance} km</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Gain</Text>
                    <Text style={styles.statValue}>+{trackStats.elevationGain}m</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>ETA</Text>
                    <Text style={styles.statValue}>{trackStats.eta}</Text>
                </View>
            </View>
            
            {trackStats.elevationGain > 0 && (
                <Animated.View style={{ opacity: chartOpacity, marginTop: 15, flex: 1 }}>
                    <ElevationChart data={uploadedTrack} />
                </Animated.View>
            )}
        </Animated.View>
      )}

      {/* Modals */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tambah Titik</Text>
            <TextInput style={styles.input} value={inputName} onChangeText={setInputName} placeholder="Nama Lokasi"/>
            <TextInput style={styles.input} value={inputDesc} onChangeText={setInputDesc} placeholder="Keterangan"/>
            <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnText}><Text>Batal</Text></TouchableOpacity>
                <TouchableOpacity onPress={saveWaypoint} style={styles.btnPrimary}><Text style={{color: COLORS.white}}>Simpan</Text></TouchableOpacity>
            </View>
        </View></View>
      </Modal>

      <Modal visible={trackSaveModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Simpan Tracking</Text>
            <TextInput style={styles.input} value={inputName} onChangeText={setInputName} placeholder="Nama Jalur"/>
            <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setTrackSaveModal(false)} style={styles.btnText}><Text>Batal</Text></TouchableOpacity>
                <TouchableOpacity onPress={saveTrackToFirebase} style={styles.btnPrimary}>
                    {isSavingTrack ? <ActivityIndicator color="white"/> : <Text style={{color: COLORS.white}}>Simpan</Text>}
                </TouchableOpacity>
            </View>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333' },
  map: { width: '100%', height: '100%' },
  
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', zIndex: 999
  },

  rightActionContainer: {
    position: 'absolute', top: 60, right: 15, alignItems: 'center', gap: 12, zIndex: 100,
  },
  sideBtn: {
    width: 50, height: 50, backgroundColor: COLORS.bgOverlay, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', elevation: 4,
  },
  btnLabel: { color: COLORS.white, fontSize: 9, marginTop: 2, fontWeight: 'bold' },
  divider: { height: 1, width: 30, backgroundColor: 'rgba(255,255,255,0.4)', marginVertical: 5 },

  timerContainer: { 
    position: 'absolute', top: 60, left: 20, backgroundColor: COLORS.bgOverlay, 
    paddingHorizontal: 15, paddingVertical: 10, borderRadius: 25, 
    flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 100
  },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.secondary },
  timerText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },

  slidingPanel: {
    position: 'absolute', 
    bottom: 90, 
    left: 20, right: 20,
    backgroundColor: COLORS.panelBg,
    borderRadius: 20, 
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderWidth: 1, borderColor: '#555',
    elevation: 10,
    overflow: 'hidden',
  },
  panelHandleContainer: { alignItems: 'center', paddingVertical: 8 },
  panelHandle: { width: 40, height: 4, backgroundColor: '#888', borderRadius: 2 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { color: '#aaa', fontSize: 11, textTransform: 'uppercase' },
  statValue: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginTop: 2 },

  chartContainer: { flex: 1, justifyContent: 'flex-end', marginTop: 10 },
  chartTitle: { color: '#aaa', fontSize: 10, marginBottom: 15, textAlign:'center' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', flex: 1, gap: 2, paddingBottom: 5 },
  chartBarContainer: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' },
  chartBar: { width: '80%', borderRadius: 2 },
  
  peakLabel: {
      position: 'absolute',
      top: -15, 
      color: COLORS.white,
      fontSize: 9,
      fontWeight: 'bold',
      width: 40,
      textAlign: 'center',
  },

  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, borderTopWidth: 1, borderTopColor: '#444', paddingTop: 2 },
  chartText: { color: '#aaa', fontSize: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: COLORS.white, padding: 20, borderRadius: 12, elevation: 5 },
  modalTitle: { fontSize: 18, marginBottom: 15, fontWeight: 'bold', color: COLORS.black },
  input: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 10, color: COLORS.black },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  btnText: { padding: 10, justifyContent:'center' },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 10, borderRadius: 8, justifyContent:'center' }
});