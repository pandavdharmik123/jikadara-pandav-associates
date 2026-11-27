import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';
import {
  SARFAESI_SEC14_NAVSARI_TEMPLATE,
  createEmptySurfacyFormData,
} from '../config/surfacyTemplates.js';
import { validateSurfacyFormData } from '../services/surfacyValidation.js';
import { generateSurfacyDocx } from '../services/surfacyDocxEngine.js';
import {
  convertDocxBufferToPdf,
  isPdfConverterAvailable,
  PdfConverterUnavailableError,
} from '../services/surfacyPdfService.js';

const router = Router();

/**
 * Ensure the default SARFAESI Section 14 template exists in SurfacyTemplate.
 */
async function ensureDefaultTemplate() {
  const existing = await prisma.surfacyTemplate.findUnique({
    where: { templateKey: SARFAESI_SEC14_NAVSARI_TEMPLATE.templateKey },
  });
  if (existing) return existing;

  return prisma.surfacyTemplate.create({
    data: {
      templateKey: SARFAESI_SEC14_NAVSARI_TEMPLATE.templateKey,
      name: SARFAESI_SEC14_NAVSARI_TEMPLATE.name,
      description: SARFAESI_SEC14_NAVSARI_TEMPLATE.description,
      fileName: SARFAESI_SEC14_NAVSARI_TEMPLATE.fileName,
      version: SARFAESI_SEC14_NAVSARI_TEMPLATE.version,
      isActive: SARFAESI_SEC14_NAVSARI_TEMPLATE.isActive,
      sections: SARFAESI_SEC14_NAVSARI_TEMPLATE.sections,
      fieldMapping: SARFAESI_SEC14_NAVSARI_TEMPLATE.fieldMapping,
      placeholderMapping: SARFAESI_SEC14_NAVSARI_TEMPLATE.placeholderMapping,
    },
  });
}

function extractSummaryFields(formData = {}, explicitTitle) {
  const court = formData.court || {};
  const applicant = formData.applicant || {};
  const opponents = Array.isArray(formData.opponents) ? formData.opponents : [];
  const primaryOpponent = opponents[0]?.fullName?.trim() || '';
  const applicantName = applicant.institutionName?.trim() || '';
  const courtName = [court.courtName, court.courtLocation].filter(Boolean).join(' - ').trim();
  const applicationNumber = court.applicationNumber
    ? `${court.applicationNumber}/${court.applicationYear || ''}`
    : '';

  const fallbackTitle = primaryOpponent
    ? `${primaryOpponent}${court.courtLocation ? ` - ${court.courtLocation}` : ''}`
    : applicantName || 'Untitled SARFAESI Filing';

  return {
    caseTitle: (explicitTitle || '').trim() || fallbackTitle,
    applicantName,
    opponentName: primaryOpponent,
    applicationNumber,
    courtName,
  };
}

// GET /api/surfacy/templates — list active templates & PDF engine capability
router.get('/templates', requireAuth, async (req, res) => {
  try {
    await ensureDefaultTemplate();
    const templates = await prisma.surfacyTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    const pdfConverterAvailable = await isPdfConverterAvailable();
    res.json({
      success: true,
      templates,
      defaultFormData: createEmptySurfacyFormData(),
      pdfConverterAvailable,
    });
  } catch (err) {
    console.error('Error fetching Surfacy templates:', err);
    res.status(500).json({ error: 'Failed to load Surfacy templates' });
  }
});

// GET /api/surfacy/cases — list authenticated user's filings
router.get('/cases', requireAuth, async (req, res) => {
  try {
    const { search, status } = req.query;
    const where = {
      userId: req.user.id,
      isDeleted: false,
    };

    if (status && ['DRAFT', 'READY_FOR_REVIEW', 'FINALIZED'].includes(status)) {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { caseTitle: { contains: q, mode: 'insensitive' } },
        { applicantName: { contains: q, mode: 'insensitive' } },
        { opponentName: { contains: q, mode: 'insensitive' } },
        { applicationNumber: { contains: q, mode: 'insensitive' } },
        { courtName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const cases = await prisma.surfacyFiling.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        templateId: true,
        caseTitle: true,
        applicantName: true,
        opponentName: true,
        applicationNumber: true,
        courtName: true,
        status: true,
        humanVerified: true,
        revision: true,
        createdAt: true,
        updatedAt: true,
        template: {
          select: { id: true, templateKey: true, name: true, version: true },
        },
      },
    });

    res.json({ success: true, cases });
  } catch (err) {
    console.error('Error listing Surfacy cases:', err);
    res.status(500).json({ error: 'Failed to fetch Surfacy filings' });
  }
});

// GET /api/surfacy/cases/:id — get a single filing owned by the user
router.get('/cases/:id', requireAuth, async (req, res) => {
  try {
    const filing = await prisma.surfacyFiling.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
        isDeleted: false,
      },
      include: {
        template: true,
      },
    });

    if (!filing) {
      return res.status(404).json({ error: 'Surfacy filing not found' });
    }

    const validation = validateSurfacyFormData(filing.formData);
    res.json({ success: true, filing, validation });
  } catch (err) {
    console.error('Error fetching Surfacy filing:', err);
    res.status(500).json({ error: 'Failed to fetch Surfacy filing' });
  }
});

// POST /api/surfacy/cases — create a new filing
router.post('/cases', requireAuth, async (req, res) => {
  try {
    const { templateId, caseTitle, status, humanVerified, formData } = req.body;
    const defaultTemplate = await ensureDefaultTemplate();
    const resolvedTemplateId = templateId || defaultTemplate.id;

    const targetStatus = ['DRAFT', 'READY_FOR_REVIEW', 'FINALIZED'].includes(status) ? status : 'DRAFT';
    if (targetStatus === 'FINALIZED' && !humanVerified) {
      return res.status(400).json({
        error: 'Human advocate verification is required before marking a filing as Finalized.',
      });
    }

    const safeFormData = formData && typeof formData === 'object' ? formData : createEmptySurfacyFormData();
    const summary = extractSummaryFields(safeFormData, caseTitle);

    const filing = await prisma.surfacyFiling.create({
      data: {
        userId: req.user.id,
        templateId: resolvedTemplateId,
        ...summary,
        status: targetStatus,
        humanVerified: Boolean(humanVerified),
        formData: safeFormData,
      },
      include: { template: true },
    });

    const validation = validateSurfacyFormData(filing.formData);
    res.status(201).json({ success: true, filing, validation });
  } catch (err) {
    console.error('Error creating Surfacy filing:', err);
    res.status(500).json({ error: 'Failed to create Surfacy filing' });
  }
});

// PUT /api/surfacy/cases/:id — update an existing filing
router.put('/cases/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.surfacyFiling.findFirst({
      where: { id: req.params.id, userId: req.user.id, isDeleted: false },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Surfacy filing not found' });
    }

    const { caseTitle, status, humanVerified, formData } = req.body;
    const nextFormData = formData && typeof formData === 'object' ? formData : existing.formData;
    const nextStatus = ['DRAFT', 'READY_FOR_REVIEW', 'FINALIZED'].includes(status) ? status : existing.status;
    const nextVerified = humanVerified !== undefined ? Boolean(humanVerified) : existing.humanVerified;

    if (nextStatus === 'FINALIZED' && !nextVerified) {
      return res.status(400).json({
        error: 'Human advocate verification is required before marking a filing as Finalized.',
      });
    }

    const summary = extractSummaryFields(nextFormData, caseTitle ?? existing.caseTitle);

    const filing = await prisma.surfacyFiling.update({
      where: { id: existing.id },
      data: {
        ...summary,
        status: nextStatus,
        humanVerified: nextVerified,
        formData: nextFormData,
        revision: { increment: 1 },
      },
      include: { template: true },
    });

    const validation = validateSurfacyFormData(filing.formData);
    res.json({ success: true, filing, validation });
  } catch (err) {
    console.error('Error updating Surfacy filing:', err);
    res.status(500).json({ error: 'Failed to update Surfacy filing' });
  }
});

// POST /api/surfacy/cases/:id/duplicate — duplicate an existing filing as a new Draft
router.post('/cases/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.surfacyFiling.findFirst({
      where: { id: req.params.id, userId: req.user.id, isDeleted: false },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Surfacy filing not found' });
    }

    const copy = await prisma.surfacyFiling.create({
      data: {
        userId: req.user.id,
        templateId: existing.templateId,
        caseTitle: `${existing.caseTitle} (Copy)`,
        applicantName: existing.applicantName,
        opponentName: existing.opponentName,
        applicationNumber: existing.applicationNumber,
        courtName: existing.courtName,
        status: 'DRAFT',
        humanVerified: false,
        formData: existing.formData,
      },
      include: { template: true },
    });

    res.status(201).json({ success: true, filing: copy });
  } catch (err) {
    console.error('Error duplicating Surfacy filing:', err);
    res.status(500).json({ error: 'Failed to duplicate Surfacy filing' });
  }
});

// DELETE /api/surfacy/cases/:id — soft-delete a filing
router.delete('/cases/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.surfacyFiling.findFirst({
      where: { id: req.params.id, userId: req.user.id, isDeleted: false },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Surfacy filing not found' });
    }

    await prisma.surfacyFiling.update({
      where: { id: existing.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting Surfacy filing:', err);
    res.status(500).json({ error: 'Failed to delete Surfacy filing' });
  }
});

// POST /api/surfacy/preview-docx — generate live DOCX buffer from unsaved formData for docx-preview
router.post('/preview-docx', requireAuth, async (req, res) => {
  try {
    const { formData, templateFileName } = req.body;
    const buffer = await generateSurfacyDocx(
      formData || {},
      templateFileName || SARFAESI_SEC14_NAVSARI_TEMPLATE.fileName
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'inline; filename="preview.docx"');
    res.send(buffer);
  } catch (err) {
    console.error('Error generating Surfacy DOCX preview:', err);
    res.status(500).json({ error: 'Failed to generate live DOCX preview' });
  }
});

// GET /api/surfacy/cases/:id/docx — download finalized DOCX
router.get('/cases/:id/docx', requireAuth, async (req, res) => {
  try {
    const filing = await prisma.surfacyFiling.findFirst({
      where: { id: req.params.id, userId: req.user.id, isDeleted: false },
      include: { template: true },
    });
    if (!filing) {
      return res.status(404).json({ error: 'Surfacy filing not found' });
    }

    const buffer = await generateSurfacyDocx(
      filing.formData,
      filing.template?.fileName || SARFAESI_SEC14_NAVSARI_TEMPLATE.fileName
    );
    const safeFileName = (filing.caseTitle || 'surfacy-filing').replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.docx"`);
    res.send(buffer);
  } catch (err) {
    console.error('Error exporting Surfacy DOCX:', err);
    res.status(500).json({ error: 'Failed to export DOCX document' });
  }
});

// GET /api/surfacy/cases/:id/pdf — convert finalized DOCX to PDF via LibreOffice
router.get('/cases/:id/pdf', requireAuth, async (req, res) => {
  try {
    const filing = await prisma.surfacyFiling.findFirst({
      where: { id: req.params.id, userId: req.user.id, isDeleted: false },
      include: { template: true },
    });
    if (!filing) {
      return res.status(404).json({ error: 'Surfacy filing not found' });
    }

    const docxBuffer = await generateSurfacyDocx(
      filing.formData,
      filing.template?.fileName || SARFAESI_SEC14_NAVSARI_TEMPLATE.fileName
    );
    const safeFileName = (filing.caseTitle || 'surfacy-filing').replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfBuffer = await convertDocxBufferToPdf(docxBuffer, safeFileName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    if (err instanceof PdfConverterUnavailableError) {
      return res.status(503).json({
        code: err.code,
        error: err.message,
      });
    }
    console.error('Error exporting Surfacy PDF:', err);
    res.status(500).json({ error: 'Failed to export PDF document' });
  }
});

export default router;
