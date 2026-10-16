// components/ProfileAvatar.tsx
import { View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

export function ProfileAvatar({ uri }: { uri?: string | null }) {
  return (
    <View className="w-28 h-28 rounded-full bg-secondary border-4 border-primary/40 items-center justify-center overflow-hidden mb-3">
      {uri ? (
        <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
      ) : (
        <Ionicons name="person" size={54} color={COLORS.primary} />
      )}
    </View>
  );
}
