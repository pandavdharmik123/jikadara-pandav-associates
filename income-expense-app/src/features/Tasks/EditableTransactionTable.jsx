import React, { useState, useEffect } from 'react';
import { Table, Input, InputNumber, DatePicker, Button, Popconfirm, Form, Typography, Space, message, Grid } from 'antd';
import { Edit, Trash2, Save, X, Plus, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import { useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '../../hooks/useTasks';
import { formatCurrency } from '../../utils/currency';

const { Text } = Typography;

const EditableCell = ({
  editing,
  dataIndex,
  title,
  inputType,
  record,
  index,
  children,
  ...restProps
}) => {
  const inputNode = inputType === 'number' ? <InputNumber style={{ width: '100%' }} /> : 
                    inputType === 'date' ? <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /> :
                    <Input />;

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            {
              required: true,
              message: `Please Input ${title}!`,
            },
          ]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

export default function EditableTransactionTable({ taskId, type, transactions, isTaskDone }) {
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const [form] = Form.useForm();
  const [data, setData] = useState(transactions || []);
  const [editingKey, setEditingKey] = useState('');
  
  const createTxMutation = useCreateTransaction();
  const updateTxMutation = useUpdateTransaction();
  const deleteTxMutation = useDeleteTransaction();

  // Sync data with props when transactions change (except when editing)
  useEffect(() => {
    if (!editingKey) {
      setData(transactions);
    }
  }, [transactions, editingKey]);

  const isEditing = (record) => record.id === editingKey;

  const edit = (record) => {
    form.setFieldsValue({
      date: dayjs(record.date),
      description: record.description,
      amount: record.amount,
    });
    setEditingKey(record.id);
  };

  const cancel = () => {
    // If we cancel a new unsaved row, remove it
    if (editingKey.toString().startsWith('new-')) {
      const newData = data.filter(item => item.id !== editingKey);
      setData(newData);
    }
    setEditingKey('');
  };

  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const isNew = key.toString().startsWith('new-');
      
      const payload = {
        taskId,
        type,
        date: row.date.format('YYYY-MM-DD'),
        description: row.description,
        amount: row.amount
      };

      if (isNew) {
        await createTxMutation.mutateAsync(payload);
        message.success('Transaction added successfully');
      } else {
        await updateTxMutation.mutateAsync({ id: key, ...payload });
        message.success('Transaction updated successfully');
      }
      setEditingKey('');
    } catch (errInfo) {
      if (errInfo.name !== 'ValidationError') {
        message.error('Operation failed');
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTxMutation.mutateAsync({ id, taskId });
      message.success('Transaction deleted');
    } catch (error) {
      message.error('Failed to delete transaction');
    }
  };

  const handleAdd = () => {
    const newKey = `new-${Date.now()}`;
    const newData = {
      id: newKey,
      date: dayjs().format('YYYY-MM-DD'),
      description: '',
      amount: '',
      type,
    };
    setData([...data, newData]);
    form.setFieldsValue({
      date: dayjs(),
      description: '',
      amount: '',
    });
    setEditingKey(newKey);
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      editable: true,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      editable: true,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      editable: true,
      align: 'right',
      render: (amount) => {
        const color = type === 'INCOME' ? 'success' : 'danger';
        return <Text type={color} strong>{formatCurrency(amount)}</Text>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      align: 'center',
      render: (_, record) => {
        const editable = isEditing(record);
        if (isTaskDone) return null;
        
        return editable ? (
          <Space>
            <Button 
              type="primary" 
              icon={<Save size={16} />} 
              onClick={() => save(record.id)} 
              size="small"
              loading={createTxMutation.isPending || updateTxMutation.isPending}
            />
            <Popconfirm title="Cancel edit?" onConfirm={cancel}>
              <Button icon={<X size={16} />} size="small" />
            </Popconfirm>
          </Space>
        ) : (
          <Space>
            <Button 
              type="text" 
              icon={<Edit size={16} />} 
              onClick={() => edit(record)} 
              disabled={editingKey !== ''}
            />
            <Popconfirm title="Delete transaction?" onConfirm={() => handleDelete(record.id)}>
              <Button type="text" danger icon={<Trash2 size={16} />} disabled={editingKey !== ''} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record) => ({
        record,
        inputType: col.dataIndex === 'amount' ? 'number' : col.dataIndex === 'date' ? 'date' : 'text',
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  const totalAmount = data.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const color = type === 'INCOME' ? 'success' : 'danger';

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space align="center" size="small">
          <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: type === 'INCOME' ? '#f0fdf4' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: type === 'INCOME' ? '#16a34a' : '#dc2626' }}>
            {type === 'INCOME' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          </div>
          <Typography.Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            {type === 'INCOME' ? 'Income' : 'Expense'}
          </Typography.Title>
        </Space>
        {!isTaskDone && (
          <Button 
            type="primary" 
            icon={<Plus size={16} />} 
            onClick={handleAdd}
            disabled={editingKey !== ''}
            style={{ borderRadius: '8px', boxShadow: 'none' }}
          >
            Add {type === 'INCOME' ? 'Income' : 'Expense'}
          </Button>
        )}
      </div>
      <Form form={form} component={false}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid #f1f5f9',
                  color: '#94a3b8',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                  No {type === 'INCOME' ? 'income' : 'expense'} recorded yet
                </div>
                {!isTaskDone && (
                  <div style={{ fontSize: 11.5, marginTop: 4 }}>
                    Click "Add {type === 'INCOME' ? 'Income' : 'Expense'}" to add a transaction.
                  </div>
                )}
              </div>
            ) : (
              data.map((record) => {
                const editable = isEditing(record);
                if (editable) {
                  return (
                    <div
                      key={record.id}
                      style={{
                        padding: '14px',
                        background: '#ffffff',
                        borderRadius: 12,
                        border: '2px solid #6366f1',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <Form.Item
                        name="date"
                        label={<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Date</span>}
                        style={{ marginBottom: 0 }}
                        rules={[{ required: true, message: 'Please select date' }]}
                      >
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%', height: 38 }} />
                      </Form.Item>

                      <Form.Item
                        name="description"
                        label={<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Description</span>}
                        style={{ marginBottom: 0 }}
                        rules={[{ required: true, message: 'Please enter description' }]}
                      >
                        <Input placeholder="Enter description" style={{ height: 38 }} />
                      </Form.Item>

                      <Form.Item
                        name="amount"
                        label={<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Amount (₹)</span>}
                        style={{ marginBottom: 0 }}
                        rules={[{ required: true, message: 'Please enter amount' }]}
                      >
                        <InputNumber
                          placeholder="0"
                          min={0}
                          style={{ width: '100%', height: 38 }}
                        />
                      </Form.Item>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                        <Popconfirm title="Cancel edit?" onConfirm={cancel}>
                          <Button size="middle" icon={<X size={15} />}>
                            Cancel
                          </Button>
                        </Popconfirm>
                        <Button
                          type="primary"
                          size="middle"
                          icon={<Save size={15} />}
                          onClick={() => save(record.id)}
                          loading={createTxMutation.isPending || updateTxMutation.isPending}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={record.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '12px 14px',
                      background: '#ffffff',
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: '#0f172a',
                            wordBreak: 'break-word',
                            lineHeight: 1.35,
                          }}
                        >
                          {record.description || '—'}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: '#64748b',
                            marginTop: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <Calendar size={12} style={{ color: '#94a3b8' }} />
                          <span>{dayjs(record.date).format('DD/MM/YYYY')}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div
                          style={{
                            fontSize: 14.5,
                            fontWeight: 700,
                            color: type === 'INCOME' ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {formatCurrency(record.amount)}
                        </div>
                      </div>
                    </div>

                    {/* Actions row */}
                    {!isTaskDone && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: '1px solid #f8fafc',
                        }}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<Edit size={14} color="#4f46e5" />}
                          onClick={() => edit(record)}
                          disabled={editingKey !== ''}
                          style={{
                            borderRadius: 8,
                            width: 32,
                            height: 32,
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#eef2ff',
                          }}
                          title="Edit"
                        />
                        <Popconfirm
                          title="Delete transaction?"
                          description="Are you sure you want to delete this transaction?"
                          onConfirm={() => handleDelete(record.id)}
                          okText="Yes, Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<Trash2 size={14} color="#dc2626" />}
                            disabled={editingKey !== ''}
                            style={{
                              borderRadius: 8,
                              width: 32,
                              height: 32,
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#fef2f2',
                            }}
                            title="Delete"
                          />
                        </Popconfirm>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Total summary card */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: type === 'INCOME' ? '#f0fdf4' : '#fef2f2',
                borderRadius: 10,
                border: `1px solid ${type === 'INCOME' ? '#bbf7d0' : '#fecaca'}`,
                marginTop: 4,
              }}
            >
              <Text strong style={{ color: '#334155', fontSize: 13 }}>
                Total {type === 'INCOME' ? 'Income' : 'Expense'}
              </Text>
              <Text
                strong
                style={{
                  color: type === 'INCOME' ? '#16a34a' : '#dc2626',
                  fontSize: 14.5,
                }}
              >
                {formatCurrency(totalAmount)}
              </Text>
            </div>
          </div>
        ) : (
          <Table
            className="modern-dashboard-table"
            components={{
              body: {
                cell: EditableCell,
              },
            }}
            bordered={false}
            dataSource={data}
            columns={mergedColumns}
            rowClassName="editable-row"
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ x: 450 }}
            summary={() => (
              <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                <Table.Summary.Cell index={0} colSpan={2}>
                  Total {type === 'INCOME' ? 'Income' : 'Expense'}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text type={color}>{formatCurrency(totalAmount)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}></Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        )}
      </Form>
      <style>{`
        .editable-row .ant-form-item-explain {
          position: absolute;
          top: 100%;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
