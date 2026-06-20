import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Drawer, Grid, Typography } from 'antd';
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
  FieldStringOutlined
} from '@ant-design/icons';
import useAuthStore from '../store/authStore';

const { Header, Sider, Content } = Layout;

export default function MainLayout({ themeMode, currentAccentColor, setMainTab }) {
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

  const handleMenuClick = (e) => {
    // If it's an existing tool, we update the mainTab state and navigate to /app/tools
    const existingTools = ['translator', 'universal', 'jantri', 'rent_agreement', 'invoice', 'number_to_words', 'studio'];
    
    if (existingTools.includes(e.key)) {
      setMainTab(e.key);
      navigate(`/app/tools`);
    } else {
      navigate(e.key);
    }
    
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
      key: 'translator',
      icon: <TranslationOutlined style={{ fontSize: 18 }} />,
      label: 'Eng to Guj',
    },
    {
      key: 'universal',
      icon: <BgColorsOutlined style={{ fontSize: 18 }} />,
      label: 'Universal Converter',
    },
    {
      key: 'jantri',
      icon: <CalculatorOutlined style={{ fontSize: 18 }} />,
      label: 'Jantri Calculator',
    },
    {
      key: 'rent_agreement',
      icon: <FormOutlined style={{ fontSize: 18 }} />,
      label: 'Rent Agreement',
    },
    {
      key: 'invoice',
      icon: <ContainerOutlined style={{ fontSize: 18 }} />,
      label: 'Invoice Generator',
    },
    {
      key: 'number_to_words',
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

  // Determine selected key based on URL, or fallback to tools
  let selectedKey = location.pathname;
  if (location.pathname === '/app/tools') {
    // We would ideally read mainTab here, but we'll let it highlight the general section or leave it
    // For now, we'll just use the pathname for advocate paths
  }

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!isMobile && <Typography.Text>{user?.name}</Typography.Text>}
          <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
            Logout
          </Button>
        </div>
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
