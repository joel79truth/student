import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  campus?: string;
  avatar: string;
  createdAt: string;
}

/**
 * Get user data by email or uid
 */
export async function getUserData(emailOrUid: string): Promise<UserData | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', emailOrUid));
    
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

/**
 * Get current user data from Firebase Auth
 */
export async function getCurrentUserData(user: { email: string | null; uid: string }): Promise<UserData | null> {
  if (!user.email) return null;
  
  // Try to get by email first (our primary key for lookups)
  let userData = await getUserData(user.email);
  
  // Fallback to uid if not found
  if (!userData) {
    userData = await getUserData(user.uid);
  }
  
  return userData;
}
