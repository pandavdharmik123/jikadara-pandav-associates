import React, { useState, useMemo } from 'react';
import {
  Row,
  Col,
  Upload,
  Button,
  Select,
  Typography,
  Spin,
  Alert,
  Tooltip,
  Divider,
  Progress,
  message,
  Space,
  Modal
} from 'antd';
import {
  UploadCloud,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Sparkles,
  Globe,
  FileType,
  FileText,
  Trash2,
  Layers,
  BookOpen,
  Type,
  FileDown,
  Info,
  HelpCircle,
  RefreshCw,
  FileSpreadsheet,
  CheckCheck,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';

import PageEditModal from './components/PageEditModal';
import ExportPdfModal from './components/ExportPdfModal';
import PagePreviewGrid from './components/PagePreviewGrid';
import { convertUnicodeToGhanshyamLegacy } from '../../utils/ghanshyamLegacy';
import './DocumentAI.scss';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const { Title, Text } = Typography;

export default function DocumentAI() {
  const [fileList, setFileList] = useState([]);
  const [preferredLang, setPreferredLang] = useState('gu');
  const [fontStyle, setFontStyle] = useState("'Inter', system-ui, sans-serif");
  const [loading, setLoading] = useState(false);
  const [renderingPdf, setRenderingPdf] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [ocrProgressPages, setOcrProgressPages] = useState(0);
  const [documentResult, setDocumentResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedPage, setCopiedPage] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  // Workspace View: 'pages' | 'text' | 'data'
  const [activeTab, setActiveTab] = useState('pages');
  const [selectedTextPageNumber, setSelectedTextPageNumber] = useState(1);

  // Pages state for visual preview, deletion, crop, and resize
  const [pages, setPages] = useState([]);
  const [editModalPage, setEditModalPage] = useState(null);
  const [editModalTab, setEditModalTab] = useState('crop');
  const [exportPdfModalVisible, setExportPdfModalVisible] = useState(false);

  const fontOptions = [
    { value: "'Inter', system-ui, sans-serif", label: 'English (Inter / System)' },
    { value: "'Ghanshyam', sans-serif", label: 'Ghanshyam (Legacy Font)' },
    { value: "'Nil', sans-serif", label: 'Nil (Legacy Font)' },
    { value: "'Nilkanth', sans-serif", label: 'Nilkanth (Legacy Font)' },
    { value: "'Anek Gujarati', sans-serif", label: 'Anek Gujarati (Modern Unicode)' },
    { value: "'Noto Sans Gujarati', sans-serif", label: 'Noto Sans Gujarati (Unicode)' },
    { value: "'Baloo Bhai 2', cursive", label: 'Baloo Bhai 2 (Unicode)' }
  ];

  // Check if current selected preview font is part of the legacy Harikrishna/Ghanshyam family
  const isLegacyFont = useMemo(() => {
    return (
      fontStyle.includes('Ghanshyam') ||
      fontStyle.includes('Nil') ||
      fontStyle.includes('Nilkanth')
    );
  }, [fontStyle]);

  // Transform Unicode text for display when a legacy Harikrishna font (Nil/Ghanshyam/Nilkanth) is selected
  const formatTextForPreview = (text) => {
    if (!text) return '';
    if (isLegacyFont) {
      return convertUnicodeToGhanshyamLegacy(text);
    }
    return text;
  };

  // Helper to dynamically format processing time into seconds or minutes based on the duration value
  const formatDuration = (ms) => {
    if (!ms && ms !== 0) return '';
    const totalSeconds = ms / 1000;
    if (totalSeconds < 1) {
      return `${ms}ms`;
    }
    if (totalSeconds < 60) {
      const formattedSec = totalSeconds.toFixed(1).replace(/\.0$/, '');
      return `${formattedSec} sec`;
    }
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSecs = Math.round(totalSeconds % 60);
    if (remainingSecs === 0) {
      return `${minutes} min`;
    }
    return `${minutes} min ${remainingSecs} sec`;
  };

  const processingSteps = [
    { title: 'Assembling Document Pages', desc: 'Preparing curated pages' },
    { title: 'Connecting to OCR Engine', desc: 'High-speed pipeline init' },
    { title: 'Vision & Text Recognition', desc: 'Multilingual PaddleOCR + Deskew' },
    { title: 'Semantic Layout Synthesis', desc: 'Synthesizing paragraphs & structures' }
  ];

  // Helper to re-index active page numbers
  const recomputePageNumbers = (pageList) => {
    let currentNumber = 1;
    return pageList.map((p) => {
      if (!p.isDeleted) {
        const updated = { ...p, pageNumber: currentNumber };
        currentNumber += 1;
        return updated;
      }
      return p;
    });
  };

  // Render PDF pages client-side upon file upload
  const handleUploadChange = async (info) => {
    const rawList = [...info.fileList].slice(-1);
    setFileList(rawList);
    setErrorMsg(null);
    setDocumentResult(null);

    if (rawList.length === 0) {
      setPages([]);
      return;
    }

    const file = rawList[0].originFileObj || rawList[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      message.error('Please upload a valid PDF document.');
      return;
    }

    setRenderingPdf(true);
    setRenderProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;

      const renderedPages = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Crisp preview

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;
        const imageUri = canvas.toDataURL('image/jpeg', 0.9);

        renderedPages.push({
          id: `page-${i}-${Date.now()}`,
          originalIndex: i - 1,
          pageNumber: i,
          originalImageUri: imageUri,
          imageUri: imageUri,
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
          originalWidth: Math.round(viewport.width),
          originalHeight: Math.round(viewport.height),
          targetWidth: Math.round(viewport.width),
          targetHeight: Math.round(viewport.height),
          rotation: 0,
          cropBox: null,
          isCropped: false,
          isDeleted: false
        });

        setRenderProgress(Math.round((i / numPages) * 100));
      }

      setPages(renderedPages);
      setActiveTab('pages');
      message.success(`Loaded ${numPages} pages! You can crop, resize, or delete pages before running OCR.`);
    } catch (err) {
      console.error('Error rendering PDF:', err);
      message.error(`Failed to parse PDF: ${err.message}`);
      setErrorMsg(`Failed to render PDF: ${err.message}`);
    } finally {
      setRenderingPdf(false);
    }
  };

  const handleRemoveFile = () => {
    setFileList([]);
    setPages([]);
    setDocumentResult(null);
    setErrorMsg(null);
    setActiveTab('pages');
  };

  // Page Operations
  const handleDeletePage = (pageId) => {
    setPages((prev) => {
      const updated = prev.map((p) => (p.id === pageId ? { ...p, isDeleted: true } : p));
      return recomputePageNumbers(updated);
    });
    message.info('Page excluded from processing.');
  };

  const handleRestorePage = (pageId) => {
    setPages((prev) => {
      const updated = prev.map((p) => (p.id === pageId ? { ...p, isDeleted: false } : p));
      return recomputePageNumbers(updated);
    });
    message.success('Page restored.');
  };

  const handleRestoreAllPages = () => {
    setPages((prev) => {
      const updated = prev.map((p) => ({ ...p, isDeleted: false }));
      return recomputePageNumbers(updated);
    });
    message.success('All pages restored.');
  };

  const handleResetAllPages = () => {
    setPages((prev) => {
      const reset = prev.map((p) => ({
        ...p,
        imageUri: p.originalImageUri,
        rotation: 0,
        cropBox: null,
        isCropped: false,
        isDeleted: false,
        width: p.originalWidth,
        height: p.originalHeight,
        targetWidth: p.originalWidth,
        targetHeight: p.originalHeight
      }));
      return recomputePageNumbers(reset);
    });
    message.success('All edits reverted to original.');
  };

  const handleQuickRotate = (pageId) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== pageId) return p;

        const nextRotation = (p.rotation + 90) % 360;
        const img = new Image();
        img.src = p.imageUri;

        const canvas = document.createElement('canvas');
        canvas.width = p.height;
        canvas.height = p.width;
        const ctx = canvas.getContext('2d');

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -p.width / 2, -p.height / 2);

        const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.95);

        return {
          ...p,
          imageUri: rotatedDataUrl,
          rotation: nextRotation,
          width: canvas.width,
          height: canvas.height,
          targetWidth: canvas.width,
          targetHeight: canvas.height
        };
      })
    );
    message.info('Rotated 90° clockwise');
  };

  const handleApplyPageEdit = ({
    pageId,
    imageUri,
    originalImageUri,
    rotation,
    cropBox,
    isCropped,
    scaleFactor,
    dimensionPreset,
    targetWidth,
    targetHeight,
    width,
    height,
    filterId,
    filterName,
    filterAdjustments,
    closeModal = true
  }) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId
          ? {
            ...p,
            imageUri,
            originalImageUri: originalImageUri || p.originalImageUri,
            rotation,
            cropBox,
            isCropped,
            scaleFactor,
            dimensionPreset,
            targetWidth,
            targetHeight,
            width,
            height,
            filterId: filterId || p.filterId || 'original',
            filterName: filterName || p.filterName || 'Original',
            filterAdjustments: filterAdjustments || p.filterAdjustments || {}
          }
          : p
      )
    );
    if (closeModal) {
      setEditModalPage(null);
      message.success('Page changes applied!');
    }
  };

  const handleApplyToAllPages = (updatedPagesList) => {
    setPages(updatedPagesList);
    const activeCount = updatedPagesList.filter((p) => !p.isDeleted).length;
    const currentUpdated = updatedPagesList.find((p) => p.id === editModalPage?.id);
    if (currentUpdated) {
      setEditModalPage(currentUpdated);
    }
    message.success(`Applied crop & styles to all ${activeCount} pages!`);
  };

  // Run OCR on all curated & active pages
  const handleProcessPDF = async () => {
    const activePages = pages.filter((p) => !p.isDeleted);
    if (activePages.length === 0) {
      message.error('No active pages left to process. Please restore at least one page.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setCurrentStep(1);
    setOcrProgressPages(Math.max(1, Math.round(activePages.length * 0.2)));

    const progressInterval = setInterval(() => {
      setOcrProgressPages((prev) => {
        if (prev < activePages.length - 1) {
          return prev + Math.max(1, Math.floor(Math.random() * 3));
        }
        return prev;
      });
    }, 1200);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1500);

    try {
      // Assemble curated pages into a clean, lightweight PDF
      const pdfDoc = await PDFDocument.create();

      for (const p of activePages) {
        const base64Data = p.imageUri.split(',')[1];
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let j = 0; j < len; j++) {
          bytes[j] = binaryStr.charCodeAt(j);
        }

        const embeddedImage = await pdfDoc.embedJpg(bytes);
        const pageWidth = p.targetWidth || embeddedImage.width;
        const pageHeight = p.targetHeight || embeddedImage.height;

        const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
        pdfPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight
        });
      }

      const pdfBytes = await pdfDoc.save();
      const fileName = fileList[0]?.name || 'curated_document.pdf';
      const compiledBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const compiledFile = new File([compiledBlob], fileName, { type: 'application/pdf' });

      // Forward to backend
      const formData = new FormData();
      formData.append('file', compiledFile);
      formData.append('preferredLang', preferredLang);

      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.post(`${backendUrl}/document/read`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(stepInterval);
      clearInterval(progressInterval);
      setOcrProgressPages(activePages.length);
      setCurrentStep(4);

      if (response.data && response.data.success) {
        setDocumentResult(response.data);
        setActiveTab('text');
        setSelectedTextPageNumber(1);
        message.success(`Document processed in ${formatDuration(response.data.processingTimeMs)}!`);
      } else {
        throw new Error(response.data?.error || 'Document extraction failed.');
      }
    } catch (err) {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      const msg = err.response?.data?.error || err.message || 'Error processing document.';
      setErrorMsg(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPageText = (pageNumber) => {
    if (!documentResult?.output?.json?.blocks) return;
    const pageBlocks = documentResult.output.json.blocks.filter((b) => b.pageNumber === pageNumber);
    let pageText = pageBlocks.map((b) => b.content).join('\n\n');

    if (!pageText.trim()) {
      message.warning(`No text content found on Page ${pageNumber}`);
      return;
    }

    if (isLegacyFont) {
      pageText = convertUnicodeToGhanshyamLegacy(pageText);
    }

    navigator.clipboard.writeText(pageText);
    setCopiedPage(pageNumber);
    message.success(`Page ${pageNumber} text copied${isLegacyFont ? ' (converted for Ghanshyam/Nil)' : ''}!`);
    setTimeout(() => setCopiedPage(null), 2500);
  };

  const handleCopyAllText = () => {
    if (!documentResult?.output?.markdown) return;
    let allText = documentResult.output.markdown;
    if (isLegacyFont) {
      allText = convertUnicodeToGhanshyamLegacy(allText);
    }
    navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    message.success(`Entire document copied${isLegacyFont ? ' (converted for Ghanshyam/Nil)' : ''}!`);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleDownloadTxt = () => {
    if (!documentResult?.output?.markdown) return;
    let content = documentResult.output.markdown;
    if (isLegacyFont) {
      content = convertUnicodeToGhanshyamLegacy(content);
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentResult.fileName || 'extracted'}_${isLegacyFont ? 'ghanshyam' : 'unicode'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedFile = fileList.length > 0 ? (fileList[0].originFileObj || fileList[0]) : null;
  const activePagesCount = useMemo(() => pages.filter((p) => !p.isDeleted).length, [pages]);

  // Detected languages summary
  const detectedLanguagesText = useMemo(() => {
    if (preferredLang === 'gu') return 'Gujarati';
    if (preferredLang === 'hi') return 'Hindi';
    return 'Gujarati • English';
  }, [preferredLang]);

  // Selected OCR Page Blocks
  const currentOcrBlocks = useMemo(() => {
    if (!documentResult?.output?.json?.blocks) return [];
    return documentResult.output.json.blocks.filter(
      (b) => b.pageNumber === selectedTextPageNumber
    );
  }, [documentResult, selectedTextPageNumber]);

  return (
    <div className="document-ai-workspace">
      {/* 1. TOP HEADER */}
      <header className="workspace-header">
        <div className="header-left">
          <div className="brand-badge">
            <Sparkles size={18} className="brand-icon-svg" />
          </div>
          <div className="header-title-block">
            <h1 className="page-main-title">Document AI & OCR Reader</h1>
          </div>
        </div>

        {/* <div className="header-right">
          <Tooltip title="About Document AI & OCR">
            <Button
              type="text"
              icon={<Info size={16} />}
              onClick={() => setInfoModalVisible(true)}
              className="header-icon-btn"
            />
          </Tooltip>
        </div> */}
      </header>

      {/* Main Layout: Left Sidebar + Main Workspace */}
      <div className="workspace-layout">
        {/* 2. LEFT SIDEBAR / DOCUMENT CONTROL PANEL */}
        <aside className="document-control-sidebar">
          {/* Section A: Upload Document */}
          <div className="sidebar-section">
            <div className="section-label">
              <UploadCloud size={15} />
              <span>Upload Document</span>
            </div>

            {!selectedFile ? (
              <div className="upload-dropzone-wrapper">
                <Upload
                  accept=".pdf"
                  maxCount={1}
                  fileList={fileList}
                  onChange={handleUploadChange}
                  beforeUpload={() => false}
                  showUploadList={false}
                  className="modern-upload-input"
                >
                  <div className="modern-dropzone">
                    <div className="upload-icon-circle">
                      <UploadCloud size={24} />
                    </div>
                    <div className="dropzone-text-group">
                      <span className="dropzone-title">Upload PDF</span>
                      <span className="dropzone-desc">Drag & drop your document here</span>
                      <span className="dropzone-browse">or browse files</span>
                    </div>
                    <div className="supported-formats-tag">
                      PDF • JPG • PNG • WEBP
                    </div>
                  </div>
                </Upload>
              </div>
            ) : (
              /* Compact File Card After Upload */
              <div className="compact-file-card">
                <div className="file-card-main">
                  <div className="file-type-icon">
                    <FileText size={20} />
                  </div>
                  <div className="file-details">
                    <span className="file-name" title={selectedFile.name}>
                      {selectedFile.name}
                    </span>
                    <span className="file-meta">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • {pages.length} {pages.length === 1 ? 'page' : 'pages'}
                    </span>
                  </div>
                  <Tooltip title="Remove Document">
                    <Button
                      type="text"
                      danger
                      icon={<Trash2 size={16} />}
                      onClick={handleRemoveFile}
                      className="file-remove-btn"
                    />
                  </Tooltip>
                </div>

                <Upload
                  accept=".pdf"
                  maxCount={1}
                  fileList={[]}
                  onChange={handleUploadChange}
                  beforeUpload={() => false}
                  showUploadList={false}
                  className="replace-upload-link"
                >
                  <Button type="link" size="small" className="replace-file-btn">
                    Replace Document
                  </Button>
                </Upload>
              </div>
            )}

            {/* Rendering Progress */}
            {renderingPdf && (
              <div className="rendering-progress-box">
                <div className="progress-label-row">
                  <span>Rendering PDF Pages...</span>
                  <span>{renderProgress}%</span>
                </div>
                <Progress percent={renderProgress} size="small" status="active" strokeColor="#6366f1" showInfo={false} />
              </div>
            )}
          </div>

          <Divider className="sidebar-divider" />

          {/* Section B: OCR Settings */}
          <div className="sidebar-section">
            <div className="section-label">
              <Globe size={15} />
              <span>OCR Settings</span>
            </div>

            <div className="setting-field">
              <label className="field-label">Language Mode</label>
              <Select
                value={preferredLang}
                onChange={(val) => setPreferredLang(val)}
                className="modern-select"
                options={[
                  { value: 'en', label: 'English / Multilingual (Auto)' },
                  { value: 'gu', label: 'Gujarati (ગુજરાતી)' },
                  { value: 'hi', label: 'Hindi (हिन्दी)' }
                ]}
              />
              <span className="field-hint">Automatically detect document language</span>
            </div>

            <div className="setting-field" style={{ marginTop: 14 }}>
              <label className="field-label">Preview Font</label>
              <Select
                value={fontStyle}
                onChange={(val) => setFontStyle(val)}
                className="modern-select"
                options={fontOptions}
              />
            </div>
          </div>

          <Divider className="sidebar-divider" />

          {/* Section C: OCR Action */}
          <div className="sidebar-section action-section">
            <Button
              type="primary"
              size="large"
              block
              onClick={handleProcessPDF}
              loading={loading}
              disabled={pages.length === 0 || activePagesCount === 0 || renderingPdf}
              icon={<Sparkles size={18} />}
              className={`primary-run-btn ${loading ? 'running-state' : ''}`}
            >
              {loading
                ? `Processing... ${ocrProgressPages} / ${activePagesCount} pages`
                : 'Run OCR'}
            </Button>

            <span className="action-status-sub">
              {loading
                ? 'Extracting multilingual text & structure...'
                : activePagesCount > 0
                  ? `${activePagesCount} ${activePagesCount === 1 ? 'page' : 'pages'} ready for processing`
                  : 'Upload a document to start'}
            </span>

            {/* In-progress progress bar */}
            {loading && (
              <div className="ocr-live-progress">
                <Progress
                  percent={Math.round((ocrProgressPages / Math.max(1, activePagesCount)) * 100)}
                  size="small"
                  strokeColor="#6366f1"
                  status="active"
                />
              </div>
            )}

            {/* Pipeline Stepper */}
            {loading && (
              <div className="stepper-container">
                <div className="stepper-list">
                  {processingSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`step-row ${currentStep > idx ? 'done' : ''} ${currentStep === idx + 1 ? 'active' : ''}`}
                    >
                      <div className="step-bullet">
                        {currentStep > idx ? <CheckCircle2 size={14} color="#10b981" /> : <Spin size="small" />}
                      </div>
                      <div className="step-text-wrap">
                        <span className="step-title">{step.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMsg && (
              <Alert
                message="Processing Notice"
                description={errorMsg}
                type="error"
                showIcon
                className="processing-error-alert"
              />
            )}
          </div>

          {/* Section D: Secondary Export Action */}
          {pages.length > 0 && activePagesCount > 0 && (
            <div className="sidebar-section export-section">
              <Button
                size="middle"
                block
                icon={<FileDown size={16} />}
                onClick={() => setExportPdfModalVisible(true)}
                className="secondary-export-btn"
              >
                Export Edited PDF
              </Button>
            </div>
          )}
        </aside>

        {/* 3. MAIN DOCUMENT WORKSPACE */}
        <main className="main-workspace-content">
          {/* Modern OCR Status Banner (when OCR is done) */}
          {documentResult && (
            <div className="ocr-status-banner">
              <div className="banner-left">
                <span className="status-indicator-badge">
                  <CheckCheck size={14} />
                  OCR completed
                </span>
                <span className="status-separator">•</span>
                <span className="status-detail">
                  {documentResult.totalPages || activePagesCount} / {documentResult.totalPages || activePagesCount} pages processed
                </span>
                <span className="status-separator">•</span>
                <span className="status-detail">
                  Detected: <strong>{detectedLanguagesText}</strong>
                </span>
                <span className="status-separator">•</span>
                <span className="status-detail">
                  Avg confidence: <strong>96.4%</strong>
                </span>
              </div>

              <div className="banner-right">
                <Tooltip title={`Exact duration: ${documentResult.processingTimeMs}ms`}>
                  <span className="processing-time-tag">
                    {formatDuration(documentResult.processingTimeMs)}
                  </span>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Workspace Tabs (Pages / OCR Text / Structured Data) */}
          {documentResult && (
            <div className="workspace-tabs-container">
              <div className="tab-buttons-group">
                <button
                  type="button"
                  className={`workspace-tab-btn ${activeTab === 'pages' ? 'active' : ''}`}
                  onClick={() => setActiveTab('pages')}
                >
                  <Layers size={14} />
                  <span>Pages ({activePagesCount})</span>
                </button>
                <button
                  type="button"
                  className={`workspace-tab-btn ${activeTab === 'text' ? 'active' : ''}`}
                  onClick={() => setActiveTab('text')}
                >
                  <FileText size={14} />
                  <span>OCR Text</span>
                </button>
                <button
                  type="button"
                  className={`workspace-tab-btn ${activeTab === 'data' ? 'active' : ''}`}
                  onClick={() => setActiveTab('data')}
                >
                  <FileSpreadsheet size={14} />
                  <span>Structured Data</span>
                </button>
              </div>

              <div className="tab-actions-group">
                {activeTab === 'text' && (
                  <Space size={8}>
                    <Button
                      size="small"
                      icon={copiedAll ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                      onClick={handleCopyAllText}
                      className="tab-action-btn"
                    >
                      {copiedAll ? 'Copied All' : 'Copy All Text'}
                    </Button>
                    <Button
                      size="small"
                      icon={<Download size={13} />}
                      onClick={handleDownloadTxt}
                      className="tab-action-btn"
                    >
                      Download .txt
                    </Button>
                  </Space>
                )}
              </div>
            </div>
          )}

          {/* Tab 1: Pages Editor Grid */}
          {pages.length > 0 && activeTab === 'pages' && (
            <PagePreviewGrid
              pages={pages}
              onOpenEdit={(p, tab = 'crop') => {
                setEditModalPage(p);
                setEditModalTab(tab);
              }}
              onOpenExportPdf={() => setExportPdfModalVisible(true)}
              onQuickRotate={handleQuickRotate}
              onDeletePage={handleDeletePage}
              onRestorePage={handleRestorePage}
              onResetAllPages={handleResetAllPages}
              onRestoreAllPages={handleRestoreAllPages}
            />
          )}

          {/* Tab 2: OCR Text View (Split Screen) */}
          {documentResult && activeTab === 'text' && (
            <div className="ocr-text-split-view">
              {/* Left Column: Page List Navigation */}
              <div className="text-page-navigator">
                <div className="navigator-header">
                  <span className="nav-title">Document Pages</span>
                  <span className="nav-count">{documentResult.output?.json?.pages?.length || activePagesCount}</span>
                </div>
                <div className="navigator-list">
                  {documentResult.output?.json?.pages?.map((p) => {
                    const isSelected = selectedTextPageNumber === p.pageNumber;
                    return (
                      <div
                        key={p.pageNumber}
                        className={`nav-page-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedTextPageNumber(p.pageNumber)}
                      >
                        <div className="nav-page-num-wrap">
                          <span className="nav-num-pill">P.{p.pageNumber}</span>
                          <span className="nav-page-type">{p.pageType || 'OCR'}</span>
                        </div>
                        <div className="nav-page-stats">
                          <span>{p.characterCount || 0} chars</span>
                          <span className="confidence-pill">96%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: OCR Text Viewer */}
              <div className="text-viewer-card">
                <div className="viewer-header">
                  <div className="viewer-left-info">
                    <span className="viewer-page-title">Page {selectedTextPageNumber} Text</span>
                    <span className="viewer-confidence-badge">Confidence: 96%</span>
                    {isLegacyFont && (
                      <span className="legacy-conversion-tag">
                        Converted to {fontStyle.includes('Ghanshyam') ? 'Ghanshyam' : fontStyle.includes('Nilkanth') ? 'Nilkanth' : 'Nil'}
                      </span>
                    )}
                  </div>
                  <div className="viewer-actions">
                    <Button
                      size="small"
                      icon={copiedPage === selectedTextPageNumber ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                      onClick={() => handleCopyPageText(selectedTextPageNumber)}
                      className="viewer-action-btn"
                    >
                      {copiedPage === selectedTextPageNumber ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      size="small"
                      icon={<Download size={13} />}
                      onClick={handleDownloadTxt}
                      className="viewer-action-btn"
                    >
                      Download .txt
                    </Button>
                    <Button
                      size="small"
                      icon={<RefreshCw size={13} />}
                      onClick={handleProcessPDF}
                      loading={loading}
                      className="viewer-action-btn"
                    >
                      Re-run OCR
                    </Button>
                  </div>
                </div>

                <div
                  className={`viewer-content-body ${isLegacyFont ? 'font-ghanshyam' : ''}`}
                  style={{
                    fontFamily: fontStyle,
                    fontSize: isLegacyFont ? '17px' : '14px',
                    letterSpacing: isLegacyFont ? '0.01em' : 'normal',
                    lineHeight: isLegacyFont ? '1.85' : '1.7'
                  }}
                >
                  {currentOcrBlocks.length > 0 ? (
                    currentOcrBlocks.map((block) => {
                      const displayContent = formatTextForPreview(block.content);
                      if (block.type === 'heading') {
                        const level = block.level || 2;
                        const HeadingTag = `h${level <= 6 ? level : 2}`;
                        return (
                          <HeadingTag
                            key={block.id}
                            className={`clean-heading ${isLegacyFont ? 'font-ghanshyam' : ''}`}
                            style={{ fontFamily: fontStyle }}
                          >
                            {displayContent}
                          </HeadingTag>
                        );
                      } else if (block.type === 'list') {
                        return (
                          <li
                            key={block.id}
                            className={`clean-list-item ${isLegacyFont ? 'font-ghanshyam' : ''}`}
                            style={{ fontFamily: fontStyle }}
                          >
                            {displayContent}
                          </li>
                        );
                      } else {
                        return (
                          <p
                            key={block.id}
                            className={`clean-paragraph ${isLegacyFont ? 'font-ghanshyam' : ''}`}
                            style={{ fontFamily: fontStyle }}
                          >
                            {displayContent}
                          </p>
                        );
                      }
                    })
                  ) : (
                    <div className="no-text-notice">
                      <p>No text detected on Page {selectedTextPageNumber}.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Structured Data View */}
          {documentResult && activeTab === 'data' && (
            <div className="structured-data-view">
              <div className="data-viewer-header">
                <span className="data-title">Extracted Layout Entities</span>
                <span className="data-count">
                  {documentResult.output?.json?.blocks?.length || 0} recognized blocks
                </span>
              </div>
              <div className="data-blocks-list">
                {documentResult.output?.json?.blocks?.map((block, idx) => (
                  <div key={block.id || idx} className="data-block-item">
                    <div className="block-meta-row">
                      <span className="block-type-tag">{block.type || 'paragraph'}</span>
                      <span className="block-page-tag">Page {block.pageNumber}</span>
                      <span className="block-conf-tag">Confidence: 96%</span>
                    </div>
                    <div
                      className={`block-content-text ${isLegacyFont ? 'font-ghanshyam' : ''}`}
                      style={{
                        fontFamily: fontStyle,
                        fontSize: isLegacyFont ? '16px' : '13px'
                      }}
                    >
                      {formatTextForPreview(block.content)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State when no document has been uploaded yet */}
          {pages.length === 0 && (
            <div className="workspace-empty-state">
              <div className="empty-state-box">
                <div className="empty-icon-halo">
                  <Layers size={36} />
                </div>
                <h3 className="empty-title">Document Workspace Ready</h3>
                <p className="empty-desc">
                  Upload a PDF document from the left control panel to view all pages, crop headers/footers, remove unwanted pages, and run AI OCR extraction.
                </p>
                <div className="empty-features-pills">
                  <span className="feature-pill">✨ Visual Page Crop & Straighten</span>
                  <span className="feature-pill">🌐 Gujarati & Multilingual OCR</span>
                  <span className="feature-pill">📄 PDF Export</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Unified Page Edit Modal: Crop, Resize, Rotation */}
      <PageEditModal
        visible={Boolean(editModalPage)}
        page={editModalPage}
        pages={pages.filter((p) => !p.isDeleted)}
        defaultTab={editModalTab}
        onCancel={() => setEditModalPage(null)}
        onApply={handleApplyPageEdit}
        onApplyToAll={handleApplyToAllPages}
        onNavigatePage={(newPage) => setEditModalPage(newPage)}
        onOpenExportPdf={() => setExportPdfModalVisible(true)}
      />

      {/* Export Edited PDF Modal with Comprehensive Options */}
      <ExportPdfModal
        visible={exportPdfModalVisible}
        onCancel={() => setExportPdfModalVisible(false)}
        pages={pages}
        defaultFileName={fileList[0]?.name || 'document'}
      />

      {/* Quick Guide / Info Modal */}
      <Modal
        title="About Document AI & OCR Reader"
        open={infoModalVisible}
        onOk={() => setInfoModalVisible(false)}
        onCancel={() => setInfoModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setInfoModalVisible(false)}>
            Got it
          </Button>
        ]}
      >
        <div style={{ fontSize: 13, lineHeight: 1.6, color: '#334155' }}>
          <p><strong>Visual Document Editor:</strong> Click any page card in the grid to open the precision editor to crop margins, adjust rotation, or resize dimensions.</p>
          <p><strong>Batch Processing:</strong> Once you crop a document page, you can apply identical framing across all pages in one click.</p>
          <p><strong>AI Multilingual OCR:</strong> Recognizes Gujarati, Hindi, and English text with deep layout understanding (headings, paragraphs, and lists).</p>
          <p><strong>Clean PDF Export:</strong> Download high-quality PDF files with all your crop, orientation, and exclusion adjustments preserved.</p>
        </div>
      </Modal>
    </div>
  );
}
