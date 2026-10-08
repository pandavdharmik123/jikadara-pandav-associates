import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Space, Typography, Tag, Card, Divider } from 'antd';
import { Save, Copy, Cloud, Database } from 'lucide-react';

const { Text } = Typography;

export default function SaveJantriModal({
  visible,
  onClose,
  onSave,
  calculationData = {},
  currentDraftTitle = '',
  currentDraftId = null,
  isSaving = false
}) {
  const {
    buyerName = '',
    village = '',
    propertyType = 'ખુલ્લો પ્લોટ',
    propertyDetails = '',
    finalValue = 0,
    totalFee = 0,
    tp = '',
    fp = ''
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
    // If it's an existing cloud draft with a custom title, keep it
    if (
      isExistingCloudDraft &&
      currentDraftTitle &&
      currentDraftTitle !== 'Untitled Jantri' &&
      (!buyerName || currentDraftTitle.includes(buyerName))
    ) {
      return currentDraftTitle;
    }

    if (buyerName && buyerName.trim()) {
      return village && village.trim()
        ? `${buyerName.trim()} (${village.trim()}) - જંત્રી ગણતરી`
        : `${buyerName.trim()} - જંત્રી ગણતરી`;
    }

    if (village && village.trim()) {
      return `મોજે ${village.trim()} - જંત્રી ગણતરી`;
    }

    return 'Untitled Jantri';
  };

  const [title, setTitle] = useState(computeDefaultTitle);

  useEffect(() => {
    if (visible) {
      setTitle(computeDefaultTitle());
    }
  }, [visible, currentDraftTitle, currentDraftId, buyerName, village, propertyType]);

  const handleUpdate = () => {
    onSave({ title: title.trim() || 'Untitled Jantri', saveAsNew: false });
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
          <span>Save Jantri Calculation / જંત્રી ગણતરી સાચવો</span>
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
            placeholder={buyerName ? `દા.ત. ${buyerName} - જંત્રી ગણતરી` : 'દા.ત. અશોકભાઈ - જંત્રી ગણતરી'}
            onChange={(e) => setTitle(e.target.value)}
            onPressEnter={() => (isExistingCloudDraft ? handleUpdate() : handleSaveAsNew())}
            autoFocus
          />

          {/* Quick Suggestions Chips */}
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Suggestions:</Text>
            {buyerName && (
              <Tag
                style={{ cursor: 'pointer' }}
                color="blue"
                onClick={() => setSuggestion(`${buyerName} - જંત્રી ગણતરી`)}
              >
                {buyerName} - જંત્રી
              </Tag>
            )}
            {buyerName && village && (
              <Tag
                style={{ cursor: 'pointer' }}
                color="purple"
                onClick={() => setSuggestion(`${buyerName} (${village}) - જંત્રી ગણતરી`)}
              >
                {buyerName} ({village})
              </Tag>
            )}
            {village && (
              <Tag
                style={{ cursor: 'pointer' }}
                color="cyan"
                onClick={() => setSuggestion(`મોજે ${village} - જંત્રી ગણતરી`)}
              >
                મોજે {village}
              </Tag>
            )}
            {propertyType && buyerName && (
              <Tag
                style={{ cursor: 'pointer' }}
                color="geekblue"
                onClick={() => setSuggestion(`${propertyType} - ${buyerName}`)}
              >
                {propertyType} - {buyerName}
              </Tag>
            )}
          </div>
        </div>

        {/* Metadata Summary Card */}
        <Card size="small" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
            <div>
              <Text type="secondary">Status:</Text>{' '}
              <Tag color={isExistingCloudDraft ? 'geekblue' : 'orange'} style={{ marginLeft: 4 }}>
                {isExistingCloudDraft ? '☁️ Existing Cloud Document' : '💾 New Document'}
              </Tag>
            </div>
            <div>
              <Text type="secondary">Property Type:</Text>{' '}
              <Tag color="blue" style={{ marginLeft: 4 }}>
                {propertyType || 'ખુલ્લો પ્લોટ'}
              </Tag>
            </div>
            <div>
              <Text type="secondary">Buyer / Client:</Text>{' '}
              <Text strong>{buyerName || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">Village (મોજે):</Text>{' '}
              <Text strong>{village || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">TP / FP:</Text>{' '}
              <Text>{tp || '-'} / {fp || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">Property Details:</Text>{' '}
              <Text ellipsis>{propertyDetails || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">Final Value (અવેજ):</Text>{' '}
              <Text strong style={{ color: '#059669' }}>₹ {formatMoney(finalValue)}</Text>
            </div>
            <div>
              <Text type="secondary">Total Duty & Fees:</Text>{' '}
              <Text strong style={{ color: '#4f46e5' }}>₹ {formatMoney(totalFee)}</Text>
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
                Update Existing Document
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