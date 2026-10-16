// components/InitialLayout.tsx
import { useEffect } from "react";
import { useConvexAuth } from "@convex-dev/auth/react";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter, useSegments } from "expo-router";
import { COLORS } from "@/constants/theme";

export default function InitialLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthScreen = segments[0] === "(auth)";

    if (isAuthenticated) {
      if (inAuthScreen) {
        router.replace("/(app)");
      }
    } else {
      if (!inAuthScreen) {
        router.replace("/(auth)/login");
      }
    }

    SplashScreen.hideAsync();
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Екрани поза групою (app) мають власний заголовок */}
      <Stack.Screen
        name="chat/[id]"
        options={{
          headerShown: true,
          title: "Чат",
          headerBackTitle: "Назад",
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.ink,
          headerTitleStyle: { fontWeight: "bold" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.surface },
        }}
      />
      <Stack.Screen
        name="user/[id]"
        options={{
          headerShown: true,
          title: "Профіль учасника",
          headerBackTitle: "Назад",
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.ink,
          headerTitleStyle: { fontWeight: "bold" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.surface },
        }}
      />
      <Stack.Screen
        name="new-room"
        options={{
          headerShown: true,
          presentation: "modal",
          title: "Нова кімната",
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.ink,
          headerTitleStyle: { fontWeight: "bold" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.surface },
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          presentation: "modal",
          title: "Профіль",
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.ink,
          headerTitleStyle: { fontWeight: "bold" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.surface },
        }}
      />
      <Stack.Screen
        name="settings/[id]"
        options={{
          headerShown: true,
          presentation: "modal",
          title: "Інформація про кімнату",
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.ink,
          headerTitleStyle: { fontWeight: "bold" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.surface },
        }}
      />
    </Stack>
  );
}
