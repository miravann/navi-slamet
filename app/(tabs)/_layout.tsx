import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/config/theme';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgSecondary,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 100, 
          paddingBottom: 20, 
          paddingTop: 10,
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: COLORS.accentGreen,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 5 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Peta', tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} /> }} />
      <Tabs.Screen name="routes" options={{ title: 'Info Rute', tabBarIcon: ({ color }) => <Ionicons name="information-circle" size={24} color={color} /> }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} /> }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={24} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} /> }} />
    </Tabs>
  );
}