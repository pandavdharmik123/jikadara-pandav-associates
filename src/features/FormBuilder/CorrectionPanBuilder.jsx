import { useMemo, useState } from 'react';
import { Button, Dropdown, Modal, Space, Tooltip, message } from 'antd';
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Download,
  MoreVertical,
  PanelLeft,
  PanelLeftClose,
  Printer,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import CorrectionPanForm from './components/CorrectionPanForm';
import PanPdfPreview from './components/PanPdfPreview';
import {
  CORRECTION_FORM_PAGES,
  CORRECTION_PAGE,
  CORRECTION_SIGNATURE_BOXES,
} from './constants/correctionPanLayout';
import { createCorrectionPanData, validateCorrectionPan } from './constants/correctionPanData';
import { clearPanDraft, savePanDraft, CORRECTION_DRAFT_KEY } from './utils/panDraft';
import { DEFAULT_SIGNATURE_ASPECT, createSignaturePlacements } from './utils/panImages';
import {
  CORRECTION_TEMPLATE_URL,
  downloadCorrectionPdf,
  printCorrectionPdf,
} from './utils/correctionPanPdfExport';
import { buildCorrectionPanOverlays } from './utils/correctionPanOverlay';

export default function CorrectionPanBuilder({ data, onChange, previewPages }) {
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [busy, setBusy] = useState(null);

  const errors = useMemo(() => validateCorrectionPan(data), [data]);
  const pageLimit = previewPages || CORRECTION_FORM_PAGES;
  const attachedDocuments = useMemo(
    () => (data.documents || []).filter((doc) => doc && doc.src),
    [data.documents]
  );

  /** Commit a signature position / size that was dragged on the preview. */
  const handleSignaturePlacement = (page, placement) => {
    const aspect = data.signatureAspect || DEFAULT_SIGNATURE_ASPECT;
    const current =
      data.signaturePlacements || createSignaturePlacements(aspect, CORRECTION_SIGNATURE_BOXES);
    onChange({
      ...data,
      signaturePlacements: {
        ...current,
        [page === 1 ? 'page1' : 'page2']: placement,
      },
    });
  };

  /** Commit a document position / size that was dragged on the preview. */
  const handleDocumentPlacement = (docId, placement) => {
    onChange({
      ...data,
      documents: (data.documents || []).map((doc) =>
        doc.id === docId ? { ...doc, placement } : doc
      ),
    });
  };

  const issues = useMemo(() => Object.keys(errors).length, [errors]);

  const handleSaveDraft = () => {
    const savedAt = savePanDraft(data, CORRECTION_DRAFT_KEY);
    if (savedAt) message.success('Draft saved on this device.');
    else message.error('Could not save the draft – browser storage may be full or unavailable.');
  };

  const handleDownload = async () => {
    setShowAllErrors(true);
    setBusy('download');
    try {
      const pages = pageLimit + attachedDocuments.length;
      await downloadCorrectionPdf(data, { maxPages: pageLimit });
      message.success(`Completed PDF downloaded (${pages} page${pages === 1 ? '' : 's'}).`);
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
      const result = await printCorrectionPdf(data, { maxPages: pageLimit });
      if (result === 'downloaded') {
        message.warning('Pop-ups are blocked, so the PDF was downloaded instead. Open it and print.');
      } else {
        message.success('The completed PDF was opened – use the print dialog to finish.');
      }
    } catch (error) {
      message.error(error?.message || 'Could not open the PDF for printing.');
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
        onChange(createCorrectionPanData());
        setShowAllErrors(false);
        message.success('Form cleared.');
      },
    });
  };

  const handleReset = () => {
    Modal.confirm({
      title: 'Reset to the blank template?',
      content: 'Every value and uploaded image will be removed, and the saved draft on this device will be deleted.',
      okText: 'Reset',
      okButtonProps: { danger: true },
      onOk: () => {
        clearPanDraft(CORRECTION_DRAFT_KEY);
        onChange(createCorrectionPanData());
        setShowAllErrors(false);
        message.success('Reset to the blank correction template.');
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

  return (
    <div className="fbs-builder">
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
            <span className="fbs-toolbar-title">PAN Card – Correction</span>
            <span className="fbs-toolbar-subtitle">Correction request · original layout preserved</span>
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
          <CorrectionPanForm
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
          <PanPdfPreview
            data={data}
            previewPages={pageLimit}
            templateUrl={CORRECTION_TEMPLATE_URL}
            buildOverlays={buildCorrectionPanOverlays}
            pageSize={CORRECTION_PAGE}
            templateLabel="PAN correction"
            onSignaturePlacementChange={handleSignaturePlacement}
            onDocumentPlacementChange={handleDocumentPlacement}
          />
        </div>
      </div>
    </div>
  );
}
