import React, { useState } from 'react';
import { Card, Modal, Table, Button, Space, Input, DatePicker, message, Form } from 'antd';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useFinancialYears, useCreateFinancialYear, useUpdateFinancialYear, useDeleteFinancialYear } from '../hooks/useFinancialYears';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function FinancialYearManager() {
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  
  const { data: financialYears, isLoading } = useFinancialYears();
  const createMutation = useCreateFinancialYear();
  const updateMutation = useUpdateFinancialYear();
  const deleteMutation = useDeleteFinancialYear();

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      dates: [dayjs(record.startDate), dayjs(record.endDate)],
    });
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Financial Year?',
      content: 'Are you sure you want to delete this financial year?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          message.success('Financial year deleted');
        } catch (error) {
          message.error('Failed to delete financial year');
        }
      },
    });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name,
        startDate: values.dates[0].toISOString(),
        endDate: values.dates[1].toISOString(),
      };

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        message.success('Financial year updated');
      } else {
        await createMutation.mutateAsync(payload);
        message.success('Financial year added');
      }
      
      setEditingId(null);
      form.resetFields();
    } catch (error) {
      if (error.name !== 'ValidationError') {
        message.error('Failed to save financial year');
      }
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<Edit size={16} />} onClick={() => handleEdit(record)} />
          <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <Card title="Manage Financial Years" className="glass-panel" bordered={false} style={{ marginTop: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <Form.Item name="name" label="Name (e.g. FY 24-25)" rules={[{ required: true }]} style={{ flex: 1, marginBottom: 0 }}>
              <Input placeholder="Enter name" />
            </Form.Item>
            <Form.Item name="dates" label="Date Range" rules={[{ required: true }]} style={{ flex: 2, marginBottom: 0 }}>
              <RangePicker style={{ width: '100%' }} format="DD MMM YYYY" />
            </Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? 'Update' : 'Add'}
            </Button>
            {editingId && (
              <Button onClick={() => { setEditingId(null); form.resetFields(); }}>
                Cancel
              </Button>
            )}
          </div>
        </Form>
      </div>

      <Table
        dataSource={financialYears}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
      />
    </Card>
  );
}
