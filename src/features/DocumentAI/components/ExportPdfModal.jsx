import { useState } from 'react';
import {
  Modal,
  Button,
  Radio,
  Input,
  Checkbox,
  Space,
  Tag,
  Typography,
  Divider,
  Progress,
  message
} from 'antd';
import {
  FileDown,
  FileSpreadsheet,
  Settings2,
  Image as ImageIcon
} from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';

const { Text } = Typography;

const QUALITY_MAP = {
  high: 0.95,
  balanced: 0.85,
  compact: 0.70
};

function sanitizeBaseName(value) {
  const cleaned = (value || 'edited_document')
    .trim()
    .replace(/\.(pdf|jpe?g|png|webp|zip)$/i, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || 'edited_document';
}

function dataUrlToBase64(dataUrl) {
  return dataUrl.split(',')[1] || '';
}

function base64ToBytes(base64) {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i += 1) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

function dataUrlToBlob(dataUrl) {
  const mimeMatch = /^data:([^;,]+)/.exec(dataUrl);
  return new Blob([base64ToBytes(dataUrlToBase64(dataUrl))], {
    type: mimeMatch?.[1] || 'image/jpeg'
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Give the browser a moment to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ExportPdfModal({
  visible,
  onCancel,
  pages = [],
  defaultFileName = 'document'
}) {
  const [format, setFormat] = useState('pdf'); // 'pdf' | 'jpeg'
  const [fileName, setFileName] = useState(
    `${sanitizeBaseName(defaultFileName)}_edited`
  );
  const [pageSizeOption, setPageSizeOption] = useState('fit-cropped'); // 'fit-cropped' | 'a4' | 'letter' | 'legal'
  const [qualityOption, setQualityOption] = useState('high'); // 'high' | 'balanced' | 'compact'
  const [addPageNumbers, setAddPageNumbers] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileNameEdited, setFileNameEdited] = useState(false);

  const activePages = pages.filter((p) => !p.isDeleted);
  const isMultiPage = activePages.length > 1;
  const outputExtension = format === 'pdf' ? '.pdf' : isMultiPage ? '.zip' : '.jpg';
  const suggestedFileName = `${sanitizeBaseName(defaultFileName)}_edited`;
  const effectiveFileName = fileNameEdited ? fileName : suggestedFileName;

  const preparePageImage = async (page) => {
    const jpegQuality = QUALITY_MAP[qualityOption] || 0.95;
    if (jpegQuality < 0.94) {
      return recompressImage(page.imageUri, jpegQuality);
    }
    return page.imageUri;
  };

  const exportPdf = async (safeName) => {
    const pdfDoc = await PDFDocument.create();
    let font = null;
    if (addPageNumbers) {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    for (let i = 0; i < activePages.length; i++) {
      const p = activePages[i];
      const dataUrl = await preparePageImage(p);
      const bytes = base64ToBytes(dataUrlToBase64(dataUrl));

      const embeddedImage = await pdfDoc.embedJpg(bytes);
      const imgW = embeddedImage.width;
      const imgH = embeddedImage.height;

      let targetW = imgW;
      let targetH = imgH;
      let drawX = 0;
      let drawY = 0;
      let drawW = imgW;
      let drawH = imgH;

      if (pageSizeOption === 'a4') {
        targetW = 595.28;
        targetH = 841.89;
        const scale = Math.min(
          (targetW - 36) / imgW,
          (targetH - (addPageNumbers ? 50 : 36)) / imgH
        );
        drawW = imgW * scale;
        drawH = imgH * scale;
        drawX = (targetW - drawW) / 2;
        drawY = (targetH - drawH) / 2 + (addPageNumbers ? 8 : 0);
      } else if (pageSizeOption === 'letter') {
        targetW = 612;
        targetH = 792;
        const scale = Math.min(
          (targetW - 36) / imgW,
          (targetH - (addPageNumbers ? 50 : 36)) / imgH
        );
        drawW = imgW * scale;
        drawH = imgH * scale;
        drawX = (targetW - drawW) / 2;
        drawY = (targetH - drawH) / 2 + (addPageNumbers ? 8 : 0);
      } else if (pageSizeOption === 'legal') {
        targetW = 612;
        targetH = 1008;
        const scale = Math.min(
          (targetW - 36) / imgW,
          (targetH - (addPageNumbers ? 50 : 36)) / imgH
        );
        drawW = imgW * scale;
        drawH = imgH * scale;
        drawX = (targetW - drawW) / 2;
        drawY = (targetH - drawH) / 2 + (addPageNumbers ? 8 : 0);
      }

      const pdfPage = pdfDoc.addPage([targetW, targetH]);
      pdfPage.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH
      });

      if (addPageNumbers && font) {
        const numText = `Page ${i + 1} of ${activePages.length}`;
        const textWidth = font.widthOfTextAtSize(numText, 9);
        pdfPage.drawText(numText, {
          x: (targetW - textWidth) / 2,
          y: 16,
          size: 9,
          font,
          color: rgb(0.4, 0.4, 0.4)
        });
      }

      setProgress(Math.round(((i + 1) / activePages.length) * 90));
    }

    setProgress(95);
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    downloadBlob(blob, `${safeName}.pdf`);

    setProgress(100);
    message.success(
      `PDF generated! Downloaded "${safeName}.pdf" (${formatBytes(pdfBytes.length)})`
    );
  };

  const exportJpeg = async (safeName) => {
    const pageImages = [];

    for (let i = 0; i < activePages.length; i++) {
      const dataUrl = await preparePageImage(activePages[i]);
      pageImages.push({ dataUrl, pageNumber: i + 1 });
      setProgress(Math.round(((i + 1) / activePages.length) * 90));
    }

    if (pageImages.length === 1) {
      const blob = dataUrlToBlob(pageImages[0].dataUrl);
      downloadBlob(blob, `${safeName}.jpg`);
      setProgress(100);
      message.success(
        `JPEG generated! Downloaded "${safeName}.jpg" (${formatBytes(blob.size)})`
      );
      return;
    }

    setProgress(94);
    const zip = new JSZip();
    for (const { dataUrl, pageNumber } of pageImages) {
      const paddedPage = String(pageNumber).padStart(2, '0');
      zip.file(`${safeName}_page-${paddedPage}.jpg`, dataUrlToBase64(dataUrl), {
        base64: true
      });
    }

    setProgress(97);
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    downloadBlob(zipBlob, `${safeName}.zip`);

    setProgress(100);
    message.success(
      `ZIP generated! Downloaded "${safeName}.zip" with ${pageImages.length} JPEG files (${formatBytes(zipBlob.size)})`
    );
  };

  const handleExport = async () => {
    if (activePages.length === 0) {
      message.error('No active pages to export.');
      return;
    }

    setGenerating(true);
    setProgress(5);

    try {
      const safeName = sanitizeBaseName(effectiveFileName);
      if (format === 'pdf') {
        await exportPdf(safeName);
      } else {
        await exportJpeg(safeName);
      }
      onCancel();
    } catch (err) {
      console.error('Failed to export document:', err);
      message.error(
        `Failed to export ${format === 'pdf' ? 'PDF' : 'JPEG'}: ${err.message}`
      );
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  const downloadLabel =
    format === 'pdf'
      ? 'Download PDF'
      : isMultiPage
        ? 'Download ZIP'
        : 'Download JPEG';

  return (
    <Modal
      open={visible}
      onCancel={generating ? undefined : onCancel}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileDown size={18} color="#4f46e5" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            Create & Download Edited Document
          </span>
          <Tag color="purple" style={{ marginLeft: 6 }}>
            {activePages.length} {activePages.length === 1 ? 'Page' : 'Pages'}
          </Tag>
        </div>
      }
      width={600}
      centered
      destroyOnHidden
      afterClose={() => {
        setFileNameEdited(false);
        setFormat('pdf');
        setProgress(0);
      }}
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            Includes all crops, rotations, & excludes
          </Text>
          <Space>
            <Button onClick={onCancel} disabled={generating}>
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<FileDown size={14} />}
              onClick={handleExport}
              loading={generating}
              style={{ background: '#4f46e5', fontWeight: 600 }}
            >
              {generating
                ? format === 'pdf'
                  ? 'Compiling PDF...'
                  : isMultiPage
                    ? 'Creating ZIP...'
                    : 'Preparing JPEG...'
                : downloadLabel}
            </Button>
          </Space>
        </div>
      }
    >
      <div style={{ padding: '8px 0' }}>
        {/* Export Format */}
        <div style={{ marginBottom: 18 }}>
          <Text strong style={{ display: 'block', marginBottom: 8, color: '#1e293b' }}>
            Export Format
          </Text>
          <Radio.Group
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            disabled={generating}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="pdf">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FileDown size={14} />
                PDF Document
              </span>
            </Radio.Button>
            <Radio.Button value="jpeg">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ImageIcon size={14} />
                JPEG Images
              </span>
            </Radio.Button>
          </Radio.Group>
          <Text
            type="secondary"
            style={{ display: 'block', marginTop: 6, fontSize: 11, lineHeight: 1.5 }}
          >
            {format === 'pdf'
              ? 'All active pages are combined into one PDF file.'
              : isMultiPage
                ? `${activePages.length} edited pages are downloaded as a ZIP containing separate JPEG files.`
                : 'The edited page is downloaded as a single JPEG image.'}
          </Text>
        </div>

        <Divider style={{ margin: '14px 0' }} />

        {/* Output Filename */}
        <div style={{ marginBottom: 18 }}>
          <Text strong style={{ display: 'block', marginBottom: 6, color: '#1e293b' }}>
            Output File Name
          </Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={effectiveFileName}
              onChange={(e) => {
                setFileNameEdited(true);
                setFileName(e.target.value);
              }}
              placeholder="e.g. document_edited"
              disabled={generating}
              style={{ width: 'calc(100% - 72px)' }}
            />
            <Input
              value={outputExtension}
              readOnly
              tabIndex={-1}
              style={{
                width: 72,
                textAlign: 'center',
                color: '#64748b',
                background: '#f8fafc',
                cursor: 'default'
              }}
            />
          </Space.Compact>
        </div>

        {format === 'pdf' && (
          <>
            <Divider style={{ margin: '14px 0' }} />

            {/* Page Sizing / Paper Format */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 8
                }}
              >
                <FileSpreadsheet size={15} color="#4f46e5" />
                <Text strong style={{ color: '#1e293b' }}>
                  Page Layout & Paper Sizing
                </Text>
              </div>
              <Radio.Group
                value={pageSizeOption}
                onChange={(e) => setPageSizeOption(e.target.value)}
                disabled={generating}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
              >
                <Radio value="fit-cropped">
                  <div>
                    <span style={{ fontWeight: 600 }}>Exact Cropped Sizes</span>
                    <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                      Fit pages to each crop area
                    </Text>
                  </div>
                </Radio>
                <Radio value="a4">
                  <div>
                    <span style={{ fontWeight: 600 }}>Standard A4 Sheet</span>
                    <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                      Centered on 595 × 842 pt
                    </Text>
                  </div>
                </Radio>
                <Radio value="letter">
                  <div>
                    <span style={{ fontWeight: 600 }}>US Letter</span>
                    <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                      Centered on 612 × 792 pt
                    </Text>
                  </div>
                </Radio>
                <Radio value="legal">
                  <div>
                    <span style={{ fontWeight: 600 }}>Legal Format</span>
                    <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                      Centered on 612 × 1008 pt
                    </Text>
                  </div>
                </Radio>
              </Radio.Group>
            </div>
          </>
        )}

        <Divider style={{ margin: '14px 0' }} />

        {/* Image Quality / Compression */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8
            }}
          >
            <Settings2 size={15} color="#4f46e5" />
            <Text strong style={{ color: '#1e293b' }}>
              Image Quality & Compression
            </Text>
          </div>
          <Radio.Group
            value={qualityOption}
            onChange={(e) => setQualityOption(e.target.value)}
            disabled={generating}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}
          >
            <Radio value="high">
              <div>
                <span style={{ fontWeight: 600 }}>High Quality</span>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                  Max sharpness
                </Text>
              </div>
            </Radio>
            <Radio value="balanced">
              <div>
                <span style={{ fontWeight: 600 }}>Balanced</span>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                  Recommended
                </Text>
              </div>
            </Radio>
            <Radio value="compact">
              <div>
                <span style={{ fontWeight: 600 }}>Compact</span>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                  Small file size
                </Text>
              </div>
            </Radio>
          </Radio.Group>
        </div>

        {format === 'pdf' && (
          <>
            <Divider style={{ margin: '14px 0' }} />

            {/* Extra Options */}
            <div>
              <Checkbox
                checked={addPageNumbers}
                onChange={(e) => setAddPageNumbers(e.target.checked)}
                disabled={generating}
              >
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  Add page numbering footer (e.g. "Page 1 of {activePages.length}")
                </span>
              </Checkbox>
            </div>
          </>
        )}

        {/* Generation Progress Bar */}
        {generating && (
          <div
            style={{
              marginTop: 18,
              background: '#f8fafc',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #e2e8f0'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4
              }}
            >
              <Text strong style={{ fontSize: 12, color: '#4f46e5' }}>
                {format === 'pdf'
                  ? 'Assembling and compressing pages...'
                  : isMultiPage
                    ? 'Preparing JPEG pages and building ZIP...'
                    : 'Preparing JPEG image...'}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>{progress}%</Text>
            </div>
            <Progress percent={progress} showInfo={false} strokeColor="#4f46e5" />
          </div>
        )}
      </div>
    </Modal>
  );
}

// Helper to recompress an image data URL with specific quality
function recompressImage(dataUrl, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Helper to format byte count into KB / MB
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
