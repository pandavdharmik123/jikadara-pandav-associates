import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import {
  VerabillValidationError,
  parseEntryPayload,
  parseListFilters,
  parseImportPayload,
} from '../lib/verabillValidation.js';
import {
  createEntry,
  deleteEntry,
  getEntry,
  getSummary,
  importEntries,
  listEntries,
  updateEntry,
} from '../services/verabill.js';

const router = Router();

function handleError(res, err, fallbackMessage) {
  if (err instanceof VerabillValidationError) {
    return res.status(400).json({ error: err.message });
  }
  console.error(`${fallbackMessage}:`, err);
  return res.status(500).json({ error: fallbackMessage });
}

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const summary = await getSummary({ userId: req.user.id });
    res.json({ summary });
  } catch (err) {
    handleError(res, err, 'Failed to fetch verabill summary');
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const filters = parseListFilters(req.query);
    const result = await listEntries({ userId: req.user.id, ...filters });
    res.json(result);
  } catch (err) {
    handleError(res, err, 'Failed to fetch verabill entries');
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const entry = await getEntry({ userId: req.user.id, id: req.params.id });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    return res.json({ entry });
  } catch (err) {
    return handleError(res, err, 'Failed to fetch verabill entry');
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const data = parseEntryPayload(req.body || {});
    const entry = await createEntry({ userId: req.user.id, data });
    res.status(201).json({ entry });
  } catch (err) {
    handleError(res, err, 'Failed to create verabill entry');
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const data = parseEntryPayload(req.body || {}, { partial: true });
    const entry = await updateEntry({ userId: req.user.id, id: req.params.id, data });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    return res.json({ entry });
  } catch (err) {
    return handleError(res, err, 'Failed to update verabill entry');
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await deleteEntry({ userId: req.user.id, id: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Entry not found' });
    return res.json({ success: true, message: 'Entry moved to Recycle Bin' });
  } catch (err) {
    return handleError(res, err, 'Failed to delete verabill entry');
  }
});

router.post('/import', requireAuth, async (req, res) => {
  try {
    const records = parseImportPayload(req.body || {});
    const result = await importEntries({ userId: req.user.id, records });
    res.json({ result });
  } catch (err) {
    handleError(res, err, 'Failed to import verabill records');
  }
});

export default router;
