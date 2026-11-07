import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import requireAuth from '../middleware/requireAuth.js';
import { translateText } from '../services/geminiTranslator.js';

const router = Router();

const MAX_TEXT_LENGTH = 10000;
const SUPPORTED_TARGETS = new Set(['en', 'gu']);
const SUPPORTED_SOURCES = new Set(['en', 'gu', 'auto']);

// Translation costs an API call, so keep a light per-user budget.
const translateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || 'anonymous',
  message: { error: 'Too many translation requests. Please wait a minute and try again.' },
});

/**
 * POST /api/translate
 * Body: { text, sourceLang?: 'en'|'gu'|'auto', targetLang?: 'en'|'gu' }
 */
router.post('/', requireAuth, translateLimiter, async (req, res) => {
  try {
    const { text, sourceLang = 'auto', targetLang = 'gu' } = req.body || {};

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        error: `text must be ${MAX_TEXT_LENGTH.toLocaleString('en-IN')} characters or fewer`,
      });
    }

    if (!SUPPORTED_SOURCES.has(sourceLang)) {
      return res.status(400).json({ error: 'sourceLang must be en, gu, or auto' });
    }

    if (!SUPPORTED_TARGETS.has(targetLang)) {
      return res.status(400).json({ error: 'targetLang must be en or gu' });
    }

    // Nothing to translate when both sides are the same language.
    if (sourceLang !== 'auto' && sourceLang === targetLang) {
      return res.json({
        success: true,
        translation: text,
        sourceLang,
        targetLang,
        model: 'none',
        characterCount: text.length,
      });
    }

    const result = await translateText({ text, sourceLang, targetLang });

    return res.json({
      success: true,
      translation: result.translation,
      sourceLang,
      targetLang,
      model: result.model,
      characterCount: text.length,
    });
  } catch (err) {
    console.error('[Translate] Error:', err.message);

    if (err.code === 'GEMINI_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'AI translation is not configured. Add GEMINI_API_KEY on the server.',
        code: err.code,
      });
    }

    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    return res.status(status).json({
      error: err.message || 'Failed to translate text',
      code: err.code || 'TRANSLATION_FAILED',
    });
  }
});

export default router;
