import { useEffect, useMemo, useRef, useState } from 'react';
import { FileSignature } from 'lucide-react';
import { message } from 'antd';
import PanCardBuilder from './PanCardBuilder';
import CorrectionPanBuilder from './CorrectionPanBuilder';
import MarriageBuilder from './MarriageBuilder';
import PropertyTaxBuilder from './PropertyTaxBuilder';
import { PAN_FORM_PAGES } from './constants/panLayout';
import { createPanData } from './constants/panData';
import { CORRECTION_FORM_PAGES } from './constants/correctionPanLayout';
import { createCorrectionPanData } from './constants/correctionPanData';
import { createMarriageData, MARRIAGE_FORM_PAGES } from './constants/marriageData';
import {
  PROPERTY_TAX_FORM_PAGES,
} from './constants/propertyTaxLayout';
import { createPropertyTaxData } from './constants/propertyTaxData';
import {
  CORRECTION_DRAFT_KEY,
  MARRIAGE_DRAFT_KEY,
  PROPERTY_TAX_DRAFT_KEY,
  readPanDraft,
} from './utils/panDraft';
import './styles/formBuilder.scss';

const PAN_TAB_KEY = 'pan-new-application';
const CORRECTION_TAB_KEY = 'pan-correction';
const MARRIAGE_TAB_KEY = 'marriage-registration';
const PROPERTY_TAX_TAB_KEY = 'property-tax-name-transfer';

/**
 * Registry of the forms available in the builder. Adding a new form is only a
 * matter of appending an entry here (plus its own layout/overlay module).
 */
const FORM_TABS = [
  {
    key: PAN_TAB_KEY,
    label: 'PAN Card – New Application',
    badge: 'Form 93',
    // Pages 3–5 of the template are the printed notes / filling guidelines.
    previewPages: PAN_FORM_PAGES,
    render: ({ data, onChange, previewPages }) => (
      <PanCardBuilder data={data} onChange={onChange} previewPages={previewPages} />
    ),
  },
  {
    key: CORRECTION_TAB_KEY,
    label: 'PAN Card – Correction',
    badge: 'Request',
    // Pages 3–4 of the template are the printed guidelines.
    previewPages: CORRECTION_FORM_PAGES,
    render: ({ data, onChange, previewPages }) => (
      <CorrectionPanBuilder data={data} onChange={onChange} previewPages={previewPages} />
    ),
  },
  {
    key: MARRIAGE_TAB_KEY,
    label: 'Marriage Registration',
    badge: 'Gujarat',
    previewPages: MARRIAGE_FORM_PAGES,
    render: ({ data, onChange, previewPages }) => (
      <MarriageBuilder data={data} onChange={onChange} previewPages={previewPages} />
    ),
  },
  {
    key: PROPERTY_TAX_TAB_KEY,
    label: 'Property Tax – Name Transfer',
    badge: 'SMC 81',
    previewPages: PROPERTY_TAX_FORM_PAGES,
    render: ({ data, onChange, previewPages }) => (
      <PropertyTaxBuilder data={data} onChange={onChange} previewPages={previewPages} />
    ),
  },
];

export default function FormBuilderPage() {
  const restoredDrafts = useMemo(
    () => ({
      pan: readPanDraft(),
      correction: readPanDraft(CORRECTION_DRAFT_KEY, createCorrectionPanData),
      marriage: readPanDraft(MARRIAGE_DRAFT_KEY, createMarriageData),
      propertyTax: readPanDraft(PROPERTY_TAX_DRAFT_KEY, createPropertyTaxData),
    }),
    []
  );
  const notified = useRef(false);

  const [activeKey, setActiveKey] = useState(FORM_TABS[0].key);
  const [formState, setFormState] = useState(() => ({
    [PAN_TAB_KEY]: restoredDrafts.pan?.data || createPanData(),
    [CORRECTION_TAB_KEY]: restoredDrafts.correction?.data || createCorrectionPanData(),
    [MARRIAGE_TAB_KEY]: restoredDrafts.marriage?.data || createMarriageData(),
    [PROPERTY_TAX_TAB_KEY]: restoredDrafts.propertyTax?.data || createPropertyTaxData(),
  }));

  useEffect(() => {
    if (notified.current) return;
    const saved = [
      restoredDrafts.pan,
      restoredDrafts.correction,
      restoredDrafts.marriage,
      restoredDrafts.propertyTax,
    ].filter((draft) => draft?.savedAt);
    if (saved.length === 0) return;
    notified.current = true;
    const latest = saved
      .map((draft) => new Date(draft.savedAt))
      .sort((a, b) => b - a)[0];
    message.info(
      `Restored ${saved.length === 1 ? 'the draft' : 'the drafts'} saved on this device on ${latest.toLocaleString()}.`
    );
  }, [restoredDrafts]);

  // Accepts a plain value or an updater function (used by the async uploads,
  // where several images can finish at the same time).
  const updateForm = (key, value) =>
    setFormState((previous) => ({
      ...previous,
      [key]: typeof value === 'function' ? value(previous[key]) : value,
    }));

  return (
    <div className="form-builder-page">
      <div className="fbs-topbar">
        <div className="fbs-brand">
          <span className="fbs-brand-icon">
            <FileSignature size={16} />
          </span>
          <div>
            <div className="fbs-brand-title">Form Builder</div>
          </div>
        </div>

        <div className="fbs-tabbar" role="tablist" aria-label="Form templates">
          {FORM_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={tab.key === activeKey}
              className={`fbs-tab${tab.key === activeKey ? ' is-active' : ''}`}
              onClick={() => setActiveKey(tab.key)}
            >
              {tab.label}
              {tab.badge && <span className="fbs-tab-badge">{tab.badge}</span>}
            </button>
          ))}
        </div>

        <div className="fbs-topbar-spacer" />
      </div>

      <div className="fbs-tab-content">
        {FORM_TABS.map((tab) => (
          <div
            key={tab.key}
            className="fbs-tab-pane"
            style={{ display: tab.key === activeKey ? 'flex' : 'none' }}
            role="tabpanel"
          >
            {tab.render({
              data: formState[tab.key],
              onChange: (value) => updateForm(tab.key, value),
              previewPages: tab.previewPages,
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
