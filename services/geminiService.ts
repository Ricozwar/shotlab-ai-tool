import { GoogleGenAI } from "@google/genai";
import { AppMode, EnhancementOptions, ImageResolution } from "../types";

// Nano Banana Pro — wyższa jakość, rozdzielczość do 4K
const MODEL_NAME = 'gemini-3-pro-image-preview';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Gemini to isolate the product on a white background.
 * This prepares the image for better composition in the next step.
 */
export const removeBackground = async (imageBase64: string): Promise<string> => {
  try {
    const base64Data = imageBase64.split(',')[1] || imageBase64;

    const prompt = `
      Task: Product Isolation for E-commerce.
      1. Identify the main product in the image.
      2. Crop it closely and place it on a pure solid white background (hex #FFFFFF).
      3. Do not change the angle, lighting, or texture of the product itself.
      4. Ensure the edges are clean.
      5. Return ONLY the image of the product on white.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "2K"
        }
      }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("Nie udało się wygenerować obrazu bez tła.");
  } catch (error) {
    console.error("Gemini Remove Background Error:", error);
    throw error;
  }
};

/**
 * Generates a product-placement image: places the given product into the scene described by the prompt.
 * Uses image-to-image (product + prompt).
 */
export const generateImage = async (
  prompt: string,
  mode: AppMode,
  aspectRatio: string,
  productImageBase64?: string,
  enhancements?: EnhancementOptions,
  imageSize: ImageResolution = '2K'
): Promise<string> => {
  try {
    let contents: any;

    // Build enhancement strings
    let lightingPrompt = "";
    let shadowPrompt = "";
    let colorPrompt = "";

    if (enhancements) {
        switch (enhancements.lighting) {
            case 'studio':
                lightingPrompt = "LIGHTING: Professional studio softbox lighting, neutral white balance, even illumination.";
                break;
            case 'warm':
                lightingPrompt = "LIGHTING: Golden hour aesthetics, warm sunlight rays entering from the side, cozy atmosphere.";
                break;
            case 'dramatic':
                lightingPrompt = "LIGHTING: High contrast chiaroscuro, moody atmosphere, spotlight on product, dark surroundings.";
                break;
            case 'natural':
            default:
                lightingPrompt = "LIGHTING: Soft, diffused natural daylight coming from a window.";
                break;
        }

        switch (enhancements.shadows) {
            case 'hard':
                shadowPrompt = "SHADOWS: Sharp, defined cast shadows to ground the product.";
                break;
            case 'dynamic':
                shadowPrompt = "SHADOWS: Realistic, long shadows matching the direction of the light source.";
                break;
            case 'soft':
            default:
                shadowPrompt = "SHADOWS: Soft, ambient contact shadows (ambient occlusion) under the product.";
                break;
        }

        if (enhancements.autoColorMatch) {
            colorPrompt = "COLOR HARMONY: Analyze the product's dominant colors and ensure the background color palette is complementary and harmonious with it.";
        }
    }

    if (mode === AppMode.PRODUCT_PLACEMENT && productImageBase64) {
      // Image + Text Generation (Product Placement)
      // STRICT GEOMETRY PRESERVATION PROMPT
      const enhancedPrompt = `
        ROLE: Expert Product Photographer & Digital Compositor.
        
        INPUT: The attached image contains a specific product (furniture/decor).
        GOAL: Place this EXACT product into a new scene described as: "${prompt}".
        
        ENHANCEMENTS:
        ${lightingPrompt}
        ${shadowPrompt}
        ${colorPrompt}
        
        CRITICAL RULES FOR PRODUCT PRESERVATION (ZERO TOLERANCE FOR DISTORTION):
        1. **NO GEOMETRIC DISTORTION**: You MUST NOT change the shape, perspective, proportions, lines, or structure of the product. It must remain structurally identical to the input image.
        2. **NO HALLUCINATION**: Do not add handles, legs, knobs, or textures that are not present in the original input. Do not "fix" the product.
        3. **PERSPECTIVE MATCHING**: Generate the background perspective to match the product's existing angle. Do NOT warp the product to fit the background.
        4. **LIGHTING INTEGRATION**: Apply the requested lighting logic to the product's surface (reflections/highlights) to blend it, but keep the physical form rigid.
        
        OUTPUT STYLE: High-end, photorealistic e-commerce photography.
      `;

      // Extract base64 data (remove header if present)
      const base64Data = productImageBase64.split(',')[1] || productImageBase64;

      contents = {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', // Assuming PNG/JPEG, API handles standard types well
              data: base64Data,
            },
          },
          {
            text: enhancedPrompt,
          },
        ],
      };
    } else {
      // Text-to-Image (Background Only)
      const backgroundPrompt = `
        Generate a photorealistic background image for product placement.
        Scene description: "${prompt}".
        
        ENHANCEMENTS:
        ${lightingPrompt}
        ${colorPrompt}
        
        REQUIREMENTS:
        1. High resolution, sharp details.
        2. Professional interior design or scenery.
        3. Leave a natural space in the composition where a product could be placed later.
        4. Photorealistic quality suitable for e-commerce.
      `;

      contents = {
        parts: [
          {
            text: backgroundPrompt,
          },
        ],
      };
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize
        }
      }
    });

    // Iterate through parts to find the image
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image data found in response.");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};