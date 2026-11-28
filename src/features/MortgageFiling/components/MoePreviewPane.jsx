import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Space, Switch, Tag, Tooltip, Typography } from 'antd';
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
import { Sk, SkText } from '../../../components/skeletons';
import { collectMoeHighlightTokens } from '../utils/moeHelpers';

const { Text } = Typography;

export default function MoePreviewPane({ docxBuffer, loading, formData, onRefresh }) {
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [zoom, setZoom] = useState(0.68);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [highlightDynamic, setHighlightDynamic] = useState(true);
  const [renderError, setRenderError] = useState('');

  const applyHighlights = useCallback((rootEl, tokens, enabled) => {
    if (!rootEl) return;
    rootEl.querySelectorAll('mark.moe-dyn-mark').forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
        parent.normalize();
      }
    });

    if (!enabled || !tokens || tokens.length === 0) return;

    const escaped = tokens.slice(0, 30).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
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
          mark.className = 'moe-dyn-mark';
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
          className: 'moe-docx',
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
        const sections = containerRef.current.querySelectorAll('section.moe-docx');
        const count = sections.length || 1;
        setTotalPages(count);
        setCurrentPage((prev) => Math.min(prev, count));

        const tokens = collectMoeHighlightTokens(formData);
        applyHighlights(containerRef.current, tokens, highlightDynamic);
      } catch (err) {
        if (!cancelled) {
          console.error('MOE docx-preview error:', err);
          setRenderError('Failed to render live MOE preview.');
        }
      }
    }
    renderDocx();
    return () => {
      cancelled = true;
    };
  }, [docxBuffer, applyHighlights, highlightDynamic, formData]);

  const scrollToPage = (pageNum) => {
    if (!containerRef.current) return;
    const sections = containerRef.current.querySelectorAll('section.moe-docx');
    const clamped = Math.max(1, Math.min(pageNum, sections.length || 1));
    setCurrentPage(clamped);
    sections[clamped - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleScroll = () => {
    if (!containerRef.current || !scrollContainerRef.current) return;
    const sections = containerRef.current.querySelectorAll('section.moe-docx');
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
          <title>Mortgage Filing (MOE) - Print / Save PDF</title>
          <style>
            @page { size: legal portrait; margin: 0; }
            body { margin: 0; background: #fff; }
            .moe-docx-wrapper { background: #fff !important; padding: 0 !important; }
            section.moe-docx { box-shadow: none !important; margin: 0 auto !important; page-break-after: always; }
            mark.moe-dyn-mark { background: transparent !important; color: inherit !important; }
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
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
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
            Live MOE Preview
          </Text>
          <Tag color="geekblue" style={{ margin: 0, fontWeight: 600 }}>
            Page {currentPage} of {totalPages}
          </Tag>
        </Space>

        <Space size={6} wrap>
          <Tooltip title="Previous Page">
            <Button size="small" icon={<ChevronLeft size={14} />} disabled={currentPage <= 1} onClick={() => scrollToPage(currentPage - 1)} />
          </Tooltip>
          <Tooltip title="Next Page">
            <Button size="small" icon={<ChevronRight size={14} />} disabled={currentPage >= totalPages} onClick={() => scrollToPage(currentPage + 1)} />
          </Tooltip>
          <Tooltip title="Zoom Out">
            <Button size="small" icon={<ZoomOut size={14} />} disabled={zoom <= 0.45} onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.1).toFixed(2))))} />
          </Tooltip>
          <Text style={{ fontSize: 12, fontWeight: 600, minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Text>
          <Tooltip title="Zoom In">
            <Button size="small" icon={<ZoomIn size={14} />} disabled={zoom >= 1.5} onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))} />
          </Tooltip>
          <Tooltip title="Reset Zoom">
            <Button size="small" icon={<RotateCcw size={13} />} onClick={() => setZoom(0.68)} />
          </Tooltip>
          <Tooltip title="Highlight dynamic values">
            <Space size={4} style={{ marginLeft: 4 }}>
              <Highlighter size={14} color={highlightDynamic ? '#d97706' : '#94a3b8'} />
              <Switch size="small" checked={highlightDynamic} onChange={setHighlightDynamic} />
            </Space>
          </Tooltip>
          <Tooltip title="Refresh Preview">
            <Button size="small" icon={<RefreshCw size={13} />} loading={loading} onClick={onRefresh} />
          </Tooltip>
          <Button size="small" icon={<Printer size={13} />} onClick={handlePrintPreview}>
            Print
          </Button>
        </Space>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflow: 'auto', padding: 16, position: 'relative', minHeight: 460 }}
      >
        {loading && !docxBuffer && (
          <div
            style={{
              maxWidth: 620,
              margin: '8px auto',
              padding: '36px 42px',
              background: '#ffffff',
              borderRadius: 6,
              boxShadow: '0 6px 20px rgba(15, 23, 42, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <SkText lines={2} widths={['55%', '35%']} align="center" gap={10} />
            <SkText lines={5} widths={['100%', '96%', '92%', '100%', '74%']} gap={9} />
            <Sk w="100%" h={84} r={6} />
            <SkText lines={6} widths={['95%', '100%', '88%', '97%', '84%', '60%']} gap={9} />
          </div>
        )}

        {loading && docxBuffer && (
          <div style={{ position: 'sticky', top: 8, zIndex: 10, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.94)',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
              }}
            >
              <Sk w={12} circle />
              <Sk w={120} h={10} r={5} />
            </div>
          </div>
        )}

        {renderError ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#dc2626' }}>{renderError}</div>
        ) : (
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', width: 'fit-content', margin: '0 auto' }}>
            <div ref={containerRef} className="moe-preview-host" />
          </div>
        )}
      </div>

      <style>{`
        .moe-preview-host .moe-docx-wrapper {
          background: transparent !important;
          padding: 0 !important;
        }
        .moe-preview-host section.moe-docx {
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.14) !important;
          margin-bottom: 20px !important;
          background: #ffffff !important;
        }
        mark.moe-dyn-mark {
          background-color: #fef08a;
          color: #0f172a;
          padding: 0 2px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
