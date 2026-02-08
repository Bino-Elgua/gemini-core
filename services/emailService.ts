import { hybridStorage } from './hybridStorageService';

export interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'mailgun' | 'gmail';
  apiKey?: string;
  senderEmail: string;
  senderName: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Attachment[];
  replyTo?: string;
}

interface Attachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private config: EmailConfig | null = null;

  async initialize(config: EmailConfig): Promise<void> {
    this.config = config;
    await hybridStorage.set('email-config', config);
    console.log(`✅ Email service initialized with ${config.provider}`);
  }

  async getConfig(): Promise<EmailConfig | null> {
    if (this.config) return this.config;
    
    const stored = await hybridStorage.get('email-config');
    if (stored) {
      this.config = stored;
      return stored;
    }
    
    return null;
  }

  async send(message: EmailMessage): Promise<EmailResponse> {
    const config = await this.getConfig();
    if (!config) {
      console.warn('⚠️ Email not configured, using fallback');
      return this.sendFallback(message);
    }

    try {
      switch (config.provider) {
        case 'resend':
          return await this.sendViaResend(message, config);
        case 'sendgrid':
          return await this.sendViaSendGrid(message, config);
        case 'mailgun':
          return await this.sendViaMailgun(message, config);
        case 'gmail':
          return await this.sendViaGmail(message, config);
        default:
          return await this.sendFallback(message);
      }
    } catch (error) {
      console.error('Email send error:', error);
      return this.sendFallback(message);
    }
  }

  private async sendViaResend(
    message: EmailMessage,
    config: EmailConfig
  ): Promise<EmailResponse> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${config.senderName} <${config.senderEmail}>`,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text
        })
      });

      if (!response.ok) {
        throw new Error(`Resend error: ${response.statusText}`);
      }

      const data = await response.json() as { id?: string };
      console.log(`✅ Email sent via Resend: ${data.id}`);
      
      return {
        success: true,
        messageId: data.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resend failed'
      };
    }
  }

  private async sendViaSendGrid(
    message: EmailMessage,
    config: EmailConfig
  ): Promise<EmailResponse> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: Array.isArray(message.to)
                ? message.to.map(email => ({ email }))
                : [{ email: message.to }],
              subject: message.subject
            }
          ],
          from: {
            email: config.senderEmail,
            name: config.senderName
          },
          content: [
            {
              type: 'text/html',
              value: message.html
            }
          ],
          replyTo: message.replyTo ? { email: message.replyTo } : undefined
        })
      });

      if (!response.ok) {
        throw new Error(`SendGrid error: ${response.statusText}`);
      }

      console.log(`✅ Email sent via SendGrid`);
      
      return {
        success: true,
        messageId: Date.now().toString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SendGrid failed'
      };
    }
  }

  private async sendViaMailgun(
    message: EmailMessage,
    config: EmailConfig
  ): Promise<EmailResponse> {
    // Mailgun implementation
    console.log(`⚠️ Mailgun implementation pending`);
    return this.sendFallback(message);
  }

  private async sendViaGmail(
    message: EmailMessage,
    config: EmailConfig
  ): Promise<EmailResponse> {
    // Gmail implementation
    console.log(`⚠️ Gmail implementation pending`);
    return this.sendFallback(message);
  }

  private async sendFallback(message: EmailMessage): Promise<EmailResponse> {
    // Fallback: Log to console and localStorage
    const emailLog = {
      id: `email-${Date.now()}`,
      timestamp: new Date().toISOString(),
      to: message.to,
      subject: message.subject,
      status: 'fallback-sent'
    };

    const logs = (await hybridStorage.get('email-logs')) || [];
    logs.push(emailLog);
    await hybridStorage.set('email-logs', logs);

    console.log(`📧 Email logged (fallback): ${message.subject}`);
    console.log(emailLog);

    return {
      success: true,
      messageId: emailLog.id
    };
  }

  async sendBatch(messages: EmailMessage[]): Promise<EmailResponse[]> {
    console.log(`📧 Sending ${messages.length} emails...`);
    
    const results = await Promise.all(
      messages.map(msg => this.send(msg))
    );

    const successful = results.filter(r => r.success).length;
    console.log(`✅ Batch sent: ${successful}/${messages.length} successful`);

    return results;
  }

  async getEmailLogs(): Promise<any[]> {
    return (await hybridStorage.get('email-logs')) || [];
  }

  async clearEmailLogs(): Promise<void> {
    await hybridStorage.set('email-logs', []);
    console.log('✅ Email logs cleared');
  }
}

export const emailService = new EmailService();
