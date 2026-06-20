import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Tag, Space, Modal, message, Row, Col, Alert } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useTask, useMarkTaskDone, useReopenTask } from '../../hooks/useTasks';
import useAuthStore from '../../store/authStore';
import EditableTransactionTable from './EditableTransactionTable';
import Loader from '../../components/Loader';
import dayjs from 'dayjs';

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
      <div className="page-header" style={{ marginBottom: 16 }}>
        <Space align="center" size="middle">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/app/tasks')}
            style={{ fontSize: 16 }}
          />
          <div>
            <Title level={3} style={{ margin: 0 }}>{task.documentType}</Title>
            <Text type="secondary">
              Client: <a onClick={() => navigate(`/app/clients/${task.client?.id}`)}>{task.client?.name}</a>
              {task.referenceName && ` | Reference: ${task.referenceName}`}
            </Text>
          </div>
        </Space>

        <Space>
          {canToggleStatus && (
            <Button
              type={isTaskDone ? "default" : "primary"}
              danger={isTaskDone}
              icon={isTaskDone ? <SyncOutlined /> : <CheckCircleOutlined />}
              onClick={handleToggleStatus}
              loading={markDoneMutation.isPending || reopenMutation.isPending}
            >
              {isTaskDone ? 'Reopen' : 'Mark Done'}
            </Button>
          )}
        </Space>
      </div>

      {/* {isTaskDone && (
        <Alert
          message="This task is marked as DONE"
          description="No more transactions can be added. Only Senior or Admin can reopen this."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )} */}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card className="glass-panel stat-card" bordered={false}>
            <div className="stat-icon" style={{ background: 'rgba(82, 196, 26, 0.1)', color: '#52c41a' }}>₹</div>
            <div className="stat-content">
              <div className="stat-value" style={{ color: '#52c41a' }}>₹{displayIncome.toFixed(2)}</div>
              <div className="stat-label">Total Income</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="glass-panel stat-card" bordered={false}>
            <div className="stat-icon" style={{ background: 'rgba(255, 77, 79, 0.1)', color: '#ff4d4f' }}>₹</div>
            <div className="stat-content">
              <div className="stat-value" style={{ color: '#ff4d4f' }}>₹{displayExpense.toFixed(2)}</div>
              <div className="stat-label">Total Expense</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="glass-panel stat-card" bordered={false}>
            <div className="stat-icon" style={{ background: displayNet >= 0 ? 'rgba(24, 144, 255, 0.1)' : 'rgba(255, 77, 79, 0.1)', color: displayNet >= 0 ? '#1890ff' : '#ff4d4f' }}>₹</div>
            <div className="stat-content">
              <div className="stat-value" style={{ color: displayNet >= 0 ? '#1890ff' : '#ff4d4f' }}>
                ₹{displayNet.toFixed(2)}
              </div>
              <div className="stat-label">Net Amount</div>
            </div>
          </Card>
        </Col>
      </Row>

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

      <Card className="glass-panel" bordered={false} styles={{ body: { padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }}>
        <Title level={4} style={{ margin: 0 }}>Net Amount (Total Profit)</Title>
        <Title level={4} style={{ margin: 0, color: displayNet >= 0 ? '#1890ff' : '#ff4d4f' }}>
          ₹{displayNet.toFixed(2)}
        </Title>
      </Card>
    </div>
  );
}
