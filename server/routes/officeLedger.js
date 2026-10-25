import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import {
  OfficeLedgerValidationError,
  parseEntryPayload,
  parseFinancialYearRange,
  parseListFilters,
  parseSplitUserName,
} from '../lib/officeLedgerValidation.js';
import {
  createOfficeLedgerEntry,
  createOfficeSplitUser,
  deleteOfficeLedgerEntry,
  deleteOfficeSplitUser,
  getOfficeLedgerEntry,
  listOfficeLedgerEntries,
  listOfficeSplitUsers,
  updateOfficeLedgerEntry,
} from '../services/officeLedger.js';

const router = Router();

function handleError(res, err, fallbackMessage) {
  if (err instanceof OfficeLedgerValidationError) {
    return res.status(400).json({ error: err.message });
  }

  console.error(`${fallbackMessage}:`, err);
  return res.status(500).json({ error: fallbackMessage });
}

/**
 * GET /api/office-ledger
 * List the authenticated user's income and expense entries for one financial year.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const filters = parseListFilters(req.query);
    const result = await listOfficeLedgerEntries({
      userId: req.user.id,
      ...filters,
    });

    res.json(result);
  } catch (err) {
    handleError(res, err, 'Failed to fetch office ledger');
  }
});

/**
 * GET /api/office-ledger/split-users
 * List the people who share this user's office expense shortfall.
 */
router.get('/split-users', requireAuth, async (req, res) => {
  try {
    const users = await listOfficeSplitUsers({ userId: req.user.id });
    res.json({ users });
  } catch (err) {
    handleError(res, err, 'Failed to fetch split users');
  }
});

/**
 * POST /api/office-ledger/split-users
 * Add a person to the authenticated user's split list.
 */
router.post('/split-users', requireAuth, async (req, res) => {
  try {
    const name = parseSplitUserName(req.body?.name);
    const user = await createOfficeSplitUser({
      userId: req.user.id,
      name,
    });

    res.status(201).json({ user });
  } catch (err) {
    handleError(res, err, 'Failed to add split user');
  }
});

/**
 * DELETE /api/office-ledger/split-users/:id
 * Remove a person from the authenticated user's split list.
 */
router.delete('/split-users/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await deleteOfficeSplitUser({
      userId: req.user.id,
      id: req.params.id,
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Split user not found' });
    }

    return res.json({ success: true });
  } catch (err) {
    return handleError(res, err, 'Failed to remove split user');
  }
});

/**
 * GET /api/office-ledger/:id
 * Fetch one ledger entry owned by the authenticated user.
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const fy = parseFinancialYearRange(req.query.fyStartDate, req.query.fyEndDate);
    const entry = await getOfficeLedgerEntry({
      userId: req.user.id,
      id: req.params.id,
      fyStart: fy.start,
      fyEnd: fy.end,
    });

    if (!entry) {
      return res.status(404).json({ error: 'Office ledger entry not found' });
    }

    return res.json({ entry });
  } catch (err) {
    return handleError(res, err, 'Failed to fetch office ledger entry');
  }
});

/**
 * POST /api/office-ledger
 * Create an income or expense entry for the authenticated user.
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const fy = parseFinancialYearRange(req.body.fyStartDate, req.body.fyEndDate);
    const data = parseEntryPayload(req.body, { fy });
    const entry = await createOfficeLedgerEntry({
      userId: req.user.id,
      data,
    });

    res.status(201).json({ entry });
  } catch (err) {
    handleError(res, err, 'Failed to create office ledger entry');
  }
});

/**
 * PUT /api/office-ledger/:id
 * Update an entry only when it belongs to the authenticated user and falls
 * inside the selected financial year.
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const fy = parseFinancialYearRange(req.body.fyStartDate, req.body.fyEndDate);
    const data = parseEntryPayload(req.body, { partial: true, fy });
    const entry = await updateOfficeLedgerEntry({
      userId: req.user.id,
      id: req.params.id,
      fyStart: fy.start,
      fyEnd: fy.end,
      data,
    });

    if (!entry) {
      return res.status(404).json({ error: 'Office ledger entry not found' });
    }

    return res.json({ entry });
  } catch (err) {
    return handleError(res, err, 'Failed to update office ledger entry');
  }
});

/**
 * DELETE /api/office-ledger/:id
 * Soft delete a ledger entry owned by the authenticated user.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const fy = parseFinancialYearRange(req.query.fyStartDate, req.query.fyEndDate);
    const deleted = await deleteOfficeLedgerEntry({
      userId: req.user.id,
      id: req.params.id,
      fyStart: fy.start,
      fyEnd: fy.end,
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Office ledger entry not found' });
    }

    return res.json({
      success: true,
      message: 'Office ledger entry moved to Recycle Bin',
    });
  } catch (err) {
    return handleError(res, err, 'Failed to delete office ledger entry');
  }
});

export default router;
