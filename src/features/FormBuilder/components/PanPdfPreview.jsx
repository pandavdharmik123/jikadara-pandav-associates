import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Spin, Tooltip } from 'antd';
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PAN_PAGE } from '../constants/panLayout';
import { PAN_TEMPLATE_URL } from '../utils/panPdfExport';
import { buildPanOverlays } from '../utils/panOverlay';
import { DEFAULT_SIGNATURE_ASPECT, clampDocumentPlacement, clampPlacement } from '../utils/panImages';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Rendered page images are cached so switching form tabs is instant. Only the
 * pages that can actually be filled (`previewPages`) are rendered – the export
 * still contains the complete template.
 */
const pageCache = new Map();

function renderTemplatePages(url, maxPages = Infinity) {
  const key = `${url}|${maxPages}`;
  const cached = pageCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const task = pdfjsLib.getDocument({ url });
    const pdf = await task.promise;
    const total = Math.min(pdf.numPages, Math.max(1, maxPages));
    const pages = [];
    for (let i = 1; i <= total; i += 1) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport, canvas }).promise;
      pages.push({ src: canvas.toDataURL('image/png'), width: viewport.width / 2, height: viewport.height / 2 });
    }
    return pages;
  })().catch((error) => {
    pageCache.delete(key);
    throw error;
  });

  pageCache.set(key, promise);
  return promise;
}

function Tick({ op }) {
  return (
    <svg
      className="fbs-op fbs-op-tick"
      style={{ left: op.x, top: op.y, width: op.w, height: op.h }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points="20,54 44,78 84,22"
        fill="none"
        stroke="#111827"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Overlay({ ops, aspect, dragPreview, onImagePointerDown }) {
  return (
    <div className="fbs-overlay" aria-hidden="true">
      {ops.map((op, index) => {
        const key = `${op.type}-${index}`;
        if (op.type === 'char') {
          return (
            <span
              key={key}
              className="fbs-op fbs-op-char"
              style={{ left: op.x, top: op.y, width: op.w, height: op.h, fontSize: op.size }}
            >
              {op.ch}
            </span>
          );
        }
        if (op.type === 'text') {
          return (
            <span
              key={key}
              className="fbs-op fbs-op-text"
              style={{
                left: op.x,
                top: op.y,
                width: op.w,
                height: op.h,
                fontSize: op.size,
                lineHeight: `${op.h}px`,
                textAlign: op.align || 'left',
                fontFamily: op.fontFamily,
              }}
            >
              {op.text}
            </span>
          );
        }
        if (op.type === 'block') {
          return (
            <div
              key={key}
              className="fbs-op fbs-op-block"
              style={{
                left: op.x,
                top: op.y,
                width: op.w,
                height: op.h,
                fontSize: op.size,
                lineHeight: `${op.lineHeight}px`,
                textAlign: op.align || 'center',
                fontFamily: op.fontFamily,
              }}
            >
              {(op.lines || []).join('\n')}
            </div>
          );
        }
        if (op.type === 'rect') {
          return (
            <div
              key={key}
              className="fbs-op fbs-op-rect"
              style={{
                left: op.x,
                top: op.y,
                width: op.w,
                height: op.h,
                background: op.fill || '#ffffff',
              }}
            />
          );
        }
        if (op.type === 'tick') return <Tick key={key} op={op} />;
        if (op.type === 'image') {
          if (op.kind !== 'signature' && op.kind !== 'document') {
            return (
              <img
                key={key}
                className="fbs-op fbs-op-image"
                src={op.src}
                alt=""
                draggable={false}
                style={{ left: op.x, top: op.y, width: op.w, height: op.h }}
              />
            );
          }
          const dragKey = op.kind === 'signature' ? `signature-${op.page}` : `document-${op.docId}`;
          const dragging = dragPreview && dragPreview.key === dragKey;
          const x = dragging ? dragPreview.placement.x : op.x;
          const y = dragging ? dragPreview.placement.y : op.y;
          const w = dragging ? dragPreview.placement.w : op.w;
          const h = dragging
            ? op.kind === 'signature'
              ? dragPreview.placement.w / aspect
              : dragPreview.placement.h
            : op.h;
          return (
            <div
              key={key}
              className={`fbs-op fbs-editable-image fbs-${op.kind}${dragging ? ' is-dragging' : ''}`}
              style={{ left: x, top: y, width: w, height: h }}
              title="Drag to move · drag the corner handle to resize"
              onPointerDown={(event) => onImagePointerDown(event, { ...op, x, y, w, h }, 'move')}
            >
              <img src={op.src} alt="" draggable={false} />
              <span
                className="fbs-resize-handle"
                onPointerDown={(event) => onImagePointerDown(event, { ...op, x, y, w, h }, 'resize')}
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export default function PanPdfPreview({
  data,
  onSignaturePlacementChange,
  onDocumentPlacementChange,
  previewPages = Infinity,
  templateUrl = PAN_TEMPLATE_URL,
  buildOverlays = buildPanOverlays,
  pageSize = PAN_PAGE,
  templateLabel = 'PAN',
}) {
  const [pages, setPages] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const viewportRef = useRef(null);
  const pageRefs = useRef([]);
  const autoFitRef = useRef(true);
  const [dragPreview, setDragPreview] = useState(null);

  const ops = useMemo(() => buildOverlays(data), [data, buildOverlays]);
  const signatureAspect = data.signatureAspect || DEFAULT_SIGNATURE_ASPECT;
  const documents = useMemo(
    () => (Array.isArray(data?.documents) ? data.documents : []).filter((doc) => doc && doc.src),
    [data?.documents]
  );
  // Template pages followed by one page per attached document.
  const renderedPages = useMemo(
    () => [
      ...pages.map((page) => ({ type: 'template', src: page.src })),
      ...documents.map((doc) => ({ type: 'document', id: doc.id })),
    ],
    [pages, documents]
  );

  useEffect(() => {
    let cancelled = false;
    renderTemplatePages(templateUrl, previewPages)
      .then((result) => {
        if (cancelled) return;
        setPages(result);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || `Unable to render the ${templateLabel} template.`);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, previewPages, templateUrl, templateLabel]);

  const retry = () => {
    setStatus('loading');
    setError(null);
    setReloadKey((value) => value + 1);
  };

  const fitToWidth = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const available = viewport.clientWidth - 48;
    if (available <= 0) return;
    setZoom(Math.min(1.6, Math.max(0.3, Math.round((available / pageSize.width) * 100) / 100)));
    autoFitRef.current = true;
  };

  // Fit once the pages are ready (the pane has its final width by then).
  useEffect(() => {
    if (status !== 'ready') return;
    const frame = requestAnimationFrame(fitToWidth);
    return () => cancelAnimationFrame(frame);
  }, [status]);

  // Re-fit when the preview pane changes width (window resize, sidebar toggle,
  // or when a hidden form tab becomes visible again).
  useEffect(() => {
    if (status !== 'ready') return undefined;
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    let lastWidth = viewport.clientWidth;
    const observer = new ResizeObserver((entries) => {
      const width = Math.round(entries[0].contentRect.width);
      if (width > 0 && Math.abs(width - lastWidth) > 4) {
        lastWidth = width;
        if (autoFitRef.current) fitToWidth();
      }
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [status]);

  const zoomBy = (delta) => {
    autoFitRef.current = false;
    setZoom((value) => Math.min(2, Math.max(0.3, Math.round((value + delta) * 100) / 100)));
  };

  const goToPage = (index) => {
    const target = pageRefs.current[index];
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPageIndex(index);
  };

  /**
   * Move / resize an uploaded image directly on the preview. The pointer delta
   * is converted from CSS pixels to PDF points with the current zoom, clamped
   * to the page, and committed to the form data when the pointer is released.
   *
   * Signatures keep their aspect ratio (only the width is stored). Documents
   * can be resized in both directions, exactly as printed.
   */
  const beginImageDrag = (event, op, mode) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const isSignature = op.kind === 'signature';
    const base = { x: op.x, y: op.y, w: op.w, h: op.h };
    const dragKey = isSignature ? `signature-${op.page}` : `document-${op.docId}`;
    const startX = event.clientX;
    const startY = event.clientY;
    const scale = zoom || 1;
    let latest = null;

    const handleMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      let next;
      if (mode === 'move') {
        next = { x: base.x + dx, y: base.y + dy, w: base.w, h: base.h };
      } else if (isSignature) {
        next = { x: base.x, y: base.y, w: base.w + dx, h: base.h };
      } else {
        next = { x: base.x, y: base.y, w: base.w + dx, h: base.h + dy };
      }
      latest = isSignature ? clampPlacement(next, signatureAspect) : clampDocumentPlacement(next);
      setDragPreview({ key: dragKey, placement: latest });
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      setDragPreview(null);
      if (!latest) return;
      if (isSignature) onSignaturePlacementChange?.(op.page, latest);
      else onDocumentPlacementChange?.(op.docId, latest);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    setDragPreview({ key: dragKey, placement: base });
  };

  // Keep the page indicator in sync while scrolling through the document.
  const handleScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const top = viewport.getBoundingClientRect().top + 24;
    let current = 0;
    pageRefs.current.forEach((node, index) => {
      if (node && node.getBoundingClientRect().top <= top) current = index;
    });
    setPageIndex(current);
  };

  return (
    <div className="fbs-preview-pane">
      <div className="fbs-dock">
        <div className="fbs-dock-group">
          <Tooltip title="Previous page">
            <button
              type="button"
              className="fbs-dock-btn"
              onClick={() => goToPage(Math.max(0, pageIndex - 1))}
              disabled={pageIndex <= 0}
            >
              <ChevronLeft size={14} />
            </button>
          </Tooltip>
          <span className="fbs-dock-label">
            Page {status === 'ready' ? pageIndex + 1 : '–'} / {status === 'ready' ? renderedPages.length : '–'}
          </span>
          <Tooltip title="Next page">
            <button
              type="button"
              className="fbs-dock-btn"
              onClick={() => goToPage(Math.min(renderedPages.length - 1, pageIndex + 1))}
              disabled={pageIndex >= renderedPages.length - 1}
            >
              <ChevronRight size={14} />
            </button>
          </Tooltip>
        </div>

        <div className="fbs-dock-divider" />

        <div className="fbs-dock-group">
          <Tooltip title="Zoom out">
            <button type="button" className="fbs-dock-btn" onClick={() => zoomBy(-0.1)} disabled={zoom <= 0.3}>
              <ZoomOut size={14} />
            </button>
          </Tooltip>
          <button type="button" className="fbs-dock-zoom" onClick={fitToWidth} title="Fit to width">
            {Math.round(zoom * 100)}%
          </button>
          <Tooltip title="Zoom in">
            <button type="button" className="fbs-dock-btn" onClick={() => zoomBy(0.1)} disabled={zoom >= 2}>
              <ZoomIn size={14} />
            </button>
          </Tooltip>
          <Tooltip title="Fit to page width">
            <button type="button" className="fbs-dock-btn" onClick={fitToWidth}>
              <Maximize2 size={13} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="fbs-viewport" ref={viewportRef} onScroll={handleScroll}>
        {status === 'loading' && (
          <div className="fbs-preview-state">
            <Spin />
            <span>Loading the {templateLabel} template…</span>
          </div>
        )}

        {status === 'error' && (
          <div className="fbs-preview-state">
            <Alert
              type="error"
              showIcon
              message="Could not render the PDF template"
              description={error}
              action={
                <Button size="small" onClick={retry}>
                  Retry
                </Button>
              }
            />
          </div>
        )}

        {status === 'ready' && (
          <div className="fbs-pages">
            {renderedPages.map((page, index) => (
              <div
                key={page.type === 'template' ? `template-${index}` : page.id}
                className="fbs-page-slot"
                ref={(node) => {
                  pageRefs.current[index] = node;
                }}
              >
                <div
                  className="fbs-page-scale"
                  style={{ width: pageSize.width * zoom, height: pageSize.height * zoom }}
                >
                  <div
                    className="fbs-page"
                    style={{
                      width: pageSize.width,
                      height: pageSize.height,
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    {page.type === 'template' ? (
                      <img
                        className="fbs-page-image"
                        src={page.src}
                        alt={`${templateLabel} form page ${index + 1}`}
                        draggable={false}
                      />
                    ) : (
                      <div className="fbs-page-blank" aria-hidden="true" />
                    )}
                    <Overlay
                      ops={ops.filter((op) => op.page === index + 1)}
                      aspect={signatureAspect}
                      dragPreview={dragPreview}
                      onImagePointerDown={beginImageDrag}
                    />
                  </div>
                </div>
                <div className="fbs-page-caption">
                  {index < pages.length ? `Page ${index + 1} of ${renderedPages.length}` : `Attachment ${index - pages.length + 1} of ${renderedPages.length}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
