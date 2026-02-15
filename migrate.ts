import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables (optional)
dotenv.config({ path: './backend/.env' });

// Path to your service account key
const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// Initialize Admin SDK
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function migrateChatsToUids() {
  const chatsRef = db.collection('chats');
  const snapshot = await chatsRef.get();

  for (const chatDoc of snapshot.docs) {
    const chatData = chatDoc.data();
    const oldParticipants = chatData.participants || [];
    
    // Skip if already using UIDs (no @)
    if (!oldParticipants.some((p: string) => p.includes('@'))) continue;

    const newParticipants: string[] = [];
    const newParticipantNames: {[uid: string]: string} = {};
    const newParticipantAvatars: {[uid: string]: string} = {};
    const newParticipantEmails: {[uid: string]: string} = {};
    const newUnreadCount: {[uid: string]: number} = {};

    for (const participant of oldParticipants) {
      let uid = participant;
      let name = chatData.participantNames?.[participant] || '';
      let avatar = chatData.participantAvatars?.[participant] || '';
      let email = participant.includes('@') ? participant : '';

      if (participant.includes('@')) {
        // Email → find UID
        const user = await getUserByEmail(participant);
        if (user) {
          uid = user.uid;
          name = name || user.name;
          email = user.email;
        } else {
          console.warn(`No user found for email ${participant}, skipping chat ${chatDoc.id}`);
          continue;
        }
      }

      newParticipants.push(uid);
      if (name) newParticipantNames[uid] = name;
      if (avatar) newParticipantAvatars[uid] = avatar;
      if (email) newParticipantEmails[uid] = email;
      const unread = chatData.unreadCount?.[participant] || 0;
      if (unread) newUnreadCount[uid] = unread;
    }

    await chatDoc.ref.update({
      participants: newParticipants,
      participantNames: newParticipantNames,
      participantAvatars: newParticipantAvatars,
      participantEmails: newParticipantEmails,
      unreadCount: newUnreadCount
    });

    console.log(`Migrated chat ${chatDoc.id}`);
  }
}

// Helper function to get user by email
async function getUserByEmail(email: string): Promise<{ uid: string; name: string; email: string } | null> {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      return {
        uid: userData.uid || userDoc.id,
        name: userData.name || email.split('@')[0],
        email: userData.email
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

// Run the migration
migrateChatsToUids()
  .then(() => {
    console.log('Migration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });