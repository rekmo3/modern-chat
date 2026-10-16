// components/ReplyPreviewBar.tsx
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

export interface ReplyTarget {
  messageId: string;
  senderName: string;
  text: string;
}

interface ReplyPreviewBarProps {
  replyTarget: ReplyTarget;
  onCancel: () => void;
}

// Панель над полем вводу: кому і на що відповідає користувач
export function ReplyPreviewBar({ replyTarget, onCancel }: ReplyPreviewBarProps) {
  return (
    <View className="flex-row items-center justify-between px-4 py-2 bg-secondary border-t border-surfaceLight border-l-4 border-l-primary">
      <View className="flex-row items-center flex-1 mr-2">
        <Ionicons
          name="arrow-undo"
          size={18}
          color={COLORS.primary}
          style={{ marginRight: 8 }}
        />
        <View className="flex-1">
          <Text className="text-primary font-bold text-xs">
            Відповідь для {replyTarget.senderName}
          </Text>
          <Text className="text-textMuted text-xs mt-0.5" numberOfLines={1}>
            {replyTarget.text || "📷 Фото"}
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={onCancel} hitSlop={8}>
        <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
