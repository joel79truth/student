"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMessageCreated = void 0;
const functions = __importStar(require("firebase-functions/v1")); // use v1 API
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
exports.onMessageCreated = functions.firestore
    .document('messages/{messageId}')
    .onCreate(async (snapshot, context) => {
    var _a;
    const message = snapshot.data();
    const chatId = message.chatId;
    const senderId = message.senderId;
    const text = message.text;
    const senderName = message.senderName;
    if (!chatId || !senderId || !text) {
        console.log('Missing required fields, aborting notification');
        return;
    }
    // 1. Get the chat document to find the recipient
    const chatRef = db.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) {
        console.log('Chat not found');
        return;
    }
    const chatData = chatDoc.data();
    const participants = chatData.participants;
    // The other participant (the one who is NOT the sender)
    const recipientId = participants.find(id => id !== senderId);
    if (!recipientId) {
        console.log('No recipient found');
        return;
    }
    // 2. Fetch the recipient's FCM token from Firestore
    const tokenDoc = await db.collection('fcm_tokens').doc(recipientId).get();
    if (!tokenDoc.exists) {
        console.log('No FCM token for recipient', recipientId);
        return;
    }
    const token = (_a = tokenDoc.data()) === null || _a === void 0 ? void 0 : _a.token;
    if (!token)
        return;
    // 3. Prepare the notification message (using modern send() API)
    const payload = {
        token: token,
        notification: {
            title: `New message from ${senderName}`,
            body: text.length > 100 ? text.substring(0, 97) + '…' : text,
        },
        data: {
            type: 'new_message',
            chatId,
            senderId,
        },
    };
    // 4. Send the notification
    try {
        await admin.messaging().send(payload);
        console.log('Notification sent to', recipientId);
    }
    catch (error) {
        console.error('Error sending notification:', error);
        // If the token is invalid, delete it
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            await db.collection('fcm_tokens').doc(recipientId).delete();
        }
    }
});
//# sourceMappingURL=index.js.map