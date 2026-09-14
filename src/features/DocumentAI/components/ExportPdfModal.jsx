import React, { useState } from 'react';
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
  FileCheck,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Layers,
  Settings2
} from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const { Text } = Typography;

export default function ExportPdfModal({
  visible,
  onCancel,
  pages = [],
  defaultFileName = 'document'
}) {
  const [fileName, setFileName] = useState(`${defaultFileName.replace(/\.[^/.]+$/, '')}_edited`);
  const [pageSizeOption, setPageSizeOption] = useState('fit-cropped'); // 'fit-cropped' | 'a4' | 'letter' | 'legal'
  const [qualityOption, setQualityOption] = useState('high'); // 'high' | 'balanced' | 'compact'
  const [addPageNumbers, setAddPageNumbers] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const activePages = pages.filter((p) => !p.isDeleted);

  const handleGeneratePdf = async () => {
    if (activePages.length === 0) {
      message.error('No active pages to export.');
      return;
    }

    setGenerating(true);
    setProgress(5);

    try {
      const pdfDoc = await PDFDocument.create();
      let font = null;
      if (addPageNumbers) {
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }

      const qualityQualityMap = {
        high: 0.95,
        balanced: 0.85,
        compact: 0.70
      };
      const jpegQuality = qualityQualityMap[qualityOption] || 0.92;

      for (let i = 0; i < activePages.length; i++) {
        const p = activePages[i];

        // Prepare image data with requested compression
        let base64Data = p.imageUri;
        if (jpegQuality < 0.94) {
          base64Data = await recompressImage(p.imageUri, jpegQuality);
        }

        const base64Str = base64Data.split(',')[1];
        const binaryStr = atob(base64Str);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let j = 0; j < len; j++) {
          bytes[j] = binaryStr.charCodeAt(j);
        }

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
          const scale = Math.min((targetW - 36) / imgW, (targetH - (addPageNumbers ? 50 : 36)) / imgH);
          drawW = imgW * scale;
          drawH = imgH * scale;
          drawX = (targetW - drawW) / 2;
          drawY = (targetH - drawH) / 2 + (addPageNumbers ? 8 : 0);
        } else if (pageSizeOption === 'letter') {
          targetW = 612;
          targetH = 792;
          const scale = Math.min((targetW - 36) / imgW, (targetH - (addPageNumbers ? 50 : 36)) / imgH);
          drawW = imgW * scale;
          drawH = imgH * scale;
          drawX = (targetW - drawW) / 2;
          drawY = (targetH - drawH) / 2 + (addPageNumbers ? 8 : 0);
        } else if (pageSizeOption === 'legal') {
          targetW = 612;
          targetH = 1008;
          const scale = Math.min((targetW - 36) / imgW, (targetH - (addPageNumbers ? 50 : 36)) / imgH);
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

        // Add page footer number if selected
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
      const downloadUrl = URL.createObjectURL(blob);

      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      const safeName = (fileName.trim() || 'edited_document').replace(/\.pdf$/i, '');
      downloadLink.download = `${safeName}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadUrl);

      setProgress(100);
      message.success(`PDF generated! Downloaded "${safeName}.pdf" (${formatBytes(pdfBytes.length)})`);
      onCancel();
    } catch (err) {
      console.error('Failed to create PDF:', err);
      message.error(`Failed to generate PDF: ${err.message}`);
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={generating ? undefined : onCancel}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileDown size={18} color="#4f46e5" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Create & Download Edited PDF</span>
          <Tag color="purple" style={{ marginLeft: 6 }}>
            {activePages.length} {activePages.length === 1 ? 'Page' : 'Pages'}
          </Tag>
        </div>
      }
      width={600}
      centered
      destroyOnClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              onClick={handleGeneratePdf}
              loading={generating}
              style={{ background: '#4f46e5', fontWeight: 600 }}
            >
              {generating ? 'Compiling PDF...' : 'Download PDF'}
            </Button>
          </Space>
        </div>
      }
    >
      <div style={{ padding: '8px 0' }}>
        {/* Output Filename */}
        <div style={{ marginBottom: 18 }}>
          <Text strong style={{ display: 'block', marginBottom: 6, color: '#1e293b' }}>
            Output PDF File Name
          </Text>
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            addonAfter=".pdf"
            placeholder="e.g. document_edited"
            disabled={generating}
          />
        </div>

        <Divider style={{ margin: '14px 0' }} />

        {/* Page Sizing / Paper Format */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
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

        <Divider style={{ margin: '14px 0' }} />

        {/* Image Quality / Compression */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
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

        {/* Generation Progress Bar */}
        {generating && (
          <div style={{ marginTop: 18, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text strong style={{ fontSize: 12, color: '#4f46e5' }}>
                Assembling and compressing pages...
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
