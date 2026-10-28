import { useAuth } from "@/lib/auth";
import { colors, fonts } from "@/lib/theme";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Text } from "react-native";

function tabLabel(label: string) {
  return function TabBarLabel({ focused, color }: { focused: boolean; color: string }) {
    return (
      <Text style={{ color, fontSize: 11.5, fontFamily: focused ? fonts.bold : fonts.medium }}>
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
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen name="setup" options={{ title: "Setup", tabBarLabel: tabLabel("Setup") }} />
      <Tabs.Screen name="activities" options={{ title: "Activities", tabBarLabel: tabLabel("Activities") }} />
      <Tabs.Screen name="editor" options={{ title: "Editor", tabBarLabel: tabLabel("Editor") }} />
      <Tabs.Screen name="preview" options={{ title: "Preview", tabBarLabel: tabLabel("Preview") }} />
    </Tabs>
  );
}
