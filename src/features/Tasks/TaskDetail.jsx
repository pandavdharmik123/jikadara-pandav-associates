import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Tag, Space, Modal, message, Row, Col, Alert } from 'antd';
import { ArrowLeft, CheckCircle, RefreshCw, NotebookText, User, Bookmark, Calendar } from 'lucide-react';
import { useTask, useMarkTaskDone, useReopenTask } from '../../hooks/useTasks';
import useAuthStore from '../../store/authStore';
import EditableTransactionTable from './EditableTransactionTable';
import Loader from '../../components/Loader';
import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/currency';

const { Title, Text } = Typography;

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: task, isLoading } = useTask(id);
  const markDoneMutation = useMarkTaskDone();
  const reopenMutation = useReopenTask();

  if (isLoading) {
    return <Loader />;
  }

  if (!task) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Task not found</div>;
  }



  const handleToggleStatus = () => {
    const isDone = task.status === 'DONE';
    const actionText = isDone ? 'Reopen' : 'Done';

    Modal.confirm({
      title: `Mark task as ${actionText}?`,
      content: isDone
        ? 'Reopening this task will allow adding new transactions.'
        : 'Marking the task as done will close it and freeze the total amount. Are you sure?',
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        try {
          if (isDone) {
            await reopenMutation.mutateAsync(task.id);
            message.success('Task reopened');
          } else {
            await markDoneMutation.mutateAsync(task.id);
            message.success('Task marked as done');
          }
        } catch (error) {
          message.error('Failed to change status');
        }
      },
    });
  };

  const isTaskDone = task.status === 'DONE';
  const canToggleStatus = user?.role === 'ADMIN' || user?.role === 'SENIOR';



  // Calculate current totals dynamically if ACTIVE, else use stored totals
  let displayIncome = Number(task.totalIncome) || 0;
  let displayExpense = Number(task.totalExpense) || 0;

  if (!isTaskDone && task.transactions) {
    displayIncome = task.transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    displayExpense = task.transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }

  const displayNet = displayIncome - displayExpense;

  return (
    <div className="advocate-module">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <Space align="center" size="middle">
          <Button
            type="text"
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate(-1)}
          />
          <div style={{ width: 44, height: 44, borderRadius: '12px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
            <NotebookText size={20} />
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>{task.documentType}</Title>
        </Space>

        <Space>
          {canToggleStatus && (
            <Button
              type={isTaskDone ? "default" : "primary"}
              danger={isTaskDone}
              icon={isTaskDone ? <RefreshCw size={16} /> : <CheckCircle size={16} />}
              onClick={handleToggleStatus}
              loading={markDoneMutation.isPending || reopenMutation.isPending}
              style={{ borderRadius: '8px', height: 40, boxShadow: 'none' }}
            >
              {isTaskDone ? 'Reopen' : 'Mark Done'}
            </Button>
          )}
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Card bordered={false} style={{ width: 'fit-content', minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
          <Space align="center" size="middle">
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <User size={16} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2, fontWeight: 500 }}>Client</Text>
              <a onClick={() => navigate(`/app/clients/${task.client?.id}`)} style={{ fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>{task.client?.name}</a>
            </div>
          </Space>
        </Card>

        <Card bordered={false} style={{ width: 'fit-content', minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
          <Space align="center" size="middle">
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Bookmark size={16} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2, fontWeight: 500 }}>Reference</Text>
              <Text strong style={{ fontSize: 13, color: '#0f172a' }}>{task.referenceName || 'N/A'}</Text>
            </div>
          </Space>
        </Card>

        <Card bordered={false} style={{ width: 'fit-content', minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
          <Space align="center" size="middle">
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2, fontWeight: 500 }}>Place</Text>
              <Text strong style={{ fontSize: 13, color: '#0f172a' }}>{task.place || 'N/A'}</Text>
            </div>
          </Space>
        </Card>

        <Card bordered={false} style={{ width: 'fit-content', minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
          <Space align="center" size="middle">
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Calendar size={16} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2, fontWeight: 500 }}>Start Date</Text>
              <Text strong style={{ fontSize: 13, color: '#0f172a' }}>{dayjs(task.startDate).format('DD MMM YYYY')}</Text>
            </div>
          </Space>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Card bordered={false} style={{ width: 'fit-content', minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
          <Space align="center" size="small">
            <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontSize: 16, fontWeight: 600 }}>₹</div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Income</Text>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>{formatCurrency(displayIncome)}</div>
            </div>
          </Space>
        </Card>

        <Card bordered={false} style={{ flex: 1, minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
          <Space align="center" size="small">
            <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 16, fontWeight: 600 }}>₹</div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Expense</Text>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>{formatCurrency(displayExpense)}</div>
            </div>
          </Space>
        </Card>

        <Card bordered={false} style={{ flex: 1, minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
          <Space align="center" size="small">
            <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: displayNet >= 0 ? '#eff6ff' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: displayNet >= 0 ? '#2563eb' : '#dc2626', fontSize: 16, fontWeight: 600 }}>₹</div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Amount</Text>
              <div style={{ fontSize: 16, fontWeight: 700, color: displayNet >= 0 ? '#2563eb' : '#dc2626' }}>{formatCurrency(displayNet)}</div>
            </div>
          </Space>
        </Card>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <EditableTransactionTable
            taskId={task.id}
            type="INCOME"
            transactions={task.transactions?.filter(t => t.type === 'INCOME') || []}
            isTaskDone={isTaskDone}
          />
        </Col>

        <Col xs={24} lg={12}>
          <EditableTransactionTable
            taskId={task.id}
            type="EXPENSE"
            transactions={task.transactions?.filter(t => t.type === 'EXPENSE') || []}
            isTaskDone={isTaskDone}
          />
        </Col>
      </Row>

      {/* <Card className="glass-panel" bordered={false} styles={{ body: { padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }}>
        <Title level={4} style={{ margin: 0 }}>Net Amount (Total Profit)</Title>
        <Title level={4} style={{ margin: 0, color: displayNet >= 0 ? '#1890ff' : '#ff4d4f' }}>
          ₹{displayNet.toFixed(2)}
        </Title>
      </Card> */}
    </div>
  );
}
