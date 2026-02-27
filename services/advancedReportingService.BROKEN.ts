// Advanced Reporting Service - PDF export, scheduled reports, custom reports
export interface Report {
  id: string;
  portfolioId: string;
  name: string;
  type: 'campaign' | 'leads' | 'analytics' | 'custom';
  format: 'pdf' | 'csv' | 'json' | 'xlsx';
  metrics: string[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  createdAt: Date;
  expiresAt?: Date;
  downloadUrl?: string;
  status: 'draft' | 'generating' | 'ready' | 'failed';
}

export interface ScheduledReport {
  id: string;
  reportId: string;
  schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  nextRun: Date;
  lastRun?: Date;
  isActive: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'campaign' | 'leads' | 'analytics' | 'custom';
  metrics: string[];
  sections: Array<{
    title: string;
    type: 'chart' | 'table' | 'summary' | 'text';
    metric: string;
  }>;
}

class AdvancedReportingService {
  private reports: Map<string, Report> = new Map();
  private scheduledReports: Map<string, ScheduledReport> = new Map();
  private reportTemplates: Map<string, ReportTemplate> = new Map();
  private reportStorage: Map<string, ArrayBuffer> = new Map();

  async initialize(): Promise<void> {
    this.setupDefaultTemplates();
  }

  private setupDefaultTemplates(): void {
    const templates: ReportTemplate[] = [
      {
        id: 'template_campaign_overview',
        name: 'Campaign Overview',
        description: 'High-level campaign performance',
        type: 'campaign',
        metrics: ['impressions', 'clicks', 'conversions', 'roi'],
        sections: [
          { title: 'Performance Summary', type: 'summary', metric: 'overall' },
          { title: 'Conversion Trend', type: 'chart', metric: 'conversions' },
          { title: 'Channel Performance', type: 'table', metric: 'channel_breakdown' }
        ]
      },
      {
        id: 'template_lead_analysis',
        name: 'Lead Analysis',
        description: 'Lead scoring and activity analysis',
        type: 'leads',
        metrics: ['total_leads', 'qualified_leads', 'conversion_rate', 'lead_score'],
        sections: [
          { title: 'Lead Summary', type: 'summary', metric: 'overall' },
          { title: 'Lead Scores', type: 'chart', metric: 'score_distribution' },
          { title: 'Top Leads', type: 'table', metric: 'top_leads' }
        ]
      },
      {
        id: 'template_analytics_full',
        name: 'Full Analytics',
        description: 'Comprehensive analytics report',
        type: 'analytics',
        metrics: ['impressions', 'clicks', 'conversions', 'engagement', 'roi', 'ctr'],
        sections: [
          { title: 'Executive Summary', type: 'summary', metric: 'overall' },
          { title: 'Performance Trends', type: 'chart', metric: 'trends' },
          { title: 'Channel Attribution', type: 'table', metric: 'attribution' },
          { title: 'Top Assets', type: 'table', metric: 'top_assets' }
        ]
      }
    ];

    templates.forEach(t => this.reportTemplates.set(t.id, t));
  }

  async createReport(
    portfolioId: string,
    name: string,
    type: 'campaign' | 'leads' | 'analytics' | 'custom',
    format: 'pdf' | 'csv' | 'json' | 'xlsx',
    metrics: string[],
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<Report> {
    const report: Report = {
      id: `report_${Date.now()}`,
      portfolioId,
      name,
      type,
      format,
      metrics,
      dateRange,
      createdAt: new Date(),
      status: 'draft'
    };

    this.reports.set(report.id, report);
    return report;
  }

  async generateReport(reportId: string): Promise<Report> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    report.status = 'generating';
    this.reports.set(reportId, report);

    try {
      // Simulate report generation
      const data = await this.buildReportData(report);
      const formatted = await this.formatReportData(data, report.format);
      
      // Store report data
      this.reportStorage.set(reportId, formatted);

      report.status = 'ready';
      report.downloadUrl = `/api/reports/${reportId}/download`;
      report.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      this.reports.set(reportId, report);

      return report;
    } catch (error) {
      report.status = 'failed';
      this.reports.set(reportId, report);
      throw error;
    }
  }

  private async buildReportData(report: Report): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {
      reportName: report.name,
      generatedAt: new Date(),
      dateRange: report.dateRange,
      metrics: {}
    };

    // Build metric data
    for (const metric of report.metrics) {
      data.metrics = {
        ...(data.metrics as Record<string, unknown>),
        [metric]: Math.random() * 10000 // Mock data
      };
    }

    return data;
  }

  private async formatReportData(
    data: Record<string, unknown>,
    format: string
  ): Promise<ArrayBuffer> {
    // In production, use actual PDF/CSV/XLSX libraries
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json).buffer;
  }

  async getReport(reportId: string): Promise<Report | null> {
    return this.reports.get(reportId) || null;
  }

  async downloadReport(reportId: string): Promise<ArrayBuffer | null> {
    return this.reportStorage.get(reportId) || null;
  }

  async listReports(portfolioId: string): Promise<Report[]> {
    return Array.from(this.reports.values()).filter(r => r.portfolioId === portfolioId);
  }

  async deleteReport(reportId: string): Promise<void> {
    this.reports.delete(reportId);
    this.reportStorage.delete(reportId);
  }

  async scheduleReport(
    reportId: string,
    schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly',
    recipients: string[]
  ): Promise<ScheduledReport> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    const scheduledReport: ScheduledReport = {
      id: `scheduled_${Date.now()}`,
      reportId,
      schedule,
      recipients,
      nextRun: this.calculateNextRun(schedule),
      isActive: true
    };

    this.scheduledReports.set(scheduledReport.id, scheduledReport);
    return scheduledReport;
  }

  private calculateNextRun(schedule: string): Date {
    const now = new Date();
    const schedules: Record<string, () => Date> = {
      daily: () => new Date(now.getTime() + 24 * 60 * 60 * 1000),
      weekly: () => new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      monthly: () => new Date(now.getFullYear(), now.getMonth() + 1, 1),
      quarterly: () => new Date(now.getFullYear(), now.getMonth() + 3, 1)
    };

    return (schedules[schedule] || schedules.monthly)();
  }

  async getScheduledReport(scheduledReportId: string): Promise<ScheduledReport | null> {
    return this.scheduledReports.get(scheduledReportId) || null;
  }

  async updateScheduledReport(
    scheduledReportId: string,
    updates: Partial<ScheduledReport>
  ): Promise<ScheduledReport> {
    const scheduled = this.scheduledReports.get(scheduledReportId);
    if (!scheduled) {
      throw new Error(`Scheduled report ${scheduledReportId} not found`);
    }

    const updated = { ...scheduled, ...updates };
    this.scheduledReports.set(scheduledReportId, updated);
    return updated;
  }

  async cancelScheduledReport(scheduledReportId: string): Promise<void> {
    const scheduled = this.scheduledReports.get(scheduledReportId);
    if (scheduled) {
      scheduled.isActive = false;
      this.scheduledReports.set(scheduledReportId, scheduled);
    }
  }

  async getReportTemplates(): Promise<ReportTemplate[]> {
    return Array.from(this.reportTemplates.values());
  }

  async getReportTemplate(templateId: string): Promise<ReportTemplate | null> {
    return this.reportTemplates.get(templateId) || null;
  }

  async createCustomTemplate(
    name: string,
    description: string,
    sections: Array<{
      title: string;
      type: 'chart' | 'table' | 'summary' | 'text';
      metric: string;
    }>
  ): Promise<ReportTemplate> {
    const template: ReportTemplate = {
      id: `template_custom_${Date.now()}`,
      name,
      description,
      type: 'custom',
      metrics: sections.map(s => s.metric),
      sections
    };

    this.reportTemplates.set(template.id, template);
    return template;
  }

  async generateScheduledReports(): Promise<void> {
    const now = new Date();
    for (const [id, scheduled] of this.scheduledReports.entries()) {
      if (scheduled.isActive && scheduled.nextRun <= now) {
        const report = this.reports.get(scheduled.reportId);
        if (report) {
          // Generate new report from the scheduled template
          const newReport = await this.createReport(
            report.portfolioId,
            `${report.name} - ${now.toLocaleDateString()}`,
            report.type,
            report.format,
            report.metrics,
            {
              startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
              endDate: now
            }
          );
          await this.generateReport(newReport.id);
          
          // Update next run
          scheduled.lastRun = now;
          scheduled.nextRun = this.calculateNextRun(scheduled.schedule);
          this.scheduledReports.set(id, scheduled);
        }
      }
    }
  }
}

export const advancedReportingService = new AdvancedReportingService();
