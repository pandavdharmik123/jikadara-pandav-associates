import React, { useEffect, useState } from 'react';
import { Card, Typography, Avatar, Tag, Row, Col, Space, Form, Input, Button, message, Divider, Tooltip, Badge } from 'antd';
import { User, Mail, Phone, ShieldCheck, Calendar, Lock, KeyRound, CheckCircle2, Save, Info, ShieldAlert, Smartphone, QrCode, Shield, CheckCircle, AlertCircle } from 'lucide-react';
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
    <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', paddingBottom: 24 }}>
      {/* Top Header Hero Banner */}
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          marginBottom: 20,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #f1f5f9',
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative' }}>
              <Avatar
                size={80}
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${activeUser?.name || 'User'}&backgroundColor=e6f4ff`}
                style={{
                  border: '3px solid #ffffff',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: activeUser?.isActive ? '#10b981' : '#ef4444',
                  border: '2px solid #ffffff',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                  {activeUser?.name}
                </Title>
                <Tag
                  color={activeUser?.role === 'ADMIN' ? 'purple' : activeUser?.role === 'SENIOR' ? 'blue' : 'default'}
                  style={{ borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 600, margin: 0 }}
                >
                  {activeUser?.role}
                </Tag>
                <Tag
                  color={activeUser?.isActive ? 'success' : 'error'}
                  style={{ borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 600, margin: 0 }}
                >
                  {activeUser?.isActive ? 'Active Account' : 'Inactive'}
                </Tag>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', color: '#64748b', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={14} color="#94a3b8" />
                  {activeUser?.email}
                </span>
                {activeUser?.mobileNumber && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={14} color="#94a3b8" />
                    {activeUser?.mobileNumber}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} color="#94a3b8" />
                  Member since {activeUser?.createdAt ? dayjs(activeUser.createdAt).format('MMMM YYYY') : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Security Status Badges */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                backgroundColor: activeUser?.twoFactorEnabled ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${activeUser?.twoFactorEnabled ? '#bbf7d0' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <ShieldCheck size={16} color={activeUser?.twoFactorEnabled ? '#16a34a' : '#94a3b8'} />
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', lineHeight: 1 }}>2FA Auth</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: activeUser?.twoFactorEnabled ? '#16a34a' : '#64748b', marginTop: 2 }}>
                  {activeUser?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                backgroundColor: activeUser?.hasSecurityPin ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${activeUser?.hasSecurityPin ? '#bfdbfe' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <KeyRound size={16} color={activeUser?.hasSecurityPin ? '#2563eb' : '#94a3b8'} />
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', lineHeight: 1 }}>Security PIN</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: activeUser?.hasSecurityPin ? '#2563eb' : '#64748b', marginTop: 2 }}>
                  {activeUser?.hasSecurityPin ? 'Configured' : 'Not Set'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main 2-Column Balanced Grid */}
      <Row gutter={[20, 20]}>
        {/* Column 1: Account Information & Password */}
        <Col xs={24} lg={12}>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {/* Account Details Form */}
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
              styles={{ body: { padding: '20px 24px' } }}
              title={
                <Space>
                  <User size={18} color="#2563eb" />
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Account Information</span>
                </Space>
              }
            >
              <Form
                form={profileForm}
                layout="vertical"
                onFinish={handleUpdateProfile}
                requiredMark={false}
              >
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="name"
                      label={<span style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>Full Name <span style={{ color: '#ef4444' }}>*</span></span>}
                      rules={[{ required: true, message: 'Please enter your full name' }]}
                    >
                      <Input
                        prefix={<User size={15} color="#94a3b8" style={{ marginRight: 6 }} />}
                        placeholder="Your full name"
                        style={{ borderRadius: 8 }}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="mobileNumber"
                      label={<span style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>Mobile Number <span style={{ color: '#ef4444' }}>*</span></span>}
                      rules={[
                        { required: true, message: 'Please enter mobile number' },
                        { pattern: /^[0-9]{10}$/, message: 'Enter 10-digit number' }
                      ]}
                    >
                      <Input
                        prefix={<Phone size={15} color="#94a3b8" style={{ marginRight: 6 }} />}
                        placeholder="10-digit mobile"
                        maxLength={10}
                        style={{ borderRadius: 8 }}
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
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>Email Address</span>
                          <Tooltip title="Email address is linked to your login and cannot be updated">
                            <Info size={13} color="#94a3b8" style={{ cursor: 'pointer' }} />
                          </Tooltip>
                        </Space>
                      }
                    >
                      <Input
                        prefix={<Mail size={15} color="#94a3b8" style={{ marginRight: 6 }} />}
                        disabled
                        style={{ backgroundColor: '#f8fafc', color: '#64748b', borderRadius: 8 }}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Form.Item label={<span style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>Role / Permissions</span>}>
                      <div style={{ height: 32, display: 'flex', alignItems: 'center' }}>
                        <Tag
                          color={activeUser?.role === 'ADMIN' ? 'purple' : activeUser?.role === 'SENIOR' ? 'blue' : 'default'}
                          style={{ borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600, margin: 0 }}
                        >
                          <ShieldCheck size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                          {activeUser?.role}
                        </Tag>
                      </div>
                    </Form.Item>
                  </Col>
                </Row>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={updateProfileMutation.isPending}
                    icon={<Save size={15} />}
                    style={{ borderRadius: 8, padding: '0 20px', fontWeight: 600, background: '#2563eb' }}
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
              styles={{ body: { padding: '20px 24px' } }}
              title={
                <Space>
                  <Lock size={18} color="#2563eb" />
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Change Password</span>
                </Space>
              }
            >
              <Form
                form={passwordForm}
                layout="vertical"
                onFinish={handleChangePassword}
                requiredMark={false}
              >
                <Form.Item
                  name="currentPassword"
                  label={<span style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>Current Password <span style={{ color: '#ef4444' }}>*</span></span>}
                  rules={[{ required: true, message: 'Please enter current password' }]}
                >
                  <Input.Password
                    prefix={<Lock size={15} color="#94a3b8" style={{ marginRight: 6 }} />}
                    placeholder="Enter current password"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="newPassword"
                      label={<span style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>New Password <span style={{ color: '#ef4444' }}>*</span></span>}
                      rules={[
                        { required: true, message: 'Please enter new password' },
                        { min: 6, message: 'Must be at least 6 characters' }
                      ]}
                    >
                      <Input.Password
                        prefix={<KeyRound size={15} color="#94a3b8" style={{ marginRight: 6 }} />}
                        placeholder="New password (min 6 chars)"
                        style={{ borderRadius: 8 }}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="confirmPassword"
                      label={<span style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>Confirm Password <span style={{ color: '#ef4444' }}>*</span></span>}
                      dependencies={['newPassword']}
                      rules={[
                        { required: true, message: 'Please confirm password' },
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
                        prefix={<CheckCircle2 size={15} color="#94a3b8" style={{ marginRight: 6 }} />}
                        placeholder="Confirm new password"
                        style={{ borderRadius: 8 }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={changePasswordMutation.isPending}
                    icon={<KeyRound size={15} />}
                    style={{ borderRadius: 8, padding: '0 20px', fontWeight: 600, background: '#2563eb' }}
                  >
                    Update Password
                  </Button>
                </div>
              </Form>
            </Card>
          </Space>
        </Col>

        {/* Column 2: Security & Privacy Center */}
        <Col xs={24} lg={12}>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {/* Security Center Card */}
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
              styles={{ body: { padding: '20px 24px' } }}
              title={
                <Space>
                  <Shield size={18} color="#2563eb" />
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Security & Privacy Settings</span>
                </Space>
              }
            >
              {/* Financial Privacy PIN Block */}
              <div style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <KeyRound size={16} color="#2563eb" />
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>Financial Numbers PIN</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>Masks dashboard & reports totals with PIN</Text>
                    </div>
                  </div>

                  <Tag
                    color={activeUser?.hasSecurityPin ? 'success' : 'default'}
                    style={{ borderRadius: 10, padding: '2px 10px', fontWeight: 600, fontSize: 11, margin: 0 }}
                  >
                    {activeUser?.hasSecurityPin ? 'CONFIGURED' : 'NOT SET'}
                  </Tag>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12, alignItems: 'center' }}>
                  {activeUser?.hasSecurityPin ? (
                    <>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          setIsResetPinMode(true);
                          setPinModalVisible(true);
                        }}
                        style={{ fontSize: 12, color: '#2563eb', padding: 0 }}
                      >
                        Reset with Password
                      </Button>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => {
                          setIsResetPinMode(false);
                          setPinModalVisible(true);
                        }}
                        style={{ borderRadius: 6, fontWeight: 600, background: '#2563eb', padding: '0 12px' }}
                      >
                        Change PIN
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        setIsResetPinMode(false);
                        setPinModalVisible(true);
                      }}
                      style={{ borderRadius: 6, fontWeight: 600, background: '#2563eb', padding: '0 14px' }}
                    >
                      Set Security PIN
                    </Button>
                  )}
                </div>
              </div>

              {/* Two-Factor Authentication (2FA) Block */}
              <div style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <QrCode size={16} color="#16a34a" />
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>Two-Factor Authentication (2FA)</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>Google / Microsoft Authenticator app</Text>
                    </div>
                  </div>

                  <Tag
                    color={activeUser?.twoFactorEnabled ? 'success' : 'default'}
                    style={{ borderRadius: 10, padding: '2px 10px', fontWeight: 600, fontSize: 11, margin: 0 }}
                  >
                    {activeUser?.twoFactorEnabled ? 'ACTIVE' : 'DISABLED'}
                  </Tag>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <Button
                    type={activeUser?.twoFactorEnabled ? 'default' : 'primary'}
                    size="small"
                    onClick={() => setTwoFactorModalVisible(true)}
                    style={{
                      borderRadius: 6,
                      fontWeight: 600,
                      padding: '0 14px',
                      borderColor: activeUser?.twoFactorEnabled ? '#059669' : undefined,
                      color: activeUser?.twoFactorEnabled ? '#059669' : undefined,
                      background: !activeUser?.twoFactorEnabled ? '#2563eb' : undefined,
                    }}
                  >
                    {activeUser?.twoFactorEnabled ? 'Manage 2FA & Backup Codes' : 'Enable 2FA'}
                  </Button>
                </div>
              </div>

              {/* Security Health Checklist */}
              <div style={{ padding: '12px 16px', borderRadius: 10, background: '#ffffff', border: '1px dashed #cbd5e1' }}>
                <Text style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Account Protection Checklist
                </Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px' }}>
                    <CheckCircle size={14} color="#16a34a" />
                    <span style={{ color: '#334155' }}>Strong bcrypt hashed account password</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px' }}>
                    {activeUser?.twoFactorEnabled ? (
                      <CheckCircle size={14} color="#16a34a" />
                    ) : (
                      <AlertCircle size={14} color="#ea580c" />
                    )}
                    <span style={{ color: activeUser?.twoFactorEnabled ? '#334155' : '#ea580c' }}>
                      {activeUser?.twoFactorEnabled ? '2FA Two-Factor Authentication enabled' : '2FA Two-Factor Authentication recommended'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px' }}>
                    {activeUser?.hasSecurityPin ? (
                      <CheckCircle size={14} color="#16a34a" />
                    ) : (
                      <AlertCircle size={14} color="#ea580c" />
                    )}
                    <span style={{ color: activeUser?.hasSecurityPin ? '#334155' : '#ea580c' }}>
                      {activeUser?.hasSecurityPin ? 'Financial Privacy PIN protection active' : 'Financial Privacy PIN not set'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </Space>
        </Col>
      </Row>

      {/* Financial Year Manager Section */}
      {activeUser?.role !== 'ADMIN' && (
        <Row style={{ marginTop: 20 }}>
          <Col span={24}>
            <FinancialYearManager />
          </Col>
        </Row>
      )}

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
    </div>
  );
}
