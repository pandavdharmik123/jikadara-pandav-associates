import React, { useState } from 'react';
import { Card, Modal, Table, Button, Space, Input, DatePicker, message, Form } from 'antd';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useFinancialYears, useCreateFinancialYear, useUpdateFinancialYear, useDeleteFinancialYear } from '../hooks/useFinancialYears';
import dayjs from 'dayjs';

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
      startDate: dayjs(record.startDate),
      endDate: dayjs(record.endDate),
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
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
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
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Form.Item name="name" label="Name (e.g. FY 24-25)" rules={[{ required: true }]} style={{ flex: '1 1 220px', marginBottom: 0 }}>
              <Input placeholder="Enter name" />
            </Form.Item>
            <Form.Item
              name="startDate"
              label="Start Date"
              rules={[{ required: true, message: 'Start date is required' }]}
              style={{ flex: '1 1 170px', marginBottom: 0 }}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD MMM YYYY"
                allowClear={false}
                onChange={(date) => {
                  const end = form.getFieldValue('endDate');
                  if (date && end && end.isBefore(date, 'day')) {
                    form.setFieldsValue({ endDate: null });
                  }
                }}
              />
            </Form.Item>
            <Form.Item
              name="endDate"
              label="End Date"
              dependencies={['startDate']}
              rules={[
                { required: true, message: 'End date is required' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const start = getFieldValue('startDate');
                    if (!value || !start || !value.isBefore(start, 'day')) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('End date cannot be before the start date'));
                  },
                }),
              ]}
              style={{ flex: '1 1 170px', marginBottom: 0 }}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD MMM YYYY"
                allowClear={false}
                disabledDate={(current) => {
                  const start = form.getFieldValue('startDate');
                  return Boolean(current && start && current.isBefore(start, 'day'));
                }}
              />
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
