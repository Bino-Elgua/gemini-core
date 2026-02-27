// PDF Service - PDF generation, manipulation, and processing
export interface PDFTemplate {
  id: string;
  name: string;
  content: string; // HTML template
  styles: string; // CSS
  pageSize: 'A4' | 'Letter' | 'Legal' | 'A3';
  orientation: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface PDFGenerationRequest {
  templateId: string;
  data: Record<string, unknown>;
  options?: {
    watermark?: string;
    signature?: string;
    encryption?: boolean;
    author?: string;
    title?: string;
    creationDate?: Date;
  };
}

export interface PDFDocument {
  id: string;
  filename: string;
  size: number;
  createdAt: Date;
  templateId: string;
  contentType: string;
  url?: string;
}

class PDFService {
  private templates: Map<string, PDFTemplate> = new Map();
  private documents: Map<string, PDFDocument> = new Map();
  private documentStorage: Map<string, Buffer> = new Map();

  async initialize(): Promise<void> {
    this.setupDefaultTemplates();
  }

  private setupDefaultTemplates(): void {
    // Invoice template
    this.registerTemplate({
      id: 'template_invoice',
      name: 'Invoice',
      content: `
        <div style="font-family: Arial, sans-serif;">
          <h1>Invoice</h1>
          <table>
            <tr><td>Invoice #:</td><td>{{invoiceNumber}}</td></tr>
            <tr><td>Date:</td><td>{{date}}</td></tr>
            <tr><td>Customer:</td><td>{{customerName}}</td></tr>
          </table>
          <h2>Items</h2>
          <table border="1">
            <thead>
              <tr><th>Description</th><th>Quantity</th><th>Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              {{#items}}
              <tr><td>{{description}}</td><td>{{quantity}}</td><td>{{price}}</td><td>{{total}}</td></tr>
              {{/items}}
            </tbody>
          </table>
          <h3>Total: {{total}}</h3>
        </div>
      `,
      styles: `
        body { font-family: Arial, sans-serif; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      `,
      pageSize: 'A4',
      orientation: 'portrait'
    });

    // Report template
    this.registerTemplate({
      id: 'template_report',
      name: 'Report',
      content: `
        <div style="font-family: Arial, sans-serif;">
          <h1>{{title}}</h1>
          <p>Generated: {{date}}</p>
          <h2>Executive Summary</h2>
          <p>{{summary}}</p>
          <h2>Details</h2>
          <p>{{content}}</p>
        </div>
      `,
      styles: `
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        h1 { color: #333; border-bottom: 2px solid #007bff; }
        h2 { color: #555; margin-top: 20px; }
      `,
      pageSize: 'A4',
      orientation: 'portrait'
    });

    // Certificate template
    this.registerTemplate({
      id: 'template_certificate',
      name: 'Certificate',
      content: `
        <div style="text-align: center; font-family: Georgia, serif; padding: 40px;">
          <h1 style="font-size: 48px; color: #8b7355;">Certificate of Completion</h1>
          <p style="font-size: 24px; margin: 40px 0;">This certifies that</p>
          <h2 style="font-size: 36px; color: #007bff;">{{recipientName}}</h2>
          <p style="font-size: 18px;">has successfully completed</p>
          <h3 style="font-size: 28px;">{{courseName}}</h3>
          <p style="font-size: 16px; margin-top: 40px;">Date: {{date}}</p>
          <p style="font-size: 16px;">Signed: {{signerName}}</p>
        </div>
      `,
      styles: `
        body { background: linear-gradient(45deg, #f5f5f5, #ffffff); }
      `,
      pageSize: 'A4',
      orientation: 'landscape'
    });
  }

  registerTemplate(template: PDFTemplate): void {
    this.templates.set(template.id, template);
  }

  async generatePDF(request: PDFGenerationRequest): Promise<PDFDocument> {
    const template = this.templates.get(request.templateId);
    if (!template) {
      throw new Error(`Template ${request.templateId} not found`);
    }

    // Fill template with data
    let content = template.content;
    for (const [key, value] of Object.entries(request.data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value));
    }

    // Handle handlebars-style repeats (simple implementation)
    const repeatMatch = content.match(/{{#(\w+)}}([\s\S]*?){{\/\1}}/);
    if (repeatMatch) {
      const [fullMatch, arrayKey, repeatContent] = repeatMatch;
      const array = request.data[arrayKey] as Array<Record<string, unknown>>;
      if (array && Array.isArray(array)) {
        let repeatedContent = '';
        for (const item of array) {
          let itemContent = repeatContent;
          for (const [key, value] of Object.entries(item)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            itemContent = itemContent.replace(regex, String(value));
          }
          repeatedContent += itemContent;
        }
        content = content.replace(fullMatch, repeatedContent);
      }
    }

    // Add watermark if specified
    if (request.options?.watermark) {
      content = this.addWatermark(content, request.options.watermark);
    }

    // Create PDF document
    const pdfBuffer = await this.renderToPDF(content, template.styles, {
      pageSize: template.pageSize,
      orientation: template.orientation,
      margins: template.margins
    });

    const document: PDFDocument = {
      id: `pdf_${Date.now()}`,
      filename: `${request.templateId}_${Date.now()}.pdf`,
      size: pdfBuffer.length,
      createdAt: new Date(),
      templateId: request.templateId,
      contentType: 'application/pdf'
    };

    this.documents.set(document.id, document);
    this.documentStorage.set(document.id, pdfBuffer);

    return document;
  }

  private addWatermark(content: string, watermarkText: string): string {
    return `
      <div style="position: relative;">
        <div style="position: absolute; opacity: 0.1; font-size: 72px; transform: rotate(-45deg); top: 50%; left: 50%;">
          ${watermarkText}
        </div>
        ${content}
      </div>
    `;
  }

  private async renderToPDF(
    htmlContent: string,
    styles: string,
    options: {
      pageSize: string;
      orientation: string;
      margins?: Record<string, number>;
    }
  ): Promise<Buffer> {
    // Mock PDF rendering
    const htmlWithStyles = `
      <html>
        <head>
          <style>${styles}</style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `;

    // In production, use pdfkit or puppeteer
    // For now, return mock buffer
    return Buffer.from(htmlWithStyles);
  }

  async getPDF(documentId: string): Promise<Buffer | null> {
    return this.documentStorage.get(documentId) || null;
  }

  async mergePDFs(documentIds: string[], outputFilename: string): Promise<PDFDocument> {
    const buffers: Buffer[] = [];

    for (const docId of documentIds) {
      const buffer = this.documentStorage.get(docId);
      if (buffer) {
        buffers.push(buffer);
      }
    }

    // Mock merging (in production use PDFKit)
    const merged = Buffer.concat(buffers);

    const document: PDFDocument = {
      id: `pdf_merged_${Date.now()}`,
      filename: outputFilename,
      size: merged.length,
      createdAt: new Date(),
      templateId: 'merged',
      contentType: 'application/pdf'
    };

    this.documents.set(document.id, document);
    this.documentStorage.set(document.id, merged);

    return document;
  }

  async splitPDF(documentId: string, pageRanges: Array<{ start: number; end: number }>): Promise<PDFDocument[]> {
    const buffer = this.documentStorage.get(documentId);
    if (!buffer) {
      throw new Error(`Document ${documentId} not found`);
    }

    const results: PDFDocument[] = [];

    for (let i = 0; i < pageRanges.length; i++) {
      const range = pageRanges[i];
      const document: PDFDocument = {
        id: `pdf_split_${Date.now()}_${i}`,
        filename: `split_${i}.pdf`,
        size: buffer.length, // Mock
        createdAt: new Date(),
        templateId: documentId,
        contentType: 'application/pdf'
      };

      this.documents.set(document.id, document);
      this.documentStorage.set(document.id, buffer); // Mock split

      results.push(document);
    }

    return results;
  }

  async addSignature(documentId: string, signatureImageUrl: string): Promise<PDFDocument> {
    const buffer = this.documentStorage.get(documentId);
    if (!buffer) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Mock signature addition
    const document: PDFDocument = {
      id: `pdf_signed_${Date.now()}`,
      filename: `signed_${documentId}.pdf`,
      size: buffer.length,
      createdAt: new Date(),
      templateId: documentId,
      contentType: 'application/pdf'
    };

    this.documents.set(document.id, document);
    this.documentStorage.set(document.id, buffer);

    return document;
  }

  async getTemplates(): Promise<PDFTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(templateId: string): Promise<PDFTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    this.templates.delete(templateId);
  }

  async getDocumentInfo(documentId: string): Promise<PDFDocument | null> {
    return this.documents.get(documentId) || null;
  }

  async listDocuments(limit: number = 100): Promise<PDFDocument[]> {
    return Array.from(this.documents.values()).slice(-limit);
  }

  async deleteDocument(documentId: string): Promise<void> {
    this.documents.delete(documentId);
    this.documentStorage.delete(documentId);
  }

  async getDocumentStats(): Promise<{
    totalDocuments: number;
    totalSize: number;
    averageSize: number;
    oldestDocument?: Date;
    newestDocument?: Date;
  }> {
    const docs = Array.from(this.documents.values());
    const totalSize = docs.reduce((sum, d) => sum + d.size, 0);

    const createdDates = docs.map(d => d.createdAt);
    const oldestDocument = createdDates.length > 0 ? new Date(Math.min(...createdDates.map(d => d.getTime()))) : undefined;
    const newestDocument = createdDates.length > 0 ? new Date(Math.max(...createdDates.map(d => d.getTime()))) : undefined;

    return {
      totalDocuments: docs.length,
      totalSize,
      averageSize: docs.length > 0 ? totalSize / docs.length : 0,
      oldestDocument,
      newestDocument
    };
  }

  async cleanupOldDocuments(olderThanDays: number = 30): Promise<number> {
    const cutoffTime = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const docsToDelete = Array.from(this.documents.entries())
      .filter(([_, doc]) => doc.createdAt < cutoffTime)
      .map(([id, _]) => id);

    for (const docId of docsToDelete) {
      this.deleteDocument(docId);
    }

    return docsToDelete.length;
  }
}

export const pdfService = new PDFService();
