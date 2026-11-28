import { Router } from 'express';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';
import {
  REGISTERED_MOE_AXIS_TEMPLATE,
  createEmptyMoeFormData,
} from '../config/moeTemplates.js';
import { validateMoeFormData } from '../services/moeValidation.js';
import { generateMoeDocx } from '../services/moeDocxEngine.js';
import {
  convertDocxBufferToPdf,
  isPdfConverterAvailable,
  PdfConverterUnavailableError,
} from '../services/surfacyPdfService.js';

const router = Router();

async function ensureDefaultMoeTemplate() {
  const existing = await prisma.moeTemplate.findUnique({
    where: { templateKey: REGISTERED_MOE_AXIS_TEMPLATE.templateKey },
  });
  if (existing) return existing;

  return prisma.moeTemplate.create({
    data: {
      templateKey: REGISTERED_MOE_AXIS_TEMPLATE.templateKey,
      name: REGISTERED_MOE_AXIS_TEMPLATE.name,
      description: REGISTERED_MOE_AXIS_TEMPLATE.description,
      fileName: REGISTERED_MOE_AXIS_TEMPLATE.fileName,
      version: REGISTERED_MOE_AXIS_TEMPLATE.version,
      isActive: REGISTERED_MOE_AXIS_TEMPLATE.isActive,
      bankDefaults: REGISTERED_MOE_AXIS_TEMPLATE.bankDefaults,
      sections: REGISTERED_MOE_AXIS_TEMPLATE.sections,
      fieldMapping: REGISTERED_MOE_AXIS_TEMPLATE.fieldMapping,
      conditionalClauses: REGISTERED_MOE_AXIS_TEMPLATE.conditionalClauses,
    },
  });
}

function extractMoeSummary(formData = {}, explicitTitle) {
  const s1 = formData.schedule1 || {};
  const sps = Array.isArray(formData.schedule2?.securityProviders) ? formData.schedule2.securityProviders : [];
  const borrowers = Array.isArray(formData.schedule3?.borrowers) ? formData.schedule3.borrowers : [];

  const spName = sps.map((p) => p.fullName?.trim()).filter(Boolean).join(', ');
  const brName = borrowers.map((b) => b.fullName?.trim()).filter(Boolean).join(', ');
  const bankName = (s1.bankName || '').trim();
  const depositDate = (s1.depositDate || '').trim();

  const fallbackTitle = spName
    ? `${spName}${bankName ? ` - ${bankName}` : ''}`
    : brName || 'Untitled MOE Document';

  return {
    documentTitle: (explicitTitle || '').trim() || fallbackTitle,
    securityProviderName: spName,
    borrowerName: brName,
    bankName,
    depositDate,
  };
}

// GET /api/moe/dashboard — stats & recent MOE documents for authenticated user
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const baseWhere = { userId: req.user.id, isDeleted: false };
    const [total, draft, readyForReview, finalized, recent] = await Promise.all([
      prisma.moeDocument.count({ where: baseWhere }),
      prisma.moeDocument.count({ where: { ...baseWhere, status: 'DRAFT' } }),
      prisma.moeDocument.count({ where: { ...baseWhere, status: 'READY_FOR_REVIEW' } }),
      prisma.moeDocument.count({ where: { ...baseWhere, status: 'FINALIZED' } }),
      prisma.moeDocument.findMany({
        where: baseWhere,
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          documentTitle: true,
          securityProviderName: true,
          borrowerName: true,
          bankName: true,
          depositDate: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    res.json({
      success: true,
      stats: { total, draft, readyForReview, finalized },
      recent,
    });
  } catch (err) {
    console.error('Error loading MOE dashboard:', err);
    res.status(500).json({ error: 'Failed to load MOE dashboard' });
  }
});

// GET /api/moe/templates — active MOE templates + default form data
router.get('/templates', requireAuth, async (req, res) => {
  try {
    await ensureDefaultMoeTemplate();
    const templates = await prisma.moeTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    const pdfConverterAvailable = await isPdfConverterAvailable();
    res.json({
      success: true,
      templates,
      defaultFormData: createEmptyMoeFormData(templates[0]?.bankDefaults),
      pdfConverterAvailable,
    });
  } catch (err) {
    console.error('Error fetching MOE templates:', err);
    res.status(500).json({ error: 'Failed to load MOE templates' });
  }
});

// PUT /api/moe/templates/:id — update template bankDefaults / version / active status (ADMIN/SENIOR)
router.put('/templates/:id', requireAuth, async (req, res) => {
  try {
    if (!['ADMIN', 'SENIOR'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Admin or Senior advocates can update MOE templates.' });
    }
    const { name, description, version, isActive, bankDefaults } = req.body;
    const updated = await prisma.moeTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(version !== undefined ? { version } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(bankDefaults !== undefined ? { bankDefaults } : {}),
      },
    });
    res.json({ success: true, template: updated });
  } catch (err) {
    console.error('Error updating MOE template:', err);
    res.status(500).json({ error: 'Failed to update MOE template' });
  }
});

// GET /api/moe/documents — list user's saved MOE documents
router.get('/documents', requireAuth, async (req, res) => {
  try {
    const { search, status } = req.query;
    const where = { userId: req.user.id, isDeleted: false };

    if (status && ['DRAFT', 'READY_FOR_REVIEW', 'FINALIZED'].includes(status)) {
      where.status = status;
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { documentTitle: { contains: q, mode: 'insensitive' } },
        { securityProviderName: { contains: q, mode: 'insensitive' } },
        { borrowerName: { contains: q, mode: 'insensitive' } },
        { bankName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const documents = await prisma.moeDocument.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        templateId: true,
        documentTitle: true,
        securityProviderName: true,
        borrowerName: true,
        bankName: true,
        depositDate: true,
        status: true,
        humanVerified: true,
        revision: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true } },
        template: { select: { id: true, templateKey: true, name: true, version: true } },
      },
    });

    res.json({ success: true, documents });
  } catch (err) {
    console.error('Error listing MOE documents:', err);
    res.status(500).json({ error: 'Failed to load MOE documents' });
  }
});

// GET /api/moe/documents/:id
router.get('/documents/:id', requireAuth, async (req, res) => {
  try {
    const doc = await prisma.moeDocument.findFirst({
      where: { id: req.params.id, userId: req.user.id, isDeleted: false },
      include: { template: true, user: { select: { id: true, name: true } } },
    });
    if (!doc) return res.status(404).json({ error: 'MOE document not found' });

    const validation = validateMoeFormData(doc.formData);
    res.json({ success: true, document: doc, validation });
  } catch (err) {
    console.error('Error fetching MOE document:', err);
    res.status(500).json({ error: 'Failed to load MOE document' });
  }
});

// POST /api/moe/documents
router.post('/documents', requireAuth, async (req, res) => {
  try {
    const { templateId, documentTitle, status, humanVerified, formData } = req.body;
    const defaultTpl = await ensureDefaultMoeTemplate();
    const resolvedTemplateId = templateId || defaultTpl.id;
    const nextStatus = ['DRAFT', 'READY_FOR_REVIEW', 'FINALIZED'].includes(status) ? status : 'DRAFT';

    if (nextStatus === 'FINALIZED' && !humanVerified) {
      return res.status(400).json({ error: 'Advocate verification is required before marking as Finalized.' });
    }

    const safeFormData = formData && typeof formData === 'object' ? formData : createEmptyMoeFormData();
    const summary = extractMoeSummary(safeFormData, documentTitle);

    const document = await prisma.moeDocument.create({
      data: {
        userId: req.user.id,
        templateId: resolvedTemplateId,
        ...summary,
        status: nextStatus,
        humanVerified: Boolean(humanVerified),
        formData: safeFormData,
      },
      include: { template: true },
    });

    const validation = validateMoeFormData(document.formData);
    res.status(201).json({ success: true, document, validation });
  } catch (err) {
    console.error('Error creating MOE document:', err);
    res.status(500).json({ error: 'Failed to create MOE document' });
  }
});

// PUT /api/moe/documents/:id
router.put('/documents/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.moeDocument.findFirst({
      where: { id: req.params.id, userId: req.user.id, isDeleted: false },
    });
    if (!existing) return res.status(404).json({ error: 'MOE document not found' });

    const { documentTitle, status, humanVerified, formData } = req.body;
    const nextFormData = formData && typeof formData === 'object' ? formData : existing.formData;
    const nextStatus = ['DRAFT', 'READY_FOR_REVIEW', 'FINALIZED'].includes(status) ? status : existing.status;
    const nextVerified = humanVerified !== undefined ? Boolean(humanVerified) : existing.humanVerified;

    if (nextStatus === 'FINALIZED' && !nextVerified) {
      return res.status(400).json({ error: 'Advocate verification is required before marking as Finalized.' });
    }

    const summary = extractMoeSummary(nextFormData, documentTitle ?? existing.documentTitle);

    const document = await prisma.moeDocument.update({
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

    const validation = validateMoeFormData(document.formData);
    res.json({ success: true, document, validation });
  } catch (err) {
    console.error('Error updating MOE document:', err);
    res.status(500).json({ error: 'Failed to update MOE document' });
  }
});

// POST /api/moe/documents/:id/duplicate
router.post('/documents/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.moeDocument.findFirst({
      where: { id: req.params.id, userId: req.user.id, isDeleted: false },
    });
    if (!existing) return res.status(404).json({ error: 'MOE document not found' });

    const copy = await prisma.moeDocument.create({
      data: {
        userId: req.user.id,
        templateId: existing.templateId,
        documentTitle: `${existing.documentTitle} (Copy)`,
        securityProviderName: existing.securityProviderName,
        borrowerName: existing.borrowerName,
        bankName: existing.bankName,
        depositDate: existing.depositDate,
        status: 'DRAFT',
        humanVerified: false,
        formData: existing.formData,
      },
      include: { template: true },
    });

    res.status(201).json({ success: true, document: copy });
  } catch (err) {
    console.error('Error duplicating MOE document:', err);
    res.status(500).json({ error: 'Failed to duplicate MOE document' });
  }
});

// DELETE /api/moe/documents/:id
router.delete('/documents/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.moeDocument.findFirst({
      where: { id: req.params.id, userId: req.user.id, isDeleted: false },
    });
    if (!existing) return res.status(404).json({ error: 'MOE document not found' });

    await prisma.moeDocument.update({
      where: { id: existing.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting MOE document:', err);
    res.status(500).json({ error: 'Failed to delete MOE document' });
  }
});

// POST /api/moe/preview-docx — live preview DOCX buffer
router.post('/preview-docx', requireAuth, async (req, res) => {
  try {
    const { formData, templateFileName } = req.body;
    const buffer = await generateMoeDocx(
      formData || {},
      templateFileName || REGISTERED_MOE_AXIS_TEMPLATE.fileName
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'inline; filename="moe-preview.docx"');
    res.send(buffer);
  } catch (err) {
    console.error('Error generating MOE DOCX preview:', err);
    res.status(500).json({ error: 'Failed to generate live MOE preview' });
  }
});

// GET /api/moe/documents/:id/docx — download finalized DOCX
router.get('/documents/:id/docx', requireAuth, async (req, res) => {
  try {
    const doc = await prisma.moeDocument.findFirst({
      where: { id: req.params.id, userId: req.user.id, isDeleted: false },
      include: { template: true },
    });
    if (!doc) return res.status(404).json({ error: 'MOE document not found' });

    const buffer = await generateMoeDocx(
      doc.formData,
      doc.template?.fileName || REGISTERED_MOE_AXIS_TEMPLATE.fileName
    );
    const safeName = (doc.documentTitle || 'moe-document').replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.docx"`);
    res.send(buffer);
  } catch (err) {
    console.error('Error exporting MOE DOCX:', err);
    res.status(500).json({ error: 'Failed to export MOE DOCX' });
  }
});

// GET /api/moe/documents/:id/pdf — convert finalized DOCX to PDF via LibreOffice
router.get('/documents/:id/pdf', requireAuth, async (req, res) => {
  try {
    const doc = await prisma.moeDocument.findFirst({
      where: { id: req.params.id, userId: req.user.id, isDeleted: false },
      include: { template: true },
    });
    if (!doc) return res.status(404).json({ error: 'MOE document not found' });

    const docxBuffer = await generateMoeDocx(
      doc.formData,
      doc.template?.fileName || REGISTERED_MOE_AXIS_TEMPLATE.fileName
    );
    const safeName = (doc.documentTitle || 'moe-document').replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfBuffer = await convertDocxBufferToPdf(docxBuffer, safeName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    if (err instanceof PdfConverterUnavailableError) {
      return res.status(503).json({ code: err.code, error: err.message });
    }
    console.error('Error exporting MOE PDF:', err);
    res.status(500).json({ error: 'Failed to export MOE PDF' });
  }
});

export default router;
