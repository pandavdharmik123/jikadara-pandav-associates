import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button, Drawer, Modal, Popconfirm, Spin, Tooltip, message } from 'antd';
import {
  Clock,
  FilePlus2,
  FileText,
  Files,
  FolderOpen,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import PanCardBuilder from './PanCardBuilder';
import CorrectionPanBuilder from './CorrectionPanBuilder';
import MarriageBuilder from './MarriageBuilder';
import PropertyTaxBuilder from './PropertyTaxBuilder';
import { PAN_FORM_PAGES } from './constants/panLayout';
import { createPanData } from './constants/panData';
import { CORRECTION_FORM_PAGES } from './constants/correctionPanLayout';
import { createCorrectionPanData } from './constants/correctionPanData';
import { createMarriageData, MARRIAGE_FORM_PAGES } from './constants/marriageData';
import { PROPERTY_TAX_FORM_PAGES } from './constants/propertyTaxLayout';
import { createPropertyTaxData } from './constants/propertyTaxData';
import {
  CORRECTION_DRAFT_KEY,
  MARRIAGE_DRAFT_KEY,
  PAN_DRAFT_KEY,
  PROPERTY_TAX_DRAFT_KEY,
  clearPanDraft,
  mergeFormDefaults,
  readPanDraft,
  savePanDraft,
} from './utils/panDraft';
import {
  FORM_KEY_BY_TAB,
  deriveFormTitle,
  toPersistedFormData,
} from './utils/formDataPayload';
import {
  createFormBuilderRecord,
  deleteFormBuilderRecord,
  getFormBuilderRecord,
  listFormBuilderRecords,
  updateFormBuilderRecord,
} from '../../services/formBuilder';
import './styles/formBuilder.scss';

const PAN_TAB_KEY = 'pan-new-application';
const CORRECTION_TAB_KEY = 'pan-correction';
const MARRIAGE_TAB_KEY = 'marriage-registration';
const PROPERTY_TAX_TAB_KEY = 'property-tax-name-transfer';
const DEFAULT_FORM_KEY = PAN_TAB_KEY;

const SAVED_FORM_STATUS_LABELS = {
  DRAFT: 'Draft',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const formatSavedAt = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Registry of the forms available in the builder. Adding a new form is only a
 * matter of appending an entry here (plus its own layout/overlay module).
 */
const FORM_TABS = [
  {
    key: PAN_TAB_KEY,
    label: 'PAN Card – New Application',
    badge: 'Form 93',
    draftKey: PAN_DRAFT_KEY,
    createData: createPanData,
    // Pages 3–5 of the template are the printed notes / filling guidelines.
    previewPages: PAN_FORM_PAGES,
    render: ({ data, onChange, previewPages, ...controls }) => (
      <PanCardBuilder
        data={data}
        onChange={onChange}
        previewPages={previewPages}
        {...controls}
      />
    ),
  },
  {
    key: CORRECTION_TAB_KEY,
    label: 'PAN Card – Correction',
    badge: 'Request',
    draftKey: CORRECTION_DRAFT_KEY,
    createData: createCorrectionPanData,
    // Pages 3–4 of the template are the printed guidelines.
    previewPages: CORRECTION_FORM_PAGES,
    render: ({ data, onChange, previewPages, ...controls }) => (
      <CorrectionPanBuilder
        data={data}
        onChange={onChange}
        previewPages={previewPages}
        {...controls}
      />
    ),
  },
  {
    key: MARRIAGE_TAB_KEY,
    label: 'Marriage Registration',
    badge: 'Gujarat',
    draftKey: MARRIAGE_DRAFT_KEY,
    createData: createMarriageData,
    previewPages: MARRIAGE_FORM_PAGES,
    render: ({ data, onChange, ...controls }) => (
      <MarriageBuilder data={data} onChange={onChange} {...controls} />
    ),
  },
  {
    key: PROPERTY_TAX_TAB_KEY,
    label: 'Property Tax – Name Transfer',
    badge: 'SMC 81',
    draftKey: PROPERTY_TAX_DRAFT_KEY,
    createData: createPropertyTaxData,
    previewPages: PROPERTY_TAX_FORM_PAGES,
    render: ({ data, onChange, previewPages, ...controls }) => (
      <PropertyTaxBuilder
        data={data}
        onChange={onChange}
        previewPages={previewPages}
        {...controls}
      />
    ),
  },
];

const confirmDiscardChanges = () =>
  new Promise((resolve) => {
    Modal.confirm({
      title: 'Discard unsaved changes?',
      content:
        'The current editor has changes that have not been saved to your account.',
      okText: 'Discard changes',
      okButtonProps: { danger: true },
      cancelText: 'Keep editing',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });

const confirmOverwrite = () =>
  new Promise((resolve) => {
    Modal.confirm({
      title: 'This form was updated somewhere else',
      content:
        'Another tab or device saved a newer version. Do you want to overwrite it with the values in this editor?',
      okText: 'Overwrite',
      okButtonProps: { danger: true },
      cancelText: 'Keep editing',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });

export default function FormBuilderPage() {
  const { formKey } = useParams();
  const activeTab = FORM_TABS.find((tab) => tab.key === formKey);

  const restoredDrafts = useMemo(
    () =>
      Object.fromEntries(
        FORM_TABS.map((tab) => [tab.key, readPanDraft(tab.draftKey, tab.createData)])
      ),
    []
  );

  const [formState, setFormState] = useState(() =>
    Object.fromEntries(
      FORM_TABS.map((tab) => [
        tab.key,
        restoredDrafts[tab.key]?.data || tab.createData(),
      ])
    )
  );

  const [records, setRecords] = useState(() =>
    Object.fromEntries(
      FORM_TABS.map((tab) => {
        const draft = restoredDrafts[tab.key];
        return [
          tab.key,
          {
            id: draft?.recordId || null,
            revision: draft?.revision || null,
            title: draft?.recordId ? deriveFormTitle(tab.key, draft.data) : '',
            // A local-only draft has never been saved to the account.
            dirty: Boolean(draft?.savedAt && !draft?.recordId),
          },
        ];
      })
    )
  );

  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFormKey, setDrawerFormKey] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [savedRecords, setSavedRecords] = useState([]);

  const notified = useRef(false);

  useEffect(() => {
    if (notified.current) return;
    const saved = Object.values(restoredDrafts).filter((draft) => draft?.savedAt);
    if (saved.length === 0) return;
    notified.current = true;
    const latest = saved
      .map((draft) => new Date(draft.savedAt))
      .sort((a, b) => b - a)[0];
    message.info(
      `Restored ${saved.length === 1 ? 'the draft' : 'the drafts'} saved on this device on ${latest.toLocaleString()}.`
    );
  }, [restoredDrafts]);

  useEffect(() => {
    const handler = (event) => {
      const hasUnsaved = Object.values(records).some((record) => record.dirty);
      if (!hasUnsaved) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [records]);

  // Accepts a plain value or an updater function (used by the async uploads,
  // where several images can finish at the same time).
  const updateForm = (key, value) => {
    setFormState((previous) => ({
      ...previous,
      [key]: typeof value === 'function' ? value(previous[key]) : value,
    }));

    setRecords((previous) => {
      if (previous[key]?.dirty) return previous;
      return {
        ...previous,
        [key]: { ...previous[key], dirty: true },
      };
    });
  };

  const resetActiveForm = () => {
    if (!activeTab) return;
    const key = activeTab.key;
    setFormState((previous) => ({ ...previous, [key]: activeTab.createData() }));
    setRecords((previous) => ({
      ...previous,
      [key]: { id: null, revision: null, title: '', dirty: false },
    }));
    clearPanDraft(activeTab.draftKey);
  };

  const saveActiveForm = async () => {
    if (!activeTab || saving) return;

    const key = activeTab.key;
    const current = records[key];
    const data = formState[key];
    const persisted = toPersistedFormData(data, key);
    const title = deriveFormTitle(key, data);

    const payload = {
      formKey: FORM_KEY_BY_TAB[key],
      title,
      clientName: title,
      status: 'COMPLETED',
      data: persisted,
    };

    setSaving(true);
    try {
      let record;
      let revision = current?.revision || null;

      // Older local drafts may have a record id but no revision. Fetch the
      // current revision first so the save can still update the same record.
      if (current?.id && !revision) {
        try {
          const existing = await getFormBuilderRecord(current.id);
          revision = existing.revision;
        } catch (error) {
          if (error?.response?.status !== 404) throw error;
        }
      }

      if (current?.id && revision) {
        try {
          record = await updateFormBuilderRecord(current.id, {
            ...payload,
            revision,
          });
        } catch (error) {
          if (error?.response?.status === 409) {
            const overwrite = await confirmOverwrite();
            if (!overwrite) return;
            record = await updateFormBuilderRecord(current.id, {
              ...payload,
              revision: error.response.data?.revision,
            });
          } else if (error?.response?.status === 404) {
            // The saved record was deleted elsewhere; save a fresh one.
            record = await createFormBuilderRecord(payload);
          } else {
            throw error;
          }
        }
      } else {
        record = await createFormBuilderRecord(payload);
      }

      setRecords((previous) => ({
        ...previous,
        [key]: {
          id: record.id,
          revision: record.revision,
          title: record.title,
          dirty: false,
        },
      }));

      // Keep the full editor state (including images) on this device. Only the
      // typed fields were sent to the server.
      const cached = savePanDraft(data, activeTab.draftKey, {
        recordId: record.id,
        revision: record.revision,
      });
      if (!cached) {
        message.warning(
          'Saved to your account, but the local image cache is full. The uploaded images were not cached on this device.'
        );
      }

      message.success('Form saved to your account.');
    } catch (error) {
      message.error(
        error?.response?.data?.error ||
        'Could not save the form. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const loadSavedRecords = async () => {
    if (!activeTab) return;
    setDrawerLoading(true);
    try {
      const result = await listFormBuilderRecords({
        formKey: FORM_KEY_BY_TAB[activeTab.key],
        limit: 100,
      });
      setSavedRecords(result.records || []);
    } catch (error) {
      message.error(
        error?.response?.data?.error || 'Could not load your saved forms.'
      );
    } finally {
      setDrawerLoading(false);
    }
  };

  const openSavedForms = () => {
    if (!activeTab) return;
    setDrawerFormKey(activeTab.key);
    setDrawerOpen(true);
    loadSavedRecords();
  };

  const openSavedRecord = async (id) => {
    if (!activeTab) return;
    const key = activeTab.key;

    if (records[key]?.dirty) {
      const discard = await confirmDiscardChanges();
      if (!discard) return;
    }

    setDrawerLoading(true);
    try {
      const record = await getFormBuilderRecord(id);
      const merged = mergeFormDefaults(activeTab.createData, record.data);
      const local = readPanDraft(activeTab.draftKey, activeTab.createData);

      // Uploaded images are device-local. Only reuse them when this device's
      // cache belongs to the same saved record.
      const next =
        local?.recordId === record.id
          ? {
            ...merged,
            photo: local.data.photo ?? null,
            signature: local.data.signature ?? null,
            signatureAspect: local.data.signatureAspect ?? null,
            signaturePlacements: local.data.signaturePlacements ?? null,
            documents: local.data.documents ?? [],
          }
          : merged;

      setFormState((previous) => ({ ...previous, [key]: next }));
      setRecords((previous) => ({
        ...previous,
        [key]: {
          id: record.id,
          revision: record.revision,
          title: record.title,
          dirty: false,
        },
      }));
      savePanDraft(next, activeTab.draftKey, {
        recordId: record.id,
        revision: record.revision,
      });
      setDrawerOpen(false);
      message.success(`Opened “${record.title || 'saved form'}”.`);
    } catch (error) {
      message.error(
        error?.response?.data?.error || 'Could not open the saved form.'
      );
    } finally {
      setDrawerLoading(false);
    }
  };

  const deleteSavedRecord = async (id) => {
    if (!activeTab) return;
    const key = activeTab.key;

    try {
      await deleteFormBuilderRecord(id);
      setSavedRecords((previous) => previous.filter((item) => item.id !== id));

      if (records[key]?.id === id) {
        // Keep the editor contents, but detach them from the deleted record so
        // the next save creates a new one.
        setRecords((previous) => ({
          ...previous,
          [key]: { id: null, revision: null, title: '', dirty: true },
        }));
        const local = readPanDraft(activeTab.draftKey, activeTab.createData);
        if (local) {
          savePanDraft(local.data, activeTab.draftKey, {
            recordId: null,
            revision: null,
          });
        }
      }

      message.success('Saved form deleted.');
    } catch (error) {
      message.error(
        error?.response?.data?.error || 'Could not delete the saved form.'
      );
    }
  };

  if (!activeTab) {
    return <Navigate to={`/app/tools/form-builder/${DEFAULT_FORM_KEY}`} replace />;
  }

  const currentRecord = records[activeTab.key];

  return (
    <div className="form-builder-page">
      <div className="fbs-tab-content">
        <div key={activeTab.key} className="fbs-tab-pane" role="tabpanel">
          {activeTab.render({
            data: formState[activeTab.key],
            onChange: (value) => updateForm(activeTab.key, value),
            previewPages: activeTab.previewPages,
            onSave: saveActiveForm,
            saving,
            onOpenSavedForms: openSavedForms,
            onReset: resetActiveForm,
            dirty: Boolean(currentRecord?.dirty),
          })}
        </div>
      </div>

      <Drawer
        open={drawerOpen && drawerFormKey === activeTab.key}
        onClose={() => setDrawerOpen(false)}
        size={460}
        placement="right"
        classNames={{
          root: 'fb-saved-drawer',
          section: 'fb-saved-drawer-panel',
          header: 'fb-saved-drawer-header',
          body: 'fb-saved-drawer-body',
        }}
        title={
          <div className="fb-saved-drawer-heading">
            <span className="fb-saved-drawer-heading-icon">
              <FolderOpen size={17} />
            </span>
            <span className="fb-saved-drawer-heading-text">
              <span className="fb-saved-drawer-heading-title">Saved forms</span>
              <span className="fb-saved-drawer-heading-sub">{activeTab.label}</span>
            </span>
          </div>
        }
      >
        {/* <div className="fb-saved-note">
          <span className="fb-saved-note-icon">
            <Info size={15} />
          </span>
          <div className="fb-saved-note-copy">
            <strong>Only typed fields are saved</strong>
            <p>Photographs, signatures and documents stay on this device.</p>
          </div>
        </div> */}

        <div className="fb-saved-toolbar">
          <div className="fb-saved-count">
            <Files size={14} />
            <span>
              {savedRecords.length} saved form{savedRecords.length === 1 ? '' : 's'}
            </span>
          </div>

          <div>
            <Button
              type="primary"
              className="fb-saved-new-btn"
              aria-label="New form"
              icon={<FilePlus2 size={15} />}
              onClick={async () => {
                if (currentRecord?.dirty) {
                  const discard = await confirmDiscardChanges();
                  if (!discard) return;
                }
                resetActiveForm();
                setDrawerOpen(false);
              }}
            >
              New form
            </Button>
            <Button
              type="text"
              size="small"
              className="fb-saved-refresh"
              icon={<RefreshCw size={14} />}
              loading={drawerLoading}
              onClick={loadSavedRecords}
            />
          </div>

        </div>

        <Spin spinning={drawerLoading}>
          {savedRecords.length === 0 ? (
            <div className="fb-saved-empty">
              <span className="fb-saved-empty-icon">
                <Files size={22} />
              </span>
              <h4>No saved forms yet</h4>
              <p>Fill the editor on the left and press Save to keep a copy in your account.</p>
              <Button
                type="primary"
                icon={<FilePlus2 size={14} />}
                onClick={() => {
                  resetActiveForm();
                  setDrawerOpen(false);
                }}
              >
                Start a new form
              </Button>
            </div>
          ) : (
            <div className="fb-saved-list">
              {savedRecords.map((item) => (
                <article className="fb-saved-row" key={item.id}>
                  <span className="fb-saved-row-icon">
                    <FileText size={16} />
                  </span>

                  <div className="fb-saved-row-copy">
                    <div className="fb-saved-row-heading">
                      <h4 title={item.title || 'Untitled form'}>
                        {item.title || 'Untitled form'}
                      </h4>
                      <span className={`fb-saved-row-status is-${(
                        item.status || 'DRAFT'
                      ).toLowerCase()}`}>
                        {SAVED_FORM_STATUS_LABELS[item.status] || 'Draft'}
                      </span>
                    </div>
                    <div className="fb-saved-row-meta">
                      <Clock size={12} />
                      <span>Updated {formatSavedAt(item.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="fb-saved-row-actions">
                    <Button
                      type="link"
                      size="small"
                      className="fb-saved-open-btn"
                      icon={<FolderOpen size={14} />}
                      onClick={() => openSavedRecord(item.id)}
                    >
                      Open
                    </Button>
                    <Popconfirm
                      title="Delete this saved form?"
                      description="It will be hidden from your saved forms."
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => deleteSavedRecord(item.id)}
                    >
                      <Button
                        type="link"
                        size="small"
                        danger
                        className="fb-saved-delete-btn"
                        icon={<Trash2 size={14} />}
                      >
                        Delete
                      </Button>
                    </Popconfirm>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Spin>
      </Drawer>
    </div>
  );
}
