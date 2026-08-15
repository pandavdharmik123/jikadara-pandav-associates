import React, { useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Tag,
  Card,
  Checkbox,
  Row,
  Col,
  Divider,
  Tooltip
} from 'antd';
import { UserPlus, Edit, Trash2, CheckCircle2, Shield } from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../../hooks/useUsers';
import useAuthStore from '../../store/authStore';
import Loader from '../../components/Loader';
import { AVAILABLE_PAGE_GROUPS, DEFAULT_ALLOWED_PAGES, ALL_AVAILABLE_PAGES } from '../../utils/pagePermissions';
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
  const selectedRole = Form.useWatch('role', form);

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber || '',
        role: user.role,
        isActive: user.isActive,
        allowedPages: user.allowedPages && user.allowedPages.length > 0 ? user.allowedPages : DEFAULT_ALLOWED_PAGES,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        role: 'JUNIOR',
        isActive: true,
        allowedPages: DEFAULT_ALLOWED_PAGES,
      });
    }
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleSelectAllPages = () => {
    form.setFieldsValue({ allowedPages: DEFAULT_ALLOWED_PAGES });
  };

  const handleClearAllPages = () => {
    form.setFieldsValue({ allowedPages: [] });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        allowedPages: values.role === 'ADMIN' ? [] : (values.allowedPages || []),
      };

      if (editingUser) {
        await updateUserMutation.mutateAsync({ id: editingUser.id, ...payload });
        message.success('User updated successfully');
      } else {
        await createUserMutation.mutateAsync(payload);
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
      width: 'fit-content',
      render: (text) => <Text strong style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>{text}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text) => <span style={{ whiteSpace: 'nowrap' }}>{text}</span>,
    },
    {
      title: 'Mobile',
      dataIndex: 'mobileNumber',
      key: 'mobileNumber',
      render: (text) => <span style={{ whiteSpace: 'nowrap' }}>{text || '-'}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag
          color={role === 'ADMIN' ? 'volcano' : role === 'SENIOR' ? 'geekblue' : 'default'}
          style={{ borderRadius: '16px', padding: '2px 12px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', border: 'none', whiteSpace: 'nowrap' }}
        >
          {role}
        </Tag>
      ),
    },
    {
      title: 'Accessible Pages',
      key: 'allowedPages',
      render: (_, record) => {
        if (record.role === 'ADMIN') {
          return (
            <Tag color="purple" style={{ borderRadius: '12px', padding: '2px 10px', fontWeight: 500, whiteSpace: 'nowrap' }}>
              <Shield size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
              Admin Portal Only
            </Tag>
          );
        }

        const pages = Array.isArray(record.allowedPages) && record.allowedPages.length > 0
          ? record.allowedPages
          : DEFAULT_ALLOWED_PAGES;

        const count = pages.length;
        const total = ALL_AVAILABLE_PAGES.length;

        const pageLabels = pages.map((k) => {
          const match = ALL_AVAILABLE_PAGES.find((p) => p.key === k);
          return match ? match.label : k;
        });

        return (
          <Tooltip title={<div style={{ maxWidth: 280 }}>{pageLabels.join(', ')}</div>}>
            <Tag color={count === total ? 'green' : count > 0 ? 'blue' : 'orange'} style={{ borderRadius: '12px', padding: '2px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {count === total ? `All Pages (${total})` : `${count} of ${total} Pages`}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '2FA Security',
      dataIndex: 'twoFactorEnabled',
      key: 'twoFactorEnabled',
      render: (twoFactorEnabled) => (
        <Tag
          color={twoFactorEnabled ? 'success' : 'default'}
          style={{ borderRadius: '12px', padding: '2px 10px', fontWeight: 500, fontSize: '12px', whiteSpace: 'nowrap' }}
        >
          {twoFactorEnabled ? 'Enabled' : 'Disabled'}
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
          style={{ borderRadius: '16px', padding: '2px 12px', fontWeight: 500, fontSize: '12px', border: 'none', whiteSpace: 'nowrap' }}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => <span style={{ whiteSpace: 'nowrap' }}>{dayjs(date).format('DD/MM/YYYY')}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle" style={{ whiteSpace: 'nowrap' }}>
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
          <Text style={{ color: '#6b7280', fontSize: '15px' }}>Manage user accounts and page access permissions</Text>
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
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editingUser ? 'Update User & Permissions' : 'Create New User'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createUserMutation.isPending || updateUserMutation.isPending}
        okText="Save User"
        cancelText="Cancel"
        width={680}
        style={{ top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="name"
                label="Full Name"
                rules={[{ required: true, message: 'Enter Full Name' }]}
              >
                <Input placeholder="e.g. John Doe" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="mobileNumber"
                label="Mobile Number"
                rules={[
                  { required: true, message: 'Enter Mobile Number' },
                  { pattern: /^[0-9]{10}$/, message: 'Enter valid 10-digit mobile number' }
                ]}
              >
                <Input placeholder="e.g. 9876543210" size="large" maxLength={10} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: 'Enter Email' },
                  { type: 'email', message: 'Enter valid email' }
                ]}
              >
                <Input placeholder="email@example.com" size="large" disabled={!!editingUser} />
              </Form.Item>
            </Col>

            {!editingUser ? (
              <Col xs={24} sm={12}>
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[{ required: true, message: 'Enter Password' }]}
                >
                  <Input.Password placeholder="Enter Password" size="large" />
                </Form.Item>
              </Col>
            ) : (
              <Col xs={24} sm={12}>
                <Form.Item
                  name="isActive"
                  label="Active Status"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="role"
                label="User Role"
                rules={[{ required: true, message: 'Select Role' }]}
              >
                <Select size="large">
                  <Option value="JUNIOR">Junior</Option>
                  <Option value="SENIOR">Senior</Option>
                  <Option value="ADMIN">Admin</Option>
                </Select>
              </Form.Item>
            </Col>

            {editingUser && (
              <Col xs={24} sm={12}>
                <Form.Item label="Two-Factor Authentication (2FA)">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 40 }}>
                    <Tag color={editingUser.twoFactorEnabled ? 'success' : 'default'} style={{ borderRadius: 8, padding: '4px 10px', fontSize: 12 }}>
                      {editingUser.twoFactorEnabled ? 'Active / Enabled' : 'Disabled'}
                    </Tag>
                    {editingUser.twoFactorEnabled && (
                      <Button
                        size="small"
                        danger
                        onClick={async () => {
                          try {
                            await updateUserMutation.mutateAsync({ id: editingUser.id, reset2FA: true });
                            message.success('2FA has been reset for this user');
                            handleCloseModal();
                          } catch (err) {
                            message.error(err.response?.data?.error || 'Failed to reset 2FA');
                          }
                        }}
                      >
                        Reset 2FA
                      </Button>
                    )}
                  </div>
                </Form.Item>
              </Col>
            )}
          </Row>

          <Divider style={{ margin: '12px 0 16px 0' }} />

          {selectedRole === 'ADMIN' ? (
            <div style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '16px', marginBottom: 16 }}>
              <Space align="start">
                <Shield size={20} color="#9333ea" style={{ marginTop: 2 }} />
                <div>
                  <Text strong style={{ color: '#6b21a8', display: 'block', fontSize: 14 }}>
                    Administrator Account
                  </Text>
                  <Text style={{ color: '#7e22ce', fontSize: 13 }}>
                    Administrators have exclusive access to manage Users and Document Types. Operational pages and user data are hidden from Admin accounts.
                  </Text>
                </div>
              </Space>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <Text strong style={{ fontSize: 15, color: '#0f172a' }}>Page Visibility Permissions</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    Check the pages this user is allowed to access and view on their sidebar
                  </Text>
                </div>
                <Space size="small">
                  <Button size="small" onClick={handleSelectAllPages}>Select All</Button>
                  <Button size="small" onClick={handleClearAllPages}>Clear All</Button>
                </Space>
              </div>

              <Form.Item name="allowedPages" noStyle>
                <Checkbox.Group style={{ width: '100%' }}>
                  {AVAILABLE_PAGE_GROUPS.map((group) => (
                    <div
                      key={group.title}
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: '12px 16px',
                        marginBottom: 12
                      }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <Text strong style={{ fontSize: 13, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {group.title}
                        </Text>
                      </div>
                      <Row gutter={[12, 10]}>
                        {group.pages.map((p) => (
                          <Col xs={24} sm={12} key={p.key}>
                            <Checkbox value={p.key} style={{ fontSize: 13 }}>
                              <span style={{ fontWeight: 500, color: '#1e293b' }}>{p.label}</span>
                              <span style={{ display: 'block', fontSize: 11, color: '#64748b' }}>{p.description}</span>
                            </Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  ))}
                </Checkbox.Group>
              </Form.Item>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
}
