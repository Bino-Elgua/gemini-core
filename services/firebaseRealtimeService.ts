/**
 * Firebase Realtime Database Service
 * Powers: Live Sessions (chat, typing indicators, team invites)
 * Google-only stack integration
 */

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: number;
  edited?: boolean;
}

interface TypingIndicator {
  userId: string;
  userName: string;
  isTyping: boolean;
}

interface TeamInvite {
  id: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

interface LiveSession {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
  participants: string[];
  messages: ChatMessage[];
  typing: TypingIndicator[];
  invites: TeamInvite[];
}

/**
 * Firebase Realtime DB Service
 * In production, connect to real Firebase.
 * For now: LocalStorage-backed mock that simulates Firebase behavior
 */
class FirebaseRealtimeService {
  private sessions = new Map<string, LiveSession>();
  private listeners = new Map<string, Set<Function>>();
  private baseUrl = 'https://your-firebase-project.firebaseio.com'; // Update with real DB

  /**
   * Initialize Firebase (real or mock)
   */
  initialize(config: { databaseUrl: string; apiKey?: string }): void {
    this.baseUrl = config.databaseUrl;
    console.log('✅ Firebase Realtime DB service initialized');
  }

  /**
   * Create live session
   */
  async createSession(sessionName: string, userId: string): Promise<string> {
    const sessionId = `session_${Date.now()}`;
    const session: LiveSession = {
      id: sessionId,
      name: sessionName,
      createdBy: userId,
      createdAt: Date.now(),
      participants: [userId],
      messages: [],
      typing: [],
      invites: [],
    };

    this.sessions.set(sessionId, session);
    this.broadcast(sessionId, 'sessionCreated', session);

    // Persist to localStorage for demo
    this.persistSession(sessionId, session);

    return sessionId;
  }

  /**
   * Join session
   */
  async joinSession(sessionId: string, userId: string): Promise<LiveSession> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
      this.broadcast(sessionId, 'participantJoined', { userId });
      this.persistSession(sessionId, session);
    }

    return session;
  }

  /**
   * Send message
   */
  async sendMessage(
    sessionId: string,
    userId: string,
    userName: string,
    text: string
  ): Promise<ChatMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      userId,
      userName,
      text,
      timestamp: Date.now(),
    };

    session.messages.push(message);
    this.broadcast(sessionId, 'newMessage', message);
    this.persistSession(sessionId, session);

    return message;
  }

  /**
   * Send typing indicator
   */
  async setTyping(sessionId: string, userId: string, userName: string, isTyping: boolean): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const existing = session.typing.findIndex((t) => t.userId === userId);
    if (existing >= 0) {
      if (isTyping) {
        session.typing[existing].isTyping = true;
      } else {
        session.typing.splice(existing, 1);
      }
    } else if (isTyping) {
      session.typing.push({ userId, userName, isTyping: true });
    }

    this.broadcast(sessionId, 'typingUpdate', { userId, isTyping });
  }

  /**
   * Invite team member
   */
  async sendInvite(
    sessionId: string,
    email: string,
    role: 'viewer' | 'editor' | 'admin'
  ): Promise<TeamInvite> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const invite: TeamInvite = {
      id: `invite_${Date.now()}`,
      email,
      role,
      status: 'pending',
      createdAt: Date.now(),
    };

    session.invites.push(invite);

    // In production: Send email via Nodemailer/SendGrid
    console.log(`📧 Invite sent to ${email} (role: ${role})`);

    this.broadcast(sessionId, 'inviteSent', invite);
    this.persistSession(sessionId, session);

    return invite;
  }

  /**
   * Accept invite
   */
  async acceptInvite(sessionId: string, inviteId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const invite = session.invites.find((i) => i.id === inviteId);
    if (!invite) throw new Error('Invite not found');

    invite.status = 'accepted';
    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
    }

    this.broadcast(sessionId, 'inviteAccepted', { inviteId, userId });
    this.persistSession(sessionId, session);
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<LiveSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      // Try to load from localStorage (for persistence)
      const stored = localStorage.getItem(`firebase_session_${sessionId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.sessions.set(sessionId, parsed);
        return parsed;
      }
    }
    return session || null;
  }

  /**
   * Subscribe to session updates (real-time)
   */
  onSessionUpdate(sessionId: string, callback: (event: string, data: any) => void): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }

    this.listeners.get(sessionId)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(sessionId)?.delete(callback);
    };
  }

  /**
   * Broadcast event to all listeners
   */
  private broadcast(sessionId: string, event: string, data: any): void {
    const listeners = this.listeners.get(sessionId);
    if (listeners) {
      listeners.forEach((fn) => {
        try {
          fn(event, data);
        } catch (error) {
          console.error('Listener error:', error);
        }
      });
    }
  }

  /**
   * Persist session to localStorage (demo mode)
   */
  private persistSession(sessionId: string, session: LiveSession): void {
    try {
      localStorage.setItem(`firebase_session_${sessionId}`, JSON.stringify(session));
    } catch (error) {
      console.warn('Storage quota exceeded:', error);
    }
  }

  /**
   * Get all sessions for user
   */
  async getUserSessions(userId: string): Promise<LiveSession[]> {
    return Array.from(this.sessions.values()).filter((s) =>
      s.participants.includes(userId) || s.createdBy === userId
    );
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.listeners.delete(sessionId);
    localStorage.removeItem(`firebase_session_${sessionId}`);
    console.log(`Session ${sessionId} deleted`);
  }
}

export const firebaseRealtimeService = new FirebaseRealtimeService();
