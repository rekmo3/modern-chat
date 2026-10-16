// components/ProfileStats.tsx
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

interface ProfileStatsProps {
  messagesCount: number;
  roomsCreatedCount: number;
  messagesCapped?: boolean;
  roomsCapped?: boolean;
}

// Якщо підрахунок упирається в серверний ліміт — показуємо «1000+»
const formatCount = (count: number, capped?: boolean) =>
  capped ? `${count}+` : String(count);

export function ProfileStats({
  messagesCount,
  roomsCreatedCount,
  messagesCapped,
  roomsCapped,
}: ProfileStatsProps) {
  return (
    <View className="flex-row gap-3 mb-6">
      <View className="flex-1 bg-secondary border border-surfaceLight rounded-2xl p-4 items-center">
        <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mb-2">
          <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary} />
        </View>
        <Text className="text-ink text-xl font-bold">
          {formatCount(messagesCount, messagesCapped)}
        </Text>
        <Text className="text-textMuted text-xs mt-0.5">Повідомлень</Text>
      </View>

      <View className="flex-1 bg-secondary border border-surfaceLight rounded-2xl p-4 items-center">
        <View className="w-10 h-10 rounded-full bg-accent/20 items-center justify-center mb-2">
          <Ionicons name="folder" size={20} color={COLORS.accent} />
        </View>
        <Text className="text-ink text-xl font-bold">
          {formatCount(roomsCreatedCount, roomsCapped)}
        </Text>
        <Text className="text-textMuted text-xs mt-0.5">Створено кімнат</Text>
      </View>
    </View>
  );
}
