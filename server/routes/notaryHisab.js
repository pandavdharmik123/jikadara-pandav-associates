import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Limits keep a runaway (or malicious) payload from creating unbounded rows.
const MAX_RANGES_PER_REGISTER = 50;
const MAX_SERIALS_PER_RANGE = 5000;
const MAX_SERIALS_PER_REGISTER = 10000;

const MONTHS_IN_YEAR = 12;

// ─── Validation helpers ─────────────────────────────────────────────────────

function validateRanges(ranges) {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return { error: 'At least one serial-number range is required' };
  }
  if (ranges.length > MAX_RANGES_PER_REGISTER) {
    return { error: `A register can contain at most ${MAX_RANGES_PER_REGISTER} ranges` };
  }

  const normalized = [];
  for (const range of ranges) {
    const start = Number(range?.startNumber);
    const end = Number(range?.endNumber);
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      return { error: 'Serial numbers must be whole numbers' };
    }
    if (start <= 0 || end <= 0) {
      return { error: 'Serial numbers must be positive' };
    }
    if (end < start) {
      return { error: `Ending serial number (${end}) must be greater than or equal to the starting serial number (${start})` };
    }
    if (end - start + 1 > MAX_SERIALS_PER_RANGE) {
      return { error: `A range can generate at most ${MAX_SERIALS_PER_RANGE} serial numbers` };
    }
    normalized.push({ startNumber: start, endNumber: end });
  }

  normalized.sort((a, b) => a.startNumber - b.startNumber);
  for (let i = 1; i < normalized.length; i += 1) {
    if (normalized[i].startNumber <= normalized[i - 1].endNumber) {
      return {
        error: `Serial ranges overlap: ${normalized[i - 1].startNumber}-${normalized[i - 1].endNumber} overlaps ${normalized[i].startNumber}-${normalized[i].endNumber}`,
      };
    }
  }

  const total = normalized.reduce((sum, r) => sum + (r.endNumber - r.startNumber + 1), 0);
  if (total > MAX_SERIALS_PER_REGISTER) {
    return { error: `A register can contain at most ${MAX_SERIALS_PER_REGISTER} serial numbers` };
  }

  return { ranges: normalized, total };
}

function validateRegisterInput({ month, year }) {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > MONTHS_IN_YEAR) {
    return { error: 'Please select a valid month' };
  }
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    return { error: 'Please select a valid year between 2000 and 2100' };
  }
  return { month: m, year: y };
}

function parseRate(rate) {
  if (rate === undefined || rate === null || rate === '') return 150; // default ₹150
  const n = Number(rate);
  if (!Number.isFinite(n) || n < 0 || n > 10000000) {
    return null;
  }
  return Math.round(n * 100) / 100;
}

const serialsForRanges = (ranges) => ranges.flatMap((r) => {
  const serials = [];
  for (let n = r.startNumber; n <= r.endNumber; n += 1) serials.push(n);
  return serials;
});

// ─── Shared query helpers ────────────────────────────────────────────────────

const registerInclude = {
  creator: { select: { id: true, name: true } },
  ranges: { orderBy: { startNumber: 'asc' } },
};

async function loadRegister(id) {
  return prisma.notaryRegister.findUnique({
    where: { id },
    include: {
      ...registerInclude,
      entries: {
        orderBy: { serialNumber: 'asc' },
        include: { assignedTo: { select: { id: true, name: true, role: true } } },
      },
    },
  });
}

function serializeRegister(register) {
  return {
    ...register,
    ratePerEntry: Number(register.ratePerEntry),
    totalSerials: register.entries?.length,
    assignedCount: register.entries?.filter((e) => e.assignedUserId).length ?? undefined,
  };
}

// Expands ranges into the list of serial numbers NEWLY covered (skipping any
// serial that already exists for this register) and returns them ready for
// createMany, together with the range rows.
async function buildNewEntriesClient(registerId, ranges, tx) {
  const existing = await tx.notaryEntry.findMany({
    where: { registerId },
    select: { serialNumber: true },
  });
  const existingSet = new Set(existing.map((e) => e.serialNumber));

  const entries = [];
  let created = 0;
  for (const range of ranges) {
    for (let n = range.startNumber; n <= range.endNumber; n += 1) {
      if (!existingSet.has(n)) {
        entries.push({ registerId, serialNumber: n });
        created += 1;
      }
    }
  }
  return entries;
}

// ─── Users directory for the assignment dropdowns ───────────────────────────
router.get('/users', requireAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching notary users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── List all monthly registers ─────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const registers = await prisma.notaryRegister.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        ...registerInclude,
        entries: {
          orderBy: { serialNumber: 'asc' },
          include: { assignedTo: { select: { id: true, name: true } } },
        },
      },
    });

    res.json({
      success: true,
      registers: registers.map(serializeRegister),
    });
  } catch (error) {
    console.error('Error fetching notary registers:', error);
    res.status(500).json({ error: 'Failed to fetch notary registers' });
  }
});

// ─── Create a monthly register ──────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { month, year, ratePerEntry, ranges } = req.body;

    const regCheck = validateRegisterInput({ month, year });
    if (regCheck.error) return res.status(400).json({ error: regCheck.error });

    const rate = parseRate(ratePerEntry);
    if (rate === null) return res.status(400).json({ error: 'Per entry amount must be a number between 0 and 10000000' });

    const rangeCheck = validateRanges(ranges);
    if (rangeCheck.error) return res.status(400).json({ error: rangeCheck.error });

    const duplicate = await prisma.notaryRegister.findUnique({
      where: { month_year: { month: regCheck.month, year: regCheck.year } },
      select: { id: true },
    });
    if (duplicate) {
      return res.status(409).json({ error: 'A register for this month and year already exists. Open it instead of creating a duplicate.' });
    }

    const created = await prisma.$transaction(async (tx) => {
      const entryData = []; // built after ranges exist inside the tx
      const register = await tx.notaryRegister.create({
        data: {
          month: regCheck.month,
          year: regCheck.year,
          ratePerEntry: rate,
          createdBy: req.user.id,
        },
      });

      await tx.notarySerialRange.createMany({
        data: rangeCheck.ranges.map((r) => ({ ...r, registerId: register.id })),
      });

      for (const range of rangeCheck.ranges) {
        for (let n = range.startNumber; n <= range.endNumber; n += 1) {
          entryData.push({ registerId: register.id, serialNumber: n });
        }
      }
      await tx.notaryEntry.createMany({ data: entryData });

      return register;
    });

    res.status(201).json({ success: true, register: serializeRegister(await loadRegister(created.id)) });
  } catch (error) {
    console.error('Error creating notary register:', error);
    res.status(500).json({ error: 'Failed to create notary register' });
  }
});

// ─── Register detail (ranges + entries + assignments) ──────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const register = await loadRegister(req.params.id);
    if (!register) return res.status(404).json({ error: 'Notary register not found' });
    res.json({ success: true, register: serializeRegister(register) });
  } catch (error) {
    console.error('Error fetching notary register:', error);
    res.status(500).json({ error: 'Failed to fetch notary register' });
  }
});

// ─── Update register (month/year/rate/ranges) ───────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await loadRegister(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Notary register not found' });

    // Rate change only recalculation — entries untouched.
    const updates = {};
    if (req.body.ratePerEntry !== undefined) {
      const rate = parseRate(req.body.ratePerEntry);
      if (rate === null) return res.status(400).json({ error: 'Per entry amount must be a number between 0 and 10000000' });
      updates.ratePerEntry = rate;
    }

    let month = existing.month;
    let year = existing.year;
    if (req.body.month !== undefined || req.body.year !== undefined) {
      const regCheck = validateRegisterInput({
        month: req.body.month !== undefined ? req.body.month : existing.month,
        year: req.body.year !== undefined ? req.body.year : existing.year,
      });
      if (regCheck.error) return res.status(400).json({ error: regCheck.error });
      month = regCheck.month;
      year = regCheck.year;
      if (month !== existing.month || year !== existing.year) {
        const duplicate = await prisma.notaryRegister.findUnique({
          where: { month_year: { month, year } },
          select: { id: true },
        });
        if (duplicate && duplicate.id !== existing.id) {
          return res.status(409).json({ error: 'Another register already exists for this month and year' });
        }
      }
      updates.month = month;
      updates.year = year;
    }

    // --- Ranges replacement (optional) ---
    let newRanges = null;
    if (req.body.ranges !== undefined) {
      const rangeCheck = validateRanges(req.body.ranges);
      if (rangeCheck.error) return res.status(400).json({ error: rangeCheck.error });

      // Serial numbers present in the old set but gone from the new one.
      const oldSerials = serialsForRanges(existing.ranges.map((r) => ({ startNumber: r.startNumber, endNumber: r.endNumber })));
      const newSerials = new Set(serialsForRanges(rangeCheck.ranges));
      const serialsBeingRemoved = oldSerials.filter((n) => !newSerials.has(n));

      const assignedBeingRemoved = serialsBeingRemoved.length
        ? await prisma.notaryEntry.count({
            where: {
              registerId: existing.id,
              serialNumber: { in: serialsBeingRemoved },
              assignedUserId: { not: null },
            },
          })
        : 0;

      if (assignedBeingRemoved > 0 && req.body.confirmDataLoss !== true) {
        return res.status(409).json({
          code: 'ASSIGNED_SERIALS_REMOVED',
          error: `${assignedBeingRemoved} assigned serial number(s) would be removed by this range change. Confirm to proceed — their assignments will be lost.`,
          assignedCount: assignedBeingRemoved,
        });
      }
      newRanges = rangeCheck.ranges;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (newRanges) {
        await tx.notarySerialRange.deleteMany({ where: { registerId: existing.id } });
        await tx.notarySerialRange.createMany({
          data: newRanges.map((r) => ({ ...r, registerId: existing.id })),
        });
        // Rebuild entries for any serial number the new set does not yet cover.
        const entries = await buildNewEntriesClient(existing.id, newRanges, tx);
        if (entries.length) await tx.notaryEntry.createMany({ data: entries });
        // Remove entries that no longer belong to any range.
        const keep = new Set(serialsForRanges(newRanges));
        await tx.notaryEntry.deleteMany({
          where: { registerId: existing.id, serialNumber: { notIn: [...keep] } },
        });
      }
      if (Object.keys(updates).length) {
        await tx.notaryRegister.update({ where: { id: existing.id }, data: updates });
      }
      return true;
    });

    if (!updated) throw new Error('Update transaction failed');
    res.json({ success: true, register: serializeRegister(await loadRegister(existing.id)) });
  } catch (error) {
    console.error('Error updating notary register:', error);
    res.status(500).json({ error: 'Failed to update notary register' });
  }
});

// ─── Delete register (hard delete with cascade) ─────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.notaryRegister.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Notary register not found' });

    // An explicit confirm is required when assignments exist, so nothing is
    // destroyed by a stray call.
    const assigned = await prisma.notaryEntry.count({
      where: { registerId: existing.id, assignedUserId: { not: null } },
    });
    if (assigned > 0 && req.body?.confirm !== true && req.query.confirm !== 'true') {
      return res.status(409).json({
        code: 'CONFIRM_DELETE',
        error: `This register has ${assigned} assigned serial number(s). Confirm to permanently delete the register along with its assignments.`,
      });
    }

    await prisma.notaryRegister.delete({ where: { id: existing.id } });
    res.json({ success: true, message: 'Notary register deleted' });
  } catch (error) {
    console.error('Error deleting notary register:', error);
    res.status(500).json({ error: 'Failed to delete notary register' });
  }
});

// ─── Add a serial range to an existing register ─────────────────────────────
router.post('/:id/ranges', requireAuth, async (req, res) => {
  try {
    const { startNumber, endNumber } = req.body;
    const existing = await prisma.notaryRegister.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Notary register not found' });

    const currentRanges = await prisma.notarySerialRange.findMany({ where: { registerId: existing.id } });
    const rangeCheck = validateRanges([
      ...currentRanges.map((r) => ({ startNumber: r.startNumber, endNumber: r.endNumber })),
      { startNumber, endNumber },
    ]);
    if (rangeCheck.error) return res.status(400).json({ error: rangeCheck.error });

    const added = await prisma.$transaction(async (tx) => {
      const range = await tx.notarySerialRange.create({
        data: {
          registerId: existing.id,
          startNumber: Number(startNumber),
          endNumber: Number(endNumber),
        },
      });
      const entries = await buildNewEntriesClient(existing.id, [{ startNumber: Number(startNumber), endNumber: Number(endNumber) }], tx);
      if (entries.length) await tx.notaryEntry.createMany({ data: entries });
      return range;
    });

    res.status(201).json({ success: true, range: added, register: serializeRegister(await loadRegister(existing.id)) });
  } catch (error) {
    console.error('Error adding notary range:', error);
    res.status(500).json({ error: 'Failed to add serial range' });
  }
});

// ─── Remove a serial range from a register ──────────────────────────────────
router.delete('/:id/ranges/:rangeId', requireAuth, async (req, res) => {
  try {
    const register = await prisma.notaryRegister.findUnique({ where: { id: req.params.id } });
    if (!register) return res.status(404).json({ error: 'Notary register not found' });

    const range = await prisma.notarySerialRange.findFirst({
      where: { id: req.params.rangeId, registerId: register.id },
    });
    if (!range) return res.status(404).json({ error: 'Serial range not found in this register' });

    const otherRanges = await prisma.notarySerialRange.findMany({
      where: { registerId: register.id, id: { not: range.id } },
    });
    const coveredElsewhere = new Set(serialsForRanges(otherRanges));
    const doomed = serialsForRanges([{ startNumber: range.startNumber, endNumber: range.endNumber }])
      .filter((n) => !coveredElsewhere.has(n)); // serials that would fall out of the register

    const assignedBeingRemoved = doomed.length
      ? await prisma.notaryEntry.count({
          where: { registerId: register.id, serialNumber: { in: doomed }, assignedUserId: { not: null } },
        })
      : 0;

    if (assignedBeingRemoved > 0 && req.body?.confirmDataLoss !== true && req.query.confirmDataLoss !== 'true') {
      return res.status(409).json({
        code: 'ASSIGNED_SERIALS_REMOVED',
        error: `${assignedBeingRemoved} assigned serial number(s) are inside this range. Confirm to remove the range and their assignments.`,
      });
    }

    await prisma.$transaction(async (tx) => {
      if (doomed.length) {
        await tx.notaryEntry.deleteMany({ where: { registerId: register.id, serialNumber: { in: doomed } } });
      }
      await tx.notarySerialRange.delete({ where: { id: range.id } });
    });

    res.json({ success: true, register: serializeRegister(await loadRegister(register.id)) });
  } catch (error) {
    console.error('Error deleting notary range:', error);
    res.status(500).json({ error: 'Failed to delete serial range' });
  }
});

// ─── Assign / reassign / unassign a single serial number ────────────────────
router.patch('/entries/:entryId', requireAuth, async (req, res) => {
  try {
    const entry = await prisma.notaryEntry.findUnique({
      where: { id: req.params.entryId },
      include: { register: { select: { id: true } } },
    });
    if (!entry) return res.status(404).json({ error: 'Serial number not found' });

    const newValue = req.body.assignedUserId ?? null;
    if (newValue) {
      const user = await prisma.user.findUnique({ where: { id: newValue }, select: { id: true, isActive: true } });
      if (!user || !user.isActive) {
        return res.status(400).json({ error: 'Selected user does not exist or is inactive' });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.notaryEntry.update({
        where: { id: entry.id },
        data: { assignedUserId: newValue },
      });
      return updated;
    });

    res.json({ success: true, entry: result });
  } catch (error) {
    console.error('Error assigning notary entry:', error);
    res.status(500).json({ error: 'Failed to save assignment' });
  }
});

// ─── Bulk assign (single transaction) ───────────────────────────────────────
router.post('/:id/entries/assign-bulk', requireAuth, async (req, res) => {
  try {
    const { entryIds, assignedUserId } = req.body;
    if (!Array.isArray(entryIds) || entryIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one serial number' });
    }
    if (entryIds.length > 1000) {
      return res.status(400).json({ error: 'Bulk assign is limited to 1000 serial numbers at a time' });
    }

    if (assignedUserId) {
      const user = await prisma.user.findUnique({ where: { id: assignedUserId }, select: { id: true, isActive: true } });
      if (!user || !user.isActive) {
        return res.status(400).json({ error: 'Selected user does not exist or is inactive' });
      }
    } else if (assignedUserId !== null) {
      return res.status(400).json({ error: 'assignedUserId must be a user id or null' });
    }

    const registerId = req.params.id;
    const entries = await prisma.notaryEntry.findMany({
      where: { id: { in: entryIds }, registerId },
      select: { id: true, serialNumber: true, assignedUserId: true },
    });
    if (entries.length !== entryIds.length) {
      return res.status(400).json({ error: 'One or more selected serial numbers do not belong to this register' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const changed = entries.filter((e) => e.assignedUserId !== assignedUserId);
      await tx.notaryEntry.updateMany({
        where: { id: { in: entries.map((e) => e.id) } },
        data: { assignedUserId },
      });
      return changed.length;
    });

    res.json({ success: true, changed: updated, register: serializeRegister(await loadRegister(registerId)) });
  } catch (error) {
    console.error('Error bulk assigning notary entries:', error);
    res.status(500).json({ error: 'Failed to bulk assign serial numbers' });
  }
});

// ─── User-wise summary for a register ───────────────────────────────────────
router.get('/:id/summary', requireAuth, async (req, res) => {
  try {
    const register = await prisma.notaryRegister.findUnique({ where: { id: req.params.id } });
    if (!register) return res.status(404).json({ error: 'Notary register not found' });

    const grouped = await prisma.notaryEntry.groupBy({
      by: ['assignedUserId'],
      where: { registerId: register.id, assignedUserId: { not: null } },
      _count: { id: true },
    });

    const users = grouped.length
      ? await prisma.user.findMany({
          where: { id: { in: grouped.map((g) => g.assignedUserId) } },
          select: { id: true, name: true, role: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const serials = grouped.length
      ? await prisma.notaryEntry.findMany({
          where: { registerId: register.id, assignedUserId: { not: null } },
          select: { serialNumber: true, assignedUserId: true },
          orderBy: { serialNumber: 'asc' },
        })
      : [];

    const serialsByUser = new Map();
    for (const s of serials) {
      if (!serialsByUser.has(s.assignedUserId)) serialsByUser.set(s.assignedUserId, []);
      serialsByUser.get(s.assignedUserId).push(s.serialNumber);
    }

    const rate = Number(register.ratePerEntry);
    const summary = grouped
      .map((g) => {
        const user = userMap.get(g.assignedUserId);
        return {
          userId: g.assignedUserId,
          userName: user?.name || 'Unknown user',
          userRole: user?.role || null,
          totalEntries: g._count.id,
          serialNumbers: serialsByUser.get(g.assignedUserId) || [],
          rate,
          totalAmount: Math.round(g._count.id * rate * 100) / 100,
        };
      })
      .sort((a, b) => b.totalEntries - a.totalEntries || a.userName.localeCompare(b.userName));

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Error fetching notary summary:', error);
    res.status(500).json({ error: 'Failed to fetch user-wise summary' });
  }
});


export default router;
