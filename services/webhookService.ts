import { hybridStorage } from './hybridStorageService';

interface Webhook {
  id: string;
  portfolioId: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive' | 'error';
  secret: string;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface WebhookEvent {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, any>;
  timestamp: Date;
  retries: number;
  status: 'pending' | 'delivered' | 'failed';
  lastAttempt?: Date;
  error?: string;
}

interface WebhookLog {
  webhookId: string;
  eventId: string;
  status: number;
  duration: number;
  timestamp: Date;
  response?: string;
}

class WebhookService {
  async createWebhook(webhook: Omit<Webhook, 'id' | 'secret' | 'createdAt' | 'updatedAt'>): Promise<Webhook> {
    const newWebhook: Webhook = {
      ...webhook,
      id: `webhook-${Date.now()}`,
      secret: this.generateSecret(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await hybridStorage.set(`webhook-${newWebhook.id}`, newWebhook);
    console.log(`✅ Webhook created: ${newWebhook.url}`);

    return newWebhook;
  }

  async getWebhook(id: string): Promise<Webhook | null> {
    return await hybridStorage.get(`webhook-${id}`);
  }

  async listWebhooks(portfolioId: string): Promise<Webhook[]> {
    const allData = await hybridStorage.getAll();
    const webhooks: Webhook[] = [];

    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('webhook-') && value && value.portfolioId === portfolioId) {
        webhooks.push(value);
      }
    }

    return webhooks;
  }

  async updateWebhook(id: string, updates: Partial<Webhook>): Promise<Webhook> {
    const webhook = await this.getWebhook(id);
    if (!webhook) throw new Error('Webhook not found');

    const updated = {
      ...webhook,
      ...updates,
      id: webhook.id,
      createdAt: webhook.createdAt,
      updatedAt: new Date()
    };

    await hybridStorage.set(`webhook-${id}`, updated);
    console.log(`✅ Webhook updated: ${updated.url}`);

    return updated;
  }

  async deleteWebhook(id: string): Promise<void> {
    await hybridStorage.remove(`webhook-${id}`);
    console.log(`✅ Webhook deleted`);
  }

  async triggerWebhook(webhookId: string, eventType: string, payload: Record<string, any>): Promise<void> {
    const webhook = await this.getWebhook(webhookId);
    if (!webhook || webhook.status === 'inactive') return;

    if (!webhook.events.includes(eventType) && !webhook.events.includes('*')) {
      return;
    }

    const event: WebhookEvent = {
      id: `event-${Date.now()}`,
      webhookId,
      eventType,
      payload,
      timestamp: new Date(),
      retries: 0,
      status: 'pending'
    };

    // Queue event for delivery
    await this.queueEvent(event);
    console.log(`📤 Webhook event queued: ${eventType}`);
  }

  private async queueEvent(event: WebhookEvent): Promise<void> {
    const queue = (await hybridStorage.get('webhook-event-queue')) || [];
    queue.push(event);
    await hybridStorage.set('webhook-event-queue', queue);

    // Attempt immediate delivery
    await this.deliverEvent(event);
  }

  private async deliverEvent(event: WebhookEvent): Promise<void> {
    const webhook = await this.getWebhook(event.webhookId);
    if (!webhook) return;

    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': webhook.secret,
      'X-Event-Type': event.eventType,
      'X-Timestamp': event.timestamp.toISOString()
    };

    try {
      const startTime = Date.now();

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(event.payload)
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        event.status = 'delivered';
        event.lastAttempt = new Date();

        // Log successful delivery
        await this.logDelivery({
          webhookId: webhook.id,
          eventId: event.id,
          status: response.status,
          duration,
          timestamp: new Date()
        });

        console.log(`✅ Webhook delivered: ${webhook.url}`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      event.error = error instanceof Error ? error.message : 'Unknown error';
      event.retries++;
      event.lastAttempt = new Date();

      if (event.retries < webhook.retryPolicy.maxRetries) {
        event.status = 'pending';
        // Schedule retry
        const delay = Math.pow(webhook.retryPolicy.backoffMultiplier, event.retries) * 1000;
        setTimeout(() => this.deliverEvent(event), delay);
      } else {
        event.status = 'failed';
        webhook.status = 'error';
        await this.updateWebhook(webhook.id, webhook);
      }

      console.error(`❌ Webhook delivery failed: ${error}`);
    }

    // Update event
    await hybridStorage.set(`webhook-event-${event.id}`, event);
  }

  private async logDelivery(log: WebhookLog): Promise<void> {
    const logs = (await hybridStorage.get(`webhook-logs-${log.webhookId}`)) || [];
    logs.push(log);
    await hybridStorage.set(`webhook-logs-${log.webhookId}`, logs.slice(-100)); // Keep last 100
  }

  async getWebhookLogs(webhookId: string, limit = 50): Promise<WebhookLog[]> {
    const logs = (await hybridStorage.get(`webhook-logs-${webhookId}`)) || [];
    return logs.slice(-limit).reverse();
  }

  async testWebhook(webhookId: string): Promise<boolean> {
    const webhook = await this.getWebhook(webhookId);
    if (!webhook) throw new Error('Webhook not found');

    const testPayload = {
      test: true,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhook.secret,
          'X-Event-Type': 'test',
          'X-Test': 'true'
        },
        body: JSON.stringify(testPayload)
      });

      return response.ok;
    } catch (error) {
      console.error('Webhook test failed:', error);
      return false;
    }
  }

  private generateSecret(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async getEventStatus(eventId: string): Promise<WebhookEvent | null> {
    return await hybridStorage.get(`webhook-event-${eventId}`);
  }

  async retryEvent(eventId: string): Promise<void> {
    const event = await this.getEventStatus(eventId);
    if (!event) throw new Error('Event not found');

    event.retries = 0;
    event.status = 'pending';
    event.error = undefined;

    await this.deliverEvent(event);
    console.log(`🔄 Event retry initiated: ${eventId}`);
  }
}

export const webhookService = new WebhookService();
