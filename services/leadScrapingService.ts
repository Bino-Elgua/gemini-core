// Lead Scraping Service - Web scraping for lead generation
export interface LeadScrapingConfig {
  source: 'linkedin' | 'crunchbase' | 'apollo' | 'hunter' | 'web' | 'github';
  keywords: string[];
  filters?: Record<string, unknown>;
  limit: number;
  targetCountries?: string[];
  industries?: string[];
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
}

export interface ScrapedLead {
  id: string;
  source: string;
  name: string;
  email: string;
  company: string;
  title: string;
  linkedinUrl?: string;
  githubUrl?: string;
  website?: string;
  phone?: string;
  location?: string;
  industry?: string;
  companySize?: string;
  lastUpdated: Date;
  confidence: number; // 0-1
  verificationStatus: 'unverified' | 'verified' | 'bounced';
}

export interface ScrapingJob {
  id: string;
  config: LeadScrapingConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  leadsFound: number;
  leadsVerified: number;
  error?: string;
  progress: number; // 0-100
}

class LeadScrapingService {
  private jobs: Map<string, ScrapingJob> = new Map();
  private leads: Map<string, ScrapedLead> = new Map();
  private jobQueue: string[] = [];
  private processing = false;

  async initialize(): Promise<void> {
    this.startJobProcessor();
  }

  private startJobProcessor(): void {
    setInterval(async () => {
      if (!this.processing && this.jobQueue.length > 0) {
        this.processingNext();
      }
    }, 1000);
  }

  private async processingNext(): Promise<void> {
    if (this.processing || this.jobQueue.length === 0) return;

    this.processing = true;
    const jobId = this.jobQueue.shift();
    if (jobId) {
      await this.processScrapingJob(jobId);
    }
    this.processing = false;
  }

  async createScrapingJob(config: LeadScrapingConfig): Promise<ScrapingJob> {
    const job: ScrapingJob = {
      id: `scrape_${Date.now()}`,
      config,
      status: 'pending',
      leadsFound: 0,
      leadsVerified: 0,
      progress: 0
    };

    this.jobs.set(job.id, job);
    this.jobQueue.push(job.id);

    return job;
  }

  private async processScrapingJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    job.startedAt = new Date();

    try {
      const scraped = await this.scrapeLeads(job.config);

      for (const lead of scraped) {
        this.leads.set(lead.id, lead);
        job.leadsFound++;

        // Verify email
        const verified = await this.verifyEmail(lead.email);
        if (verified) {
          lead.verificationStatus = 'verified';
          job.leadsVerified++;
        } else {
          lead.verificationStatus = 'bounced';
        }

        this.leads.set(lead.id, lead);
      }

      job.status = 'completed';
      job.progress = 100;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }

    job.completedAt = new Date();
  }

  private async scrapeLeads(config: LeadScrapingConfig): Promise<ScrapedLead[]> {
    const leads: ScrapedLead[] = [];

    switch (config.source) {
      case 'linkedin':
        return this.scrapeLinkedIn(config);
      case 'crunchbase':
        return this.scrapeCrunchbase(config);
      case 'apollo':
        return this.scrapeApollo(config);
      case 'hunter':
        return this.scrapeHunter(config);
      case 'github':
        return this.scrapeGitHub(config);
      case 'web':
        return this.scrapeWeb(config);
    }

    return leads;
  }

  private async scrapeLinkedIn(config: LeadScrapingConfig): Promise<ScrapedLead[]> {
    // Mock LinkedIn scraping
    const leads: ScrapedLead[] = [];

    for (let i = 0; i < Math.min(config.limit, 10); i++) {
      leads.push({
        id: `linkedin_${Date.now()}_${i}`,
        source: 'linkedin',
        name: `Lead ${i + 1}`,
        email: `lead${i + 1}@example.com`,
        company: `Company ${i + 1}`,
        title: 'Product Manager',
        linkedinUrl: `https://linkedin.com/in/lead${i + 1}`,
        location: 'San Francisco, CA',
        industry: 'Technology',
        lastUpdated: new Date(),
        confidence: 0.95,
        verificationStatus: 'unverified'
      });
    }

    return leads;
  }

  private async scrapeCrunchbase(config: LeadScrapingConfig): Promise<ScrapedLead[]> {
    // Mock Crunchbase scraping
    const leads: ScrapedLead[] = [];

    for (let i = 0; i < Math.min(config.limit, 10); i++) {
      leads.push({
        id: `crunchbase_${Date.now()}_${i}`,
        source: 'crunchbase',
        name: `Founder ${i + 1}`,
        email: `founder${i + 1}@startup.com`,
        company: `Startup ${i + 1}`,
        title: 'CEO/Founder',
        website: `https://startup${i + 1}.com`,
        location: 'San Francisco, CA',
        companySize: 'startup',
        lastUpdated: new Date(),
        confidence: 0.90,
        verificationStatus: 'unverified'
      });
    }

    return leads;
  }

  private async scrapeApollo(config: LeadScrapingConfig): Promise<ScrapedLead[]> {
    // Mock Apollo scraping
    const leads: ScrapedLead[] = [];

    for (let i = 0; i < Math.min(config.limit, 25); i++) {
      leads.push({
        id: `apollo_${Date.now()}_${i}`,
        source: 'apollo',
        name: `Professional ${i + 1}`,
        email: `professional${i + 1}@company.com`,
        company: `Company ${i + 1}`,
        title: 'Manager',
        phone: `+1-555-${String(1000 + i).padStart(4, '0')}`,
        location: 'USA',
        lastUpdated: new Date(),
        confidence: 0.88,
        verificationStatus: 'unverified'
      });
    }

    return leads;
  }

  private async scrapeHunter(config: LeadScrapingConfig): Promise<ScrapedLead[]> {
    // Mock Hunter scraping
    const leads: ScrapedLead[] = [];

    for (let i = 0; i < Math.min(config.limit, 15); i++) {
      leads.push({
        id: `hunter_${Date.now()}_${i}`,
        source: 'hunter',
        name: `Person ${i + 1}`,
        email: `person${i + 1}@domain.com`,
        company: `Company ${i + 1}`,
        title: 'Employee',
        website: `https://company${i + 1}.com`,
        lastUpdated: new Date(),
        confidence: 0.85,
        verificationStatus: 'unverified'
      });
    }

    return leads;
  }

  private async scrapeGitHub(config: LeadScrapingConfig): Promise<ScrapedLead[]> {
    // Mock GitHub scraping
    const leads: ScrapedLead[] = [];

    for (let i = 0; i < Math.min(config.limit, 20); i++) {
      leads.push({
        id: `github_${Date.now()}_${i}`,
        source: 'github',
        name: `Developer ${i + 1}`,
        email: `dev${i + 1}@github.com`,
        company: `Tech ${i + 1}`,
        title: 'Software Engineer',
        githubUrl: `https://github.com/dev${i + 1}`,
        lastUpdated: new Date(),
        confidence: 0.80,
        verificationStatus: 'unverified'
      });
    }

    return leads;
  }

  private async scrapeWeb(config: LeadScrapingConfig): Promise<ScrapedLead[]> {
    // Mock web scraping
    const leads: ScrapedLead[] = [];

    for (let i = 0; i < Math.min(config.limit, 30); i++) {
      leads.push({
        id: `web_${Date.now()}_${i}`,
        source: 'web',
        name: `Contact ${i + 1}`,
        email: `contact${i + 1}@website.com`,
        company: `Business ${i + 1}`,
        title: 'Contact',
        website: `https://website${i + 1}.com`,
        lastUpdated: new Date(),
        confidence: 0.75,
        verificationStatus: 'unverified'
      });
    }

    return leads;
  }

  private async verifyEmail(email: string): Promise<boolean> {
    // Mock email verification
    // In production, integrate with email verification API
    return Math.random() > 0.2; // 80% pass rate
  }

  async getJob(jobId: string): Promise<ScrapingJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async getLeads(jobId: string): Promise<ScrapedLead[]> {
    return Array.from(this.leads.values()).filter(l => l.id.includes(jobId));
  }

  async getAllLeads(verified: boolean = false): Promise<ScrapedLead[]> {
    let leads = Array.from(this.leads.values());

    if (verified) {
      leads = leads.filter(l => l.verificationStatus === 'verified');
    }

    return leads;
  }

  async deduplicateLeads(sourceJobId?: string): Promise<number> {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const [id, lead] of this.leads) {
      if (sourceJobId && !id.includes(sourceJobId)) continue;

      const key = `${lead.email}|${lead.company}`;
      if (seen.has(key)) {
        duplicates.push(id);
      } else {
        seen.add(key);
      }
    }

    // Remove duplicates (keep first occurrence)
    for (const id of duplicates) {
      this.leads.delete(id);
    }

    return duplicates.length;
  }

  async filterLeads(
    criteria: {
      verificationStatus?: string;
      company?: string;
      industry?: string;
      title?: string;
      location?: string;
    }
  ): Promise<ScrapedLead[]> {
    let filtered = Array.from(this.leads.values());

    if (criteria.verificationStatus) {
      filtered = filtered.filter(l => l.verificationStatus === criteria.verificationStatus);
    }

    if (criteria.company) {
      filtered = filtered.filter(l => l.company.includes(criteria.company!));
    }

    if (criteria.industry) {
      filtered = filtered.filter(l => l.industry?.includes(criteria.industry!));
    }

    if (criteria.title) {
      filtered = filtered.filter(l => l.title.includes(criteria.title!));
    }

    if (criteria.location) {
      filtered = filtered.filter(l => l.location?.includes(criteria.location!));
    }

    return filtered;
  }

  async getJobStatus(jobId: string): Promise<ScrapingJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async listJobs(status?: string, limit: number = 50): Promise<ScrapingJob[]> {
    let jobs = Array.from(this.jobs.values());

    if (status) {
      jobs = jobs.filter(j => j.status === status);
    }

    return jobs.slice(-limit);
  }

  async getLeadsStats(): Promise<{
    totalLeads: number;
    verifiedLeads: number;
    bouncedEmails: number;
    verificationRate: number;
    leadsBySource: Record<string, number>;
  }> {
    const leads = Array.from(this.leads.values());
    const verified = leads.filter(l => l.verificationStatus === 'verified').length;
    const bounced = leads.filter(l => l.verificationStatus === 'bounced').length;

    const bySource: Record<string, number> = {};
    for (const lead of leads) {
      bySource[lead.source] = (bySource[lead.source] || 0) + 1;
    }

    return {
      totalLeads: leads.length,
      verifiedLeads: verified,
      bouncedEmails: bounced,
      verificationRate: leads.length > 0 ? (verified / leads.length) * 100 : 0,
      leadsBySource: bySource
    };
  }
}

export const leadScrapingService = new LeadScrapingService();
