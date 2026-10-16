// app/user/[id].tsx
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileStats } from "@/components/ProfileStats";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const userId = id ? (id as Id<"users">) : undefined;
  const profile = useQuery(
    api.users.getUserProfile,
    userId ? { userId } : "skip"
  );
  const currentUser = useQuery(api.users.currentUser);

  const isOwnProfile = !!currentUser && currentUser._id === userId;

  if (profile === undefined) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (profile === null) {
    return (
      <View className="flex-1 bg-surface justify-center items-center p-6">
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
        <Text className="text-ink text-lg font-bold mt-3">
          Користувача не знайдено
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 bg-secondary px-5 py-2.5 rounded-xl border border-surfaceLight"
          activeOpacity={0.8}
        >
          <Text className="text-ink font-medium">Повернутися</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ padding: 20 }}
    >
      <Stack.Screen options={{ title: profile.name }} />

      {/* Фото та основні дані */}
      <View className="items-center mt-4 mb-6">
        <ProfileAvatar uri={profile.image} />

        <Text className="text-ink text-2xl font-bold">{profile.name}</Text>

        {profile.username ? (
          <Text className="text-primary text-sm font-semibold mt-0.5">
            @{profile.username}
          </Text>
        ) : null}

        {isOwnProfile && (
          <View className="bg-primary/20 px-2 py-0.5 rounded-full mt-2">
            <Text className="text-primary text-xs font-semibold">
              Це ваш акаунт
            </Text>
          </View>
        )}

        {/* Статус / Bio */}
        {profile.bio ? (
          <View className="mt-4 px-4 py-3 bg-secondary rounded-2xl border border-surfaceLight w-full">
            <Text className="text-textMuted text-xs font-semibold uppercase mb-1">
              Статус
            </Text>
            <Text className="text-ink text-sm leading-5">{profile.bio}</Text>
          </View>
        ) : null}
      </View>

      {/* Статистика активності учасника */}
      <ProfileStats {...profile.stats} />

      {/* Інформація про реєстрацію */}
      <View className="bg-secondary/60 border border-surfaceLight rounded-2xl p-4 flex-row items-center mb-6">
        <Ionicons
          name="calendar-outline"
          size={20}
          color={COLORS.textMuted}
          style={{ marginRight: 10 }}
        />
        <Text className="text-textMuted text-xs">
          Учасник з{" "}
          {new Date(profile._creationTime).toLocaleDateString([], {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Text>
      </View>

      {/* Кнопка повернення до чату */}
      <TouchableOpacity
        onPress={() => router.back()}
        className="bg-secondary border border-surfaceLight rounded-2xl py-3.5 items-center justify-center active:opacity-80"
        activeOpacity={0.8}
      >
        <Text className="text-ink font-bold text-base">
          Повернутися до розмови
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
