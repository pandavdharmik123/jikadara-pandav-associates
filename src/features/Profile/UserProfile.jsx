import React, { useEffect, useState } from 'react';
import { Card, Typography, Avatar, Tag, Row, Col, Space, Form, Input, Button, message, Divider, Tooltip } from 'antd';
import { User, Mail, Phone, ShieldCheck, Calendar, Lock, KeyRound, CheckCircle2, Save, Info, ShieldAlert, Smartphone, QrCode } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useCurrentProfile, useUpdateProfile, useChangePassword } from '../../hooks/useUsers';
import dayjs from 'dayjs';
import FinancialYearManager from '../../components/FinancialYearManager';
import TwoFactorSettingsModal from '../../components/TwoFactorSettingsModal';
import SetPinModal from '../../components/SetPinModal';

const { Title, Text } = Typography;

export default function UserProfile() {
  const { user, updateUser } = useAuthStore();
  const { data: profileData, refetch: refetchProfile } = useCurrentProfile();

  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [twoFactorModalVisible, setTwoFactorModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [isResetPinMode, setIsResetPinMode] = useState(false);

  // Populate profile form when user/profileData is loaded
  useEffect(() => {
    const target = profileData || user;
    if (target) {
      profileForm.setFieldsValue({
        name: target.name,
        email: target.email,
        mobileNumber: target.mobileNumber || '',
      });
    }
  }, [profileData, user?.id, profileForm]);

  const handleUpdateProfile = async (values) => {
    try {
      const updatedUser = await updateProfileMutation.mutateAsync({
        name: values.name.trim(),
        mobileNumber: values.mobileNumber.trim(),
      });
      updateUser(updatedUser);
      message.success('Profile details updated successfully!');
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (values) => {
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Password changed successfully!');
      passwordForm.resetFields();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to change password');
    }
  };

  const activeUser = profileData || user;
  if (!activeUser) return null;

  return (
    <div className="advocate-module">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>My Profile</Title>
          <Text type="secondary">Manage your personal account details and security settings</Text>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* Left Column: Avatar & Overview */}
        <Col xs={24} lg={8}>
          <Card
            className="glass-panel"
            bordered={false}
            style={{ textAlign: 'center', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
          >
            <Avatar
              size={120}
              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${activeUser?.name || 'User'}&backgroundColor=e6f4ff`}
              style={{ marginBottom: 16, border: '3px solid #e2e8f0' }}
            />
            <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
              {activeUser?.name}
            </Title>
            <Text type="secondary" style={{ textTransform: 'capitalize', display: 'block', marginBottom: 12 }}>
              {activeUser?.role?.toLowerCase() || 'Member'}
            </Text>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              <Tag
                color={activeUser?.isActive ? 'success' : 'error'}
                style={{ borderRadius: 12, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}
              >
                {activeUser?.isActive ? 'Active Account' : 'Inactive'}
              </Tag>
              <Tag
                color={activeUser?.role === 'ADMIN' ? 'purple' : activeUser?.role === 'SENIOR' ? 'blue' : 'default'}
                style={{ borderRadius: 12, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}
              >
                {activeUser?.role}
              </Tag>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Mail size={16} color="#64748b" />
                <Text style={{ color: '#334155', fontSize: 13 }}>{activeUser?.email}</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Phone size={16} color="#64748b" />
                <Text style={{ color: '#334155', fontSize: 13 }}>{activeUser?.mobileNumber || 'Not set'}</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Calendar size={16} color="#64748b" />
                <Text style={{ color: '#64748b', fontSize: 13 }}>
                  Member since {activeUser?.createdAt ? dayjs(activeUser.createdAt).format('MMMM D, YYYY') : 'N/A'}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        {/* Right Column: Editable Profile & Change Password */}
        <Col xs={24} lg={16}>
          <Space orientation="vertical" size={24} style={{ width: '100%' }}>
            {/* Account Information Form */}
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
              title={
                <Space>
                  <User size={18} color="#2563eb" />
                  <span style={{ fontWeight: 700, fontSize: 16 }}>Edit Account Information</span>
                </Space>
              }
            >
              <Form
                form={profileForm}
                layout="vertical"
                onFinish={handleUpdateProfile}
                requiredMark="optional"
              >
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="name"
                      label={<span style={{ fontWeight: 600 }}>Full Name <span style={{ color: '#ef4444' }}>*</span></span>}
                      rules={[{ required: true, message: 'Please enter your full name' }]}
                    >
                      <Input
                        prefix={<User size={16} color="#94a3b8" style={{ marginRight: 6 }} />}
                        placeholder="Your full name"
                        size="large"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="mobileNumber"
                      label={<span style={{ fontWeight: 600 }}>Mobile Number <span style={{ color: '#ef4444' }}>*</span></span>}
                      rules={[
                        { required: true, message: 'Please enter your mobile number' },
                        { pattern: /^[0-9]{10}$/, message: 'Enter a valid 10-digit mobile number' }
                      ]}
                    >
                      <Input
                        prefix={<Phone size={16} color="#94a3b8" style={{ marginRight: 6 }} />}
                        placeholder="10-digit mobile number"
                        size="large"
                        maxLength={10}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="email"
                      label={
                        <Space size={4}>
                          <span style={{ fontWeight: 600 }}>Email Address</span>
                          <Tooltip title="Email address is linked to your login and cannot be updated">
                            <Info size={14} color="#64748b" style={{ cursor: 'pointer' }} />
                          </Tooltip>
                        </Space>
                      }
                      extra={<span style={{ fontSize: 12, color: '#94a3b8' }}>Email address cannot be changed</span>}
                    >
                      <Input
                        prefix={<Mail size={16} color="#94a3b8" style={{ marginRight: 6 }} />}
                        size="large"
                        disabled
                        style={{ backgroundColor: '#f8fafc', color: '#64748b' }}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Form.Item label={<span style={{ fontWeight: 600 }}>Role / Permissions</span>}>
                      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
                        <Tag
                          color={activeUser?.role === 'ADMIN' ? 'purple' : activeUser?.role === 'SENIOR' ? 'blue' : 'default'}
                          style={{ borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}
                        >
                          <ShieldCheck size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} />
                          {activeUser?.role}
                        </Tag>
                      </div>
                    </Form.Item>
                  </Col>
                </Row>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={updateProfileMutation.isPending}
                    icon={<Save size={16} />}
                    size="large"
                    style={{ borderRadius: 8, padding: '0 24px', fontWeight: 600 }}
                  >
                    Save Changes
                  </Button>
                </div>
              </Form>
            </Card>

            {/* Change Password Card */}
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
              title={
                <Space>
                  <Lock size={18} color="#2563eb" />
                  <span style={{ fontWeight: 700, fontSize: 16 }}>Security & Change Password</span>
                </Space>
              }
            >
              <Form
                form={passwordForm}
                layout="vertical"
                onFinish={handleChangePassword}
                requiredMark="optional"
              >
                <Row gutter={16}>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="currentPassword"
                      label={<span style={{ fontWeight: 600 }}>Current Password <span style={{ color: '#ef4444' }}>*</span></span>}
                      rules={[{ required: true, message: 'Please enter current password' }]}
                    >
                      <Input.Password
                        prefix={<Lock size={16} color="#94a3b8" style={{ marginRight: 6 }} />}
                        placeholder="Current password"
                        size="large"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="newPassword"
                      label={<span style={{ fontWeight: 600 }}>New Password <span style={{ color: '#ef4444' }}>*</span></span>}
                      rules={[
                        { required: true, message: 'Please enter new password' },
                        { min: 6, message: 'Must be at least 6 characters' }
                      ]}
                    >
                      <Input.Password
                        prefix={<KeyRound size={16} color="#94a3b8" style={{ marginRight: 6 }} />}
                        placeholder="New password"
                        size="large"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="confirmPassword"
                      label={<span style={{ fontWeight: 600 }}>Confirm New Password <span style={{ color: '#ef4444' }}>*</span></span>}
                      dependencies={['newPassword']}
                      rules={[
                        { required: true, message: 'Please confirm new password' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('newPassword') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Passwords do not match'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        prefix={<CheckCircle2 size={16} color="#94a3b8" style={{ marginRight: 6 }} />}
                        placeholder="Confirm password"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={changePasswordMutation.isPending}
                    icon={<KeyRound size={16} />}
                    size="large"
                    style={{ borderRadius: 8, padding: '0 24px', fontWeight: 600 }}
                  >
                    Update Password
                  </Button>
                </div>
              </Form>
            </Card>
            {/* Security PIN Card */}
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
              title={
                <Space>
                  <KeyRound size={18} color="#2563eb" />
                  <span style={{ fontWeight: 700, fontSize: 16 }}>Financial Privacy & Security PIN</span>
                </Space>
              }
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 15 }}>4-Digit Security PIN</Text>
                    <Tag
                      color={activeUser?.hasSecurityPin ? 'success' : 'default'}
                      style={{ borderRadius: 10, padding: '2px 10px', fontWeight: 600, fontSize: 12 }}
                    >
                      {activeUser?.hasSecurityPin ? 'CONFIGURED' : 'NOT CONFIGURED'}
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block', maxWidth: 500 }}>
                    Protects sensitive numbers like income, expense totals, and net profits with a 4-digit banking PIN on your dashboard.
                  </Text>
                </div>

                <Space wrap>
                  {activeUser?.hasSecurityPin ? (
                    <>
                      <Button
                        type="default"
                        icon={<KeyRound size={16} />}
                        onClick={() => {
                          setIsResetPinMode(false);
                          setPinModalVisible(true);
                        }}
                        style={{
                          borderRadius: 8,
                          fontWeight: 600,
                          height: 40,
                          padding: '0 16px',
                        }}
                      >
                        Change PIN
                      </Button>
                      <Button
                        type="link"
                        onClick={() => {
                          setIsResetPinMode(true);
                          setPinModalVisible(true);
                        }}
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#2563eb',
                        }}
                      >
                        Reset with Password
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="primary"
                      icon={<KeyRound size={16} />}
                      onClick={() => {
                        setIsResetPinMode(false);
                        setPinModalVisible(true);
                      }}
                      style={{
                        borderRadius: 8,
                        fontWeight: 600,
                        height: 40,
                        padding: '0 20px',
                        background: '#2563eb',
                      }}
                    >
                      Set Security PIN
                    </Button>
                  )}
                </Space>
              </div>
            </Card>

            {/* Two-Factor Authentication (TOTP) Card */}
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
              title={
                <Space>
                  <ShieldCheck size={18} color="#2563eb" />
                  <span style={{ fontWeight: 700, fontSize: 16 }}>Two-Factor Authentication (2FA)</span>
                </Space>
              }
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 15 }}>Authenticator App (TOTP)</Text>
                    <Tag
                      color={activeUser?.twoFactorEnabled ? 'success' : 'default'}
                      style={{ borderRadius: 10, padding: '2px 10px', fontWeight: 600, fontSize: 12 }}
                    >
                      {activeUser?.twoFactorEnabled ? 'ACTIVE / ENABLED' : 'NOT ENABLED'}
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block', maxWidth: 500 }}>
                    Use Google Authenticator, Microsoft Authenticator, or Authy to generate secure 6-digit verification codes upon login.
                  </Text>
                </div>

                <Button
                  type={activeUser?.twoFactorEnabled ? 'default' : 'primary'}
                  icon={<QrCode size={16} />}
                  onClick={() => setTwoFactorModalVisible(true)}
                  style={{
                    borderRadius: 8,
                    fontWeight: 600,
                    height: 40,
                    padding: '0 20px',
                    borderColor: activeUser?.twoFactorEnabled ? '#059669' : undefined,
                    color: activeUser?.twoFactorEnabled ? '#059669' : undefined,
                  }}
                >
                  {activeUser?.twoFactorEnabled ? 'Manage 2FA & Backup Codes' : 'Enable 2FA'}
                </Button>
              </div>
            </Card>
          </Space>
        </Col>
      </Row>

      {/* Security PIN Modal */}
      <SetPinModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        hasExistingPin={Boolean(activeUser?.hasSecurityPin)}
        isResetMode={isResetPinMode}
        onSuccess={() => {
          setPinModalVisible(false);
          if (refetchProfile) refetchProfile();
        }}
      />

      {/* Two-Factor Setup / Management Modal */}
      <TwoFactorSettingsModal
        visible={twoFactorModalVisible}
        onClose={() => setTwoFactorModalVisible(false)}
        user={activeUser}
        onStatusChanged={(updatedUserData) => {
          if (updatedUserData) {
            updateUser(updatedUserData);
            if (refetchProfile) refetchProfile();
          }
        }}
      />

      {/* Financial Year Manager for Non-Admin */}
      {activeUser?.role !== 'ADMIN' && (
        <Row style={{ marginTop: 24 }}>
          <Col span={24}>
            <FinancialYearManager />
          </Col>
        </Row>
      )}
    </div>
  );
}
