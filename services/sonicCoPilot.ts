import { universalAiService } from './universalAiService';
import { dnaExtractionService } from './dnaExtractionService';
import { leadScrapingService } from './leadScrapingService';
import { errorHandlingService } from './errorHandlingService';
import { creditsService } from './creditsService';

// Sonic CoPilot - AI-powered assistant for platform automation and guidance
export interface CoPilotMessage {
  id: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant';
  context?: Record<string, unknown>;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface CoPilotResponse {
  id: string;
  message: string;
  actions?: CoPilotAction[];
  suggestions?: string[];
  confidence: number;
  contextUsed: string[];
}

export interface CoPilotAction {
  type: 'create' | 'update' | 'delete' | 'execute' | 'suggest' | 'navigate';
  target: string;
  params?: Record<string, unknown>;
  description: string;
}

export interface CoPilotConversation {
  id: string;
  userId: string;
  messages: CoPilotMessage[];
  createdAt: Date;
  updatedAt: Date;
  context: Record<string, unknown>;
  isActive: boolean;
}

class SonicCoPilot {
  private conversations: Map<string, CoPilotConversation> = new Map();
  private readonly COPILOT_COST = 5; // Credits per query

  async initialize(): Promise<void> {
    console.log('🤖 Sonic CoPilot initialized (Gemini Mode)');
  }

  async startConversation(userId: string, context?: Record<string, unknown>): Promise<CoPilotConversation> {
    const conversation: CoPilotConversation = {
      id: `conv_${Date.now()}`,
      userId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      context: context || {},
      isActive: true
    };

    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  async sendMessage(conversationId: string, content: string): Promise<CoPilotResponse> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    // 1. Check Credits
    const canAfford = await creditsService.canAffordOperation('copilot-query');
    if (!canAfford) throw new Error('Insufficient credits for CoPilot');

    // 2. Add User Message
    const userMsg: CoPilotMessage = {
      id: `msg_${Date.now()}`,
      conversationId,
      content,
      role: 'user',
      timestamp: new Date()
    };
    conversation.messages.push(userMsg);

    try {
      // 3. Generate AI Response
      const response = await this.generateAiResponse(content, conversation);
      
      // 4. Add Assistant Message
      const assistantMsg: CoPilotMessage = {
        id: `msg_assistant_${Date.now()}`,
        conversationId,
        content: response.message,
        role: 'assistant',
        timestamp: new Date()
      };
      conversation.messages.push(assistantMsg);
      conversation.updatedAt = new Date();

      // 5. Deduct Credits
      await creditsService.deduct(conversation.userId, this.COPILOT_COST, 'copilot-query');

      return response;
    } catch (error) {
      await errorHandlingService.handleError(error, 'copilot_message');
      throw error;
    }
  }

  private async generateAiResponse(userInput: string, conversation: CoPilotConversation): Promise<CoPilotResponse> {
    const history = conversation.messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
    
    const prompt = `You are Sonic CoPilot, the intelligent assistant for the Sacred Core marketing platform.
Your goal is to help the user navigate the platform, generate content, and automate tasks.

Current User Context:
- Page: ${conversation.context.currentPage || 'Dashboard'}
- Active DNA: ${conversation.context.activeDnaId || 'None'}

Conversation History:
${history}

User Query: "${userInput}"

Analyze the query and respond with VALID JSON only:
{
  "message": "Direct response to user",
  "intent": "detected_intent (e.g., extract_dna, create_campaign, list_leads)",
  "actions": [
    {
      "type": "navigate|execute|suggest",
      "target": "page_url|function_name",
      "description": "Short explanation",
      "params": {}
    }
  ],
  "suggestions": ["Follow-up question 1", "Action suggestion 2"],
  "confidence": 0.95
}

Capabilities:
- Navigate to: /extract, /campaigns, /leads, /analytics, /settings
- Execute functions: 'generateContent', 'scoreLeads', 'extractDnaFromUrl'
`;

    const aiResponse = await universalAiService.generateText({
      prompt,
      responseMimeType: 'application/json',
      featureId: 'sonic-copilot'
    });

    const parsed = JSON.parse(aiResponse);
    
    return {
      id: `resp_${Date.now()}`,
      message: parsed.message,
      actions: parsed.actions,
      suggestions: parsed.suggestions,
      confidence: parsed.confidence,
      contextUsed: ['history', 'currentPage']
    };
  }

  async getConversation(conversationId: string): Promise<CoPilotConversation | null> {
    return this.conversations.get(conversationId) || null;
  }
}

export const sonicCoPilot = new SonicCoPilot();
