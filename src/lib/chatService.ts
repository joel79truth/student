import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Timestamp;
  read: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  participantNames: { [userId: string]: string };
  participantAvatars: { [userId: string]: string };
  productId: string;
  productTitle: string;
  productImage: string;
  lastMessage: string;
  lastMessageTime: Timestamp;
  unreadCount: { [userId: string]: number };
  createdAt: Timestamp;
}

// Utility to safely store IDs as Firestore map keys
const safeId = (id: string) => id.replace(/\./g, '_');

/** Get or create a chat between two users about a product */
export async function getOrCreateChat(
  currentUserId: string,
  currentUserName: string,
  otherUserId: string,
  otherUserName: string,
  productId: string,
  productTitle: string,
  productImage: string
): Promise<string> {
  try {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', currentUserId));
    const snapshot = await getDocs(q);

    for (const docItem of snapshot.docs) {
      const chatData = docItem.data() as Chat;
      if (chatData.participants.includes(otherUserId) && chatData.productId === productId) {
        return docItem.id;
      }
    }

    const newChatRef = await addDoc(chatsRef, {
      participants: [currentUserId, otherUserId],
      participantNames: {
        [currentUserId]: currentUserName,
        [otherUserId]: otherUserName,
      },
      participantAvatars: {
        [currentUserId]: currentUserName[0].toUpperCase(),
        [otherUserId]: otherUserName[0].toUpperCase(),
      },
      productId,
      productTitle,
      productImage,
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      unreadCount: {
        [safeId(currentUserId)]: 0,
        [safeId(otherUserId)]: 0,
      },
      createdAt: serverTimestamp(),
    });

    return newChatRef.id;
  } catch (err) {
    console.error('Error creating chat:', err);
    throw err;
  }
}

/** Send a message in a chat */
export async function sendMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<void> {
  try {
    // Add the message
    await addDoc(collection(db, 'messages'), {
      chatId,
      senderId,
      senderName,
      text,
      timestamp: serverTimestamp(),
      read: false,
    });

    // Update chat's last message & unread counts
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);

    if (chatDoc.exists()) {
      const chatData = chatDoc.data() as Chat;
      const updates: any = {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
      };

      chatData.participants.forEach((id) => {
        if (id !== senderId) {
          updates[`unreadCount.${safeId(id)}`] = (chatData.unreadCount?.[safeId(id)] || 0) + 1;
        }
      });

      await updateDoc(chatRef, updates);
    }
  } catch (err) {
    console.error('Error sending message:', err);
    throw err;
  }
}

/** Subscribe to messages in a chat (real-time) */
export function subscribeToMessages(chatId: string, callback: (messages: Message[]) => void): () => void {
  const messagesRef = collection(db, 'messages');
  const q = query(messagesRef, where('chatId', '==', chatId), orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = snapshot.docs.map((docItem) => {
      const data = docItem.data() as Omit<Message, 'id'>;
      return { id: docItem.id, ...data };
    });
    callback(messages);
  });
}

/** Subscribe to user's chats (real-time) */
export function subscribeToChats(userId: string, callback: (chats: Chat[]) => void): () => void {
  const chatsRef = collection(db, 'chats');
  const q = query(chatsRef, where('participants', 'array-contains', userId), orderBy('lastMessageTime', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const chats: Chat[] = snapshot.docs.map((docItem) => {
      const data = docItem.data() as Omit<Chat, 'id'>;
      return { id: docItem.id, ...data };
    });
    callback(chats);
  });
}

/** Mark messages as read */
export async function markMessagesAsRead(chatId: string, userId: string): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, { [`unreadCount.${safeId(userId)}`]: 0 });

    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where('chatId', '==', chatId), where('senderId', '!=', userId), where('read', '==', false));
    const snapshot = await getDocs(q);

    const promises = snapshot.docs.map((docItem) => updateDoc(doc(db, 'messages', docItem.id), { read: true }));
    await Promise.all(promises);
  } catch (err) {
    console.error('Error marking messages read:', err);
  }
}

/** Format timestamp to readable time */
export function formatMessageTime(timestamp: Timestamp | null): string {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/** Format timestamp for message display */
export function formatMessageTimestamp(timestamp: Timestamp | null): string {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  }
}
