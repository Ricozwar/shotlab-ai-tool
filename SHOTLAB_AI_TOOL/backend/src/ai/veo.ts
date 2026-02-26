import { GoogleGenAI } from '@google/genai';

const VEO_MODEL = 'veo-3.1-generate-preview';
const POLL_INTERVAL_MS = 10000;

function getAi() {
  const key = process.env.API_KEY;
  if (!key) throw new Error('API key not configured. Set API_KEY in .env.');
  return new GoogleGenAI({ apiKey: key });
}

/** Returns base64 video (data URL or raw base64) so frontend can create blob URL. */
export async function generateReel(
  prompt: string,
  firstFrameImageBase64?: string | null
): Promise<string> {
  const ai = getAi();
  const config = { aspectRatio: '9:16', durationSeconds: 8, resolution: '720p' as const };
  const params: {
    model: string;
    prompt: string;
    image?: { imageBytes: string; mimeType: string };
    config: typeof config;
  } = { model: VEO_MODEL, prompt, config };

  if (firstFrameImageBase64?.trim()) {
    const base64Data = firstFrameImageBase64.includes(',')
      ? firstFrameImageBase64.split(',')[1]
      : firstFrameImageBase64;
    if (base64Data) {
      params.image = { imageBytes: base64Data, mimeType: 'image/png' };
    }
  }

  let operation = await ai.models.generateVideos(params);
  while (!operation.done) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation.error) {
    throw new Error((operation.error as { message?: string })?.message ?? 'Veo failed');
  }

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video) throw new Error('No video in response');

  if (video.videoBytes) {
    return `data:video/mp4;base64,${video.videoBytes}`;
  }
  if (video.uri) {
    const apiKey = process.env.API_KEY;
    const res = await fetch(video.uri, {
      headers: apiKey ? { 'x-goog-api-key': apiKey } : {},
    });
    if (!res.ok) throw new Error(`Download video failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    return `data:video/mp4;base64,${base64}`;
  }
  throw new Error('Video has no videoBytes or uri');
}
