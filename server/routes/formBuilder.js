import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import {
  FormBuilderValidationError,
  parseListFilters,
  parseRecordId,
  parseRecordPayload,
} from '../lib/formBuilderValidation.js';
import {
  createFormBuilderRecord,
  deleteFormBuilderRecord,
  getFormBuilderRecord,
  listFormBuilderRecords,
  updateFormBuilderRecord,
} from '../services/formBuilder.js';

const router = Router();

function handleError(res, err, fallbackMessage) {
  if (err instanceof FormBuilderValidationError) {
    return res.status(400).json({ error: err.message });
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Form data is too large' });
  }

  console.error(`${fallbackMessage}:`, err);
  return res.status(500).json({ error: fallbackMessage });
}

/**
 * GET /api/form-builder/records
 * List the authenticated user's saved forms. The response never includes the
 * full form payload, so the saved-forms list stays small.
 */
router.get('/records', requireAuth, async (req, res) => {
  try {
    const filters = parseListFilters(req.query);
    const result = await listFormBuilderRecords({
      userId: req.user.id,
      ...filters,
    });

    res.json(result);
  } catch (err) {
    handleError(res, err, 'Failed to fetch saved forms');
  }
});

/**
 * GET /api/form-builder/records/:id
 * Load one full form owned by the authenticated user.
 */
router.get('/records/:id', requireAuth, async (req, res) => {
  try {
    const id = parseRecordId(req.params.id);
    const record = await getFormBuilderRecord({
      userId: req.user.id,
      id,
    });

    if (!record) {
      return res.status(404).json({ error: 'Saved form not found' });
    }

    return res.json({ record });
  } catch (err) {
    return handleError(res, err, 'Failed to fetch the saved form');
  }
});

/**
 * POST /api/form-builder/records
 * Save a new form. A new record is created only when the editor is not already
 * attached to an existing record.
 */
router.post('/records', requireAuth, async (req, res) => {
  try {
    const payload = parseRecordPayload(req.body);
    const record = await createFormBuilderRecord({
      userId: req.user.id,
      payload,
    });

    res.status(201).json({ record });
  } catch (err) {
    handleError(res, err, 'Failed to save the form');
  }
});

/**
 * PUT /api/form-builder/records/:id
 * Update an existing form. The revision guards against two tabs/devices
 * silently overwriting each other.
 */
router.put('/records/:id', requireAuth, async (req, res) => {
  try {
    const id = parseRecordId(req.params.id);
    const payload = parseRecordPayload(req.body, { partial: true });
    const result = await updateFormBuilderRecord({
      userId: req.user.id,
      id,
      payload,
    });

    if (result.notFound) {
      return res.status(404).json({ error: 'Saved form not found' });
    }

    if (result.conflict) {
      return res.status(409).json({
        error: 'This form was updated somewhere else',
        revision: result.currentRevision,
      });
    }

    return res.json({ record: result.record });
  } catch (err) {
    return handleError(res, err, 'Failed to update the form');
  }
});

/**
 * DELETE /api/form-builder/records/:id
 * Soft-delete a saved form. The record stays recoverable in the database but is
 * hidden from the user's saved-forms list.
 */
router.delete('/records/:id', requireAuth, async (req, res) => {
  try {
    const id = parseRecordId(req.params.id);
    const deleted = await deleteFormBuilderRecord({
      userId: req.user.id,
      id,
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Saved form not found' });
    }

    return res.json({
      success: true,
      message: 'Saved form deleted',
    });
  } catch (err) {
    return handleError(res, err, 'Failed to delete the saved form');
  }
});

export default router;
