import { GoogleGenAI } from '@google/genai';

const MODEL_NAME = 'gemini-3-pro-image-preview';

function getAi() {
  const key = process.env.API_KEY;
  if (!key) throw new Error('API key not configured. Set API_KEY in .env.');
  return new GoogleGenAI({ apiKey: key });
}

export async function removeBackground(imageBase64: string): Promise<string> {
  const ai = getAi();
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1]! : imageBase64;
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Data } },
        { text: 'Task: Product Isolation. Identify main product, crop closely, place on pure white background (#FFFFFF). Do not change angle/lighting/texture. Return ONLY the image of the product on white.' },
      ],
    },
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '1:1', imageSize: '2K' },
    },
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error('No image in response');
}

type ImageSize = '1K' | '2K' | '4K';

export async function generateImage(
  prompt: string,
  aspectRatio: string,
  productImageBase64: string | undefined,
  enhancements: { lighting: string; shadows: string; autoColorMatch: boolean } | undefined,
  imageSize: ImageSize = '2K'
): Promise<string> {
  const lightingPrompt = enhancements?.lighting === 'studio' ? 'Professional studio softbox lighting.'
    : enhancements?.lighting === 'warm' ? 'Golden hour, warm sunlight.'
    : enhancements?.lighting === 'dramatic' ? 'Chiaroscuro, moody.'
    : 'Soft natural daylight from a window.';
  const shadowPrompt = enhancements?.shadows === 'hard' ? 'Sharp cast shadows.'
    : enhancements?.shadows === 'dynamic' ? 'Realistic long shadows.'
    : 'Soft ambient contact shadows.';
  const colorPrompt = enhancements?.autoColorMatch ? 'Color harmony with product.' : '';

  const enhancedPrompt = productImageBase64
    ? `ROLE: Expert Product Photographer. INPUT: Attached image = product. GOAL: Place this EXACT product into: "${prompt}". ENHANCEMENTS: ${lightingPrompt} ${shadowPrompt} ${colorPrompt}. CRITICAL: NO geometric distortion, no adding parts. Match background perspective to product angle. OUTPUT: Photorealistic e-commerce.`
    : `Generate photorealistic background for product placement. Scene: "${prompt}". ${lightingPrompt} ${colorPrompt}. High resolution, leave space for product.`;

  let contents: { parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> };
  if (productImageBase64) {
    const base64Data = productImageBase64.includes(',') ? productImageBase64.split(',')[1]! : productImageBase64;
    contents = {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Data } },
        { text: enhancedPrompt },
      ],
    };
  } else {
    contents = { parts: [{ text: enhancedPrompt }] };
  }

  const ai = getAi();
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio, imageSize },
    },
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error('No image in response');
}
