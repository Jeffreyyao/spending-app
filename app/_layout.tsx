import { useFonts } from 'expo-font';
import { Tabs } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { List, User, Wallet } from "lucide-react-native";
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Don't render until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Use system font as fallback for web if custom font fails
  const headerFontFamily = Platform.OS === 'web' && !fontsLoaded ? 'monospace' : 'SpaceMono';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#666",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E5EA",
          paddingBottom: 3,
          paddingTop: 3,
          height: 60,
        },
        headerStyle: {
          backgroundColor: "#666",
        },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: {
          fontWeight: "bold",
          fontFamily: headerFontFamily,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Spendings",
          tabBarIcon: ({ color, size }) => (
            <Wallet size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color, size }) => (
            <List size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="personal"
        options={{
          title: "Personal",
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
