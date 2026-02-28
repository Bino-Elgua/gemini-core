# Sacred Core - AI Services Mapping (ACTUAL IMPLEMENTATION)

## Services That Touch AI

### 1. **universalAiService.ts** - Core LLM Router
```typescript
// Calls whatever LLM is configured (Gemini, OpenAI, Anthropic, etc.)
await universalAiService.generateText({
  prompt: string,
  responseMimeType?: 'text/plain' | 'application/json',
  featureId?: string,
  bypassCache?: boolean,
  modelOverride?: 'gemini' | 'gpt-4' | 'claude' | ...
})

// CALLS TO:
- Google Gemini API (primary fallback)
- OpenAI GPT-4 (if configured)
- Anthropic Claude (if configured)
- Groq / Mistral / Cohere (if configured)
// Cache: Neural cache (1-hour TTL)
// Cost tracking: Per token
```

### 2. **aiProviderService.ts** - Provider Registry
```typescript
// Manages all 30+ AI providers
// Initializes defaults: Gemini (LLM), Unsplash (image), Web Speech (voice)

const LLM_PROVIDERS = [
  'google-gemini', 'openai-gpt4', 'openai-gpt35',
  'anthropic-claude3', 'mistral-large', 'xai-grok',
  'deepseek', 'groq', 'together', 'openrouter',
  'perplexity', 'qwen', 'cohere', 'meta-llama',
  'azure-openai', 'ollama', 'sambanova', 'cerebras',
  'hyperbolic', 'nebius', 'aws-bedrock', 'friendli',
  'replicate', 'minimax', 'hunyuan', 'blackbox',
  'dify', 'venice', 'zai', 'hugging-face'
];

const IMAGE_PROVIDERS = [
  'google-imagen', 'openai-dalle3', 'openai-dalle4',
  'stability-ai', 'stability-sd3', 'stability-flux',
  'midjourney', 'runware', 'leonardo', 'recraft',
  'xai-grok', 'amazon-titan', 'adobe-firefly',
  'deepai', 'replicate', 'bria', 'segmind',
  'prodia', 'ideogram', 'black-forest-labs',
  'wan', 'hunyuan-image', 'unsplash-fallback'
];

const VIDEO_PROVIDERS = [
  'openai-sora', 'google-veo', 'runway', 'kling',
  'luma', 'ltx-2', 'wan-video', 'hunyuan-video',
  'mochi', 'seedance', 'pika', 'hailuoai',
  'pixverse', 'higgsfield', 'heygen', 'synthesia',
  'deepbrain', 'colossyan', 'replicate-video',
  'fal-ai', 'fireworks', 'wavespeed', 'bbb-fallback'
];

// Methods:
callLLM(prompt, providerId?, options?) → string
getConfiguredProviders(type: 'llm' | 'image' | 'video') → AIProvider[]
```

### 3. **inferenceRouter.ts** - Decoding Strategies
Routes prompts through different reasoning strategies:

```typescript
// Direct Shot - Fast
inferenceRouter.generateFast(prompt)
  └─> universalAiService.generateText(prompt)

// Chain of Thought - Step-by-step reasoning
inferenceRouter.generateWithReasoning(prompt)
  └─> universalAiService.generateText(updatedPrompt with "Let's think step by step...")

// Chain of Verification - Generate, verify, revise
inferenceRouter.generateWithVerification(prompt)
  └─> Call 1: Generate baseline
  └─> Call 2: Fact-check baseline
  └─> Call 3: Revise based on critique

// Self-Consistency - Multiple generations, pick best
inferenceRouter.generateSelfConsistency(prompt, samples=2)
  └─> Call 1: Generate variation 1
  └─> Call 2: Generate variation 2
  └─> Call 3: Select best via LLM
```

### 4. **campaignPRDService.ts** - Strategy Generation
Creates the campaign blueprint (what to make):

```typescript
createCampaignPRD(brand, overview, channels)
  
  If activeLLM === 'gemini':
    └─> generateAdvancedPRD() [Gemini-optimized]
  
  Else (OpenAI, Anthropic, etc.):
    └─> universalAiService.generateText({
      prompt: `Generate campaign PRD JSON with objectives, channels, timeline, KPIs, contentPillars, assets`,
      responseMimeType: 'application/json'
    })
  
  Fallback to Gemini if other provider fails

RETURNS: CampaignPRD {
  title, objectives, channels[], timeline[], kpis[], contentPillars[], assets[]
}
```

### 5. **autonomousCampaignService.ts** - Content Generation Engine
The actual content synthesizer:

```typescript
class AutonomousCampaignEngine {
  
  async executeStory(story: UserStory) {
    
    1. GET ACTIVE PROVIDERS from store:
       const activeLLM = providers.activeLLM || 'gemini'
       const activeImage = providers.activeImage || 'stability-ultra'
    
    2. GENERATE CONTENT:
       If activeLLM === 'gemini':
         rawAsset = await generateAssetFromStory(brand, story)
       Else:
         rawAsset = await universalAiService.generateText({
           prompt: "Generate JSON asset with title, headline, content, platformPost, cta, imagePrompt...",
           responseMimeType: 'application/json'
         })
    
    3. VALIDATE CONTENT:
       { asset, report } = await healAsset(brand, rawAsset, story)
       └─> Strict single-pass validation
    
    4. GENERATE IMAGE:
       If imagePrompt exists:
         image = await imageGenerationService.generate({
           prompt: finalAssetData.imagePrompt,
           provider: activeImage,
           width: 1024, height: 1024
         })
    
    5. RETURN FINAL ASSET with image URL
  }
}
```

### 6. **imageGenerationService.ts** - Image Synthesis
Connects to 20+ image providers:

```typescript
async generate(request: ImageGenerationRequest) {
  
  const provider = request.provider || 'unsplash-fallback'
  
  switch(provider):
    case 'openai-dalle3':
      POST https://api.openai.com/v1/images/generations
      Header: Authorization: Bearer {OPENAI_API_KEY}
      Body: { model: 'dall-e-3', prompt, n: 1, size: '1024x1024' }
    
    case 'stability':
      POST https://api.stability.ai/v2beta/stable-image/generate/...
      Header: Authorization: Bearer {STABILITY_API_KEY}
    
    case 'stability-ultra':
      POST https://api.stability.ai/v2beta/stable-image/ultra/...
    
    case 'midjourney':
      POST https://api.midjourneyapi.xyz/mj/submit/...
    
    case 'leonardo':
      POST https://api.leonardo.ai/v1/generations
      Header: Authorization: Bearer {LEONARDO_API_KEY}
    
    case 'black-forest-labs':
      POST https://api.blackforestlabs.ai/flux/...
    
    default:
      GET https://api.unsplash.com/search/photos
      (Free fallback)
  
  RETURNS: GeneratedImage { id, prompt, provider, url, width, height, cost, createdAt }
}

// Cost tracking:
costTrackingService.logUsage({
  provider,
  operationType: 'image_generation',
  cost: estimateCost(provider, 'image_generation'),
  metadata: { width, height }
})
```

### 7. **videoService.ts** - Video Synthesis (from earlier doc)
```typescript
generateVideo(prompt, engine, onComplete)

case 'veo-3':
  POST https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:generateContent
  Auth: Bearer {GEMINI_API_KEY}

case 'ltx-2':
  POST https://fal.run/fal-ai/ltx-video
  Auth: Key {FAL_API_KEY}

case 'luma':
  POST https://api.lumalabs.ai/v1/generations
  Auth: Bearer {LUMA_API_KEY}
  Then POLL: GET https://api.lumalabs.ai/v1/generations/{id} (30 attempts, 5s delay)
```

### 8. **geminiService.ts** - Gemini-Specific Optimizations
```typescript
// For when Gemini is the active LLM (faster, more optimized paths)

generateAdvancedPRD(brand, overview, channels)
  └─> Google Gemini API with structured JSON output

generateAssetFromStory(brand, story)
  └─> Google Gemini API with campaign asset JSON schema
```

### 9. **selfHealingService.ts** - Content Validation
```typescript
healAsset(brand, asset, story, iterations, onLog)
  
  Validates:
  - Brand voice consistency
  - No hallucinations
  - Platform conventions
  - Hashtag quality
  - CTA clarity
  
  May call universalAiService.generateText() to repair content
```

---

## Complete Campaign Creation Flow (Actual)

```
USER CLICKS: "Create Campaign"
    ↓
STEP 1: Create Campaign PRD
  campaignPRDService.createCampaignPRD(brand, overview, channels)
    ├─ Check: activeLLM = store.providers.activeLLM || 'gemini'
    ├─ If Gemini: generateAdvancedPRD() [Gemini SDK optimized]
    └─ Else: universalAiService.generateText(prdPrompt) [JSON]
  
  EXTERNAL CALLS:
    - 1x Google Gemini API (or other LLM provider)
  
  OUTPUT: CampaignPRD { objectives, channels, timeline, KPIs, contentPillars, assets }

    ↓

STEP 2: Generate User Stories (Dependencies)
  For each contentPillar:
    1. Create UserStory with dependencies calculated
    2. Stratify by execution layer (no polling loops)
    3. Queue stories for execution

    ↓

STEP 3: Execute Stories (Parallel by Layer)
  For each story in current layer:
    
    a) Generate Asset Content:
       AutonomousCampaignEngine.executeStory(story)
       
       Get activeImage = store.providers.activeImage || 'stability-ultra'
       
       If activeLLM === 'gemini':
         asset = await generateAssetFromStory(brand, story)
       Else:
         asset = await universalAiService.generateText({
           prompt: "Generate asset JSON: title, headline, content, imagePrompt...",
           responseMimeType: 'application/json'
         })
       
       EXTERNAL CALLS:
         - 1x Gemini API (or other LLM)
    
    b) Validate Asset:
       { asset, report } = await healAsset(brand, asset, story, 1, log)
       
       Single-pass validation:
       - Brand voice check
       - Fact-check
       - Platform conventions
       - Hashtag validation
       - CTA clarity
       
       May call universalAiService if repair needed
       
       EXTERNAL CALLS:
         - 0-1x LLM (if repair needed)
    
    c) Generate Image:
       If asset.imagePrompt:
         image = await imageGenerationService.generate({
           prompt: asset.imagePrompt,
           provider: activeImage,  // e.g., 'stability-ultra'
           width: 1024, height: 1024
         })
         
         EXTERNAL CALLS:
           - 1x Image API (DALLE-3, Stability, Leonardo, etc.)
    
    d) Return Final Asset with image URL
       onAssetGenerated(asset)

    ↓

STEP 4: Aggregate Results
  All stories completed
  Assets stored in campaign
  Display in UI

═══════════════════════════════════════════════════════════════

TYPICAL COST PER CAMPAIGN:

Campaign with 5 user stories, 5 images:

1. PRD generation: ~0.0001 (300 tokens, Gemini)
2. Content generation (5 stories): ~0.0005 (5 × 100-token LLM calls)
3. Image generation (5 images): ~7.50 (5 × $1.50 per image, Stability)
4. Validation (if repairs): ~0.0002 (1 repair call)

TOTAL: ~$7.50 per campaign (mostly image costs)

If using free image fallback (Unsplash):
TOTAL: ~$0.001 per campaign (LLM only)
```

---

## Provider Priority (What Gets Called)

### LLM Sequence:
1. Check `store.providers.activeLLM`
2. If 'gemini' → Use Gemini-optimized path
3. Else → Use universalAiService (supports 30+ providers)
4. If provider fails → Fallback to Gemini
5. If no provider configured → Error

### Image Sequence:
1. Check `store.providers.activeImage`
2. Switch on provider (DALLE-3, Stability, Leonardo, etc.)
3. If provider fails → Fallback to Unsplash (free, always works)
4. Return image URL

### Video Sequence:
1. Check user tier limits
2. Call appropriate engine API
3. If async (Luma) → Start polling loop
4. If sync (Fal.ai) → Wait for response
5. Track cost based on tier

---

## Services That DON'T Touch AI Directly

- **collaborationService.ts** - Real-time chat/activity (no AI)
- **analyticsService.ts** - Event tracking (no AI)
- **leadScrapingService.ts** - Web scraping (no AI)
- **costTrackingService.ts** - Cost logging (no AI)
- **hybridStorageService.ts** - Data persistence (no AI)

---

## Environment Variables Needed for Full AI Access

```bash
# LLM Providers
VITE_GEMINI_API_KEY                # Required (default)
VITE_OPENAI_API_KEY                # Optional (GPT-4, DALLE-3)
VITE_ANTHROPIC_API_KEY             # Optional (Claude)
VITE_GROQ_API_KEY                  # Optional
VITE_MISTRAL_API_KEY               # Optional
VITE_COHERE_API_KEY                # Optional

# Image Providers
VITE_STABILITY_API_KEY             # For Stability/Stability-Ultra/Flux
VITE_OPENAI_API_KEY                # For DALLE-3/DALLE-4
VITE_MIDJOURNEY_API_KEY            # For Midjourney
VITE_LEONARDO_API_KEY              # For Leonardo
VITE_BLACK_FOREST_LABS_API_KEY     # For Flux

# Video Providers
VITE_FAL_API_KEY                   # For Fal.ai LTX-2
VITE_LUMA_API_KEY                  # For Luma Labs
VITE_KLING_API_KEY                 # For Kling

# Always needed
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

This is the **actual working implementation** in Full-Core.
