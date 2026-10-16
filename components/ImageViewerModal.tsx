// components/ImageViewerModal.tsx
import { Modal, View, Image, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
};

export function ImageViewerModal({ visible, imageUrl, onClose }: Props) {
  const insets = useSafeAreaInsets();

  if (!imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black justify-center items-center">
        {/* Кнопка закриття у правому верхньому кутку */}
        <TouchableOpacity
          onPress={onClose}
          style={{ top: Math.max(insets.top, 16) + 8 }}
          className="absolute right-6 z-20 w-10 h-10 rounded-full bg-black/50 items-center justify-center"
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <Image
          source={{ uri: imageUrl }}
          className="w-full h-4/5"
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
}
