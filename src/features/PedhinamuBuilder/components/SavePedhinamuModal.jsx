import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Space, Typography, Tag, Card, Divider } from 'antd';
import { Save, Copy, Cloud, CheckCircle, Database } from 'lucide-react';

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

  const defaultProposedTitle = currentDraftTitle || (
    isAlive
      ? `${applicant.name || 'હયાતી'} - પેઢીનામું`
      : `${deceased.name || applicant.name || 'સ્વર્ગસ્થ'} - પેઢીનામું`
  );

  const [title, setTitle] = useState(defaultProposedTitle);

  useEffect(() => {
    if (visible) {
      const generated = currentDraftTitle || (
        isAlive
          ? `${applicant.name || 'હયાતી'} - પેઢીનામું`
          : `${deceased.name || applicant.name || 'સ્વર્ગસ્થ'} - પેઢીનામું`
      );
      setTitle(generated);
    }
  }, [visible, currentDraftTitle, applicant.name, deceased.name, isAlive]);

  const isExistingCloudDraft = Boolean(currentDraftId && !currentDraftId.startsWith('draft-'));

  const handleUpdate = () => {
    onSave({ title: title.trim() || 'Untitled Pedhinamu', saveAsNew: false });
  };

  const handleSaveAsNew = () => {
    onSave({ title: title.trim() || 'Untitled Pedhinamu', saveAsNew: true });
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
            placeholder="દા.ત. મધુભાઇ પરશોતમભાઇ જીકાદરા - પેઢીનામું"
            onChange={(e) => setTitle(e.target.value)}
            onPressEnter={() => (isExistingCloudDraft ? handleUpdate() : handleSaveAsNew())}
            autoFocus
          />

          {/* Quick Suggestions Chips */}
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Suggestions:</Text>
            {deceased.name && (
              <Tag
                style={{ cursor: 'pointer' }}
                color="blue"
                onClick={() => setSuggestion(`${deceased.name} - પેઢીનામું`)}
              >
                {deceased.name} - પેઢીનામું
              </Tag>
            )}
            {applicant.name && (
              <Tag
                style={{ cursor: 'pointer' }}
                color="purple"
                onClick={() => setSuggestion(`${applicant.name} - પેઢીનામું`)}
              >
                {applicant.name} - પેઢીનામું
              </Tag>
            )}
            {general.moje && (
              <Tag
                style={{ cursor: 'pointer' }}
                color="cyan"
                onClick={() => setSuggestion(`મોજે ${general.moje} - પેઢીનામું`)}
              >
                મોજે {general.moje} - પેઢીનામું
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
              <Text strong>{applicant.name || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">{isAlive ? 'Subject:' : 'Deceased:'}</Text>{' '}
              <Text strong>{(isAlive ? applicant.name : deceased.name) || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">Moje / Taluka:</Text>{' '}
              <Text>{general.moje || '-'}, {general.taluka || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">Reg No:</Text>{' '}
              <Text>{general.registrationNo || '-'}</Text>
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
