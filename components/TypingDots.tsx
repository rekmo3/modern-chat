// components/TypingDots.tsx
import { View, Text, Animated } from "react-native";
import { useEffect, useRef } from "react";

type Props = {
  typingUsers: string[];
};

export function TypingDots({ typingUsers }: Props) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Кожна крапка стрибає з власною затримкою старту (хвиля)
    const animateDot = (dot: Animated.Value, startDelay: number) =>
      Animated.sequence([
        Animated.delay(startDelay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, {
              toValue: -4,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.delay(300),
          ])
        ),
      ]);

    const anims = [
      animateDot(dot1, 0),
      animateDot(dot2, 150),
      animateDot(dot3, 300),
    ];
    anims.forEach((a) => a.start());

    return () => anims.forEach((a) => a.stop());
  }, [dot1, dot2, dot3]);

  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0]} друкує`
      : `${typingUsers.join(", ")} друкують`;

  return (
    <View className="flex-row items-center px-4 py-1.5 bg-surface">
      <Text className="text-textMuted text-xs mr-2" numberOfLines={1}>
        {text}
      </Text>
      <View className="flex-row items-center gap-1">
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary"
            style={{ transform: [{ translateY: dot }] }}
          />
        ))}
      </View>
    </View>
  );
}
