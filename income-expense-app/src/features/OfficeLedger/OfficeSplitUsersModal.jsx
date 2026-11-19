import { useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Modal,
  Popconfirm,
  Space,
  Typography,
  message,
} from 'antd';
import { Plus, Trash2, Users } from 'lucide-react';
import TransliterateInput from '../../components/TransliterateInput';
import {
  useCreateOfficeSplitUser,
  useDeleteOfficeSplitUser,
} from '../../hooks/useOfficeLedger';
import { formatCurrencyPrecise } from '../../utils/currency';

const { Text } = Typography;

export default function OfficeSplitUsersModal({
  open,
  onClose,
  splitUsers = [],
  shortfall = 0,
  periodLabel = '',
}) {
  const [name, setName] = useState('');
  const createMutation = useCreateOfficeSplitUser();
  const deleteMutation = useDeleteOfficeSplitUser();

  const hasShortfall = Number(shortfall) > 0;

  const handleClose = () => {
    setName('');
    onClose();
  };

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      message.warning('Enter a user name first');
      return;
    }

    try {
      await createMutation.mutateAsync({ name: trimmed });
      setName('');
      message.success('Split user added');
    } catch (error) {
      message.error(
        error.response?.data?.error || 'Failed to add split user'
      );
    }
  };

  const handleRemove = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      message.success('Split user removed');
    } catch (error) {
      message.error(
        error.response?.data?.error || 'Failed to remove split user'
      );
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: '#fff7ed',
              color: '#c2410c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={18} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              Split Users
            </div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>
              {periodLabel ? `Shortfall for ${periodLabel}` : 'Manage split users'}
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={520}
      destroyOnHidden
    >
      <div style={{ marginTop: 18 }}>
        {hasShortfall ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12, borderRadius: 8 }}
            message={
              <span style={{ fontSize: 12 }}>
                Expenses exceed income by{' '}
                <strong>{formatCurrencyPrecise(shortfall)}</strong>. The shortfall
                is split equally among the users below.
              </span>
            }
          />
        ) : (
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 12, borderRadius: 8 }}
            message={
              <span style={{ fontSize: 12 }}>
                No split required for this period. Income covers the expenses.
              </span>
            }
          />
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <TransliterateInput
              value={name}
              onChange={setName}
              placeholder="દા.ત. રમેશ"
              style={{ height: 36, fontSize: 13 }}
            />
          </div>
          <Button
            type="primary"
            icon={<Plus size={14} />}
            loading={createMutation.isPending}
            onClick={handleAdd}
            style={{
              height: 36,
              borderRadius: 8,
              background: '#c2410c',
              borderColor: '#c2410c',
              fontWeight: 600,
            }}
          >
            Add
          </Button>
        </div>

        {splitUsers.length === 0 ? (
          <div
            style={{
              padding: '22px 12px',
              textAlign: 'center',
              border: '1px dashed #e2e8f0',
              borderRadius: 10,
              background: '#f8fafc',
            }}
          >
            <Users size={24} style={{ color: '#94a3b8', marginBottom: 6 }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
              No split users added yet
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Add a name above to include them in the split.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {splitUsers.map((user) => {
              const isRemoving =
                deleteMutation.isPending && deleteMutation.variables === user.id;

              return (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 9,
                    background: '#ffffff',
                  }}
                >
                  <Space size={8} style={{ minWidth: 0 }}>
                    <Avatar
                      size={28}
                      style={{
                        background: '#eff6ff',
                        color: '#2563eb',
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {user.name?.trim()?.charAt(0)?.toUpperCase() || '?'}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#0f172a',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={user.name}
                      >
                        {user.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>
                        {hasShortfall ? 'Equal share' : 'No split required'}
                      </div>
                    </div>
                  </Space>

                  <Space size={6} style={{ flexShrink: 0 }}>
                    <Text
                      strong
                      style={{
                        fontSize: 13,
                        color: hasShortfall ? '#c2410c' : '#64748b',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCurrencyPrecise(user.splitAmount)}
                    </Text>
                    <Popconfirm
                      title="Remove this split user?"
                      okText="Remove"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleRemove(user.id)}
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<Trash2 size={14} />}
                        loading={isRemoving}
                        aria-label={`Remove ${user.name}`}
                      />
                    </Popconfirm>
                  </Space>
                </div>
              );
            })}
          </div>
        )}

        {hasShortfall && splitUsers.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginTop: 12,
              padding: '9px 10px',
              borderRadius: 9,
              background: '#fff7ed',
              border: '1px solid #fed7aa',
            }}
          >
            <Text strong style={{ fontSize: 12, color: '#9a3412' }}>
              Total shortfall
            </Text>
            <Text strong style={{ fontSize: 13, color: '#c2410c' }}>
              {formatCurrencyPrecise(shortfall)}
            </Text>
          </div>
        )}

        <Button
          block
          onClick={handleClose}
          style={{ marginTop: 16, height: 36, borderRadius: 8, fontWeight: 600 }}
        >
          Done
        </Button>
      </div>
    </Modal>
  );
}
