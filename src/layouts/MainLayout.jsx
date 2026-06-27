import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { Layout, Menu, Button, Drawer, Grid, Input, Dropdown, Avatar, Badge, Select } from 'antd';
import {
  Menu as MenuIcon,
  LogOut,
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart2,
  Settings,
  Languages,
  Palette,
  Calculator,
  FileSignature,
  FileText,
  Hash,
  ChevronDown,
  User,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  Files
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useFinancialYears } from '../hooks/useFinancialYears';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768);
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, activeFinancialYear, setActiveFinancialYear } = useAuthStore();
  const { data: financialYears, isLoading: fyLoading } = useFinancialYears();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  React.useEffect(() => {
    if (financialYears && financialYears.length > 0 && !activeFinancialYear) {
      const defaultFy = financialYears.find(f => f.isDefault) || financialYears[0];
      setActiveFinancialYear(defaultFy);
    }
  }, [financialYears, activeFinancialYear, setActiveFinancialYear]);

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <User size={16} />,
        label: <span style={{ fontSize: 15, fontWeight: 500, marginLeft: 8 }}>My Profile</span>,
        style: { padding: '10px 16px', borderRadius: 8, marginBottom: 4 }
      },
      {
        type: 'divider',
        style: { margin: '4px 0' }
      },
      {
        key: 'logout',
        icon: <LogOut size={16} />,
        label: <span style={{ fontSize: 15, fontWeight: 500, marginLeft: 8 }}>Logout</span>,
        danger: true,
        style: { padding: '10px 16px', borderRadius: 8, marginTop: 4 }
      },
    ],
    onClick: (e) => {
      if (e.key === 'profile') {
        navigate('/app/profile');
      } else if (e.key === 'logout') {
        handleLogout();
      }
    },
    style: {
      padding: '8px',
      borderRadius: '12px',
      minWidth: '200px',
      boxShadow: '0 12px 28px rgba(0,0,0,0.12)'
    }
  };

  const handleMenuClick = (e) => {
    navigate(e.key);
    if (isMobile) {
      setCollapsed(true);
    }
  };

  const advocateMenuItems = [
    {
      key: '/app/dashboard',
      icon: <LayoutDashboard size={20} />,
      label: 'Dashboard',
    },
    {
      key: '/app/clients',
      icon: <Users size={20} />,
      label: 'Clients',
    },
    {
      key: '/app/tasks',
      icon: <CheckSquare size={20} />,
      label: 'Tasks',
    },
    {
      key: '/app/reports',
      icon: <BarChart2 size={20} />,
      label: 'Reports',
    },
  ];

  if (user?.role === 'ADMIN') {
    advocateMenuItems.push(
      {
        key: '/app/admin/users',
        icon: <Settings size={20} />,
        label: 'Admin Panel',
      },
      {
        key: '/app/admin/document-types',
        icon: <Files size={20} />,
        label: 'Document Types',
      }
    );
  }

  const existingMenuItems = [
    {
      key: '/app/tools/translator',
      icon: <Languages size={20} />,
      label: 'Eng to Guj',
    },
    {
      key: '/app/tools/universal',
      icon: <Palette size={20} />,
      label: 'Universal Converter',
    },
    {
      key: '/app/tools/jantri',
      icon: <Calculator size={20} />,
      label: 'Jantri Calculator',
    },
    {
      key: '/app/tools/rent_agreement',
      icon: <FileSignature size={20} />,
      label: 'Rent Agreement',
    },
    {
      key: '/app/tools/invoice',
      icon: <FileText size={20} />,
      label: 'Invoice Generator',
    },
    {
      key: '/app/tools/number_to_words',
      icon: <Hash size={20} />,
      label: 'Numbers to Words',
    }
  ];

  const menuItems = [
    {
      key: 'advocate-group',
      type: 'group',
      label: 'Advocate Management',
      children: advocateMenuItems,
    },
    {
      type: 'divider',
    },
    {
      key: 'tools-group',
      type: 'group',
      label: 'Tools',
      children: existingMenuItems,
    }
  ];

  let selectedKey = location.pathname;

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getGreeting = () => {
    const hour = dayjs().hour();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const renderSidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: collapsed ? '24px 16px' : '24px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: '12px',
        borderBottom: '1px solid #f1f5f9',
        height: 89,
        overflow: 'hidden'
      }}>
        <img src="/logo.png" alt="Logo" style={{ height: 40, width: 'auto', flexShrink: 0 }} />
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              JIKADARA & PANDAV
            </h2>
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              Advocate & Legal Consultants
            </span>
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={handleMenuClick}
          items={menuItems}
          style={{ padding: '0 12px', borderRight: 0 }}
          className="sidebar-custom-menu"
        />
      </div>
      {!isMobile && (
        <div style={{ padding: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
          <Button
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            icon={collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            style={{ color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        </div>
      )}
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row' }}>
      {isMobile ? (
        <Drawer
          placement="left"
          closable={false}
          onClose={() => setCollapsed(true)}
          open={!collapsed}
          width={280}
          styles={{ body: { padding: 0 } }}
        >
          {renderSidebarContent()}
        </Drawer>
      ) : (
        <Sider
          width={280}
          collapsedWidth={80}
          theme="light"
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            height: '100vh',
            position: 'sticky',
            top: 0,
            left: 0,
            borderRight: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            zIndex: 100
          }}
        >
          {renderSidebarContent()}
        </Sider>
      )}

      <Layout style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <Header style={{
          padding: isMobile ? '12px 16px' : '0 24px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          height: 'auto',
          minHeight: 72,
          lineHeight: 'normal',
          position: 'sticky',
          top: 0,
          zIndex: 999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 16, flex: 1, height: '100%' }}>
            {isMobile && (
              <Button type="text" icon={<MenuIcon size={20} />} onClick={() => setCollapsed(!collapsed)} style={{ padding: '0 4px', marginLeft: -4 }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                {getGreeting()},{!isMobile && ' '}{isMobile && <br />}{user?.name || 'User'}!
              </div>
              {!isMobile && (
                <div style={{ color: '#64748b', fontSize: '13px', marginTop: 4, lineHeight: 1.2 }}>
                  Here's what's happening with your practice today. • {dayjs().format('dddd, MMMM D, YYYY')}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 16 : 24 }}>
            {!isMobile && (
              <Select
                placeholder="Select Financial Year"
                value={activeFinancialYear?.id || undefined}
                onChange={(id) => {
                  const fy = financialYears?.find(f => f.id === id);
                  setActiveFinancialYear(fy);
                }}
                style={{ width: 200 }}
                loading={fyLoading}
              >
                {financialYears?.map(fy => (
                  <Select.Option key={fy.id} value={fy.id}>
                    {fy.name}
                  </Select.Option>
                ))}
              </Select>
            )}

            <Badge dot color="red">
              <Bell size={20} color="#64748b" style={{ cursor: 'pointer' }} />
            </Badge>

            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', fontWeight: 600 }}>
                  {getInitials(user?.name)}
                </Avatar>
                {!isMobile && (
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                    {user?.name || 'User'}
                  </span>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ padding: '16px', overflow: 'initial' }}>
          <Outlet />
        </Content>
      </Layout>

    </Layout>
  );
}
