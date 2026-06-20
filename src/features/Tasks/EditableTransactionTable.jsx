import React, { useState, useEffect } from 'react';
import { Table, Input, InputNumber, DatePicker, Button, Popconfirm, Form, Typography, Space, message } from 'antd';
import { Edit, Trash2, Save, X, Plus, TrendingUp, TrendingDown } from 'lucide-react';
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
        date: row.date.toISOString(),
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
      date: dayjs().toISOString(),
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
              <Table.Summary.Cell index={0} colSpan={2}>Total {type === 'INCOME' ? 'Income' : 'Expense'}</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text type={color}>{formatCurrency(totalAmount)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}></Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
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
