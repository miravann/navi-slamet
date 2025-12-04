import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../src/config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/config/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Cek jika user sudah login, langsung lempar ke Tabs
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/(tabs)');
      } else {
        setCheckingAuth(false);
      }
    });
    return unsub;
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Mohon isi email dan password');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: email,
            username: email.split('@')[0],
            photoURL: 'https://ui-avatars.com/api/?name=' + email + '&background=0D8ABC&color=fff',
            createdAt: new Date()
        });
        Alert.alert('Sukses', 'Akun berhasil dibuat!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // Router akan di-handle oleh useEffect di atas
    } catch (error) {
      // Menangani error code Firebase agar lebih mudah dibaca
      let msg = error.message;
      if (error.code === 'auth/invalid-credential') msg = "Email atau password salah.";
      if (error.code === 'auth/email-already-in-use') msg = "Email sudah terdaftar.";
      if (error.code === 'auth/weak-password') msg = "Password terlalu lemah.";
      if (error.code === 'auth/operation-not-allowed') msg = "Login Email belum diaktifkan di Firebase Console.";
      Alert.alert('Gagal', msg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.accentGreen} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="navigate-circle" size={80} color={COLORS.accentGreen} />
        <Text style={styles.title}>Slamet-Navi</Text>
        <Text style={styles.subtitle}>{isRegistering ? 'Daftar Akun Baru' : 'Masuk ke Aplikasi'}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="email@contoh.com"
          placeholderTextColor={COLORS.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="********"
          placeholderTextColor={COLORS.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{isRegistering ? 'Daftar' : 'Masuk'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)} style={styles.switchButton}>
          <Text style={styles.switchText}>
            {isRegistering ? 'Sudah punya akun? Login' : 'Belum punya akun? Daftar'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.guestButton}>
            <Text style={styles.guestText}>Masuk sebagai Tamu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.accentGreen,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  form: {
    backgroundColor: COLORS.bgSecondary,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  label: {
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '600'
  },
  input: {
    backgroundColor: COLORS.bgPrimary,
    color: COLORS.textPrimary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: {
    backgroundColor: COLORS.accentGreen,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: COLORS.accentGreen,
  },
  guestButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  guestText: {
    color: COLORS.textSecondary,
    textDecorationLine: 'underline'
  }
});