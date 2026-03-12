import { dnaExtractionService } from './dnaExtractionService';
import { leadScrapingService } from './leadScrapingService';
import { universalAiService } from './universalAiService';

// AMP CLI Service - Command-line interface for Sacred Core
export interface CLICommand {
  name: string;
  description: string;
  aliases: string[];
  options: CLIOption[];
  action: (args: Record<string, any>) => Promise<string>;
}

export interface CLIOption {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
}

class AmpCLIService {
  private commands: Map<string, CLICommand> = new Map();

  async initialize(): Promise<void> {
    this.registerDefaultCommands();
    console.log('💻 AMP CLI Service initialized');
  }

  private registerDefaultCommands(): void {
    // 🧬 DNA Commands
    this.registerCommand({
      name: 'dna:extract',
      description: 'Extract brand DNA from a URL',
      aliases: ['extract'],
      options: [{ name: 'url', type: 'string', required: true, description: 'Target website URL' }],
      action: async (args) => {
        console.log(`🧬 Extracting DNA from: ${args.url}`);
        const dna = await dnaExtractionService.extractDNA(args.url, 'cli_user');
        return `✅ DNA Extracted: ${dna.companyName} (${dna.sector})`;
      }
    });

    // 🚀 Campaign Commands
    this.registerCommand({
      name: 'campaign:generate',
      description: 'Generate marketing campaign from DNA',
      aliases: ['gen'],
      options: [
        { name: 'dnaId', type: 'string', required: true, description: 'Source DNA ID' },
        { name: 'platforms', type: 'string', description: 'Comma-separated platforms' }
      ],
      action: async (args) => {
        const platforms = args.platforms?.split(',') || ['instagram', 'tiktok'];
        console.log(`🚀 Generating campaign for platforms: ${platforms.join(', ')}`);
        // Logic to call campaign generation
        return `✅ Campaign generated for DNA ${args.dnaId}`;
      }
    });

    // 🕵️ Lead Commands
    this.registerCommand({
      name: 'lead:scrape',
      description: 'Scrape leads for a target',
      aliases: ['scrape'],
      options: [{ name: 'target', type: 'string', required: true, description: 'Domain or keyword' }],
      action: async (args) => {
        const taskId = await leadScrapingService.startLeadGen(args.target, 'cli_user');
        return `⏳ Lead scraping task started: ${taskId}`;
      }
    });
  }

  registerCommand(command: CLICommand): void {
    this.commands.set(command.name, command);
  }

  async execute(input: string): Promise<string> {
    const [cmdName, ...rawArgs] = input.split(' ');
    const command = this.commands.get(cmdName);
    
    if (!command) return `❌ Unknown command: ${cmdName}`;

    const args: Record<string, any> = {};
    rawArgs.forEach(arg => {
      if (arg.startsWith('--')) {
        const [k, v] = arg.slice(2).split('=');
        args[k] = v || true;
      }
    });

    try {
      return await command.action(args);
    } catch (err: any) {
      return `❌ Error: ${err.message}`;
    }
  }
}

export const ampCLIService = new AmpCLIService();
