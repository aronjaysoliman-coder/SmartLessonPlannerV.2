import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Text } from "react-native";

function tabLabel(label: string) {
  return function TabBarLabel({ focused, color }: { focused: boolean; color: string }) {
    return (
      <Text style={{ color, fontSize: 12, fontFamily: focused ? "Inter_500Medium" : undefined }}>
        {label}
      </Text>
    );
  };
}

export default function AppLayout() {
  const { user, isLoading } = useAuth();

  if (!isLoading && !user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.primaryLight,
        tabBarItemStyle: { borderRadius: 16, marginHorizontal: 4 },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarLabel: tabLabel("Home"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-plans"
        options={{
          title: "My Plans",
          tabBarLabel: tabLabel("My Plans"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: tabLabel("Profile"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="upload-template" options={{ href: null }} />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: tabLabel("Settings"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
}
