const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.notifyNewMessage = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap) => {

    const msg = snap.data();
    if (!msg.receiverId) return null;

    const userDoc = await admin
      .firestore()
      .doc(`users/${msg.receiverId}`)
      .get();

    const token = userDoc.data()?.fcmToken;
    if (!token) return null;

    await admin.messaging().send({
      token,
      notification: {
        title: "New Message",
        body: msg.text
      },
      data: {
        chatId: snap.ref.parent.parent.id
      }
    });

    return null;
  });
