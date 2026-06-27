import React, { useState } from 'react';
import { Typography, Table, Button, Space, Modal, Form, Input, Select, Switch, message, Tag, Card } from 'antd';
import { UserPlus, Edit, Trash2 } from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../../hooks/useUsers';
import useAuthStore from '../../store/authStore';
import Loader from '../../components/Loader';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

export default function AdminUsers() {
  const { user: currentUser } = useAuthStore();
  const { data: users, isLoading } = useUsers();

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ role: 'JUNIOR', isActive: true });
    }
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await updateUserMutation.mutateAsync({ id: editingUser.id, ...values });
        message.success('User updated successfully');
      } else {
        await createUserMutation.mutateAsync(values);
        message.success('User created successfully');
      }
      handleCloseModal();
    } catch (error) {
      if (error.name !== 'ValidationError') {
        message.error(error.response?.data?.error || 'Operation failed');
      }
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete User?',
      content: 'Are you sure you want to delete this user?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await deleteUserMutation.mutateAsync(id);
          message.success('User deleted');
        } catch (error) {
          message.error(error.response?.data?.error || 'Operation failed');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag
          color={role === 'ADMIN' ? 'volcano' : role === 'SENIOR' ? 'geekblue' : 'default'}
          style={{ borderRadius: '16px', padding: '2px 12px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', border: 'none' }}
        >
          {role}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag
          color={isActive ? 'success' : 'error'}
          style={{ borderRadius: '16px', padding: '2px 12px', fontWeight: 500, fontSize: '12px', border: 'none' }}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<Edit size={16} />}
            onClick={() => handleOpenModal(record)}
            disabled={record.id === currentUser?.id && currentUser?.email === 'admin@jikadara.com'}
          />
          {record.id !== currentUser?.id && (
            <Button
              type="text"
              danger
              icon={<Trash2 size={16} />}
              onClick={() => handleDelete(record.id)}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="advocate-module" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#111827' }}>Admin Panel</Title>
          <Text style={{ color: '#6b7280', fontSize: '15px' }}>Manage system users</Text>
        </div>
        <Button
          type="primary"
          icon={<UserPlus size={18} />}
          size="large"
          onClick={() => handleOpenModal()}
          style={{ backgroundColor: '#10b981', borderColor: '#10b981', borderRadius: '8px', fontWeight: 500, padding: '0 20px', height: '44px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          Add New User
        </Button>
      </div>

      <Card bordered={false} styles={{ body: { padding: 0 } }} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #f3f4f6', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
        <Table
          className="modern-admin-table"
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={{ spinning: isLoading, indicator: <Loader size={60} /> }}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingUser ? 'Update User' : 'Create New User'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createUserMutation.isPending || updateUserMutation.isPending}
        okText="Save"
        cancelText="Cancel"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Enter Name' }]}
          >
            <Input placeholder="Enter Name" size="large" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Enter Email' },
              { type: 'email', message: 'Enter valid email' }
            ]}
          >
            <Input placeholder="email@example.com" size="large" disabled={!!editingUser} />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Enter Password' }]}
            >
              <Input.Password placeholder="Enter Password" size="large" />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Select Role' }]}
          >
            <Select size="large">
              <Option value="JUNIOR">Junior</Option>
              <Option value="SENIOR">Senior</Option>
              <Option value="ADMIN">Admin</Option>
            </Select>
          </Form.Item>

          {editingUser && (
            <Form.Item
              name="isActive"
              label="Is Active?"
              valuePropName="checked"
            >
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
