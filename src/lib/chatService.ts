// chatService.ts

import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  DocumentData
} from "firebase/firestore";
import { db } from "../firebase";

/* ================= TYPES ================= */

export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date;
  readBy: string[];
}

export interface Chat {
  id: string;
  users: string[];
  productId: string;
  productTitle: string;
  lastMessage: string;
  lastMessageAt: Date;
}

/* ================================================= */
/* =============== GET OR CREATE CHAT ============== */
/* ================================================= */

export async function getOrCreateChat(
  buyerId: string,
  sellerId: string,
  productId: string,
  productTitle: string
): Promise<string> {

  const users = [buyerId, sellerId].sort();
  const chatKey = `${users[0]}_${users[1]}_${productId}`;
  const chatRef = doc(db, "chats", chatKey);

  const snap = await getDoc(chatRef);
  if (snap.exists()) return snap.id;

  await setDoc(chatRef, {
    users,
    chatKey,
    productId,
    productTitle,
    lastMessage: "",
    lastMessageAt: serverTimestamp()
  });

  return chatRef.id;
}

/* ================================================= */
/* ================= SEND MESSAGE ================== */
/* ================================================= */

export async function sendMessage(
  chatId: string,
  text: string,
  senderId: string
) {
  const messagesRef = collection(db, "chats", chatId, "messages");

  await addDoc(messagesRef, {
    text,
    senderId,
    createdAt: serverTimestamp(),
    readBy: [senderId]
  });

  // Update chat metadata
  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp()
  });
}

/* ================================================= */
/* ================ LISTEN MESSAGES ================= */
/* ================================================= */

export function listenToMessages(
  chatId: string | null | undefined,
  callback: (msgs: Message[]) => void
) {
  if (!chatId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    q,
    snap => {
      const msgs: Message[] = snap.docs.map(d => {
        const data = d.data() as DocumentData;

        const createdAt = data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : new Date(); // fallback

        return {
          id: d.id,
          text: data.text ?? "",
          senderId: data.senderId ?? "",
          createdAt,
          readBy: data.readBy ?? []
        };
      });

      callback(msgs);
    },
    error => {
      console.error("listenToMessages:", error);
      callback([]);
    }
  );
}

/* ================================================= */
/* ================ USER CHAT LIST ================= */
/* ================================================= */

export function listenToUserChats(
  uid: string,
  callback: (chats: Chat[]) => void
) {
  const q = query(
    collection(db, "chats"),
    orderBy("lastMessageAt", "desc")
  );

  return onSnapshot(
    q,
    snap => {
      const chats: Chat[] = snap.docs
        .map(d => {
          const data = d.data() as DocumentData;
          if (!data.users?.includes(uid)) return null;

          const lastMessageAt = data.lastMessageAt instanceof Timestamp
            ? data.lastMessageAt.toDate()
            : new Date();

          return {
            id: d.id,
            users: data.users ?? [],
            productId: data.productId ?? "",
            productTitle: data.productTitle ?? "",
            lastMessage: data.lastMessage ?? "",
            lastMessageAt
          } as Chat;
        })
        .filter(Boolean) as Chat[];

      callback(chats);
    },
    error => {
      console.error("listenToUserChats:", error);
      callback([]);
    }
  );
}

/* ================================================= */
/* ================= READ RECEIPT ================== */
/* ================================================= */

export async function markAsRead(
  chatId: string,
  messageId: string,
  uid: string
) {
  const ref = doc(db, "chats", chatId, "messages", messageId);

  await updateDoc(ref, {
    readBy: arrayUnion(uid)
  });
}

/* ================================================= */
/* ================= TYPING STATUS ================= */
/* ================================================= */

export async function setTyping(
  chatId: string,
  uid: string,
  typing: boolean
) {
  const ref = doc(db, "chats", chatId, "typing", uid);

  if (typing) {
    await setDoc(ref, {
      typing: true,
      timestamp: serverTimestamp()
    });
  } else {
    await deleteDoc(ref);
  }
}

export function listenToTyping(
  chatId: string,
  currentUserId: string,
  callback: (isTyping: boolean) => void
) {
  const ref = collection(db, "chats", chatId, "typing");

  return onSnapshot(
    ref,
    snap => {
      const otherUserTyping = snap.docs.some(
        d => d.id !== currentUserId && d.data().typing === true
      );
      callback(otherUserTyping);
    },
    error => {
      console.error("listenToTyping:", error);
      callback(false);
    }
  );
}
