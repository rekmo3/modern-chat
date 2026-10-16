// app/profile.tsx
import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import { EditProfileModal } from "@/components/EditProfileModal";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileStats } from "@/components/ProfileStats";

export default function ProfileScreen() {
  const router = useRouter();
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Статистика активності (чекаємо, поки завантажиться поточний користувач)
  const profile = useQuery(
    api.users.getUserProfile,
    user?._id ? { userId: user._id } : "skip"
  );

  const handleSignOut = () => {
    Alert.alert("Вихід з акаунта", "Ви дійсно бажаєте вийти з додатку?", [
      { text: "Скасувати", style: "cancel" },
      {
        text: "Вийти",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (user === undefined) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ padding: 20 }}
    >
      {/* Шапка профілю */}
      <View className="items-center mt-4 mb-6">
        <ProfileAvatar uri={user?.image} />

        <Text className="text-ink text-2xl font-bold">
          {user?.name ?? "Користувач"}
        </Text>

        {user?.username ? (
          <Text className="text-primary text-sm font-semibold mt-0.5">
            @{user.username}
          </Text>
        ) : null}

        <Text className="text-textMuted text-sm mt-1">{user?.email}</Text>

        {/* Статус / Bio */}
        {user?.bio ? (
          <View className="mt-3 px-4 py-2 bg-secondary rounded-xl border border-surfaceLight max-w-[90%]">
            <Text className="text-ink/90 text-sm text-center italic">
              {user.bio}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Статистика активності */}
      {profile ? (
        <ProfileStats {...profile.stats} />
      ) : profile === undefined && user ? (
        <View className="h-28 mb-6 items-center justify-center">
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : null}

      {/* Дії з акаунтом */}
      <View className="gap-3">
        <TouchableOpacity
          onPress={() => setIsEditModalOpen(true)}
          className="flex-row items-center justify-center bg-primary rounded-2xl py-3.5 px-4 active:opacity-80"
          activeOpacity={0.8}
        >
          <Ionicons
            name="create-outline"
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text className="text-white font-bold text-base">
            Редагувати профіль
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSignOut}
          className="flex-row items-center justify-center bg-danger/10 border border-danger/30 rounded-2xl py-3.5 px-4 active:bg-danger/20"
          activeOpacity={0.8}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={COLORS.danger}
            style={{ marginRight: 8 }}
          />
          <Text className="text-danger text-base font-bold">
            Вийти з акаунту
          </Text>
        </TouchableOpacity>
      </View>

      {/* Модальне вікно редагування */}
      <EditProfileModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentUser={user}
      />
    </ScrollView>
  );
}
