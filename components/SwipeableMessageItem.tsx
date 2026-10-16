// components/SwipeableMessageItem.tsx
import { View, Text, TouchableOpacity, Image } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import { Id } from "@/convex/_generated/dataModel";

export interface MessageItemData {
  _id: Id<"messages">;
  _creationTime: number;
  senderId: Id<"users">;
  senderName: string;
  senderPhoto?: string;
  content?: string;
  imageUrl?: string;
  isEdited?: boolean;
  replyToId?: Id<"messages">;
  replyToSender?: string;
  replyToText?: string;
}

interface SwipeableMessageItemProps {
  item: MessageItemData;
  isMe: boolean;
  onLongPress: (item: MessageItemData) => void;
  onReply: (item: MessageItemData) => void;
  onImagePress: (url: string) => void;
  onAuthorPress?: (userId: Id<"users">) => void;
}

const SWIPE_THRESHOLD = 50;
const MAX_SWIPE = 80;

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

export function SwipeableMessageItem({
  item,
  isMe,
  onLongPress,
  onReply,
  onImagePress,
  onAuthorPress,
}: SwipeableMessageItemProps) {
  const translateX = useSharedValue(0);

  const triggerReply = () => onReply(item);

  // Свайп вправо; вертикальний рух віддаємо FlatList, щоб не заважати прокрутці
  const panGesture = Gesture.Pan()
    .activeOffsetX(10)
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      translateX.value = Math.max(0, Math.min(event.translationX, MAX_SWIPE));
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(triggerReply)();
      }
      translateX.value = withSpring(0, { damping: 16, stiffness: 200 });
    });

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => {
    const progress = Math.min(translateX.value / SWIPE_THRESHOLD, 1);
    return {
      opacity: progress,
      transform: [{ scale: 0.5 + progress * 0.5 }],
    };
  });

  const mutedText = isMe ? "text-white/70" : "text-textMuted";

  return (
    <View className="justify-center">
      {/* Іконка відповіді, що з'являється під час свайпу */}
      <Animated.View
        style={animatedIconStyle}
        className="absolute left-1 w-8 h-8 rounded-full bg-primary/30 items-center justify-center"
      >
        <Ionicons name="arrow-undo" size={18} color={COLORS.primary} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={animatedRowStyle}
          className={`flex-row items-end gap-2 ${
            isMe ? "justify-end" : "justify-start"
          }`}
        >
          {!isMe && (
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={6}
              onPress={() => onAuthorPress?.(item.senderId)}
              className="w-7 h-7 rounded-full bg-secondary border border-surfaceLight items-center justify-center mb-1 overflow-hidden"
            >
              {item.senderPhoto ? (
                <Image
                  source={{ uri: item.senderPhoto }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-textMuted text-xs font-bold">
                  {item.senderName[0]?.toUpperCase() ?? "U"}
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            delayLongPress={300}
            onLongPress={() => onLongPress(item)}
            className={`max-w-[78%] px-4 py-2.5 rounded-2xl ${
              isMe
                ? "bg-primary rounded-br-none"
                : "bg-secondary border border-surfaceLight rounded-bl-none"
            }`}
          >
            {!isMe && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onAuthorPress?.(item.senderId)}
                onLongPress={() => onLongPress(item)}
                delayLongPress={300}
                className="self-start"
              >
                <Text className="text-primary text-xs font-bold mb-1">
                  {item.senderName}
                </Text>
              </TouchableOpacity>
            )}

            {/* Цитата оригінального повідомлення */}
            {item.replyToId && (
              <View
                className={`mb-2 px-2 py-1.5 rounded-lg border-l-2 ${
                  isMe
                    ? "bg-black/15 border-white/70"
                    : "bg-surface border-primary"
                }`}
              >
                <Text
                  className={`text-[11px] font-semibold ${
                    isMe ? "text-white" : "text-primary"
                  }`}
                  numberOfLines={1}
                >
                  {item.replyToSender ?? "Повідомлення"}
                </Text>
                <Text
                  className={`text-xs mt-0.5 ${isMe ? "text-white/80" : "text-textMuted"}`}
                  numberOfLines={2}
                >
                  {item.replyToText || "📷 Фото"}
                </Text>
              </View>
            )}

            {item.imageUrl && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onImagePress(item.imageUrl!)}
                onLongPress={() => onLongPress(item)}
                delayLongPress={300}
                className="mb-1 rounded-xl overflow-hidden"
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  className="w-56 h-56 rounded-xl bg-surfaceLight"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}

            {item.content ? (
              <Text
                className={`text-base leading-5 ${isMe ? "text-white" : "text-ink"}`}
              >
                {item.content}
              </Text>
            ) : null}

            <View className="flex-row items-center justify-end mt-1 gap-1">
              {item.isEdited && (
                <Text className={`text-[10px] italic ${mutedText}`}>(ред.)</Text>
              )}
              <Text className={`text-[10px] ${mutedText}`}>
                {formatTime(item._creationTime)}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
