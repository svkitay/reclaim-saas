require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { fal } = require('@fal-ai/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3001;

fal.config({ credentials: process.env.FAL_KEY });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

const LIFESTYLE_PROMPT = [
  'A photorealistic lifestyle living room scene featuring this furniture piece as the centerpiece,',
  'natural light streaming through large windows, warm interior design,',
  'modern Scandinavian aesthetic, potted plants, hardwood floors,',
  'magazine-quality interior photography, 8K resolution, highly detailed'
].join(' ');

const COPY_PROMPT = `You are a professional furniture marketing copywriter.
Look at this photorealistic lifestyle image of a furniture piece in a living room scene.

Write EXACTLY the following three pieces of marketing copy. Return them as a JSON object with these exact keys:
- "instagram": An Instagram caption (max 150 characters total, include 5 relevant hashtags on a new line)
- "facebook": A Facebook post (2-3 sentences, conversational and warm, no hashtags)
- "headline": A short punchy ad headline (max 8 words, focus on the lifestyle aspiration)

Respond ONLY with valid JSON, no markdown, no explanation.`;

function parseGeminiJSON(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(cleaned);
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/generate', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const tempPath = req.file.path;

  try {
    // Step 1: Upload to fal.ai storage
    const fileBuffer = fs.readFileSync(tempPath);
    const uploadedUrl = await fal.storage.upload(fileBuffer, {
      contentType: req.file.mimetype,
      fileName: req.file.originalname
    });

    // Step 2: Generate lifestyle scene via fal-ai/nano-banana-2
    const falResult = await fal.subscribe('fal-ai/nano-banana-2', {
      input: {
        image_url: uploadedUrl,
        prompt: LIFESTYLE_PROMPT,
        negative_prompt: 'blurry, deformed, cartoon, illustration, watermark, text, logo',
        num_inference_steps: 28,
        guidance_scale: 7.5,
        strength: 0.75
      },
      logs: false
    });

    const lifestyleImageUrl = falResult.data.images[0].url;

    // Step 3: Fetch the generated image and convert to base64 for Gemini
    const imageResponse = await fetch(lifestyleImageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const imageBase64 = imageBuffer.toString('base64');

    // Step 4: Generate marketing copy via Gemini
    const geminiResult = await geminiModel.generateContent([
      { text: COPY_PROMPT },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      }
    ]);

    const rawText = geminiResult.response.text();
    const copy = parseGeminiJSON(rawText);
    const { instagram, facebook, headline } = copy;

    if (!instagram || !facebook || !headline) {
      throw new Error('Gemini response missing required keys');
    }

    fs.unlinkSync(tempPath);

    res.json({
      originalName: req.file.originalname,
      lifestyleImageUrl,
      instagram,
      facebook,
      headline
    });
  } catch (err) {
    console.error('[generate]', err);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({
      error: err.message || 'Generation failed',
      originalName: req.file?.originalname
    });
  }
});

app.listen(PORT, () => {
  console.log(`Furniture marketing backend running on http://localhost:${PORT}`);
  if (!process.env.FAL_KEY) console.warn('WARNING: FAL_KEY not set');
  if (!process.env.GEMINI_KEY) console.warn('WARNING: GEMINI_KEY not set');
});
