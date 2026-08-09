import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Upload,
  Button,
  Tag,
  Select,
  Typography,
  Spin,
  Alert,
  Tooltip,
  Divider,
  message
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
  Type
} from 'lucide-react';
import axios from 'axios';
import './DocumentAI.scss';

const { Title, Text } = Typography;

export default function DocumentAI() {
  const [fileList, setFileList] = useState([]);
  const [preferredLang, setPreferredLang] = useState('en');
  const [fontStyle, setFontStyle] = useState("'Inter', system-ui, sans-serif");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [documentResult, setDocumentResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedPage, setCopiedPage] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const fontOptions = [
    { value: "'Inter', system-ui, sans-serif", label: 'English (Inter / System)' },
    { value: "'Ghanshyam', 'Anek Gujarati', sans-serif", label: 'Ghanshyam' },
    { value: "'Nil', 'Anek Gujarati', sans-serif", label: 'Nil' },
    { value: "'Nilkanth', 'Anek Gujarati', sans-serif", label: 'Nilkanth' },
    { value: "'Anek Gujarati', sans-serif", label: 'Anek Gujarati' },
    { value: "'Baloo Bhai 2', cursive", label: 'Baloo Bhai 2' },
    { value: "'Noto Sans Gujarati', sans-serif", label: 'Noto Sans Gujarati' }
  ];

  const processingSteps = [
    { title: 'Uploading PDF', desc: 'Validating magic bytes & temporary buffer' },
    { title: 'Page Classification', desc: 'PyMuPDF page scan (Digital vs Scanned)' },
    { title: 'OCR Vision Engine', desc: 'OpenCV deskew/denoise + PaddleOCR' },
    { title: 'Layout Synthesis', desc: 'Structuring headings, lists, & paragraphs' }
  ];

  const handleUploadChange = (info) => {
    let newFileList = [...info.fileList].slice(-1);
    setFileList(newFileList);
    setErrorMsg(null);
  };

  const handleRemoveFile = () => {
    setFileList([]);
    setDocumentResult(null);
    setErrorMsg(null);
  };

  const handleProcessPDF = async () => {
    if (fileList.length === 0) {
      message.error('Please select or drop a PDF file to process.');
      return;
    }

    const file = fileList[0].originFileObj || fileList[0];
    if (!file) {
      message.error('Invalid file selection.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setDocumentResult(null);
    setCurrentStep(1);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1200);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('preferredLang', preferredLang);

      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.post(`${backendUrl}/document/read`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(stepInterval);
      setCurrentStep(4);

      if (response.data && response.data.success) {
        setDocumentResult(response.data);
        message.success(`Document extracted in ${response.data.processingTimeMs}ms!`);
      } else {
        throw new Error(response.data?.error || 'Document extraction failed.');
      }
    } catch (err) {
      clearInterval(stepInterval);
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
    const pageText = pageBlocks.map((b) => b.content).join('\n\n');

    if (!pageText.trim()) {
      message.warning(`No text content found on Page ${pageNumber}`);
      return;
    }

    navigator.clipboard.writeText(pageText);
    setCopiedPage(pageNumber);
    message.success(`Page ${pageNumber} content copied!`);
    setTimeout(() => setCopiedPage(null), 2500);
  };

  const handleCopyAllText = () => {
    if (!documentResult?.output?.markdown) return;
    navigator.clipboard.writeText(documentResult.output.markdown);
    setCopiedAll(true);
    message.success('Entire document content copied!');
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleDownloadTxt = () => {
    if (!documentResult?.output?.markdown) return;
    const blob = new Blob([documentResult.output.markdown], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentResult.fileName || 'extracted'}_content.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedFile = fileList.length > 0 ? (fileList[0].originFileObj || fileList[0]) : null;

  return (
    <div className="document-ocr-container">
      {/* Simple, Modern Page Header */}
      <div className="simple-header">
        <div className="header-title-row">
          <div className="brand-icon">
            <Sparkles size={22} color="#6366f1" />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
              Document OCR Reader
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Upload any PDF document to extract, view, and copy page content in English, Gujarati, & Hindi.
            </Text>
          </div>
        </div>
      </div>

      <Row gutter={[24, 24]} style={{ marginTop: 20 }}>
        {/* Left Column: Polished Upload Dropzone & Controls */}
        <Col xs={24} lg={8}>
          <Card className="upload-card-container" bordered={false}>
            <div className="card-section-title">
              <UploadCloud size={18} color="#6366f1" />
              <Text strong style={{ fontSize: 14, color: '#334155' }}>
                Upload PDF Document
              </Text>
            </div>

            {/* Language Selection */}
            <div className="lang-selector-wrapper">
              <Text style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                <Globe size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                Language Mode
              </Text>
              <Select
                value={preferredLang}
                onChange={(val) => setPreferredLang(val)}
                style={{ width: '100%' }}
                options={[
                  { value: 'en', label: 'English / Multilingual (Auto)' },
                  { value: 'gu', label: 'Gujarati (ગુજરાતી)' },
                  { value: 'hi', label: 'Hindi (हिन्दी)' }
                ]}
              />
            </div>

            {/* Font Style Selection */}
            <div className="font-selector-wrapper" style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                <Type size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                Preview Font Style
              </Text>
              <Select
                value={fontStyle}
                onChange={(val) => setFontStyle(val)}
                style={{ width: '100%' }}
                options={fontOptions}
              />
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* Dropzone UI */}
            <div className="dropzone-outer">
              <Upload
                accept=".pdf"
                maxCount={1}
                fileList={fileList}
                onChange={handleUploadChange}
                beforeUpload={() => false}
                showUploadList={false}
                style={{ width: '100%', display: 'block' }}
              >
                <div className="modern-dropzone-box">
                  <div className="upload-icon-circle">
                    <FileType size={30} color="#6366f1" />
                  </div>
                  <Text strong className="dropzone-primary-text">
                    Click or Drop PDF file to browse
                  </Text>
                  <Text type="secondary" className="dropzone-secondary-text">
                    Supports Digital & Scanned PDFs up to 50MB
                  </Text>
                </div>
              </Upload>
            </div>

            {/* Selected File Card */}
            {selectedFile && (
              <div className="selected-file-pill">
                <div className="file-info-left">
                  <FileText size={18} color="#6366f1" />
                  <div className="file-name-box">
                    <Text strong className="file-name-text" ellipsis={{ tooltip: selectedFile.name }}>
                      {selectedFile.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </Text>
                  </div>
                </div>
                <Button
                  type="text"
                  danger
                  icon={<Trash2 size={16} />}
                  onClick={handleRemoveFile}
                  title="Remove File"
                />
              </div>
            )}

            {/* Process Button */}
            <Button
              type="primary"
              size="large"
              block
              onClick={handleProcessPDF}
              loading={loading}
              disabled={fileList.length === 0}
              icon={<Sparkles size={18} />}
              className="run-ocr-button"
            >
              {loading ? 'Reading Document...' : 'Run Document OCR Reader'}
            </Button>

            {/* Pipeline Stepper */}
            {loading && (
              <div className="stepper-container">
                <Text strong style={{ fontSize: 13, color: '#334155' }}>
                  Processing Pipeline:
                </Text>
                <div className="stepper-list">
                  {processingSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`step-row ${currentStep > idx ? 'done' : ''} ${currentStep === idx + 1 ? 'active' : ''}`}
                    >
                      <div className="step-bullet">
                        {currentStep > idx ? <CheckCircle2 size={15} color="#10b981" /> : <Spin size="small" />}
                      </div>
                      <div className="step-text-wrap">
                        <Text strong style={{ fontSize: 12 }}>{step.title}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <Alert
                message="Extraction Error"
                description={errorMsg}
                type="error"
                showIcon
                style={{ marginTop: 16, borderRadius: 8 }}
              />
            )}
          </Card>
        </Col>

        {/* Right Column: Page Content Only Stream */}
        <Col xs={24} lg={16}>
          {documentResult ? (
            <div className="extracted-content-panel">
              {/* Document Overview Bar */}
              <div className="doc-overview-bar">
                <div className="bar-left">
                  <BookOpen size={18} color="#6366f1" />
                  <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                    {documentResult.fileName}
                  </Text>
                  <Tag color="purple" style={{ marginLeft: 8, borderRadius: 12, fontWeight: 600 }}>
                    {documentResult.totalPages} {documentResult.totalPages === 1 ? 'Page' : 'Pages'}
                  </Tag>
                </div>
                <div className="bar-right">
                  <Button
                    size="small"
                    icon={copiedAll ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    onClick={handleCopyAllText}
                    style={{ borderRadius: 6 }}
                  >
                    {copiedAll ? 'Copied All!' : 'Copy All Text'}
                  </Button>
                  <Button
                    size="small"
                    icon={<Download size={14} />}
                    onClick={handleDownloadTxt}
                    style={{ borderRadius: 6, marginLeft: 8 }}
                  >
                    Download .txt
                  </Button>
                </div>
              </div>

              {/* Page Content Stream with Dynamic Font Style */}
              <div className="page-stream-list">
                {documentResult.output.json.pages.map((p) => {
                  const pageBlocks = documentResult.output.json.blocks.filter((b) => b.pageNumber === p.pageNumber);
                  return (
                    <div key={p.pageNumber} className="page-card">
                      {/* Page Card Header */}
                      <div className="page-card-header">
                        <div className="header-left-badges">
                          <span className="page-number-pill">
                            Page {p.pageNumber}
                          </span>
                          <Tooltip title={`Copy text of Page ${p.pageNumber}`}>
                            <Button
                              size="small"
                              type="primary"
                              ghost
                              icon={copiedPage === p.pageNumber ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                              onClick={() => handleCopyPageText(p.pageNumber)}
                              className="copy-this-page-btn"
                            >
                              {copiedPage === p.pageNumber ? 'Copied!' : `Copy Page ${p.pageNumber}`}
                            </Button>
                          </Tooltip>
                        </div>
                        <div className="header-right-meta">
                          <Tag color={p.pageType === 'digital' ? 'blue' : 'purple'} style={{ borderRadius: 4, fontSize: 11 }}>
                            {p.pageType.toUpperCase()}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {p.characterCount} chars
                          </Text>
                        </div>
                      </div>

                      {/* Page Content Body with Dynamic Font Style */}
                      <div className="page-card-body" style={{ fontFamily: fontStyle }}>
                        {pageBlocks.length > 0 ? (
                          pageBlocks.map((block) => {
                            if (block.type === 'heading') {
                              const level = block.level || 2;
                              const HeadingTag = `h${level <= 6 ? level : 2}`;
                              return <HeadingTag key={block.id} className="clean-heading" style={{ fontFamily: fontStyle }}>{block.content}</HeadingTag>;
                            } else if (block.type === 'list') {
                              return <li key={block.id} className="clean-list-item" style={{ fontFamily: fontStyle }}>{block.content}</li>;
                            } else {
                              return <p key={block.id} className="clean-paragraph" style={{ fontFamily: fontStyle }}>{block.content}</p>;
                            }
                          })
                        ) : (
                          <Text type="secondary" style={{ fontStyle: 'italic' }}>
                            No text content detected on this page.
                          </Text>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card className="empty-state-card" bordered={false}>
              <div className="empty-content-box">
                <div className="empty-icon-wrap">
                  <Layers size={36} color="#94a3b8" />
                </div>
                <Title level={4} style={{ marginTop: 14, color: '#475569', fontWeight: 600 }}>
                  Ready to Read Document
                </Title>
                <Text type="secondary" style={{ fontSize: 13, display: 'block', maxWidth: 320, margin: '0 auto' }}>
                  Upload a PDF document on the left panel to instantly extract and view page text.
                </Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
