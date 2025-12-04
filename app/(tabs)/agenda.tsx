import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { COLORS } from '../../src/config/theme';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../src/config/firebase';
// Gunakan fungsi RTDB
import { ref, push, onValue, update } from 'firebase/database';
import { useRouter } from 'expo-router';

LocaleConfig.locales['id'] = {
  monthNames: ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],
  monthNamesShort: ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'],
  dayNames: ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'],
  dayNamesShort: ['Min','Sen','Sel','Rab','Kam','Jum','Sab'],
  today: 'Hari ini'
};
LocaleConfig.defaultLocale = 'id';

export default function AgendaScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [agendas, setAgendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listener Realtime
    const agendaRef = ref(db, 'agendas');
    const unsubscribe = onValue(agendaRef, (snapshot) => {
        const data = snapshot.val();
        const list: any[] = [];
        if (data) {
            Object.keys(data).forEach((key) => {
                list.push({ id: key, ...data[key] });
            });
        }
        // Sort by Date
        list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setAgendas(list);
    });

    return () => unsubscribe();
  }, []);

  const handleAddAgenda = async () => {
    if (!auth.currentUser) return Alert.alert("Akses", "Login dulu ya.");
    if (!title) return Alert.alert("Error", "Judul kegiatan harus diisi");
    
    setLoading(true);
    const targetDate = selectedDate || new Date().toISOString().split('T')[0];

    try {
        const newAgendaRef = ref(db, 'agendas'); // Referensi ke node 'agendas'
        await push(newAgendaRef, {
            date: targetDate,
            title: title,
            description: desc,
            creatorUid: auth.currentUser.uid,
            creatorName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0],
            // Struktur peserta menggunakan Object Keys agar unik
            participants: {
                [auth.currentUser.uid]: true 
            },
            createdAt: new Date().toISOString()
        });
        
        setModalVisible(false); setTitle(''); setDesc('');
        Alert.alert("Sukses", "Agenda berhasil dibuat!", [
            { text: "Nanti" },
            { text: "Buka Chat", onPress: () => router.push('/(tabs)/chat') }
        ]);
    } catch(e: any) { 
        Alert.alert("Gagal", e.message); 
    } finally { 
        setLoading(false); 
    }
  };

  const joinAgenda = async (agendaId: string) => {
    if (!auth.currentUser) return Alert.alert("Login", "Silakan login.");
    try {
       
        const updates: any = {};
        updates[`agendas/${agendaId}/participants/${auth.currentUser.uid}`] = true;
        
        await update(ref(db), updates);
        
        Alert.alert("Berhasil", "Anda bergabung! Cek Tab Chat.", [
            { text: "OK" },
            { text: "Ke Chat", onPress: () => router.push('/(tabs)/chat') }
        ]);
    } catch (e: any) {
        Alert.alert("Gagal", e.message);
    }
  };

  const filteredAgendas = selectedDate 
    ? agendas.filter(a => a.date === selectedDate)
    : agendas; 

  const markedDates: any = {};
  agendas.forEach(a => { markedDates[a.date] = { marked: true, dotColor: COLORS.accentGreen } });
  if (selectedDate) markedDates[selectedDate] = { ...markedDates[selectedDate], selected: true, selectedColor: COLORS.accentGreen };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Agenda Pendakian</Text>
      
      <Calendar
        theme={{ backgroundColor: COLORS.bgSecondary, calendarBackground: COLORS.bgSecondary, textSectionTitleColor: COLORS.textSecondary, selectedDayBackgroundColor: COLORS.accentGreen, selectedDayTextColor: '#ffffff', todayTextColor: COLORS.accentGreen, dayTextColor: COLORS.textPrimary, textDisabledColor: '#444', monthTextColor: COLORS.textPrimary, arrowColor: COLORS.accentGreen }}
        onDayPress={(day: any) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
      />
      
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
            <Text style={styles.sectionTitle}>{selectedDate ? `Kegiatan: ${selectedDate}` : 'Semua Agenda'}</Text>
            <TouchableOpacity onPress={() => auth.currentUser ? setModalVisible(true) : Alert.alert("Login", "Login dulu ya.")}>
                <Ionicons name="add-circle" size={34} color={COLORS.accentGreen} />
            </TouchableOpacity>
        </View>

        <FlatList
            data={filteredAgendas}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text style={{color:'#888', fontStyle:'italic', marginTop:20, textAlign:'center'}}>Tidak ada agenda.</Text>}
            renderItem={({item}) => {
                
                const parts = item.participants || {};
                const isJoined = parts.hasOwnProperty(auth.currentUser?.uid);
                const count = Object.keys(parts).length;
                const isCreator = item.creatorUid === auth.currentUser?.uid;
                
                return (
                    <View style={styles.agendaItem}>
                        <View style={{flex:1}}>
                            <Text style={styles.agendaTitle}>{item.title}</Text>
                            <Text style={styles.agendaDesc}>{item.description}</Text>
                            <Text style={styles.agendaMeta}>
                                {item.date} • {isCreator ? "Anda" : item.creatorName} • {count} Orang
                            </Text>
                        </View>
                        {isJoined ? (
                            <TouchableOpacity style={styles.btnJoined} onPress={() => router.push('/(tabs)/chat')}>
                                <Text style={{color:'white', fontSize:12, fontWeight:'bold'}}>Chat</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.btnJoin} onPress={() => joinAgenda(item.id)}>
                                <Text style={{color:'white', fontSize:12, fontWeight:'bold'}}>Gabung</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            }}
        />
      </View>

      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Buat Agenda Baru</Text>
                <Text style={{marginBottom:10, color:'#666'}}>Tanggal: {selectedDate || "Hari Ini"}</Text>
                <TextInput style={styles.input} placeholder="Nama Kegiatan" value={title} onChangeText={setTitle}/>
                <TextInput style={styles.input} placeholder="Keterangan" value={desc} onChangeText={setDesc}/>
                <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}><Text>Batal</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleAddAgenda} style={styles.btnSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="white"/> : <Text style={{color:'white'}}>Simpan</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, paddingHorizontal: 20, marginBottom: 20 },
  detailContainer: { flex: 1, padding: 20, marginTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  agendaItem: { backgroundColor: COLORS.bgSecondary, padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent:'space-between', borderWidth:1, borderColor: COLORS.border },
  agendaTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  agendaDesc: { color: COLORS.textSecondary, marginTop: 2, fontSize: 12 },
  agendaMeta: { color: COLORS.accentGreen, marginTop: 5, fontSize: 10, fontWeight: 'bold' },
  btnJoin: { backgroundColor: COLORS.accentGreen, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  btnJoined: { backgroundColor: COLORS.bgTertiary, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth:1, borderColor: COLORS.accentGreen },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  input: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  btnCancel: { padding: 10 },
  btnSave: { backgroundColor: COLORS.accentGreen, padding: 10, borderRadius: 8 }
});