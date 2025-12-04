import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { COLORS } from '../../src/config/theme';
import { auth, db } from '../../src/config/firebase';
import { ref, push, onValue, serverTimestamp } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const [viewMode, setViewMode] = useState<'list' | 'room'>('list'); 
  const [joinedAgendas, setJoinedAgendas] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const flatListRef = useRef<FlatList>(null);

  // 1. AMBIL DAFTAR CHAT (Agenda yang diikuti)
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const agendasRef = ref(db, 'agendas');
    const unsubscribe = onValue(agendasRef, (snapshot) => {
        const data = snapshot.val();
        const list: any[] = [];
        if (data) {
            Object.keys(data).forEach((key) => {
                const item = data[key];
                
                if (item.participants && item.participants[auth.currentUser?.uid || '']) {
                    list.push({ id: key, ...item });
                }
            });
        }
        setJoinedAgendas(list);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. AMBIL PESAN (Saat masuk room)
  useEffect(() => {
    if (viewMode === 'room' && activeChat) {
        setMessages([]); 
       
        const messagesRef = ref(db, `chats/${activeChat.id}`);
        
        const unsubscribe = onValue(messagesRef, (snapshot) => {
            const data = snapshot.val();
            const msgs: any[] = [];
            if (data) {
                Object.keys(data).forEach((key) => {
                    msgs.push({ id: key, ...data[key] });
                });
            }
            
            msgs.sort((a, b) => a.createdAt - b.createdAt);
            
            setMessages(msgs);
            
            
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 500);
        });
        
        return () => unsubscribe();
    }
  }, [viewMode, activeChat]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const msg = inputText;
    setInputText(''); 

    try {
        const messagesRef = ref(db, `chats/${activeChat.id}`);
        await push(messagesRef, {
            text: msg,
            senderId: auth.currentUser?.uid,
            senderName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0],
            createdAt: Date.now() 
        });
    } catch (e) { 
        console.log("Gagal kirim pesan:", e);
        setInputText(msg); 
    }
  };

  // --- TAMPILAN LIST CHAT ---
  if (viewMode === 'list') {
    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Diskusi Tim</Text>
            
            {loading ? (
                <ActivityIndicator size="large" color={COLORS.accentGreen} style={{marginTop: 50}} />
            ) : joinedAgendas.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textSecondary} />
                    <Text style={{color: COLORS.textSecondary, textAlign:'center', marginTop:10}}>
                        Anda belum bergabung ke agenda apapun.{"\n"}Silakan gabung di menu Agenda.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={joinedAgendas}
                    keyExtractor={item => item.id}
                    renderItem={({item}) => (
                        <TouchableOpacity 
                            style={styles.chatItem} 
                            onPress={() => { setActiveChat(item); setViewMode('room'); }}
                        >
                            <View style={styles.avatarGroup}>
                                <Text style={styles.avatarLetter}>{item.title?.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={{flex:1}}>
                                <Text style={styles.chatTitle}>{item.title}</Text>
                                <Text style={styles.chatSub}>{item.date}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
  }

  // --- TAMPILAN ROOM CHAT (FIX LAYOUT) ---
  return (
    <View style={styles.roomContainer}>
        {/* Header Chat */}
        <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setViewMode('list')} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View>
                <Text style={styles.headerTitleSmall}>{activeChat?.title}</Text>
                <Text style={styles.headerSubSmall}>Diskusi Grup</Text>
            </View>
        </View>

        {/* List Pesan */}
        <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
            renderItem={({item}) => {
                const isMe = item.senderId === auth.currentUser?.uid;
                return (
                    <View style={[
                        styles.msgBubble, 
                        isMe ? styles.msgMe : styles.msgOther
                    ]}>
                        {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}
                        <Text style={isMe ? styles.msgTextMe : styles.msgTextOther}>{item.text}</Text>
                        <Text style={[styles.msgTime, isMe ? {color:'#eee'} : {color:'#888'}]}>
                            {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Text>
                    </View>
                );
            }}
            ListEmptyComponent={
                <Text style={styles.emptyChatText}>Belum ada pesan. Sapa temanmu!</Text>
            }
        />

        {/* Input Area (Keyboard Handling) */}
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.inputArea}>
                <TextInput 
                    style={styles.input} 
                    value={inputText} 
                    onChangeText={setInputText} 
                    placeholder="Ketik pesan..." 
                    placeholderTextColor="#888"
                    multiline
                />
                <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={!inputText.trim()}>
                    <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary, paddingTop: 50 },
  roomContainer: { flex: 1, backgroundColor: COLORS.bgPrimary, paddingTop: 40 }, // Padding top untuk status bar
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  // List Styles
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, paddingHorizontal: 20, marginBottom: 20 },
  chatItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatarGroup: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.accentGreen, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarLetter: { color: 'white', fontWeight: 'bold', fontSize: 20 },
  chatTitle: { color: COLORS.textPrimary, fontWeight: 'bold', fontSize: 16 },
  chatSub: { color: COLORS.textSecondary, fontSize: 12 },

  
  chatHeader: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingVertical: 15, 
      paddingHorizontal: 15, 
      backgroundColor: COLORS.bgSecondary, 
      borderBottomWidth: 1, 
      borderBottomColor: COLORS.border 
  },
  backBtn: { marginRight: 15 },
  headerTitleSmall: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  headerSubSmall: { fontSize: 12, color: COLORS.textSecondary },

  msgBubble: { padding: 12, borderRadius: 12, marginBottom: 10, maxWidth: '80%' },
  msgMe: { alignSelf: 'flex-end', backgroundColor: COLORS.accentGreen, borderBottomRightRadius: 0 },
  msgOther: { alignSelf: 'flex-start', backgroundColor: COLORS.bgSecondary, borderBottomLeftRadius: 0 },
  
  msgTextMe: { color: 'white', fontSize: 15 },
  msgTextOther: { color: COLORS.textPrimary, fontSize: 15 },
  senderName: { color: COLORS.accentGreenHover, fontSize: 11, marginBottom: 4, fontWeight: 'bold' },
  msgTime: { fontSize: 9, marginTop: 5, alignSelf: 'flex-end' },
  
  emptyChatText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20, fontStyle: 'italic' },

  
  inputArea: { 
      flexDirection: 'row', 
      padding: 10, 
      paddingBottom: Platform.OS === 'android' ? 100 : 20, 
      backgroundColor: COLORS.bgSecondary, 
      alignItems: 'center', 
      borderTopWidth: 1, 
      borderTopColor: COLORS.border 
  },
  input: { 
      flex: 1, 
      backgroundColor: COLORS.bgPrimary, 
      color: 'white', 
      padding: 12, 
      borderRadius: 25, 
      marginRight: 10,
      maxHeight: 100 
  },
  sendBtn: { 
      backgroundColor: COLORS.accentGreen, 
      width: 45, 
      height: 45, 
      borderRadius: 25, 
      justifyContent: 'center', 
      alignItems: 'center' 
  }
});