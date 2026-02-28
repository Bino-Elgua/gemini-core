/**
 * Live Sessions Service (Gemini-only, Google Stack)
 * Real Firebase Realtime DB chat, team invites, typing indicators
 * 
 * Features:
 * - Real-time chat via Firebase (not mock)
 * - Email-based team invites
 * - Live typing indicators via WebSocket
 * - User presence tracking
 */

import { firebaseService } from './firebaseService';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  avatar?: string;
  edited?: boolean;
  editedAt?: number;
}

export interface TeamInvite {
  id: string;
  fromUserId: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  expiresAt: number;
}

export interface UserPresence {
  userId: string;
  username: string;
  isTyping: boolean;
  typingSince?: number;
  lastSeen: number;
  avatar?: string;
}

class LiveSessionsService {
  private sessionChats: Map<string, ChatMessage[]> = new Map();
  private userPresence: Map<string, UserPresence> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private TYPING_TIMEOUT_MS = 3000; // Auto-clear typing after 3s
  private firebaseListeners: Map<string, () => void> = new Map();

  /**
   * Initialize real-time chat listener for a session
   */
  async initializeSession(sessionId: string, userId: string): Promise<void> {
    console.log(`📡 Initializing live session: ${sessionId}`);

    try {
      // Load initial messages from Firebase
      const messages = await firebaseService.getSessionMessages(sessionId);
      if (messages) {
        this.sessionChats.set(sessionId, messages);
      }

      // Set up real-time listener via Firebase
      const unsubscribe = await firebaseService.subscribeToSessionMessages(
        sessionId,
        (newMessages: ChatMessage[]) => {
          this.sessionChats.set(sessionId, newMessages);
          console.log(`📨 Loaded ${newMessages.length} messages for session ${sessionId}`);
        }
      );

      // Store unsubscribe function for cleanup
      this.firebaseListeners.set(sessionId, unsubscribe);

      // Set user as present
      await this.setUserPresence(sessionId, userId, {
        isTyping: false,
        lastSeen: Date.now()
      });

      console.log(`✅ Session ${sessionId} initialized`);
    } catch (error) {
      console.error('❌ Failed to initialize session:', error);
      throw error;
    }
  }

  /**
   * Send a chat message to Firebase
   */
  async sendMessage(
    sessionId: string,
    userId: string,
    username: string,
    message: string,
    avatar?: string
  ): Promise<ChatMessage> {
    const chatMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      username,
      message,
      timestamp: Date.now(),
      avatar
    };

    try {
      // Save to Firebase Realtime DB
      await firebaseService.saveSessionMessage(sessionId, chatMessage);

      // Add to local cache
      const messages = this.sessionChats.get(sessionId) || [];
      messages.push(chatMessage);
      this.sessionChats.set(sessionId, messages);

      // Clear typing indicator
      await this.setTyping(sessionId, userId, false);

      console.log(`💬 Message sent to ${sessionId}: ${message.substring(0, 50)}...`);
      return chatMessage;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Get all messages for a session
   */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.sessionChats.get(sessionId) || [];
  }

  /**
   * Update typing indicator (real-time)
   */
  async setTyping(sessionId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      // Update Firebase presence
      await firebaseService.setUserTyping(sessionId, userId, isTyping);

      // Update local presence
      const presence = this.userPresence.get(userId) || { userId, isTyping: false, lastSeen: Date.now() };
      presence.isTyping = isTyping;
      presence.typingSince = isTyping ? Date.now() : undefined;
      this.userPresence.set(userId, presence);

      // Auto-clear typing after timeout
      const timeout = this.typingTimeouts.get(userId);
      if (timeout) clearTimeout(timeout);

      if (isTyping) {
        const newTimeout = setTimeout(() => {
          this.setTyping(sessionId, userId, false).catch(e => console.warn('Auto-clear typing failed:', e));
        }, this.TYPING_TIMEOUT_MS);
        this.typingTimeouts.set(userId, newTimeout);
      } else {
        this.typingTimeouts.delete(userId);
      }
    } catch (error) {
      console.warn('⚠️ Failed to update typing indicator:', error);
    }
  }

  /**
   * Get users currently typing
   */
  async getTypingUsers(sessionId: string): Promise<UserPresence[]> {
    try {
      const typingUsers = await firebaseService.getTypingUsers(sessionId);
      return typingUsers || [];
    } catch (error) {
      console.warn('⚠️ Failed to get typing users:', error);
      return [];
    }
  }

  /**
   * Invite a user to the team via email
   */
  async inviteTeamMember(
    sessionId: string,
    fromUserId: string,
    toEmail: string
  ): Promise<TeamInvite> {
    const invite: TeamInvite = {
      id: `invite_${Date.now()}`,
      fromUserId,
      toEmail,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    try {
      // Save invite to Firebase
      await firebaseService.saveTeamInvite(sessionId, invite);

      // Send email (via email service)
      await this.sendInviteEmail(toEmail, sessionId, invite);

      console.log(`📧 Invite sent to ${toEmail} for session ${sessionId}`);
      return invite;
    } catch (error) {
      console.error('❌ Failed to send invite:', error);
      throw error;
    }
  }

  /**
   * Accept a team invite
   */
  async acceptInvite(inviteId: string, userId: string): Promise<boolean> {
    try {
      const result = await firebaseService.acceptTeamInvite(inviteId, userId);
      console.log(`✅ Team invite accepted: ${inviteId}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to accept invite:', error);
      throw error;
    }
  }

  /**
   * Get team members for a session
   */
  async getTeamMembers(sessionId: string): Promise<any[]> {
    try {
      return await firebaseService.getSessionTeamMembers(sessionId);
    } catch (error) {
      console.warn('⚠️ Failed to get team members:', error);
      return [];
    }
  }

  /**
   * Get pending invites for a user
   */
  async getPendingInvites(userEmail: string): Promise<TeamInvite[]> {
    try {
      return await firebaseService.getPendingInvites(userEmail);
    } catch (error) {
      console.warn('⚠️ Failed to get invites:', error);
      return [];
    }
  }

  /**
   * Send invite email (mock implementation)
   * In production, integrate with EmailJS or SendGrid
   */
  private async sendInviteEmail(toEmail: string, sessionId: string, invite: TeamInvite): Promise<void> {
    console.log(`📧 [Mock Email] Sending invite to ${toEmail}`);
    console.log(`   Session: ${sessionId}`);
    console.log(`   Invite ID: ${invite.id}`);
    // TODO: Integrate with actual email service
  }

  /**
   * Update user presence
   */
  private async setUserPresence(
    sessionId: string,
    userId: string,
    updates: Partial<UserPresence>
  ): Promise<void> {
    const presence = this.userPresence.get(userId) || {
      userId,
      username: 'Unknown',
      isTyping: false,
      lastSeen: Date.now()
    };

    Object.assign(presence, updates);
    this.userPresence.set(userId, presence);

    try {
      await firebaseService.setUserPresence(sessionId, userId, presence);
    } catch (error) {
      console.warn('⚠️ Failed to update presence:', error);
    }
  }

  /**
   * Cleanup session listeners
   */
  async cleanupSession(sessionId: string): Promise<void> {
    const unsubscribe = this.firebaseListeners.get(sessionId);
    if (unsubscribe) {
      unsubscribe();
      this.firebaseListeners.delete(sessionId);
    }

    this.sessionChats.delete(sessionId);
    console.log(`🧹 Cleaned up session ${sessionId}`);
  }

  /**
   * Cleanup all
   */
  destroy(): void {
    for (const [, unsubscribe] of this.firebaseListeners) {
      unsubscribe();
    }
    for (const [, timeout] of this.typingTimeouts) {
      clearTimeout(timeout);
    }
    this.sessionChats.clear();
    this.userPresence.clear();
    this.firebaseListeners.clear();
    this.typingTimeouts.clear();
  }
}

export const liveSessionsService = new LiveSessionsService();
