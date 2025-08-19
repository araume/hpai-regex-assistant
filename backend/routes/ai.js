import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { RegexQueryLog } from '../schema/RegexQueryLog.js';
import { Profile } from '../schema/Profile.js';

dotenv.config();

const router = Router();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.warn('Warning: GEMINI_API_KEY/GOOGLE_API_KEY not set. API calls will fail.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

const systemPrompt = `
You are a helpful senior regex engineer. Your job is to design clean, robust, and well-explained Regular Expressions that satisfy the user's intent.
Rules:
- Prefer clarity and maintainability; add inline flags and grouping for readability.
- Avoid catastrophic backtracking; prefer possessive quantifiers or atomic groups when supported. Offer safe alternatives otherwise.
- Always provide: (1) final regex pattern, (2) flags, (3) short explanation, (4) sample matches and non-matches, (5) notes for Filipino/Tagalog nuances when relevant.
- Optimize for use in JavaScript (ECMAScript) unless the user requests another flavor.
- For Filipino phrase detection (e.g., "pagbabayad ng utang"), consider inflections, spacing/punctuation variants, common misspellings, and code-switching.
`;

router.post('/generate-regex', async (req, res) => {
  try {
    const { instruction, examples, language, profileName } = req.body || {};
    if (!instruction || typeof instruction !== 'string') {
      return res.status(400).json({ error: 'instruction is required' });
    }

    if (!genAI) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const prompt = buildPrompt({ instruction, examples, language });

    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse out a code block with the regex
    const extracted = extractRegexResponse(text);

    // Resolve profile if provided
    let profileId = null;
    if (profileName && Profile) {
      const profile = await Profile.findOne({ name: profileName }).lean();
      profileId = profile?._id || null;
    }

    // Log to DB if available
    try {
      if (RegexQueryLog) {
        await RegexQueryLog.create({
          instruction,
          examples,
          language: language || 'javascript',
          model: modelName,
          rawResponse: text,
          extracted,
          profile: profileId,
        });
      }
    } catch (e) {
      console.warn('Failed to write log:', e.message);
    }

    return res.json({ ok: true, text, extracted });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate regex' });
  }
});

// Create profile (requires correct MASTER_PASS)
router.post('/profiles', async (req, res) => {
  try {
    const { name, master } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    const expected = process.env.MASTER_PASS;
    if (!expected) return res.status(500).json({ error: 'MASTER_PASS not configured' });
    if (master !== expected) return res.status(403).json({ error: 'Invalid master password' });

    const exists = await Profile.findOne({ name });
    if (exists) return res.status(409).json({ error: 'Profile already exists' });
    const created = await Profile.create({ name });
    return res.json({ ok: true, profile: { id: created._id, name: created.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create profile' });
  }
});

// List profiles
router.get('/profiles', async (_req, res) => {
  try {
    const profiles = await Profile.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, profiles: profiles.map(p => ({ id: p._id, name: p.name })) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to list profiles' });
  }
});

// Get logs for a profile
router.get('/profiles/:name/logs', async (req, res) => {
  try {
    const { name } = req.params;
    const profile = await Profile.findOne({ name }).lean();
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const logs = await RegexQueryLog.find({ profile: profile._id }).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, logs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Delete one log by id for a profile
router.delete('/profiles/:name/logs/:id', async (req, res) => {
  try {
    const { name, id } = req.params;
    const profile = await Profile.findOne({ name }).lean();
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const result = await RegexQueryLog.deleteOne({ _id: id, profile: profile._id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Log not found' });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete log' });
  }
});

// Delete all logs for a profile
router.delete('/profiles/:name/logs', async (req, res) => {
  try {
    const { name } = req.params;
    const profile = await Profile.findOne({ name }).lean();
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const result = await RegexQueryLog.deleteMany({ profile: profile._id });
    return res.json({ ok: true, deleted: result.deletedCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete logs' });
  }
});

function buildPrompt({ instruction, examples, language }) {
  const lang = language || 'javascript';
  const examplesText = Array.isArray(examples) && examples.length
    ? `\nUser Examples (optional):\n${examples.map((e, i) => `- ${i + 1}. ${e}`).join('\n')}`
    : '';

  return `${systemPrompt}\n\nUser Intent:\n${instruction}${examplesText}\n\nDeliver your answer in the following JSON structure inside a single fenced json code block:\n\n{\n  "regex": "<pattern without surrounding slashes>",\n  "flags": "<js flags like gim>",\n  "explanation": "<short explanation>",\n  "sampleMatches": ["..."],\n  "sampleNonMatches": ["..."],\n  "notes": "<edge cases, Tagalog nuances>",\n  "language": "${lang}"\n}\n`;
}

function extractRegexResponse(markdownText) {
  // Extract JSON code block
  const jsonBlock = /```json\n([\s\S]*?)```/i.exec(markdownText);
  if (!jsonBlock) return { regex: null, flags: '', explanation: '', language: 'javascript' };
  try {
    const parsed = JSON.parse(jsonBlock[1]);
    return {
      regex: parsed.regex || null,
      flags: parsed.flags || '',
      explanation: parsed.explanation || '',
      language: parsed.language || 'javascript',
      sampleMatches: parsed.sampleMatches || [],
      sampleNonMatches: parsed.sampleNonMatches || [],
      notes: parsed.notes || ''
    };
  } catch (_) {
    return { regex: null, flags: '', explanation: '', language: 'javascript' };
  }
}

export default router;


