import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Space, Spin, Switch, Tag, Tooltip, Typography } from 'antd';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Highlighter,
  RefreshCw,
  Printer,
  FileText,
} from 'lucide-react';
import { renderAsync } from 'docx-preview';
import { collectHighlightTokens } from '../surfacyValidation';

const { Text } = Typography;

export default function SurfacyPreviewPane({
  docxBuffer,
  loading,
  formData,
  onRefresh,
}) {
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [zoom, setZoom] = useState(0.72);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [highlightDynamic, setHighlightDynamic] = useState(true);
  const [renderError, setRenderError] = useState('');

  const applyHighlights = useCallback((rootEl, tokens, enabled) => {
    if (!rootEl) return;
    // Remove previous highlights
    rootEl.querySelectorAll('mark.surfacy-dyn-mark').forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
        parent.normalize();
      }
    });

    if (!enabled || !tokens || tokens.length === 0) return;

    const escaped = tokens
      .slice(0, 30)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (escaped.length === 0) return;
    const regex = new RegExp(`(${escaped.join('|')})`, 'g');

    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.trim() && regex.test(node.nodeValue)) {
        textNodes.push(node);
      }
      regex.lastIndex = 0;
    }

    textNodes.forEach((txtNode) => {
      const val = txtNode.nodeValue;
      regex.lastIndex = 0;
      const parts = val.split(regex);
      if (parts.length <= 1) return;
      const frag = document.createDocumentFragment();
      parts.forEach((part, idx) => {
        if (!part) return;
        if (idx % 2 === 1) {
          const mark = document.createElement('mark');
          mark.className = 'surfacy-dyn-mark';
          mark.textContent = part;
          frag.appendChild(mark);
        } else {
          frag.appendChild(document.createTextNode(part));
        }
      });
      txtNode.parentNode?.replaceChild(frag, txtNode);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function renderDocx() {
      if (!docxBuffer || !containerRef.current) return;
      setRenderError('');
      try {
        containerRef.current.innerHTML = '';
        await renderAsync(docxBuffer, containerRef.current, null, {
          className: 'surfacy-docx',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: true,
          trimXmlDeclaration: true,
        });
        if (cancelled) return;
        const sections = containerRef.current.querySelectorAll('section.surfacy-docx');
        const count = sections.length || 1;
        setTotalPages(count);
        setCurrentPage((prev) => Math.min(prev, count));

        const tokens = collectHighlightTokens(formData);
        applyHighlights(containerRef.current, tokens, highlightDynamic);
      } catch (err) {
        if (!cancelled) {
          console.error('docx-preview render error:', err);
          setRenderError('Failed to render live DOCX preview.');
        }
      }
    }
    renderDocx();
    return () => {
      cancelled = true;
    };
  }, [docxBuffer, applyHighlights, highlightDynamic, formData]);

  const scrollToPage = (pageNum) => {
    if (!containerRef.current || !scrollContainerRef.current) return;
    const sections = containerRef.current.querySelectorAll('section.surfacy-docx');
    const clamped = Math.max(1, Math.min(pageNum, sections.length || 1));
    setCurrentPage(clamped);
    const target = sections[clamped - 1];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScroll = () => {
    if (!containerRef.current || !scrollContainerRef.current) return;
    const sections = containerRef.current.querySelectorAll('section.surfacy-docx');
    if (!sections.length) return;
    const containerTop = scrollContainerRef.current.getBoundingClientRect().top;
    let closest = 1;
    let minDiff = Infinity;
    sections.forEach((sec, idx) => {
      const diff = Math.abs(sec.getBoundingClientRect().top - containerTop - 24);
      if (diff < minDiff) {
        minDiff = diff;
        closest = idx + 1;
      }
    });
    setCurrentPage(closest);
  };

  const handlePrintPreview = () => {
    if (!containerRef.current) return;
    const printWin = window.open('', '_blank', 'width=960,height=800');
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SARFAESI Case Filing - Print / Save PDF</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; background: #fff; }
            .surfacy-docx-wrapper { background: #fff !important; padding: 0 !important; }
            section.surfacy-docx { box-shadow: none !important; margin: 0 auto !important; page-break-after: always; }
            mark.surfacy-dyn-mark { background: transparent !important; color: inherit !important; }
          </style>
        </head>
        <body>${containerRef.current.innerHTML}</body>
      </html>
    `);
    printWin.document.close();
    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 350);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#f1f5f9',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      {/* Preview Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          padding: '10px 14px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Space size={8} align="center">
          <FileText size={16} color="#4f46e5" />
          <Text strong style={{ fontSize: 13.5, color: '#0f172a' }}>
            Live Document Preview
          </Text>
          <Tag color="geekblue" style={{ margin: 0, fontWeight: 600 }}>
            Page {currentPage} of {totalPages}
          </Tag>
        </Space>

        <Space size={6} wrap>
          <Tooltip title="Previous Page">
            <Button
              size="small"
              icon={<ChevronLeft size={14} />}
              disabled={currentPage <= 1}
              onClick={() => scrollToPage(currentPage - 1)}
            />
          </Tooltip>
          <Tooltip title="Next Page">
            <Button
              size="small"
              icon={<ChevronRight size={14} />}
              disabled={currentPage >= totalPages}
              onClick={() => scrollToPage(currentPage + 1)}
            />
          </Tooltip>

          <Tooltip title="Zoom Out">
            <Button
              size="small"
              icon={<ZoomOut size={14} />}
              disabled={zoom <= 0.5}
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
            />
          </Tooltip>
          <Text style={{ fontSize: 12, fontWeight: 600, minWidth: 42, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Text>
          <Tooltip title="Zoom In">
            <Button
              size="small"
              icon={<ZoomIn size={14} />}
              disabled={zoom >= 1.5}
              onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
            />
          </Tooltip>
          <Tooltip title="Reset Zoom">
            <Button size="small" icon={<RotateCcw size={13} />} onClick={() => setZoom(0.72)} />
          </Tooltip>

          <Tooltip title="Highlight dynamic fields inside document">
            <Space size={4} style={{ marginLeft: 4 }}>
              <Highlighter size={14} color={highlightDynamic ? '#d97706' : '#94a3b8'} />
              <Switch
                size="small"
                checked={highlightDynamic}
                onChange={setHighlightDynamic}
              />
            </Space>
          </Tooltip>

          <Tooltip title="Refresh Live Preview">
            <Button
              size="small"
              icon={<RefreshCw size={13} />}
              loading={loading}
              onClick={onRefresh}
            />
          </Tooltip>

          <Tooltip title="Print / Save as PDF from Browser Preview">
            <Button
              size="small"
              icon={<Printer size={13} />}
              onClick={handlePrintPreview}
            >
              Print
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* Document Viewport */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          position: 'relative',
          minHeight: 540,
        }}
      >
        {loading && (
          <div
            style={{
              position: 'sticky',
              top: 8,
              zIndex: 10,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Tag color="processing" style={{ padding: '4px 12px', borderRadius: 20 }}>
              <Spin size="small" style={{ marginRight: 6 }} /> Updating DOCX preview...
            </Tag>
          </div>
        )}

        {renderError ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#dc2626' }}>
            {renderError}
          </div>
        ) : (
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              width: 'fit-content',
              margin: '0 auto',
            }}
          >
            <div ref={containerRef} className="surfacy-preview-host" />
          </div>
        )}
      </div>

      <style>{`
        .surfacy-preview-host .surfacy-docx-wrapper {
          background: transparent !important;
          padding: 0 !important;
        }
        .surfacy-preview-host section.surfacy-docx {
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.14) !important;
          margin-bottom: 20px !important;
          background: #ffffff !important;
        }
        mark.surfacy-dyn-mark {
          background-color: #fef08a;
          color: #0f172a;
          padding: 0 2px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
