// components/EditProfileModal.tsx
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { COLORS } from "@/constants/theme";

const NAME_MAX = 50;
const USERNAME_MAX = 20;
const BIO_MAX = 150;

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: {
    name?: string;
    username?: string;
    bio?: string;
    image?: string;
  } | null;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  currentUser,
}) => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  // Новий обраний файл (якщо користувач змінив фото) і прев'ю
  const [newAvatar, setNewAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const generateAvatarUploadUrl = useMutation(api.users.generateAvatarUploadUrl);

  // Скидаємо форму до поточних даних щоразу, коли вікно відкривається
  useEffect(() => {
    if (visible) {
      setName(currentUser?.name ?? "");
      setUsername(currentUser?.username ?? "");
      setBio(currentUser?.bio ?? "");
      setNewAvatar(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const avatarPreview = newAvatar?.uri ?? currentUser?.image ?? null;

  // Вибір фото з галереї
  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Потрібен доступ", "Дозвольте додатку доступ до галереї для вибору фото.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setNewAvatar(result.assets[0]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Помилка", "Не вдалося вибрати аватар");
    }
  };

  // Збереження змін
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Помилка", "Ім'я не може бути порожнім");
      return;
    }

    try {
      setIsSubmitting(true);
      let avatarStorageId: Id<"_storage"> | undefined;

      // Якщо вибрано новий файл — завантажуємо його напряму в Convex Storage
      if (newAvatar) {
        const uploadUrl = await generateAvatarUploadUrl();
        const file = new File(newAvatar.uri);

        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": newAvatar.mimeType ?? "image/jpeg" },
          body: file,
        });

        if (!uploadResult.ok) throw new Error("Не вдалося завантажити фото");

        const { storageId } = await uploadResult.json();
        avatarStorageId = storageId;
      }

      await updateUserProfile({
        name: name.trim(),
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarStorageId,
      });

      onClose();
    } catch (error) {
      console.error(error);
      // ConvexError містить зрозуміле для користувача повідомлення (валідація на сервері)
      const message =
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : error instanceof Error && error.message === "Не вдалося завантажити фото"
            ? error.message
            : "Не вдалося оновити профіль";
      Alert.alert("Помилка", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="bg-surface rounded-t-3xl border-t border-surfaceLight max-h-[90%] p-6">
          {/* Заголовок модального вікна */}
          <View className="flex-row items-center justify-between pb-4 border-b border-surfaceLight">
            <Text className="text-ink text-lg font-bold">Редагувати профіль</Text>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting} hitSlop={8}>
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="mt-4"
          >
            {/* Вибір фото профілю */}
            <View className="items-center my-4">
              <TouchableOpacity
                onPress={pickAvatar}
                disabled={isSubmitting}
                className="relative"
                activeOpacity={0.8}
              >
                <View className="w-24 h-24 rounded-full bg-secondary border-2 border-primary/50 overflow-hidden items-center justify-center">
                  {avatarPreview ? (
                    <Image
                      source={{ uri: avatarPreview }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="person" size={44} color={COLORS.primary} />
                  )}
                </View>
                <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary items-center justify-center border-2 border-surface">
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text className="text-primary text-xs font-semibold mt-2">Змінити фотографію</Text>
            </View>

            {/* Поле: Ім'я */}
            <View className="mb-4">
              <Text className="text-textMuted text-xs font-semibold uppercase mb-1.5">
                Ім'я користувача *
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ваше повне ім'я"
                placeholderTextColor={COLORS.textMuted}
                maxLength={NAME_MAX}
                className="bg-secondary border border-surfaceLight rounded-xl px-4 py-3 text-ink text-base"
              />
            </View>

            {/* Поле: Нікнейм */}
            <View className="mb-4">
              <Text className="text-textMuted text-xs font-semibold uppercase mb-1.5">
                Нікнейм (@username)
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="alex_dev"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={USERNAME_MAX + 1} // +1 на випадок, якщо користувач вводить «@»
                className="bg-secondary border border-surfaceLight rounded-xl px-4 py-3 text-ink text-base"
              />
              <Text className="text-textMuted text-[11px] mt-1">
                Латиниця, цифри та «_», від 3 до 20 символів
              </Text>
            </View>

            {/* Поле: Статус / Bio */}
            <View className="mb-6">
              <Text className="text-textMuted text-xs font-semibold uppercase mb-1.5">
                Про себе (Статус)
              </Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Розробляю чудові додатки на React Native 🚀"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                maxLength={BIO_MAX}
                textAlignVertical="top"
                className="bg-secondary border border-surfaceLight rounded-xl px-4 py-3 text-ink text-base min-h-[80px]"
              />
              <Text className="text-textMuted text-[11px] mt-1 text-right">
                {bio.length}/{BIO_MAX}
              </Text>
            </View>

            {/* Кнопка збереження */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSubmitting}
              className="bg-primary rounded-xl py-3.5 items-center justify-center active:opacity-80 mb-6"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-base">Зберегти зміни</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
