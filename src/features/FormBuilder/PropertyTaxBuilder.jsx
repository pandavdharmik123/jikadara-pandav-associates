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
import PropertyTaxForm from './components/PropertyTaxForm';
import PanPdfPreview from './components/PanPdfPreview';
import {
  PROPERTY_TAX_FORM_PAGES,
  PROPERTY_TAX_PAGE,
  PROPERTY_TAX_TEMPLATE_URL,
} from './constants/propertyTaxLayout';
import { createPropertyTaxData, validatePropertyTax } from './constants/propertyTaxData';
import { clearPanDraft, savePanDraft, PROPERTY_TAX_DRAFT_KEY } from './utils/panDraft';
import { downloadPropertyTaxPdf, printPropertyTaxPdf } from './utils/propertyTaxPdfExport';
import { buildPropertyTaxOverlays } from './utils/propertyTaxOverlay';

export default function PropertyTaxBuilder({ data, onChange, previewPages }) {
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [busy, setBusy] = useState(null);

  const errors = useMemo(() => validatePropertyTax(data), [data]);
  const pageLimit = previewPages || PROPERTY_TAX_FORM_PAGES;
  const issues = useMemo(() => Object.keys(errors).length, [errors]);

  const handleSaveDraft = () => {
    const savedAt = savePanDraft(data, PROPERTY_TAX_DRAFT_KEY);
    if (savedAt) message.success('Draft saved on this device.');
    else message.error('Could not save the draft – browser storage may be full or unavailable.');
  };

  const handleDownload = async () => {
    setShowAllErrors(true);
    setBusy('download');
    try {
      await downloadPropertyTaxPdf(data, { maxPages: pageLimit });
      message.success(`Completed PDF downloaded (${pageLimit} page${pageLimit === 1 ? '' : 's'}).`);
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
      const result = await printPropertyTaxPdf(data, { maxPages: pageLimit });
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
        onChange(createPropertyTaxData());
        setShowAllErrors(false);
        message.success('Form cleared.');
      },
    });
  };

  const handleReset = () => {
    Modal.confirm({
      title: 'Reset to the blank template?',
      content: 'Every entered value will be removed, and the saved draft on this device will be deleted.',
      okText: 'Reset',
      okButtonProps: { danger: true },
      onOk: () => {
        clearPanDraft(PROPERTY_TAX_DRAFT_KEY);
        onChange(createPropertyTaxData());
        setShowAllErrors(false);
        message.success('Reset to the blank property tax template.');
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
            <span className="fbs-toolbar-title">Property Tax – Name Transfer</span>
            <span className="fbs-toolbar-subtitle">S.M.C. Form No. 81 · original layout preserved</span>
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
          <PropertyTaxForm
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
            templateUrl={PROPERTY_TAX_TEMPLATE_URL}
            buildOverlays={buildPropertyTaxOverlays}
            pageSize={PROPERTY_TAX_PAGE}
            templateLabel="Property Tax"
          />
        </div>
      </div>
    </div>
  );
}
