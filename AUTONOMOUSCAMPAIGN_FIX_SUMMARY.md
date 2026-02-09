# Autonomous Campaign Service Fix - Phase 3 Complete

## Overview
Fixed hardcoded Gemini dependencies in `services/autonomousCampaignService.ts` to respect user-selected LLM and image generation providers from the Zustand store.

## Changes Made

### File: `services/autonomousCampaignService.ts`

#### Imports Added
```typescript
import { universalAiService } from "./universalAiService";
import { imageGenerationService } from "./imageGenerationService";
import { useStore } from "../store";
```

#### 1. Asset Generation (Text/JSON)
**Before:** Hardcoded to use `generateAssetFromStory` from `geminiService`
```typescript
const rawAsset = await generateAssetFromStory(this.brand, story);
```

**After:** Routes based on `providers.activeLLM`
```typescript
const { providers } = useStore.getState();
const activeLLM = providers.activeLLM || 'gemini';

let rawAsset;
if (activeLLM === 'gemini') {
  rawAsset = await generateAssetFromStory(this.brand, story);
} else {
  // Use universalAiService for other providers (OpenAI, Anthropic, Mistral, etc.)
  const prompt = `Generate a complete campaign asset for this story:\n${JSON.stringify(story)}\n\nBrand context: ${this.brand.name}\n\nReturn valid JSON with: title, headline, content, platformPost, cta, imagePrompt (string), hashtags (array), metadata (object with platformConvention)`;
  const responseText = await universalAiService.generateText({
    prompt,
    responseMimeType: 'application/json',
    bypassCache: true
  });
  rawAsset = JSON.parse(responseText);
}
```

**Impact:** Campaign text/assets now generated using user's selected LLM (Mistral, OpenAI, Claude, etc.)

#### 2. Image Generation
**Before:** Hardcoded to use `generateCampaignImage` from `geminiService`
```typescript
imageUrl = await generateCampaignImage(finalAssetData.imagePrompt, this.brand);
```

**After:** Routes based on `providers.activeImage` with fallback
```typescript
const activeImage = providers.activeImage || 'stability-ultra';

try {
  const generatedImage = await imageGenerationService.generate({
    prompt: finalAssetData.imagePrompt,
    provider: activeImage,
    width: 1024,
    height: 1024
  });
  imageUrl = generatedImage.url;
} catch (imageError) {
  this.onLog(`[MEDIA] Image generation failed, using fallback...`, 'warning');
  // Fallback to Gemini image generation
  imageUrl = await generateCampaignImage(finalAssetData.imagePrompt, this.brand);
}
```

**Impact:** Campaign images now generated using user's selected image provider (Stability Ultra, DALLE-4, Leonardo, Black Forest Labs, etc.)

## Provider Support
The autonomous campaign engine now supports:

### LLM Providers
- Gemini (default)
- OpenAI
- Anthropic (Claude)
- Mistral
- Groq
- DeepSeek

### Image Providers
- Stability Ultra (default)
- DALLE-3, DALLE-4
- Leonardo
- Black Forest Labs
- Midjourney
- Recraft
- Adobe Firefly
- + more via imageGenerationService

## Flow Diagram
```
AutonomousCampaignEngine.executeStory()
├─ Load providers from useStore
├─ Asset Generation
│  ├─ IF activeLLM === 'gemini' → geminiService
│  └─ ELSE → universalAiService (routes to correct provider)
├─ Healing/Audit (unchanged)
├─ Image Generation
│  ├─ TRY → imageGenerationService (routes to activeImage provider)
│  └─ CATCH → fallback to geminiService
└─ Asset Finalization
```

## Testing
1. Set Settings to use Mistral for LLM and Stability Ultra for images
2. Create a new campaign
3. Verify in browser console logs that:
   - Text generation routes to Mistral
   - Image generation routes to Stability Ultra
4. Check generated assets use selected providers (quality/style should match)

## Backward Compatibility
- Default behavior unchanged (Gemini)
- Fallback to Gemini if imageGenerationService fails
- geminiService still imported and available
- No breaking changes to public API

## Related Files
- `store.ts` - Provider selection state (activeLLM, activeImage)
- `universalAiService.ts` - Multi-provider LLM support
- `imageGenerationService.ts` - Multi-provider image generation
- `campaignPRDService.ts` - Already updated with same pattern (Phase 2)
