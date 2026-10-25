import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, Modal, Space, Tooltip, message } from 'antd';
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Download,
  Maximize2,
  MoreVertical,
  PanelLeft,
  PanelLeftClose,
  Printer,
  RotateCcw,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import MarriageForm from './components/MarriageForm';
import MarriagePrintDocument from './components/MarriagePrintDocument';
import { createMarriageData, validateMarriage } from './constants/marriageData';
import { clearPanDraft, savePanDraft, MARRIAGE_DRAFT_KEY } from './utils/panDraft';
import './styles/marriageBuilder.scss';

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PAGE_GAP = 24;
const PAGE_COUNT = 3;
const PDF_WIDTH = 595.28;
const PDF_HEIGHT = 841.89;

const PNG_OPTIONS = {
  backgroundColor: '#ffffff',
  pixelRatio: 4,
  cacheBust: true,
  skipFonts: false,
  style: {
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textRendering: 'geometricPrecision',
    transform: 'none',
  },
  filter: (node) => {
    if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
      const href = node.href || '';
      if (href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com')) {
        return false;
      }
    }
    return true;
  },
};

export default function MarriageBuilder({ data, onChange }) {
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [busy, setBusy] = useState(null);
  const [zoom, setZoom] = useState(0.6);

  const viewportRef = useRef(null);
  const exportRef1 = useRef(null);
  const exportRef2 = useRef(null);
  const exportRef3 = useRef(null);

  const errors = useMemo(() => validateMarriage(data), [data]);
  const issues = useMemo(() => Object.keys(errors).length, [errors]);

  const fitToScreen = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const available = viewport.clientWidth - 52;
    if (available <= 0) return;
    setZoom(Math.min(1.2, Math.max(0.25, Math.round((available / PAGE_WIDTH) * 100) / 100)));
  };

  useEffect(() => {
    const id = window.setTimeout(fitToScreen, 60);
    const viewport = viewportRef.current;
    let observer;
    if (viewport && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => fitToScreen());
      observer.observe(viewport);
    }
    return () => {
      window.clearTimeout(id);
      observer?.disconnect();
    };
  }, []);

  const handleSaveDraft = () => {
    const savedAt = savePanDraft(data, MARRIAGE_DRAFT_KEY);
    if (savedAt) message.success('Draft saved on this device.');
    else message.error('Could not save the draft – browser storage may be full or unavailable.');
  };

  const handleDownload = async () => {
    setShowAllErrors(true);
    setBusy('download');
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((resolve) => window.setTimeout(resolve, 160));

      const elements = [exportRef1, exportRef2, exportRef3].map((ref) => {
        const wrapper = ref.current;
        if (!wrapper) return null;
        return wrapper.querySelector('.mp-page') || wrapper;
      });
      if (elements.some((element) => !element)) {
        throw new Error('The print pages are not ready yet. Please try again.');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
        compress: true,
      });

      for (let index = 0; index < PAGE_COUNT; index += 1) {
        const png = await toPng(elements[index], {
          ...PNG_OPTIONS,
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
        });
        if (index > 0) pdf.addPage('a4', 'portrait');
        pdf.addImage(png, 'PNG', 0, 0, PDF_WIDTH, PDF_HEIGHT, undefined, 'FAST');
      }

      pdf.save('Marriage-Registration.pdf');
      message.success('PDF downloaded (3 pages).');
    } catch (error) {
      message.error(error?.message || 'Could not generate the PDF.');
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = async () => {
    setShowAllErrors(true);
    setBusy('print');
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      window.print();
    } catch (error) {
      message.error(error?.message || 'Could not open the print dialog.');
    } finally {
      setBusy(null);
    }
  };

  const handleClear = () => {
    Modal.confirm({
      title: 'Clear the form?',
      content: 'All entered values will be removed. The saved draft on this device is not changed.',
      okText: 'Clear form',
      okButtonProps: { danger: true },
      onOk: () => {
        onChange(createMarriageData());
        setShowAllErrors(false);
        message.success('Form cleared.');
      },
    });
  };

  const handleReset = () => {
    Modal.confirm({
      title: 'Reset to the blank template?',
      content: 'Every value will be removed, and the saved draft on this device will be deleted.',
      okText: 'Reset',
      okButtonProps: { danger: true },
      onOk: () => {
        clearPanDraft(MARRIAGE_DRAFT_KEY);
        onChange(createMarriageData());
        setShowAllErrors(false);
        message.success('Reset to the blank marriage-registration form.');
      },
    });
  };

  const moreItems = [
    {
      key: 'draft',
      icon: <Cloud size={14} />,
      label: 'Save draft on this device',
      onClick: handleSaveDraft,
    },
    { type: 'divider' },
    {
      key: 'clear',
      icon: <Trash2 size={14} />,
      label: 'Clear form',
      onClick: handleClear,
    },
    {
      key: 'reset',
      icon: <RotateCcw size={14} />,
      label: 'Reset to blank template',
      danger: true,
      onClick: handleReset,
    },
  ];

  const documentHeight = PAGE_HEIGHT * PAGE_COUNT + PAGE_GAP * (PAGE_COUNT - 1);

  return (
    <div className="fbs-builder marriage-builder">
      <div className="fbs-toolbar">
        <div className="fbs-toolbar-left">
          <Tooltip title={sidebarCollapsed ? 'Show input panel' : 'Hide input panel'}>
            <button
              type="button"
              className={`fbs-icon-btn${sidebarCollapsed ? ' is-active' : ''}`}
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              {sidebarCollapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </Tooltip>
          <div className="fbs-toolbar-titles">
            <span className="fbs-toolbar-title">Marriage Registration</span>
            <span className="fbs-toolbar-subtitle">
              Live A4 document · values reflow in Nilkanth / Ghanshyam
            </span>
          </div>
          <button
            type="button"
            className={`fbs-status-chip${issues > 0 ? ' has-issues' : ' is-ready'}`}
            onClick={() => setShowAllErrors(true)}
            title={issues > 0 ? 'Show all pending fields' : 'All required details are filled'}
          >
            {issues > 0 ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
            {issues > 0 ? `${issues} field${issues === 1 ? '' : 's'} pending` : 'Ready'}
          </button>
        </div>

        <Space size={8} className="fbs-toolbar-actions">
          <Tooltip title="Save the current values on this device">
            <Button icon={<Cloud size={14} />} onClick={handleSaveDraft}>
              Save draft
            </Button>
          </Tooltip>
          <Button
            icon={<Printer size={14} />}
            loading={busy === 'print'}
            disabled={busy === 'download'}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            type="primary"
            icon={<Download size={14} />}
            loading={busy === 'download'}
            disabled={busy === 'print'}
            onClick={handleDownload}
          >
            Download PDF
          </Button>
          <Dropdown menu={{ items: moreItems }} trigger={['click']} placement="bottomRight">
            <Button icon={<MoreVertical size={15} />} aria-label="More actions" />
          </Dropdown>
        </Space>
      </div>

      <div className="fbs-workspace">
        <div className={`fbs-editor-pane${sidebarCollapsed ? ' is-collapsed' : ''}`}>
          <MarriageForm
            data={data}
            onChange={onChange}
            errors={errors}
            showAllErrors={showAllErrors}
          />
        </div>

        <div className="fbs-preview-wrap">
          {sidebarCollapsed && (
            <button type="button" className="fbs-expand-btn" onClick={() => setSidebarCollapsed(false)}>
              <PanelLeft size={14} />
              Expand editor
            </button>
          )}

          <div className="marriage-preview-pane">
            <div className="marriage-preview-toolbar">
              <button
                type="button"
                className="marriage-zoom-btn"
                onClick={() => setZoom((value) => Math.max(0.25, Math.round((value - 0.1) * 100) / 100))}
                aria-label="Zoom out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="marriage-zoom-value">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="marriage-zoom-btn"
                onClick={() => setZoom((value) => Math.min(1.5, Math.round((value + 0.1) * 100) / 100))}
                aria-label="Zoom in"
              >
                <ZoomIn size={14} />
              </button>
              <button type="button" className="marriage-zoom-btn" onClick={fitToScreen}>
                <Maximize2 size={13} />
                Fit
              </button>
            </div>

            <div className="marriage-preview-viewport" ref={viewportRef}>
              <div className="marriage-preview-track">
                <div
                  className="marriage-preview-zoom-outer"
                  style={{
                    width: PAGE_WIDTH * zoom,
                    height: documentHeight * zoom,
                  }}
                >
                  <div
                    className="marriage-preview-sheet"
                    style={{ transform: `scale(${zoom})` }}
                  >
                    <MarriagePrintDocument data={data} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Off-screen full-size pages used by the PDF exporter. */}
      <div className="marriage-export-container" aria-hidden="true">
        <div ref={exportRef1}>
          <MarriagePrintDocument data={data} pages={1} />
        </div>
        <div ref={exportRef2}>
          <MarriagePrintDocument data={data} pages={2} />
        </div>
        <div ref={exportRef3}>
          <MarriagePrintDocument data={data} pages={3} />
        </div>
      </div>

      {/* Visible only in @media print. */}
      <div className="marriage-print-container">
        <MarriagePrintDocument data={data} />
      </div>
    </div>
  );
}
