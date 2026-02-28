/**
 * Firebase Service - Auth, Realtime DB, Storage, Functions
 * Replaces Supabase for all data operations
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  Database
} from 'firebase/database';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getBytes,
  deleteObject,
  Storage
} from 'firebase/storage';

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

class FirebaseService {
  
  // ===== AUTH =====
  
  async registerUser(email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // Create user profile in DB
    await set(ref(db, `users/${uid}`), {
      email,
      createdAt: new Date().toISOString(),
      credits: 0, // Start with 0, can buy packs
      tier: 'free',
      campaigns: [],
      portfolios: [],
      dnaProfiles: []
    });
    
    return uid;
  }

  async loginUser(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user.uid;
  }

  async logoutUser() {
    await signOut(auth);
  }

  async getCurrentUser(): Promise<User | null> {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        resolve(user);
      });
    });
  }

  // ===== REALTIME DB =====

  async getUserProfile(uid: string) {
    const snapshot = await get(ref(db, `users/${uid}`));
    return snapshot.val();
  }

  async saveDNAProfile(uid: string, dnaId: string, dnaJson: object) {
    await set(ref(db, `dna/${uid}/${dnaId}`), {
      ...dnaJson,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async getDNAProfile(uid: string, dnaId: string) {
    const snapshot = await get(ref(db, `dna/${uid}/${dnaId}`));
    return snapshot.val();
  }

  async listDNAProfiles(uid: string) {
    const snapshot = await get(ref(db, `dna/${uid}`));
    return snapshot.val() || {};
  }

  async saveCampaign(uid: string, campaignId: string, campaignData: object) {
    await set(ref(db, `campaigns/${uid}/${campaignId}`), {
      ...campaignData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async getCampaign(uid: string, campaignId: string) {
    const snapshot = await get(ref(db, `campaigns/${uid}/${campaignId}`));
    return snapshot.val();
  }

  async listCampaigns(uid: string) {
    const snapshot = await get(ref(db, `campaigns/${uid}`));
    return snapshot.val() || {};
  }

  async updateUser(uid: string, updates: any) {
    await update(ref(db, `users/${uid}`), updates);
  }

  async subscribeToUser(uid: string, callback: (data: any) => void) {
    onValue(ref(db, `users/${uid}`), (snapshot) => {
      callback(snapshot.val());
    });
  }

  // ===== STORAGE =====

  async uploadFile(uid: string, fileName: string, file: Blob) {
    const fileRef = storageRef(storage, `users/${uid}/${fileName}`);
    await uploadBytes(fileRef, file);
    return `users/${uid}/${fileName}`;
  }

  async deleteFile(filePath: string) {
    const fileRef = storageRef(storage, filePath);
    await deleteObject(fileRef);
  }

  async getFileUrl(filePath: string): Promise<string> {
    // In production, use signed URLs or Cloud Storage public URLs
    return `gs://${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}/${filePath}`;
  }

  // ===== ANALYTICS EVENTS =====

  async logEvent(uid: string, eventName: string, eventData: object) {
    const eventId = `${Date.now()}_${Math.random()}`;
    await set(ref(db, `analytics/${uid}/${eventId}`), {
      eventName,
      ...eventData,
      timestamp: new Date().toISOString()
    });
  }

  // ===== CREDITS/BILLING =====

  async addCredits(uid: string, amount: number, source: string) {
    const user = await this.getUserProfile(uid);
    const newBalance = (user?.credits || 0) + amount;
    
    await update(ref(db, `users/${uid}`), { credits: newBalance });
    
    // Log transaction
    await set(ref(db, `credits/${uid}/${Date.now()}`), {
      amount,
      source,
      newBalance,
      timestamp: new Date().toISOString()
    });

    return newBalance;
  }

  async deductCredits(uid: string, amount: number, operation: string): Promise<boolean> {
    const user = await this.getUserProfile(uid);
    const currentCredits = user?.credits || 0;

    if (currentCredits < amount) {
      console.warn(`❌ Insufficient credits: have ${currentCredits}, need ${amount}`);
      return false;
    }

    const newBalance = currentCredits - amount;
    await update(ref(db, `users/${uid}`), { credits: newBalance });

    // Log transaction
    await set(ref(db, `credits/${uid}/${Date.now()}`), {
      amount: -amount,
      operation,
      newBalance,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  async getCreditsBalance(uid: string): Promise<number> {
    const user = await this.getUserProfile(uid);
    return user?.credits || 0;
  }
}

export const firebaseService = new FirebaseService();
