import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();

// Firestore triggers in v2 use "onDocumentCreated" instead of ".document().onCreate()"
export const sendPushOnMessage = functions.firestore
  .onDocumentCreated("chats/{chatId}/messages/{messageId}", async (event) => {
    const snap = event.data; // DocumentSnapshot
    if (!snap) return;
    const message = snap.data();
    const chatId = event.params.chatId;

    if (!message) return;

    const chatDoc = await admin
      .firestore()
      .doc(`chats/${chatId}`)
      .get();

    const participants: string[] = chatDoc.data()?.participants || [];
    const receiverId = participants.find((id) => id !== message.senderId);
    if (!receiverId) return;

    const userDoc = await admin.firestore().doc(`users/${receiverId}`).get();
    const token = userDoc.data()?.fcmToken;
    if (!token) return;

    await admin.messaging().send({
      token,
      notification: {
        title: "New Message",
        body: message.text,
      },
    });
  });
