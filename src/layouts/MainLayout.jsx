import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Drawer, Grid, Typography, Dropdown, Avatar, Space } from 'antd';
import {
  MenuOutlined,
  LogoutOutlined,
  DashboardOutlined,
  UsergroupAddOutlined,
  CheckSquareOutlined,
  BarChartOutlined,
  SettingOutlined,
  TranslationOutlined,
  BgColorsOutlined,
  CalculatorOutlined,
  FormOutlined,
  ContainerOutlined,
  FieldStringOutlined,
  DownOutlined,
  UserOutlined
} from '@ant-design/icons';
import useAuthStore from '../store/authStore';

const { Header, Sider, Content } = Layout;

export default function MainLayout({ themeMode, currentAccentColor }) {
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768);
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined style={{ fontSize: 16 }} />,
        label: <span style={{ fontSize: 15, fontWeight: 500, marginLeft: 8 }}>My Profile</span>,
        style: { padding: '10px 16px', borderRadius: 8, marginBottom: 4 }
      },
      {
        type: 'divider',
        style: { margin: '4px 0' }
      },
      {
        key: 'logout',
        icon: <LogoutOutlined style={{ fontSize: 16 }} />,
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
      icon: <DashboardOutlined style={{ fontSize: 18 }} />,
      label: 'Dashboard',
    },
    {
      key: '/app/clients',
      icon: <UsergroupAddOutlined style={{ fontSize: 18 }} />,
      label: 'Clients',
    },
    {
      key: '/app/tasks',
      icon: <CheckSquareOutlined style={{ fontSize: 18 }} />,
      label: 'Tasks',
    },
    {
      key: '/app/reports',
      icon: <BarChartOutlined style={{ fontSize: 18 }} />,
      label: 'Reports',
    },
  ];

  if (user?.role === 'ADMIN') {
    advocateMenuItems.push({
      key: '/app/admin/users',
      icon: <SettingOutlined style={{ fontSize: 18 }} />,
      label: 'Admin Panel',
    });
  }

  const existingMenuItems = [
    {
      key: '/app/tools/translator',
      icon: <TranslationOutlined style={{ fontSize: 18 }} />,
      label: 'Eng to Guj',
    },
    {
      key: '/app/tools/universal',
      icon: <BgColorsOutlined style={{ fontSize: 18 }} />,
      label: 'Universal Converter',
    },
    {
      key: '/app/tools/jantri',
      icon: <CalculatorOutlined style={{ fontSize: 18 }} />,
      label: 'Jantri Calculator',
    },
    {
      key: '/app/tools/rent_agreement',
      icon: <FormOutlined style={{ fontSize: 18 }} />,
      label: 'Rent Agreement',
    },
    {
      key: '/app/tools/invoice',
      icon: <ContainerOutlined style={{ fontSize: 18 }} />,
      label: 'Invoice Generator',
    },
    {
      key: '/app/tools/number_to_words',
      icon: <FieldStringOutlined style={{ fontSize: 18 }} />,
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

  // Determine selected key based on URL
  let selectedKey = location.pathname;

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex' }}>
      <Header className={`app-header ${themeMode === 'dark' ? 'dark' : 'light'}`} style={{
        position: 'fixed',
        zIndex: 9999,
        width: '100%',
        padding: isMobile ? '0 16px' : '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${themeMode === 'dark' ? '#30363d' : '#e1e4e8'}`,
        height: 64,
        top: 0,
      }}>
        <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          {isMobile && (
            <Button type="text" icon={<MenuOutlined style={{ fontSize: 20 }} />} onClick={() => setCollapsed(!collapsed)} style={{ padding: '0 8px', marginLeft: -8, marginRight: 4 }} />
          )}
          <img src="/logo.png" alt="Logo" style={{ height: isMobile ? 32 : 40, width: 'auto' }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '13px' : '18px', fontWeight: 700, lineHeight: 1.2 }}>
              JIKADARA & PANDAV ASSOCIATES
            </h2>
            <span style={{ fontSize: isMobile ? '10px' : '13px', opacity: 0.8, marginTop: '2px', lineHeight: 1.2 }}>
              Advocate and Legal Consultants
            </span>
          </div>
        </div>

        <Dropdown 
          menu={userMenu} 
          placement="bottomRight" 
          trigger={['click']}
          overlayStyle={{ paddingTop: '16px' }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12, 
            cursor: 'pointer', 
            padding: '6px 12px',
            borderRadius: '8px',
            background: themeMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
          }}>
            <Avatar 
              size={38} 
              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.name || 'User'}&backgroundColor=e6f4ff`} 
            />
            {!isMobile && (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', lineHeight: 1.2 }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{user?.name || 'User'}</span>
                <span style={{ fontSize: '12px', color: '#888', textTransform: 'capitalize' }}>
                  {user?.role?.toLowerCase() || 'Member'}
                </span>
              </div>
            )}
            <DownOutlined style={{ fontSize: 12, color: '#888' }} />
          </div>
        </Dropdown>
      </Header>

      <Layout style={{ marginTop: 64 }}>
        {isMobile ? (
          <Drawer
            placement="left"
            closable={false}
            onClose={() => setCollapsed(true)}
            open={!collapsed}
            width={260}
            styles={{ body: { padding: 0 } }}
          >
            <div style={{ padding: '16px 24px', fontWeight: 'bold', borderBottom: `1px solid ${themeMode === 'dark' ? '#30363d' : '#e1e4e8'}`, fontSize: 16 }}>
              Menu
            </div>
            <Menu
              theme={themeMode}
              mode="inline"
              selectedKeys={[selectedKey]}
              onClick={handleMenuClick}
              items={menuItems}
              style={{ padding: '8px 0', borderRight: 0 }}
            />
          </Drawer>
        ) : (
          <Sider
            width={260}
            theme={themeMode}
            collapsible
            collapsed={collapsed}
            onCollapse={(value) => setCollapsed(value)}
            style={{
              overflow: 'auto',
              height: 'calc(100vh - 64px)',
              position: 'fixed',
              left: 0,
              top: 64,
              bottom: 0,
              borderRight: `1px solid ${themeMode === 'dark' ? '#30363d' : '#e1e4e8'}`,
              zIndex: 90
            }}
          >
            <Menu
              theme={themeMode}
              mode="inline"
              selectedKeys={[selectedKey]}
              onClick={handleMenuClick}
              items={menuItems}
              style={{ padding: '16px 8px', borderRight: 0 }}
            />
          </Sider>
        )}

        <Layout style={{
          marginLeft: isMobile ? 0 : (collapsed ? 80 : 260),
          transition: 'all 0.2s',
          padding: isMobile ? '12px 8px' : '16px 24px',
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Content style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* The Outlet renders the matched child route */}
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
