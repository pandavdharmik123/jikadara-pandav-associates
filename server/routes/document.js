import express from 'express';
import multer from 'multer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = express.Router();

// Configure temporary upload storage
const uploadDir = path.join(os.tmpdir(), 'pdf_uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `upload-${uniqueSuffix}.pdf`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF files are allowed.'));
    }
  }
});

/**
 * Modular hook interface for future database persistence without changing the OCR pipeline.
 * Currently a no-op stateless handler.
 */
async function handlePostProcessingHooks(documentResult) {
  // Database persistence logic can be attached here in the future
  // e.g. await db.documentLog.create({ data: ... })
  return documentResult;
}

/**
 * POST /api/document/read
 * 
 * 1. Accepts PDF file upload
 * 2. Validates PDF format & magic bytes (%PDF-)
 * 3. Forwards PDF payload to Python OCR microservice
 * 4. Deletes local temporary file immediately in finally block
 * 5. Returns structured JSON, HTML, and Markdown result to React
 */
router.post('/read', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No PDF file uploaded. Please attach a valid PDF file under the "file" field.'
    });
  }

  const tempFilePath = req.file.path;
  const preferredLang = req.body.preferredLang || 'en';

  try {
    // Validation 1: Magic Byte Check (%PDF-)
    const fileHeader = Buffer.alloc(4);
    const fd = fs.openSync(tempFilePath, 'r');
    fs.readSync(fd, fileHeader, 0, 4, 0);
    fs.closeSync(fd);

    if (fileHeader.toString('utf-8') !== '%PDF') {
      return res.status(400).json({
        success: false,
        error: 'Uploaded file is corrupted or not a valid PDF document (Magic bytes %PDF- check failed).'
      });
    }

    // Prepare FormData payload for Python OCR microservice
    const pythonServiceUrl = process.env.PYTHON_OCR_URL || 'http://localhost:8000';
    const targetEndpoint = `${pythonServiceUrl}/api/v1/ocr/process`;

    // Create standard FormData
    const formData = new FormData();
    const fileStream = fs.createReadStream(tempFilePath);

    // Convert stream to Blob / File for fetch / axios compatibility
    const fileBuffer = fs.readFileSync(tempFilePath);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('file', blob, req.file.originalname);
    formData.append('preferred_lang', preferredLang);

    console.log(`[Node.js Proxy] Forwarding PDF '${req.file.originalname}' (${req.file.size} bytes) to Python service: ${targetEndpoint}`);

    // Call Python OCR Service
    const response = await fetch(targetEndpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Python OCR Service Error ${response.status}]:`, errorText);
      throw new Error(`Python OCR service returned status ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Trigger modular hook (No DB persistence, purely stateless)
    await handlePostProcessingHooks(result);

    // Return response to React frontend immediately
    return res.json(result);

  } catch (error) {
    console.error('[Document Read Route Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while processing the PDF document.'
    });
  } finally {
    // Delete local temporary file immediately after processing
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`[Node.js Temp Cleanup] Deleted temporary file: ${tempFilePath}`);
      } catch (cleanupErr) {
        console.error(`[Node.js Temp Cleanup Error] Failed to delete file ${tempFilePath}:`, cleanupErr);
      }
    }
  }
});

export default router;
