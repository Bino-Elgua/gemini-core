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
  off,
  query,
  orderByChild,
  equalTo,
  push,
  Database
} from 'firebase/database';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getBytes,
  deleteObject
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

  // ===== LIVE SESSIONS / CHAT =====

  async getSessionMessages(sessionId: string) {
    const snapshot = await get(ref(db, `sessions/${sessionId}/messages`));
    const val = snapshot.val();
    return val ? Object.values(val) : [];
  }

  async subscribeToSessionMessages(sessionId: string, callback: (messages: any[]) => void) {
    const messagesRef = ref(db, `sessions/${sessionId}/messages`);
    const listener = onValue(messagesRef, (snapshot) => {
      const val = snapshot.val();
      callback(val ? Object.values(val) : []);
    });
    return () => off(messagesRef, 'value', listener);
  }

  async saveSessionMessage(sessionId: string, message: any) {
    const messageRef = push(ref(db, `sessions/${sessionId}/messages`));
    await set(messageRef, message);
  }

  async setUserTyping(sessionId: string, userId: string, isTyping: boolean) {
    await update(ref(db, `sessions/${sessionId}/presence/${userId}`), {
      isTyping,
      lastSeen: Date.now()
    });
  }

  async getTypingUsers(sessionId: string) {
    const snapshot = await get(ref(db, `sessions/${sessionId}/presence`));
    const val = snapshot.val();
    if (!val) return [];
    return Object.values(val).filter((u: any) => u.isTyping);
  }

  async setUserPresence(sessionId: string, userId: string, presence: any) {
    await update(ref(db, `sessions/${sessionId}/presence/${userId}`), presence);
  }

  async saveTeamInvite(sessionId: string, invite: any) {
    await set(ref(db, `invites/${invite.id}`), {
      ...invite,
      sessionId
    });
  }

  async acceptTeamInvite(inviteId: string, userId: string) {
    const inviteRef = ref(db, `invites/${inviteId}`);
    const snapshot = await get(inviteRef);
    const invite = snapshot.val();
    
    if (!invite) return false;

    // Add user to session team
    await update(ref(db, `sessions/${invite.sessionId}/team/${userId}`), {
      userId,
      role: 'editor',
      joinedAt: Date.now()
    });

    // Mark invite as accepted
    await update(inviteRef, { status: 'accepted' });
    return true;
  }

  async getSessionTeamMembers(sessionId: string) {
    const snapshot = await get(ref(db, `sessions/${sessionId}/team`));
    const val = snapshot.val();
    return val ? Object.values(val) : [];
  }

  async getPendingInvites(email: string) {
    const invitesRef = ref(db, 'invites');
    const pendingQuery = query(invitesRef, orderByChild('toEmail'), equalTo(email));
    const snapshot = await get(pendingQuery);
    const val = snapshot.val();
    if (!val) return [];
    return Object.values(val).filter((i: any) => i.status === 'pending');
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

  // ===== SCHEDULED POSTS =====

  async saveScheduledPost(userId: string, postId: string, postData: any) {
    await set(ref(db, `scheduled_posts/${userId}/${postId}`), {
      ...postData,
      updatedAt: new Date().toISOString()
    });
  }

  async updateScheduledPost(userId: string, postId: string, updates: any) {
    await update(ref(db, `scheduled_posts/${userId}/${postId}`), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async listPendingScheduledPosts() {
    // This is tricky in Firebase without indexing all users' posts
    // For now, we'll assume a global 'pending_posts' queue or just list all users
    // Better: store a global list of scheduled posts for the service to watch
    const snapshot = await get(ref(db, 'scheduled_posts'));
    const allUsersPosts = snapshot.val() || {};
    const pending: any[] = [];
    
    Object.keys(allUsersPosts).forEach(userId => {
      Object.keys(allUsersPosts[userId]).forEach(postId => {
        const post = allUsersPosts[userId][postId];
        if (post.status === 'pending') {
          pending.push({ ...post, userId });
        }
      });
    });
    
    return pending;
  }

  async getCampaignAsset(userId: string, campaignId: string, assetId: string) {
    const campaign = await this.getCampaign(userId, campaignId);
    if (!campaign || !campaign.assets) return null;
    return campaign.assets.find((a: any) => a.id === assetId) || null;
  }

  // ===== NOTIFICATIONS =====

  async broadcastNotification(userId: string, notification: any) {
    const notificationId = push(ref(db, `notifications/${userId}`)).key;
    await set(ref(db, `notifications/${userId}/${notificationId}`), {
      ...notification,
      read: false,
      timestamp: new Date().toISOString()
    });
    
    // Also trigger a value update for real-time listeners
    await update(ref(db, `users/${userId}`), {
      lastNotification: notification
    });
  }
}

export const firebaseService = new FirebaseService();
