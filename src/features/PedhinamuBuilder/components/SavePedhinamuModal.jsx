import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Space, Typography, Tag, Card, Divider } from 'antd';
import { Save, Copy, Cloud, Database } from 'lucide-react';
import { ensureUnicode } from '../utils/unicodeUtils';

const { Text } = Typography;

export default function SavePedhinamuModal({
  visible,
  onClose,
  onSave,
  currentData = {},
  currentDraftTitle = '',
  currentDraftId = null,
  isSaving = false
}) {
  const { applicant = {}, deceased = {}, general = {}, pedhinamuType = 'DECEASED' } = currentData;
  const isAlive = pedhinamuType === 'ALIVE';

  const applicantNameUni = ensureUnicode(applicant.name);
  const deceasedNameUni = ensureUnicode(currentData.tree?.rootNode?.name || deceased.name);
  const mainPersonUni = isAlive
    ? (applicantNameUni || deceasedNameUni)
    : (deceasedNameUni || applicantNameUni);

  const mojeUni = ensureUnicode(general.moje);
  const talukaUni = ensureUnicode(general.taluka);
  const regNoUni = ensureUnicode(general.registrationNo);

  const isExistingCloudDraft = Boolean(currentDraftId && !currentDraftId.startsWith('draft-'));

  // Determine proposed title dynamically based on the target person
  const computeDefaultTitle = () => {
    // Check if currentDraftTitle already contains / belongs to the active person
    const titleMatchesCurrentPerson = Boolean(
      mainPersonUni && currentDraftTitle && currentDraftTitle.includes(mainPersonUni)
    );

    // Keep currentDraftTitle ONLY if it's an existing cloud draft AND its title actually belongs to the current person
    if (
      isExistingCloudDraft &&
      titleMatchesCurrentPerson &&
      currentDraftTitle !== 'મધુભાઇ પરશોતમભાઇ જીકાદરા - પેઢીનામું' &&
      currentDraftTitle !== 'Untitled Pedhinamu'
    ) {
      return currentDraftTitle;
    }

    // Otherwise derive dynamically from the person we are making pedhinamu for (in Unicode)
    if (mainPersonUni) {
      return `${mainPersonUni} - પેઢીનામું`;
    }
    return isAlive ? 'હયાતી - પેઢીનામું' : 'સ્વર્ગસ્થ - પેઢીનામું';
  };

  const [title, setTitle] = useState(computeDefaultTitle);

  useEffect(() => {
    if (visible) {
      setTitle(computeDefaultTitle());
    }
  }, [
    visible,
    currentDraftTitle,
    currentDraftId,
    applicantNameUni,
    deceasedNameUni,
    mainPersonUni,
    isAlive,
    isExistingCloudDraft
  ]);

  const handleUpdate = () => {
    onSave({ title: title.trim() || 'Untitled Pedhinamu', saveAsNew: false });
  };

  const handleSaveAsNew = () => {
    let finalTitle = title.trim();
    if (!finalTitle || (mainPersonUni && !finalTitle.includes(mainPersonUni))) {
      finalTitle = mainPersonUni ? `${mainPersonUni} - પેઢીનામું` : 'Untitled Pedhinamu';
    }
    onSave({ title: finalTitle, saveAsNew: true });
  };

  const setSuggestion = (suggested) => {
    if (suggested && suggested.trim()) {
      setTitle(suggested.trim());
    }
  };

  return (
    <Modal
      title={
        <Space>
          <Database size={18} style={{ color: '#4f46e5' }} />
          <span>Save Pedhinamu to Database / ડેટાબેઝમાં સાચવો</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnClose
    >
      <div style={{ marginTop: 16 }}>
        {/* Title Input */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 6 }}>
            Pedhinamu Title / પેઢીનામું શીર્ષક <span style={{ color: '#ef4444' }}>*</span>
          </Text>
          <Input
            size="large"
            value={title}
            placeholder={
              mainPersonUni
                ? `દા.ત. ${mainPersonUni} - પેઢીનામું`
                : 'દા.ત. મુખ્ય વ્યક્તિનું નામ - પેઢીનામું'
            }
            onChange={(e) => setTitle(e.target.value)}
            onPressEnter={() => (isExistingCloudDraft ? handleUpdate() : handleSaveAsNew())}
            autoFocus
          />

          {/* Quick Suggestions Chips (All in Unicode) */}
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Suggestions:</Text>
            {deceasedNameUni && (
              <Tag
                style={{ cursor: 'pointer' }}
                color="blue"
                onClick={() => setSuggestion(`${deceasedNameUni} - પેઢીનામું`)}
              >
                {deceasedNameUni} - પેઢીનામું
              </Tag>
            )}
            {applicantNameUni && applicantNameUni !== deceasedNameUni && (
              <Tag
                style={{ cursor: 'pointer' }}
                color="purple"
                onClick={() => setSuggestion(`${applicantNameUni} - પેઢીનામું`)}
              >
                {applicantNameUni} - પેઢીનામું
              </Tag>
            )}
            {mojeUni && (
              <Tag
                style={{ cursor: 'pointer' }}
                color="cyan"
                onClick={() => setSuggestion(`મોજે ${mojeUni} - પેઢીનામું`)}
              >
                મોજે {mojeUni} - પેઢીનામું
              </Tag>
            )}
            {mainPersonUni && mojeUni && (
              <Tag
                style={{ cursor: 'pointer' }}
                color="geekblue"
                onClick={() => setSuggestion(`${mainPersonUni} (${mojeUni}) - પેઢીનામું`)}
              >
                {mainPersonUni} ({mojeUni}) - પેઢીનામું
              </Tag>
            )}
          </div>
        </div>

        {/* Metadata Summary Card */}
        <Card size="small" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
            <div>
              <Text type="secondary">Type:</Text>{' '}
              <Tag color={isAlive ? 'success' : 'default'} style={{ marginLeft: 4 }}>
                {isAlive ? '🟢 Alive (હયાતી)' : '🔴 Deceased (સ્વર્ગસ્થ)'}
              </Tag>
            </div>
            <div>
              <Text type="secondary">Status:</Text>{' '}
              <Tag color={isExistingCloudDraft ? 'geekblue' : 'orange'} style={{ marginLeft: 4 }}>
                {isExistingCloudDraft ? '☁️ Existing Cloud Draft' : '💾 New Document'}
              </Tag>
            </div>
            <div>
              <Text type="secondary">Applicant:</Text>{' '}
              <Text strong>{applicantNameUni || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">{isAlive ? 'Subject:' : 'Deceased:'}</Text>{' '}
              <Text strong>{(isAlive ? (applicantNameUni || deceasedNameUni) : (deceasedNameUni || applicantNameUni)) || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">Moje / Taluka:</Text>{' '}
              <Text>{mojeUni || '-'}, {talukaUni || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">Reg No:</Text>{' '}
              <Text>{regNoUni || '-'}</Text>
            </div>
          </div>
        </Card>

        <Divider style={{ margin: '14px 0' }} />

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>

          {isExistingCloudDraft ? (
            <>
              <Button
                icon={<Copy size={15} />}
                onClick={handleSaveAsNew}
                loading={isSaving}
              >
                Save as New Copy
              </Button>
              <Button
                type="primary"
                icon={<Save size={15} />}
                onClick={handleUpdate}
                loading={isSaving}
                style={{ backgroundColor: '#4f46e5' }}
              >
                Update Existing Draft
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              icon={<Cloud size={15} />}
              onClick={handleSaveAsNew}
              loading={isSaving}
              style={{ backgroundColor: '#4f46e5' }}
            >
              Save to Database
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
