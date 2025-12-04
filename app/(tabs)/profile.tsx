import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  Alert, ScrollView, RefreshControl, ActivityIndicator, StatusBar 
} from 'react-native';
import { auth, db } from '../../src/config/firebase'; 
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { ref, onValue, remove } from 'firebase/database';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/config/theme'; 
import { Ionicons } from '@expo/vector-icons';

interface Waypoint {
  id: string;
  name: string;
  uid: string;
  [key: string]: any;
}

interface Track {
  id: string;
  name: string;
  uid: string;
  [key: string]: any;
}

export default function ProfileScreen() {
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [myPoints, setMyPoints] = useState<Waypoint[]>([]);
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser) {
        fetchData(currentUser.uid);
      }
    });
    return unsubscribe;
  }, []);

  const fetchData = async (uid: string) => {
    setRefreshing(true);
    try {
      onValue(ref(db, 'waypoints'), (snapshot) => {
        const data = snapshot.val();
        const list: Waypoint[] = [];
        if (data) {
          Object.keys(data).forEach((key) => {
            if (data[key].uid === uid) {
              list.push({ id: key, ...data[key] });
            }
          });
        }
        setMyPoints(list);
      }, { onlyOnce: true });

      onValue(ref(db, 'tracks'), (snapshot) => {
        const data = snapshot.val();
        const list: Track[] = [];
        if (data) {
          Object.keys(data).forEach((key) => {
            if (data[key].uid === uid) {
              list.push({ id: key, ...data[key] });
            }
          });
        }
        setMyTracks(list);
      }, { onlyOnce: true });

    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const deleteItem = (pathName: string, id: string) => {
    Alert.alert(
      "Hapus Data",
      "Apakah Anda yakin ingin menghapus item ini? Data tidak dapat dikembalikan.",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Hapus", 
          style: 'destructive',
          onPress: async () => { 
            await remove(ref(db, `${pathName}/${id}`)); 
            if (user) fetchData(user.uid); 
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert("Keluar", "Ingin keluar dari akun?", [
        { text: "Batal", style: "cancel"},
        { text: "Ya, Keluar", onPress: async () => {
            try { 
                await signOut(auth); 
                router.replace('/(auth)/login'); 
            } catch (error) {
                console.error(error);
            }
        }}
    ]);
  };

  if (loadingAuth) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.bgPrimary }]}>
        <ActivityIndicator size="large" color={COLORS.accentGreen} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.center, styles.guestContainer]}>
        <Ionicons name="person-circle-outline" size={80} color={COLORS.textSecondary} />
        <Text style={styles.guestTitle}>Anda Belum Login</Text>
        <Text style={styles.guestSubtitle}>Silakan login untuk menyimpan rute dan titik koordinat Anda.</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.btnText}>Login Sekarang</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 50 }}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => user && fetchData(user.uid)} tintColor={COLORS.accentGreen} />
        }
      >
        <View style={styles.profileHeader}>
          <Image 
            source={
              user.photoURL 
                ? { uri: user.photoURL } 
                : require('../../assets/images/user2.png') 
            } 
            style={styles.avatar} 
          />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user.displayName || user.email?.split('@')[0] || 'Pendaki'}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>Member</Text></View>
          </View>
        </View>

        <View style={styles.statsContainer}>
            <View style={styles.statBox}>
                <Text style={styles.statNumber}>{myPoints.length}</Text>
                <Text style={styles.statLabel}>Titik</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.statBox}>
                <Text style={styles.statNumber}>{myTracks.length}</Text>
                <Text style={styles.statLabel}>Jalur</Text>
            </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color={COLORS.accentGreen} />
            <Text style={styles.sectionTitle}>Titik Tersimpan</Text>
          </View>
          
          {myPoints.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada titik disimpan.</Text>
          ) : (
            myPoints.map((p) => (
              <View key={p.id} style={styles.itemRow}>
                <View style={styles.itemIconBg}><Ionicons name="pin" size={16} color="white" /></View>
                <Text style={styles.itemText} numberOfLines={1}>{p.name || 'Tanpa Nama'}</Text>
                <TouchableOpacity onPress={() => deleteItem("waypoints", p.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="map" size={20} color={COLORS.accentGreen} />
            <Text style={styles.sectionTitle}>Jalur Tersimpan</Text>
          </View>
          
          {myTracks.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada jalur direkam.</Text>
          ) : (
            myTracks.map((t) => (
              <View key={t.id} style={styles.itemRow}>
                <View style={styles.itemIconBg}><Ionicons name="footsteps" size={16} color="white" /></View>
                <Text style={styles.itemText} numberOfLines={1}>{t.name || 'Jalur Tanpa Nama'}</Text>
                <TouchableOpacity onPress={() => deleteItem("tracks", t.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="white" style={{marginRight: 8}} />
            <Text style={styles.btnText}>Keluar Akun</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  guestContainer: { backgroundColor: COLORS.bgPrimary, padding: 30 },
  guestTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 20 },
  guestSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 10, marginBottom: 30 },
  loginBtn: { backgroundColor: COLORS.accentGreen, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 25 },

  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 25, paddingTop: 40 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: COLORS.accentGreen },
  profileInfo: { marginLeft: 20, flex: 1 },
  name: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  email: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  badge: { backgroundColor: 'rgba(255, 165, 0, 0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 8 },
  badgeText: { color: '#FFA500', fontSize: 10, fontWeight: 'bold' },

  statsContainer: { flexDirection: 'row', backgroundColor: COLORS.bgSecondary, marginHorizontal: 20, borderRadius: 12, padding: 15, justifyContent: 'space-around', alignItems: 'center', marginBottom: 20 },
  statBox: { alignItems: 'center', flex: 1 },
  statNumber: { color: COLORS.textPrimary, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },
  separator: { width: 1, height: '80%', backgroundColor: COLORS.border },

  section: { backgroundColor: COLORS.bgSecondary, marginHorizontal: 20, marginBottom: 15, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { color: COLORS.textPrimary, fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  emptyText: { color: COLORS.textSecondary, fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: 10 },

  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgPrimary, padding: 10, borderRadius: 10, marginBottom: 8 },
  itemIconBg: { width: 30, height: 30, backgroundColor: COLORS.bgTertiary, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  itemText: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  deleteBtn: { padding: 5 },

  logoutBtn: { flexDirection: 'row', backgroundColor: '#FF4444', margin: 20, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});