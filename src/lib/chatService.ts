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
  deleteField,
} from 'firebase/firestore';
import { db } from './firebase';
import { getUserByUsername, getUserByEmail } from './userService';

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
export const safeId = (id: string) => id.replace(/\./g, '_');

/**
 * Normalize user ID - always use email if possible
 */
export async function normalizeUserId(userId: string): Promise<{id: string, name: string}> {
  console.log('Normalizing user ID:', userId);
  
  // If it's already an email, use it
  if (userId.includes('@')) {
    const userData = await getUserByEmail(userId);
    return {
      id: userId,
      name: userData?.name || userId.split('@')[0]
    };
  }
  
  // If it's a username (like seller_truthjoel165), look up the email
  const userData = await getUserByUsername(userId);
  if (userData) {
    console.log(`Found user data for ${userId}:`, userData.email);
    return {
      id: userData.email,  // Use email
      name: userData.name
    };
  }
  
  // If we can't find the user, return the original (but this shouldn't happen)
  console.warn(`Could not normalize user ID: ${userId}, using as-is`);
  return {
    id: userId,
    name: userId
  };
}

/** Get or create a chat between two users about a product */
export async function getOrCreateChat(
  currentUserId: string,
  currentUserName: string,
  otherUserId: string,
  otherUserName: string,
  productId?: string,    // now optional – used only when creating a new chat
  productTitle?: string,
  productImage?: string
): Promise<string> {
  try {
    console.log('=== getOrCreateChat START ===');
    
    // Normalize both IDs to emails (your existing logic)
    const normalizedCurrentUser = await normalizeUserId(currentUserId);
    const normalizedOtherUser = await normalizeUserId(otherUserId);

    if (normalizedCurrentUser.id === normalizedOtherUser.id) {
      throw new Error('Cannot start chat with yourself');
    }

    // Fetch fresh names
    const currentUserData = await getUserByEmail(normalizedCurrentUser.id);
    const otherUserData = await getUserByEmail(normalizedOtherUser.id);
    const currentName = currentUserData?.name || normalizedCurrentUser.name;
    const otherName = otherUserData?.name || normalizedOtherUser.name;

    const chatsRef = collection(db, 'chats');

    // 1️⃣ Look for ANY existing chat between these two users (no product filter)
    const q = query(chatsRef, where('participants', 'array-contains', normalizedCurrentUser.id));
    const snapshot = await getDocs(q);

    for (const docItem of snapshot.docs) {
      const chatData = docItem.data() as Chat;
      if (chatData.participants.includes(normalizedOtherUser.id)) {
        console.log('✅ Reusing existing chat (any product):', docItem.id);
        return docItem.id; // Return the existing chat ID
      }
    }

    // 2️⃣ No chat exists – create a new one with the current product details
    console.log('🆕 Creating new chat');
    const newChatData = {
      participants: [normalizedCurrentUser.id, normalizedOtherUser.id],
      participantNames: {
        [safeId(normalizedCurrentUser.id)]: currentName,
        [safeId(normalizedOtherUser.id)]: otherName,
      },
      participantAvatars: {
        [safeId(normalizedCurrentUser.id)]: currentName[0].toUpperCase(),
        [safeId(normalizedOtherUser.id)]: otherName[0].toUpperCase(),
      },
      productId: productId || '',
      productTitle: productTitle || '',
      productImage: productImage || '',
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      unreadCount: {
        [safeId(normalizedCurrentUser.id)]: 0,
        [safeId(normalizedOtherUser.id)]: 0,
      },
      createdAt: serverTimestamp(),
    };

    const newChatRef = await addDoc(chatsRef, newChatData);
    console.log('✅ Created new chat:', newChatRef.id);
    return newChatRef.id;
  } catch (err) {
    console.error('❌ Error in getOrCreateChat:', err);
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
    console.log('=== sendMessage START ===');
    console.log('Raw senderId:', senderId, 'Name:', senderName);
    
    // NORMALIZE senderId to email
    const normalizedSender = await normalizeUserId(senderId);
    console.log('Normalized sender:', normalizedSender.id, 'Name:', normalizedSender.name);
    
    // Use normalized sender ID
    const actualSenderId = normalizedSender.id;
    const actualSenderName = normalizedSender.name;
    
    console.log('Sending message to chat:', chatId, 'from:', actualSenderId);
    
    // Add the message
    const messageRef = await addDoc(collection(db, 'messages'), {
      chatId,
      senderId: actualSenderId,  // Use normalized ID
      senderName: actualSenderName,  // Use normalized name
      text,
      timestamp: serverTimestamp(),
      read: false,
    });

    console.log('✓ Message added with ID:', messageRef.id);

    // Update chat's last message & unread counts
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);

    if (chatDoc.exists()) {
      const chatData = chatDoc.data() as Chat;
      const updates: any = {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
      };

      // Increment unread count for all participants except sender
      chatData.participants.forEach((id) => {
        if (id !== actualSenderId) {  // Use normalized ID
          const currentUnread = chatData.unreadCount?.[safeId(id)] || 0;
          updates[`unreadCount.${safeId(id)}`] = currentUnread + 1;
          console.log(`Updating unread count for ${id} (${safeId(id)}): ${currentUnread + 1}`);
        }
      });

      await updateDoc(chatRef, updates);
      console.log('✓ Chat document updated');
    } else {
      console.error('❌ Chat document not found:', chatId);
    }
  } catch (err) {
    console.error('❌ Error sending message:', err);
    throw err;
  }
}

/** Subscribe to messages in a chat (real-time) */
export function subscribeToMessages(chatId: string, callback: (messages: Message[]) => void): () => void {
  console.log('=== subscribeToMessages called ===');
  console.log('Chat ID:', chatId);
  
  const messagesRef = collection(db, 'messages');
  const q = query(messagesRef, where('chatId', '==', chatId), orderBy('timestamp', 'asc'));

  console.log('Query created:', {
    collection: 'messages',
    condition: 'chatId == ' + chatId,
    orderBy: 'timestamp asc'
  });

  return onSnapshot(
    q,
    (snapshot) => {
      console.log('=== onSnapshot triggered ===');
      console.log(`Snapshot has ${snapshot.docs.length} documents`);
      console.log('Snapshot empty?', snapshot.empty);
      console.log('Snapshot metadata:', snapshot.metadata);
      
      // Log EACH document in detail
      snapshot.docs.forEach((docItem, index) => {
        const data = docItem.data();
        console.log(`--- Message ${index + 1} ---`);
        console.log('Document ID:', docItem.id);
        console.log('Text:', data.text);
        console.log('Sender ID:', data.senderId);
        console.log('Sender Name:', data.senderName);
        console.log('Timestamp:', data.timestamp);
        console.log('Timestamp as Date:', data.timestamp?.toDate?.());
        console.log('Read status:', data.read);
        console.log('Chat ID:', data.chatId);
        console.log('Full data:', JSON.stringify(data, null, 2));
      });
      
      const messages: Message[] = snapshot.docs.map((docItem) => {
        const data = docItem.data() as Omit<Message, 'id'>;
        return { id: docItem.id, ...data };
      });
      
      console.log('Calling callback with', messages.length, 'messages');
      callback(messages);
    },
    (error) => {
      console.error('=== ERROR in subscribeToMessages ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
    }
  );
}

/** Subscribe to user's chats (real-time) */
export function subscribeToChats(userId: string, callback: (chats: Chat[]) => void): () => void {
  console.log('=== subscribeToChats START ===');
  console.log('Normalized userId for subscription:', userId);
  
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef, 
    where('participants', 'array-contains', userId), 
    orderBy('lastMessageTime', 'desc')
  );
  
  return onSnapshot(
    q,
    (snapshot) => {
      console.log(`Received ${snapshot.docs.length} chats for userId: ${userId}`);
      const chats: Chat[] = snapshot.docs.map((docItem) => {
        const data = docItem.data() as Omit<Chat, 'id'>;
        return { id: docItem.id, ...data };
      });
      callback(chats);
    },
    (error) => {
      console.error('Error subscribing to chats:', error);
      // Return empty array on error to avoid hanging UI
      callback([]);
    }
  );
}

/** Mark messages as read */
export async function markMessagesAsRead(chatId: string, userId: string): Promise<void> {
  try {
    console.log('Marking messages as read for chat:', chatId, 'user:', userId);
    
    // Normalize userId to ensure consistency
    const normalizedUser = await normalizeUserId(userId);
    const normalizedUserId = normalizedUser.id;
    
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, { [`unreadCount.${safeId(normalizedUserId)}`]: 0 });

    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, 
      where('chatId', '==', chatId), 
      where('senderId', '!=', normalizedUserId), 
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);

    const promises = snapshot.docs.map((docItem) => 
      updateDoc(doc(db, 'messages', docItem.id), { read: true })
    );
    await Promise.all(promises);
    
    console.log(`Marked ${snapshot.docs.length} messages as read`);
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
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  }
}

/** Check and fix chat participant IDs if needed */
export async function ensureChatParticipantsNormalized(chatId: string): Promise<void> {
  try {
    console.log('=== Checking chat normalization ===');
    console.log('Chat ID:', chatId);
    
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      console.log('Chat not found');
      return;
    }
    
    const chatData = chatDoc.data() as Chat;
    console.log('Current participants:', chatData.participants);
    
    let needsFix = false;
    const updates: any = {};
    
    // Check each participant
    for (let i = 0; i < chatData.participants.length; i++) {
      const participant = chatData.participants[i];
      
      // If participant looks like a username (starts with seller_ and no @)
      if (participant.startsWith('seller_') && !participant.includes('@')) {
        console.log('Found username participant that needs normalization:', participant);
        needsFix = true;
        
        // Try to get the email for this username
        const userData = await getUserByUsername(participant);
        if (userData && userData.email) {
          console.log(`Normalizing ${participant} -> ${userData.email}`);
          
          // Update participant in array
          chatData.participants[i] = userData.email;
          
          // Update maps
          const oldSafeId = safeId(participant);
          const newSafeId = safeId(userData.email);
          
          // Update participantNames
          if (chatData.participantNames[oldSafeId]) {
            updates[`participantNames.${newSafeId}`] = chatData.participantNames[oldSafeId];
            updates[`participantNames.${oldSafeId}`] = deleteField();
          }
          
          // Update participantAvatars
          if (chatData.participantAvatars[oldSafeId]) {
            updates[`participantAvatars.${newSafeId}`] = chatData.participantAvatars[oldSafeId];
            updates[`participantAvatars.${oldSafeId}`] = deleteField();
          }
          
          // Update unreadCount
          if (chatData.unreadCount[oldSafeId] !== undefined) {
            updates[`unreadCount.${newSafeId}`] = chatData.unreadCount[oldSafeId];
            updates[`unreadCount.${oldSafeId}`] = deleteField();
          }
        }
      }
    }
    
    if (needsFix) {
      updates.participants = chatData.participants;
      console.log('Applying fixes to chat:', updates);
      await updateDoc(chatRef, updates);
      console.log('✅ Chat normalized successfully');
    } else {
      console.log('✅ Chat already normalized');
    }
  } catch (error) {
    console.error('❌ Error normalizing chat:', error);
  }
}