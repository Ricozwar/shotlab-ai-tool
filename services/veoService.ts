import { GoogleGenAI } from "@google/genai";

const VEO_MODEL = "veo-3.1-generate-preview";
const POLL_INTERVAL_MS = 10000;

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates an 8-second 9:16 reel (Instagram-style) using Veo 3.1.
 * Optionally uses the given image as the first frame (image-to-video).
 * Returns an object URL for the video blob (suitable for <video src> and download).
 */
export async function generateReel(
  prompt: string,
  firstFrameImageBase64?: string | null
): Promise<string> {
  const config = {
    aspectRatio: "9:16",
    durationSeconds: 8,
    resolution: "720p",
  };

  const params: {
    model: string;
    prompt: string;
    image?: { imageBytes: string; mimeType: string };
    config: typeof config;
  } = {
    model: VEO_MODEL,
    prompt,
    config,
  };

  if (firstFrameImageBase64 && firstFrameImageBase64.trim()) {
    const base64Data = firstFrameImageBase64.includes(",")
      ? firstFrameImageBase64.split(",")[1]
      : firstFrameImageBase64;
    if (base64Data) {
      params.image = { imageBytes: base64Data, mimeType: "image/png" };
    }
  }

  let operation = await ai.models.generateVideos(params);

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation.error) {
    throw new Error(
      (operation.error as { message?: string })?.message ?? "Veo generation failed"
    );
  }

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video) {
    throw new Error("No video data in response.");
  }

  let blob: Blob;

  if (video.videoBytes) {
    const binary = atob(video.videoBytes);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    blob = new Blob([bytes], { type: video.mimeType ?? "video/mp4" });
  } else if (video.uri) {
    const apiKey = process.env.API_KEY;
    const res = await fetch(video.uri, {
      headers: apiKey ? { "x-goog-api-key": apiKey } : {},
    });
    if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);
    blob = await res.blob();
  } else {
    throw new Error("Video has no videoBytes or uri.");
  }

  return URL.createObjectURL(blob);
}
