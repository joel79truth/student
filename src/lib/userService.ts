import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  campus?: string;
  avatar: string;
  createdAt: string;
  username?: string;
  sellerId?: string;
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

/**
 * Get user data by username/seller ID
 */
export async function getUserByUsername(username: string): Promise<UserData | null> {
  try {
    console.log('Looking up user by username:', username);
    
    const usersRef = collection(db, 'users');
    
    // Try 'username' field first
    const q = query(usersRef, where('username', '==', username));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      console.log('Found user by username field');
      return snapshot.docs[0].data() as UserData;
    }
    
    // Try 'sellerId' field
    const q2 = query(usersRef, where('sellerId', '==', username));
    const snapshot2 = await getDocs(q2);
    
    if (!snapshot2.empty) {
      console.log('Found user by sellerId field');
      return snapshot2.docs[0].data() as UserData;
    }
    
    // Check if username matches email (without @domain)
    const emailQ = query(usersRef, where('email', '>=', username), where('email', '<=', username + '\uf8ff'));
    const emailSnapshot = await getDocs(emailQ);
    
    if (!emailSnapshot.empty) {
      console.log('Found user by email prefix');
      return emailSnapshot.docs[0].data() as UserData;
    }
    
    console.log('No user found for username:', username);
    return null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
}

/**
 * Get user data by email
 */
export async function getUserByEmail(email: string): Promise<UserData | null> {
  try {
    console.log('Looking up user by email:', email);
    
    // First try to get by email as document ID
    let userData = await getUserData(email);
    
    if (userData) {
      console.log('Found user by email (as document ID)');
      return userData;
    }
    
    // If not found, query by email field
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      console.log('Found user by email field');
      return snapshot.docs[0].data() as UserData;
    }
    
    console.log('No user found for email:', email);
    return null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Create or update user document
 */
export async function createOrUpdateUser(user: { 
  uid: string; 
  email: string; 
  name: string; 
  username?: string;
  sellerId?: string;
  phone?: string;
  campus?: string;
}): Promise<UserData | null> {
  try {
    console.log('Creating/updating user:', user.email);
    
    // Store user with email as document ID for easy lookup
    const userData: UserData = {
      uid: user.uid,
      email: user.email,
      name: user.name,
      username: user.username || user.email.split('@')[0],
      sellerId: user.sellerId,
      phone: user.phone || '',
      campus: user.campus || '',
      avatar: user.name[0].toUpperCase(),
      createdAt: serverTimestamp().toString(),
    };
    
    await setDoc(doc(db, 'users', user.email), userData);
    console.log('User document created/updated:', user.email);
    
    return userData;
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return null;
  }
}

/**
 * Search users by name, email, or username
 */
export async function searchUsers(searchTerm: string): Promise<UserData[]> {
  try {
    const usersRef = collection(db, 'users');
    const results: UserData[] = [];
    
    // Search by name
    const nameQ = query(usersRef, 
      where('name', '>=', searchTerm), 
      where('name', '<=', searchTerm + '\uf8ff')
    );
    
    // Search by email
    const emailQ = query(usersRef, 
      where('email', '>=', searchTerm), 
      where('email', '<=', searchTerm + '\uf8ff')
    );
    
    // Search by username
    const usernameQ = query(usersRef, 
      where('username', '>=', searchTerm), 
      where('username', '<=', searchTerm + '\uf8ff')
    );
    
    const [nameSnapshot, emailSnapshot, usernameSnapshot] = await Promise.all([
      getDocs(nameQ),
      getDocs(emailQ),
      getDocs(usernameQ),
    ]);
    
    // Combine and deduplicate results
    const allDocs = [
      ...nameSnapshot.docs,
      ...emailSnapshot.docs,
      ...usernameSnapshot.docs,
    ];
    
    const seenEmails = new Set<string>();
    
    allDocs.forEach(doc => {
      const data = doc.data() as UserData;
      if (!seenEmails.has(data.email)) {
        seenEmails.add(data.email);
        results.push(data);
      }
    });
    
    console.log(`Found ${results.length} users for search: ${searchTerm}`);
    return results;
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}