import React, { useState, useEffect } from 'react';
import { Table, Input, InputNumber, DatePicker, Button, Popconfirm, Form, Typography, Space, message } from 'antd';
import { EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '../../hooks/useTasks';

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
      width: '20%',
      editable: true,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: '40%',
      editable: true,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: '20%',
      editable: true,
      align: 'right',
      render: (amount) => {
        const color = type === 'INCOME' ? 'success' : 'danger';
        return <Text type={color} strong>₹{Number(amount || 0).toFixed(2)}</Text>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '20%',
      align: 'center',
      render: (_, record) => {
        const editable = isEditing(record);
        if (isTaskDone) return null;
        
        return editable ? (
          <Space>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={() => save(record.id)} 
              size="small"
              loading={createTxMutation.isPending || updateTxMutation.isPending}
            />
            <Popconfirm title="Cancel edit?" onConfirm={cancel}>
              <Button icon={<CloseOutlined />} size="small" />
            </Popconfirm>
          </Space>
        ) : (
          <Space>
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => edit(record)} 
              disabled={editingKey !== ''}
            />
            <Popconfirm title="Delete transaction?" onConfirm={() => handleDelete(record.id)}>
              <Button type="text" danger icon={<DeleteOutlined />} disabled={editingKey !== ''} />
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
        <Typography.Title level={5} style={{ margin: 0 }}>
          {type === 'INCOME' ? 'Income' : 'Expense'}
        </Typography.Title>
        {!isTaskDone && (
          <Button 
            type="dashed" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            disabled={editingKey !== ''}
          >
            Add {type === 'INCOME' ? 'Income' : 'Expense'}
          </Button>
        )}
      </div>
      <Form form={form} component={false}>
        <Table
          components={{
            body: {
              cell: EditableCell,
            },
          }}
          bordered
          dataSource={data}
          columns={mergedColumns}
          rowClassName="editable-row"
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 600 }}
          summary={() => (
            <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
              <Table.Summary.Cell index={0} colSpan={2}>Total {type === 'INCOME' ? 'Income' : 'Expense'}</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text type={color}>₹{totalAmount.toFixed(2)}</Text>
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
