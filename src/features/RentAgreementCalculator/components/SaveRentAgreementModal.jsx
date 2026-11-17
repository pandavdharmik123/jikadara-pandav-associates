import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Space, Typography, Tag, Divider } from 'antd';
import { Save, Cloud, Database } from 'lucide-react';

const { Text } = Typography;

export default function SaveRentAgreementModal({
  visible,
  onClose,
  onSave,
  calculationData = {},
  currentDraftTitle = '',
  currentDraftId = null,
  isSaving = false
}) {
  const {
    partyName = '',
    totalCost = 0
  } = calculationData;

  const isExistingCloudDraft = Boolean(currentDraftId && !currentDraftId.startsWith('draft-'));

  // Format currency
  const formatMoney = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '0';
    return Math.round(Number(val)).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Dynamically compute the default title
  const computeDefaultTitle = () => {
    if (
      isExistingCloudDraft &&
      currentDraftTitle &&
      currentDraftTitle !== 'Untitled Rent Agreement' &&
      (!partyName || currentDraftTitle.includes(partyName))
    ) {
      return currentDraftTitle;
    }

    if (partyName && partyName.trim()) {
      return `${partyName.trim()} - ભાડા એગ્રીમેન્ટ`;
    }

    return 'Untitled Rent Agreement';
  };

  const [title, setTitle] = useState(computeDefaultTitle);

  useEffect(() => {
    if (visible) {
      setTitle(computeDefaultTitle());
    }
  }, [visible, currentDraftTitle, currentDraftId, partyName]);

  const handleUpdate = () => {
    onSave({ title: title.trim() || 'Untitled Rent Agreement', saveAsNew: false });
  };

  const handleSaveAsNew = () => {
    let finalTitle = title.trim();
    if (!finalTitle) {
      finalTitle = computeDefaultTitle();
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
          <span>Save Rent Agreement Calculation / ભાડા એગ્રીમેન્ટ ગણતરી સાચવો</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={560}
      centered
      destroyOnClose
    >
      <div style={{ marginTop: 16 }}>
        {/* Title Input */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 6 }}>
            Calculation Title / શીર્ષક <span style={{ color: '#ef4444' }}>*</span>
          </Text>
          <Input
            size="large"
            value={title}
            placeholder={partyName ? `દા.ત. ${partyName} - ભાડા એગ્રીમેન્ટ` : 'દા.ત. અશોકભાઈ - ભાડા એગ્રીમેન્ટ'}
            onChange={(e) => setTitle(e.target.value)}
            onPressEnter={() => (isExistingCloudDraft ? handleUpdate() : handleSaveAsNew())}
            autoFocus
          />

          {/* Quick Suggestions Chips */}
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>Suggestions:</Text>
            {partyName && partyName.trim() && (
              <Tag
                style={{ cursor: 'pointer', fontSize: 11 }}
                color="blue"
                onClick={() => setSuggestion(`${partyName.trim()} - ભાડા એગ્રીમેન્ટ`)}
              >
                {partyName.trim()} - ભાડા એગ્રીમેન્ટ
              </Tag>
            )}
          </div>
        </div>

        {/* Calculation Snapshot */}
        <div style={{
          padding: '10px 12px',
          backgroundColor: 'rgba(79, 70, 229, 0.06)',
          borderRadius: 10,
          border: '1px solid rgba(79, 70, 229, 0.15)',
          marginBottom: 16
        }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
            <Cloud size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            Saving: {partyName || 'Untitled'} • Total Cost: ₹ {formatMoney(totalCost)}
          </Text>
        </div>

        {/* Action Buttons */}
        <Space style={{ width: '100%' }} direction="vertical" size={8}>
          {isExistingCloudDraft && (
            <Button
              type="primary"
              block
              size="large"
              icon={<Save size={16} />}
              onClick={handleUpdate}
              loading={isSaving}
              style={{ backgroundColor: '#4f46e5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              Update Existing Calculation
            </Button>
          )}
          <Button
            block
            size="large"
            icon={<Save size={16} />}
            onClick={handleSaveAsNew}
            loading={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              ...(isExistingCloudDraft ? {} : { backgroundColor: '#4f46e5', color: '#fff', borderColor: '#4f46e5' })
            }}
          >
            {isExistingCloudDraft ? 'Save as New Calculation' : 'Save to Database'}
          </Button>
        </Space>

        <Divider style={{ margin: '12px 0 0' }} />
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
          Saved calculations appear in "Saved Calculations" and can be loaded, cloned or deleted anytime.
        </Text>
      </div>
    </Modal>
  );
}
