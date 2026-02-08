// Input Validation Service - Prevents injection attacks and validates all user input

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: Record<string, any>;
}

class InputValidationService {
  // Email validation
  validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email || typeof email !== 'string') {
      errors.push('Email must be a string');
      return { valid: false, errors };
    }

    if (email.length > 254) {
      errors.push('Email exceeds maximum length');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: { email: email.toLowerCase().trim() }
    };
  }

  // URL validation
  validateURL(url: string): ValidationResult {
    const errors: string[] = [];

    if (!url || typeof url !== 'string') {
      errors.push('URL must be a string');
      return { valid: false, errors };
    }

    try {
      new URL(url);
    } catch {
      errors.push('Invalid URL format');
    }

    // Check for suspicious patterns
    if (url.includes('javascript:') || url.includes('data:')) {
      errors.push('Suspicious URL scheme detected');
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: { url }
    };
  }

  // Text validation (prevent XSS)
  validateText(text: string, maxLength = 5000): ValidationResult {
    const errors: string[] = [];

    if (!text || typeof text !== 'string') {
      errors.push('Text must be a string');
      return { valid: false, errors };
    }

    if (text.length > maxLength) {
      errors.push(`Text exceeds maximum length of ${maxLength}`);
    }

    const sanitized = this.sanitizeText(text);

    return {
      valid: errors.length === 0,
      errors,
      sanitized: { text: sanitized }
    };
  }

  // Number validation
  validateNumber(num: any, min = 0, max = Number.MAX_SAFE_INTEGER): ValidationResult {
    const errors: string[] = [];

    if (typeof num !== 'number' || isNaN(num)) {
      errors.push('Must be a valid number');
      return { valid: false, errors };
    }

    if (num < min) {
      errors.push(`Number must be greater than or equal to ${min}`);
    }

    if (num > max) {
      errors.push(`Number must be less than or equal to ${max}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: { number: num }
    };
  }

  // Object validation
  validateObject(obj: any, schema: Record<string, string>): ValidationResult {
    const errors: string[] = [];

    if (typeof obj !== 'object' || obj === null) {
      errors.push('Must be a valid object');
      return { valid: false, errors };
    }

    for (const [key, type] of Object.entries(schema)) {
      const value = obj[key];
      if (value !== undefined && value !== null) {
        if (typeof value !== type) {
          errors.push(`Field "${key}" must be of type ${type}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: obj
    };
  }

  // Campaign data validation
  validateCampaignData(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Campaign data must be an object');
      return { valid: false, errors };
    }

    // Validate name
    const nameValidation = this.validateText(data.name || '', 200);
    if (!nameValidation.valid) {
      errors.push('Invalid campaign name: ' + nameValidation.errors.join(', '));
    }

    // Validate goal
    if (data.goal && typeof data.goal !== 'string') {
      errors.push('Campaign goal must be a string');
    }

    // Validate timeline
    if (data.timeline && typeof data.timeline !== 'string') {
      errors.push('Campaign timeline must be a string');
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: {
        name: data.name?.trim() || '',
        goal: data.goal?.trim() || '',
        timeline: data.timeline?.trim() || '',
        audienceSegment: data.audienceSegment?.trim() || ''
      }
    };
  }

  // Prompt validation (for LLM calls)
  validatePrompt(prompt: string, maxLength = 5000): ValidationResult {
    const errors: string[] = [];

    if (!prompt || typeof prompt !== 'string') {
      errors.push('Prompt must be a non-empty string');
      return { valid: false, errors };
    }

    if (prompt.length > maxLength) {
      errors.push(`Prompt exceeds maximum length of ${maxLength}`);
    }

    // Prevent prompt injection attempts
    const suspiciousPatterns = [
      'ignore previous',
      'forget about',
      'pretend you are',
      'you are now',
      'new instructions'
    ];

    const lowerPrompt = prompt.toLowerCase();
    for (const pattern of suspiciousPatterns) {
      if (lowerPrompt.includes(pattern)) {
        errors.push(`Suspicious prompt pattern detected: "${pattern}"`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: { prompt: this.sanitizeText(prompt) }
    };
  }

  // API key validation
  validateAPIKey(key: string): ValidationResult {
    const errors: string[] = [];

    if (!key || typeof key !== 'string') {
      errors.push('API key must be a non-empty string');
      return { valid: false, errors };
    }

    if (key.length < 10) {
      errors.push('API key seems too short');
    }

    if (key.length > 512) {
      errors.push('API key exceeds reasonable length');
    }

    // Check for spaces or newlines
    if (/[\s\n\r]/.test(key)) {
      errors.push('API key contains whitespace');
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: { key } // Don't log the actual key
    };
  }

  // Sanitize text to prevent XSS
  private sanitizeText(text: string): string {
    if (typeof text !== 'string') return '';

    return text
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  // Rate limiting check
  checkRateLimit(userId: string, limit = 100, windowSeconds = 3600): boolean {
    // This is a simplified version - in production use Redis
    const key = `ratelimit:${userId}`;
    const now = Date.now();
    
    // Store in localStorage for demo
    const data = JSON.parse(localStorage.getItem(key) || '{"count":0,"reset":0}');
    
    if (now > data.reset) {
      data.count = 0;
      data.reset = now + (windowSeconds * 1000);
    }

    data.count++;
    localStorage.setItem(key, JSON.stringify(data));

    return data.count <= limit;
  }

  // Get rate limit status
  getRateLimitStatus(userId: string): { remaining: number; resetIn: number } {
    const key = `ratelimit:${userId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{"count":0,"reset":0}');
    const now = Date.now();

    return {
      remaining: Math.max(0, 100 - data.count),
      resetIn: Math.max(0, data.reset - now)
    };
  }
}

export const inputValidationService = new InputValidationService();
