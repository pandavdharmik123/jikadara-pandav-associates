import { useEffect, useMemo, useRef, useState } from 'react';
import { FileSignature, Info } from 'lucide-react';
import { message } from 'antd';
import PanCardBuilder from './PanCardBuilder';
import { PAN_FORM_PAGES } from './constants/panLayout';
import { createPanData } from './constants/panData';
import { readPanDraft } from './utils/panDraft';
import './styles/formBuilder.scss';

const PAN_TAB_KEY = 'pan-new-application';

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
];

export default function FormBuilderPage() {
  const restoredDraft = useMemo(() => readPanDraft(), []);
  const notified = useRef(false);

  const [activeKey, setActiveKey] = useState(FORM_TABS[0].key);
  const [formState, setFormState] = useState(() => ({
    [PAN_TAB_KEY]: restoredDraft?.data || createPanData(),
  }));

  useEffect(() => {
    if (!restoredDraft?.savedAt || notified.current) return;
    notified.current = true;
    const when = new Date(restoredDraft.savedAt);
    message.info(`Restored the draft saved on this device on ${when.toLocaleString()}.`);
  }, [restoredDraft]);

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
            <div className="fbs-brand-subtitle">
              Fill the original government PDF — the printed layout is never redrawn.
            </div>
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

        <span className="fbs-topbar-hint">
          <Info size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
          Values are drawn over the original PDF – nothing is redrawn
        </span>
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
