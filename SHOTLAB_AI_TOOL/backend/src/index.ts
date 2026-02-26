import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authMiddleware } from './auth.js';
import { getUsage, checkAndIncrementImages, checkAndIncrementReels, ensureUser } from './db.js';
import { removeBackground, generateImage } from './ai/gemini.js';
import { generateReel } from './ai/veo.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  })
);
app.use(express.json({ limit: '50mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/usage', authMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId: string }).userId;
    const usage = await getUsage(userId);
    res.json(usage);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

app.post('/api/remove-background', authMiddleware, async (req, res) => {
  const userId = (req as express.Request & { userId: string; userEmail?: string }).userId;
  const userEmail = (req as express.Request & { userId: string; userEmail?: string }).userEmail;
  await ensureUser(userId, userEmail);
  const check = await checkAndIncrementImages(userId);
  if (!check.ok) {
    res.status(403).json({ error: check.error });
    return;
  }
  const { imageBase64 } = req.body as { imageBase64?: string };
  if (!imageBase64) {
    res.status(400).json({ error: 'imageBase64 required' });
    return;
  }
  try {
    const result = await removeBackground(imageBase64);
    res.json({ imageBase64: result });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Background removal failed' });
  }
});

app.post('/api/generate-image', authMiddleware, async (req, res) => {
  const userId = (req as express.Request & { userId: string; userEmail?: string }).userId;
  const userEmail = (req as express.Request & { userId: string; userEmail?: string }).userEmail;
  await ensureUser(userId, userEmail);
  const check = await checkAndIncrementImages(userId);
  if (!check.ok) {
    res.status(403).json({ error: check.error });
    return;
  }
  const {
    prompt,
    aspectRatio,
    productImageBase64,
    enhancements,
    imageSize,
  } = req.body as {
    prompt?: string;
    aspectRatio?: string;
    productImageBase64?: string;
    enhancements?: { lighting: string; shadows: string; autoColorMatch: boolean };
    imageSize?: '1K' | '2K' | '4K';
  };
  if (!prompt?.trim()) {
    res.status(400).json({ error: 'prompt required' });
    return;
  }
  try {
    const url = await generateImage(
      prompt,
      aspectRatio || '1:1',
      productImageBase64,
      enhancements,
      imageSize || '2K'
    );
    res.json({ url });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Image generation failed' });
  }
});

app.post('/api/generate-reel', authMiddleware, async (req, res) => {
  const userId = (req as express.Request & { userId: string; userEmail?: string }).userId;
  const userEmail = (req as express.Request & { userId: string; userEmail?: string }).userEmail;
  await ensureUser(userId, userEmail);
  const check = await checkAndIncrementReels(userId);
  if (!check.ok) {
    res.status(403).json({ error: check.error });
    return;
  }
  const { prompt, firstFrameImageBase64 } = req.body as {
    prompt?: string;
    firstFrameImageBase64?: string | null;
  };
  if (!prompt?.trim()) {
    res.status(400).json({ error: 'prompt required' });
    return;
  }
  try {
    const dataUrl = await generateReel(prompt, firstFrameImageBase64);
    res.json({ videoBase64: dataUrl });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Reel generation failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
