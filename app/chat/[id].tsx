// app/chat/[id].tsx
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useState, useRef, useEffect, useMemo } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { ImageViewerModal } from "@/components/ImageViewerModal";
import { TypingDots } from "@/components/TypingDots";
import {
  SwipeableMessageItem,
  MessageItemData,
} from "@/components/SwipeableMessageItem";
import { ReplyPreviewBar, ReplyTarget } from "@/components/ReplyPreviewBar";

const TYPING_THROTTLE_MS = 1500;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  // Під час закриття екрана параметр id може тимчасово бути undefined —
  // у такому разі запити пропускаємо ("skip"), щоб не слати порожні аргументи
  const roomId = id ? (id as Id<"chatRooms">) : undefined;
  const room = useQuery(api.rooms.getRoom, roomId ? { roomId } : "skip");
  const messages = useQuery(
    api.messages.listMessages,
    roomId ? { chatRoomId: roomId } : "skip"
  );
  const currentUser = useQuery(api.users.currentUser);
  const typingData = useQuery(
    api.typing.getTypingUsers,
    roomId ? { chatRoomId: roomId } : "skip"
  );
  const setTyping = useMutation(api.typing.setTyping);
  const sendMessage = useMutation(api.messages.sendMessage);
  const editMessage = useMutation(api.messages.editMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const sendMediaMessage = useMutation(api.messages.sendMediaMessage);

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [editingMessageId, setEditingMessageId] =
    useState<Id<"messages"> | null>(null);
  const [selectedImage, setSelectedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  // Індикатор набору: Convex-запит не оновлюється сам із часом,
  // тому момент зникнення рахуємо на клієнті по таймеру.
  const lastTypingSentRef = useRef(0);
  const [typingTick, setTypingTick] = useState(0);
  const typingReceivedAt = useMemo(() => Date.now(), [typingData]);
  const activeTyping = (typingData ?? []).filter(
    (u) => typingReceivedAt + u.expiresInMs > Date.now()
  );

  useEffect(() => {
    if (activeTyping.length === 0) return;
    const nextExpiry = Math.min(
      ...activeTyping.map((u) => typingReceivedAt + u.expiresInMs)
    );
    const timeout = setTimeout(
      () => setTypingTick((t) => t + 1),
      Math.max(nextExpiry - Date.now(), 0) + 50
    );
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingData, typingTick]);

  // Введення тексту з тротлінгом запиту "друкує" (раз на 1.5 с)
  const handleTextChange = (text: string) => {
    setInputText(text);

    if (!roomId || !text.trim() || editingMessageId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > TYPING_THROTTLE_MS) {
      lastTypingSentRef.current = now;
      setTyping({ chatRoomId: roomId }).catch(() => {});
    }
  };

  // Автоматичне прокручування вниз при нових повідомленнях
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages?.length]);

  // Вибір фото з галереї
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        // Фото не поєднуємо з режимом редагування тексту
        setEditingMessageId(null);
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking image", error);
      Alert.alert("Помилка", "Не вдалося відкрити галерею");
    }
  };

  // Відправка тексту, фото або збереження змін
  const handleSend = async () => {
    const text = inputText.trim();
    if (!roomId || (!text && !selectedImage) || isSending) return;

    const previousEditingId = editingMessageId;
    const previousImage = selectedImage;
    const previousReply = replyTarget;
    const replyToId = previousReply
      ? (previousReply.messageId as Id<"messages">)
      : undefined;
    setInputText("");
    setEditingMessageId(null);
    setSelectedImage(null);
    setReplyTarget(null);
    setIsSending(true);

    try {
      if (previousImage) {
        // 1. Одноразове посилання, 2. прямий upload, 3. повідомлення з storageId
        const uploadUrl = await generateUploadUrl();
        const file = new File(previousImage.uri);

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": previousImage.mimeType ?? "image/jpeg" },
          body: file,
        });
        if (!uploadResponse.ok) throw new Error("Upload failed");

        const { storageId } = await uploadResponse.json();
        await sendMediaMessage({
          chatRoomId: roomId,
          storageId,
          caption: text || undefined,
          replyToId,
        });
      } else if (previousEditingId) {
        await editMessage({ messageId: previousEditingId, content: text });
      } else {
        await sendMessage({ chatRoomId: roomId, content: text, replyToId });
      }
    } catch (error) {
      console.error("Error sending message", error);
      // Повертаємо стан, щоб користувач нічого не втратив
      setInputText(text);
      setEditingMessageId(previousEditingId);
      setSelectedImage(previousImage);
      setReplyTarget(previousReply);
      Alert.alert("Помилка", "Не вдалося виконати дію");
    } finally {
      setIsSending(false);
    }
  };

  // Підтвердження видалення
  const confirmDelete = (messageId: Id<"messages">) => {
    Alert.alert(
      "Видалити повідомлення",
      "Ви впевнені, що хочете видалити повідомлення?",
      [
        { text: "Ні", style: "cancel" },
        {
          text: "Так, видалити",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMessage({ messageId });
              if (editingMessageId === messageId) cancelEditing();
            } catch (error) {
              console.error("Error deleting message", error);
              Alert.alert("Помилка", "Не вдалося видалити повідомлення");
            }
          },
        },
      ]
    );
  };

  // Початок відповіді на повідомлення (свайп або меню)
  const startReply = (message: MessageItemData) => {
    setReplyTarget({
      messageId: message._id,
      senderName: message.senderName,
      text: message.content ?? "",
    });
    // Відповідь і редагування взаємовиключні
    if (editingMessageId) cancelEditing();
  };

  // Меню дій над повідомленням (довге натискання)
  const handleMessageLongPress = (message: MessageItemData) => {
    const actions: {
      text: string;
      style?: "cancel" | "destructive";
      onPress?: () => void;
    }[] = [{ text: "Відповісти", onPress: () => startReply(message) }];

    if (message.senderId === currentUser?._id) {
      if (message.content || !message.imageUrl) {
        actions.push({
          text: "Редагувати",
          onPress: () => {
            setReplyTarget(null);
            setEditingMessageId(message._id);
            setInputText(message.content ?? "");
          },
        });
      }
      actions.push({
        text: "Видалити",
        style: "destructive",
        onPress: () => confirmDelete(message._id),
      });
    }

    actions.push({ text: "Скасувати", style: "cancel" });
    Alert.alert("Дії з повідомленням", "Оберіть дію:", actions);
  };

  // Скасування режиму редагування
  const cancelEditing = () => {
    setEditingMessageId(null);
    setInputText("");
  };

  // Явні стани замість нескінченного спінера
  if (!roomId || room === null) {
    return (
      <View className="flex-1 bg-surface justify-center items-center p-6">
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
        <Text className="text-ink text-lg font-bold mt-3">
          Кімнату не знайдено
        </Text>
        <Text className="text-textMuted text-xs mt-1 text-center">
          {roomId ? `id: ${roomId}` : "Не передано id кімнати (id = undefined)"}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(app)")}
          className="mt-4 bg-secondary px-5 py-2.5 rounded-xl border border-surfaceLight"
          activeOpacity={0.8}
        >
          <Text className="text-ink font-medium">До списку кімнат</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (room === undefined) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      className="flex-1 bg-surface"
    >
      <Stack.Screen
        options={{
          title: room.title,
          headerRight: () => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/settings/[id]",
                  params: { id: room._id },
                })
              }
              className="p-1"
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={COLORS.ink}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Список повідомлень */}
      {messages === undefined ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            gap: 12,
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={40}
                color={COLORS.textMuted}
              />
              <Text className="text-textMuted text-sm mt-2 text-center">
                Повідомлень ще немає. Напишіть першим!
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <SwipeableMessageItem
              item={item}
              isMe={!!currentUser && item.senderId === currentUser._id}
              onLongPress={handleMessageLongPress}
              onReply={startReply}
              onImagePress={setFullscreenImage}
              onAuthorPress={(userId) =>
                router.push({ pathname: "/user/[id]", params: { id: userId } })
              }
            />
          )}
        />
      )}

      {/* Індикатор набору тексту іншими користувачами */}
      {activeTyping.length > 0 && (
        <TypingDots typingUsers={activeTyping.map((u) => u.userName)} />
      )}

      {/* Прев'ю обраного фото перед відправкою */}
      {selectedImage && (
        <View className="flex-row items-center px-4 py-2 bg-secondary border-t border-surfaceLight">
          <Image
            source={{ uri: selectedImage.uri }}
            className="w-12 h-12 rounded-lg mr-3"
          />
          <Text className="text-ink text-xs flex-1">
            Фото додано до відправки
          </Text>
          <TouchableOpacity onPress={() => setSelectedImage(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* Панель відповіді на повідомлення */}
      {replyTarget && (
        <ReplyPreviewBar
          replyTarget={replyTarget}
          onCancel={() => setReplyTarget(null)}
        />
      )}

      {/* Панель режиму редагування */}
      {editingMessageId && (
        <View className="flex-row items-center justify-between px-4 py-2 bg-secondary border-t border-surfaceLight">
          <View className="flex-row items-center flex-1 mr-2">
            <Ionicons
              name="pencil"
              size={16}
              color={COLORS.primary}
              style={{ marginRight: 6 }}
            />
            <Text className="text-ink text-xs font-semibold">
              Редагування повідомлення
            </Text>
          </View>
          <TouchableOpacity onPress={cancelEditing} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Панель введення повідомлення */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 10) }}
        className="px-4 py-2 bg-surface border-t border-surfaceLight flex-row items-end gap-2"
      >
        <TouchableOpacity
          onPress={pickImage}
          disabled={isSending}
          className="w-11 h-11 rounded-2xl items-center justify-center bg-secondary"
          activeOpacity={0.8}
        >
          <Ionicons name="image-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        <TextInput
          className="flex-1 bg-secondary border border-surfaceLight rounded-2xl px-4 py-2.5 text-ink text-base max-h-28 min-h-[42px]"
          placeholder={
            selectedImage
              ? "Додайте опис до фото..."
              : replyTarget
                ? `Відповідь для ${replyTarget.senderName}...`
                : editingMessageId
                ? "Змініть текст..."
                : "Повідомлення..."
          }
          placeholderTextColor={COLORS.textMuted}
          value={inputText}
          onChangeText={handleTextChange}
          multiline
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={(!inputText.trim() && !selectedImage) || isSending}
          className={`w-11 h-11 rounded-2xl items-center justify-center ${
            (inputText.trim() || selectedImage) && !isSending ? "bg-primary" : "bg-secondary"
          }`}
          activeOpacity={0.8}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={editingMessageId ? "checkmark" : "send"}
              size={18}
              color={inputText.trim() || selectedImage ? "#FFFFFF" : COLORS.textMuted}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Повноекранний переглядач фото */}
      <ImageViewerModal
        visible={!!fullscreenImage}
        imageUrl={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />
    </KeyboardAvoidingView>
  );
}
