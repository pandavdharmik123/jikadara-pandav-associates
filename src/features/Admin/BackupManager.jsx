import { useState } from 'react';
import {
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Table,
  Tag,
  Space,
  Alert,
  Progress,
  Tooltip,
  Popconfirm,
  Empty,
  Divider,
  message,
} from 'antd';
import {
  CloudUpload,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  Clock,
  Database,
} from 'lucide-react';
import dayjs from 'dayjs';
import Loader from '../../components/Loader';
import { useBackupStatus, useBackupHistory, useRunBackup, useDeleteBackup } from '../../hooks/useBackup';

const { Title, Text } = Typography;

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

const STATUS_COLORS = {
  SUCCESS: 'success',
  FAILED: 'error',
  RUNNING: 'processing',
  DELETED: 'default',
};

const TRIGGER_COLORS = {
  scheduled: 'blue',
  cli: 'purple',
  manual: 'geekblue',
};

export default function BackupManager() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: status, isLoading, isFetching, refetch } = useBackupStatus();
  const { data: history, isLoading: historyLoading } = useBackupHistory(page, pageSize);
  const runMutation = useRunBackup();
  const deleteMutation = useDeleteBackup();

  const config = status?.config;
  const configured = Boolean(config?.configured);
  const running = Boolean(status?.running) || runMutation.isPending;

  const handleRun = async (dryRun) => {
    try {
      const data = await runMutation.mutateAsync({ dryRun });
      if (data?.result?.ok) {
        if (dryRun) {
          message.success(
            `Dry run successful: ${data.result.fileName} (${formatBytes(data.result.sizeBytes)})`
          );
        } else {
          message.success('Backup uploaded to Google Drive.');
        }
      } else {
        message.warning('Backup finished with errors. Check the history table.');
      }
    } catch (error) {
      message.error(error.response?.data?.error || error.message || 'Backup failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      message.success('Backup deleted permanently from Google Drive.');
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to delete backup');
    }
  };

  if (isLoading) return <Loader />;

  const quota = status?.quota;
  const quotaPercent =
    quota?.limit > 0 ? Math.min(100, Math.round((quota.usage / quota.limit) * 100)) : null;

  const lastRun = status?.lastRun;
  const totals = status?.totals || {};

  const columns = [
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 160,
      render: (value) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>
            {dayjs(value).format('DD MMM YYYY')}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(value).format('HH:mm:ss')}
          </Text>
        </div>
      ),
    },
    {
      title: 'File',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (value, record) => (
        <div style={{ maxWidth: 320 }}>
          <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: value }}>
            {value || '—'}
          </Text>
          {record.encrypted && (
            <Tag color="green" style={{ marginLeft: 8 }}>
              encrypted
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'fileSizeBytes',
      key: 'fileSizeBytes',
      width: 90,
      render: (value) => formatBytes(value),
    },
    {
      title: 'Account',
      dataIndex: 'accountEmail',
      key: 'accountEmail',
      width: 200,
      render: (value, record) => (
        <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: value }}>
          {value || record.accountId || '—'}
        </Text>
      ),
    },
    {
      title: 'Trigger',
      dataIndex: 'trigger',
      key: 'trigger',
      width: 110,
      render: (value) => {
        const base = String(value || '').split(':')[0];
        return <Tag color={TRIGGER_COLORS[base] || 'default'}>{base}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (value, record) => {
        const tag = <Tag color={STATUS_COLORS[value] || 'default'}>{value}</Tag>;
        if (value === 'FAILED' && record.error) {
          return <Tooltip title={record.error}>{tag}</Tooltip>;
        }
        return tag;
      },
    },
    {
      title: 'Duration',
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 90,
      render: (value) => (value ? `${(value / 1000).toFixed(1)}s` : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          {record.driveWebLink && (
            <Tooltip title="Open in Google Drive">
              <Button
                type="text"
                icon={<ExternalLink size={16} />}
                href={record.driveWebLink}
                target="_blank"
                rel="noreferrer"
              />
            </Tooltip>
          )}
          {record.status !== 'DELETED' && record.driveFileId && (
            <Popconfirm
              title="Delete this backup permanently?"
              description="The file is removed from Google Drive. This cannot be undone."
              okText="Delete"
              okType="danger"
              cancelText="Cancel"
              onConfirm={() => handleDelete(record.id)}
            >
              <Tooltip title="Delete from Drive">
                <Button type="text" danger icon={<Trash2 size={16} />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="advocate-module">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>
            Database Backups
          </Title>
          <Text type="secondary">
            PostgreSQL dumps uploaded to Google Drive. {config?.encryptionEnabled ? 'Archives are encrypted.' : 'Encryption is off.'}
          </Text>
        </div>
        <Space wrap>
          <Button icon={<RefreshCw size={16} />} onClick={() => refetch()} loading={isFetching}>
            Refresh
          </Button>
          <Button onClick={() => handleRun(true)} loading={running} disabled={!configured}>
            Dry run
          </Button>
          <Button
            type="primary"
            icon={<CloudUpload size={16} />}
            onClick={() => handleRun(false)}
            loading={running}
            disabled={!configured}
          >
            Backup now
          </Button>
        </Space>
      </div>

      {!configured && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 20 }}
          message="Google Drive backup is not configured yet"
          description={
            <div>
              <p style={{ margin: '0 0 8px' }}>
                Add the missing values to <code>server/.env</code>, then restart the server:
              </p>
              <ul style={{ margin: '0 0 8px 18px' }}>
                {(config?.missing || []).map((item) => (
                  <li key={item}>
                    <code>{item}</code>
                  </li>
                ))}
              </ul>
              <p style={{ margin: 0 }}>
                Generate the refresh token with <code>cd server &amp;&amp; npm run backup:auth</code>. Full guide:{' '}
                <code>server/BACKUP.md</code>.
              </p>
            </div>
          }
        />
      )}

      {config?.warnings?.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message="Configuration notices"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {config.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          }
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, height: '100%' }}>
            <Statistic
              title={<span><Database size={14} /> Last backup</span>}
              value={lastRun ? dayjs(lastRun.startedAt).format('DD MMM, HH:mm') : 'Never'}
              valueStyle={{ fontSize: 20, fontWeight: 700 }}
            />
            <div style={{ marginTop: 8 }}>
              {lastRun ? (
                <Tag color={STATUS_COLORS[lastRun.status] || 'default'}>{lastRun.status}</Tag>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>No runs recorded yet</Text>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, height: '100%' }}>
            <Statistic
              title={<span><Clock size={14} /> Next scheduled</span>}
              value={
                status?.nextRun
                  ? dayjs(status.nextRun).format('DD MMM, HH:mm')
                  : config?.enabled && config?.scheduleEnabled
                    ? config.schedule
                    : 'Disabled'
              }
              valueStyle={{ fontSize: 20, fontWeight: 700 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {config?.scheduleEnabled ? config?.timezone : 'Scheduler off'}
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, height: '100%' }}>
            <Statistic
              title={<span><HardDrive size={14} /> Stored archives</span>}
              value={totals.trackedFiles || 0}
              suffix={<span style={{ fontSize: 13, color: '#64748b' }}>{formatBytes(totals.storedBytes)}</span>}
              valueStyle={{ fontSize: 20, fontWeight: 700 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {totals.successful || 0} successful · {totals.failed || 0} failed
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, height: '100%' }}>
            <Statistic
              title={<span><HardDrive size={14} /> Google Drive</span>}
              value={quota ? `${quotaPercent}%` : '—'}
              valueStyle={{ fontSize: 20, fontWeight: 700 }}
            />
            {quota ? (
              <>
                <Progress
                  percent={quotaPercent ?? 0}
                  showInfo={false}
                  strokeColor={quotaPercent >= 90 ? '#dc2626' : quotaPercent >= 75 ? '#f59e0b' : '#16a34a'}
                  size="small"
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatBytes(quota.usage)} of {formatBytes(quota.limit)}
                </Text>
              </>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {status?.quotaError || 'Quota unavailable'}
              </Text>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title={<span>Connected Google accounts</span>}
        style={{ borderRadius: 12, marginBottom: 20 }}
        extra={<Tag icon={<ShieldCheck size={12} />} color={config?.encryptionEnabled ? 'green' : 'orange'}>{config?.encryptionEnabled ? 'Encrypted' : 'Not encrypted'}</Tag>}
      >
        {status?.accounts?.length ? (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {status.accounts.map((account) => (
              <div
                key={account.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                }}
              >
                <Space>
                  <Tag color="blue">{account.id}</Tag>
                  <Text strong>{account.email || 'Email not set'}</Text>
                </Space>
                {account.folderLink ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<ExternalLink size={14} />}
                    href={account.folderLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Drive folder
                  </Button>
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Folder is created on first upload
                  </Text>
                )}
              </div>
            ))}
          </Space>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Google account configured" />
        )}

        <Divider style={{ margin: '16px 0' }} />

        <Row gutter={[16, 12]}>
          <Col xs={24} md={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>Schedule</Text>
            <div style={{ fontWeight: 600 }}>{config?.schedule} ({config?.timezone})</div>
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>Retention</Text>
            <div style={{ fontWeight: 600 }}>
              {config?.retention?.daily} daily · {config?.retention?.weekly} weekly · {config?.retention?.monthly} monthly
            </div>
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>Dump format</Text>
            <div style={{ fontWeight: 600 }}>{config?.format}</div>
          </Col>
        </Row>
      </Card>

      <Card title="Backup history" style={{ borderRadius: 12 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={history?.items || []}
          loading={historyLoading}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No backups yet" />,
          }}
          pagination={{
            current: page,
            pageSize,
            total: history?.total || 0,
            showSizeChanger: true,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
      </Card>
    </div>
  );
}
