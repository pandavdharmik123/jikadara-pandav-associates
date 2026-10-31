import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { Layout, Menu, Button, Drawer, Grid, Dropdown, Avatar, Badge, Select } from 'antd';
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
  User,
  Bell,
  ChevronLeft,
  ChevronRight,
  Files,
  Sparkles,
  Wallet,
  Trash2,
  GitFork,
  FileCheck,
  FileSpreadsheet,
  Receipt,
  CloudUpload
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useFinancialYears } from '../hooks/useFinancialYears';
import { hasPageAccess } from '../utils/pagePermissions';

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

  let menuItems = [];

  const rawToolItems = [
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
    },
    {
      key: '/app/tools/document-ai',
      icon: <Sparkles size={20} />,
      label: 'Document AI & OCR',
    },
    {
      key: '/app/tools/pedhinamu',
      icon: <GitFork size={20} />,
      label: 'Pedhinamu Builder',
    },
    {
      key: 'form-builder-group',
      icon: <FileSignature size={20} />,
      label: 'Form Builder',
      children: [
        {
          key: '/app/tools/form-builder/pan-new-application',
          permissionKey: '/app/tools/form-builder',
          label: 'PAN Card – New Application',
        },
        {
          key: '/app/tools/form-builder/pan-correction',
          permissionKey: '/app/tools/form-builder',
          label: 'PAN Card – Correction',
        },
        {
          key: '/app/tools/form-builder/marriage-registration',
          permissionKey: '/app/tools/form-builder',
          label: 'Marriage Registration',
        },
        {
          key: '/app/tools/form-builder/property-tax-name-transfer',
          permissionKey: '/app/tools/form-builder',
          label: 'Property Tax – Name Transfer',
        },
      ],
    },
  ];

  const prepareMenuItems = (items, canAccess) =>
    items
      .map((item) => {
        if (!item.children) return item;

        const children = item.children
          .filter((child) => canAccess(child.permissionKey || child.key))
          .map((child) => {
            const menuChild = { ...child };
            delete menuChild.permissionKey;
            return menuChild;
          });

        return { ...item, children };
      })
      .filter((item) =>
        item.children ? item.children.length > 0 : canAccess(item.key)
      );

  if (user?.role === 'ADMIN') {
    menuItems = [
      {
        key: 'admin-group',
        type: 'group',
        label: 'Administration',
        children: [
          {
            key: '/app/admin/users',
            icon: <Settings size={20} />,
            label: 'Admin Panel',
          },
          {
            key: '/app/admin/document-types',
            icon: <Files size={20} />,
            label: 'Document Types',
          },
          {
            key: '/app/admin/backup',
            icon: <CloudUpload size={20} />,
            label: 'Database Backups',
          },
          {
            key: '/app/recycle-bin',
            icon: <Trash2 size={20} />,
            label: 'Recycle Bin',
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        key: 'tools-group',
        type: 'group',
        label: 'Tools & Utilities',
        children: prepareMenuItems(rawToolItems, () => true),
      },
    ];
  } else {
    const rawAdvocateItems = [
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
      {
        key: 'excel-sheets-group',
        icon: <FileSpreadsheet size={20} />,
        label: 'Excel Sheets',
        children: [
          {
            key: '/app/excel-sheets/office-reports',
            permissionKey: '/app/office-expenses',
            icon: <Receipt size={20} />,
            label: 'Office Reports',
          },
          {
            key: '/app/excel-sheets/nondh-status',
            permissionKey: '/app/nondh-status',
            icon: <FileCheck size={20} />,
            label: 'Nondh Status',
          },
        ],
      },
      {
        key: '/app/upad',
        icon: <Wallet size={20} />,
        label: 'Upad List',
      },
      {
        key: '/app/recycle-bin',
        icon: <Trash2 size={20} />,
        label: 'Recycle Bin',
      },
      {
        key: '/app/admin/document-types',
        icon: <Files size={20} />,
        label: 'Document Types',
      },
    ];


    const allowedAdvocate = prepareMenuItems(rawAdvocateItems, (key) =>
      hasPageAccess(user, key)
    );
    const allowedTools = prepareMenuItems(rawToolItems, (key) =>
      hasPageAccess(user, key)
    );

    if (allowedAdvocate.length > 0) {
      menuItems.push({
        key: 'advocate-group',
        type: 'group',
        label: 'Advocate Management',
        children: allowedAdvocate,
      });
    }

    if (allowedAdvocate.length > 0 && allowedTools.length > 0) {
      menuItems.push({
        type: 'divider',
      });
    }

    if (allowedTools.length > 0) {
      menuItems.push({
        key: 'tools-group',
        type: 'group',
        label: 'Tools',
        children: allowedTools,
      });
    }
  }

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
        <img src="/logo.png" alt="Logo" style={{ height: 44, width: 'auto', flexShrink: 0 }} />
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
            <h2 style={{ margin: 0, textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#0f172a', lineHeight: 1.25, letterSpacing: '-0.2px' }}>
              JIKADARA & PANDAV<br />ASSOCIATES
            </h2>
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
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
          defaultOpenKeys={[
            ...(window.location.pathname.startsWith('/app/excel-sheets') ||
            window.location.pathname === '/app/office-expenses' ||
            window.location.pathname === '/app/nondh-status'
              ? ['excel-sheets-group']
              : []),
            ...(window.location.pathname.startsWith('/app/tools/form-builder')
              ? ['form-builder-group']
              : []),
          ]}
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
    <Layout style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>
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

      <Layout style={{ flex: 1, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
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
          flexShrink: 0,
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
                  {user?.role === 'ADMIN'
                    ? `System Administration & User Management • ${dayjs().format('dddd, MMMM D, YYYY')}`
                    : `Here's what's happening with your practice today. • ${dayjs().format('dddd, MMMM D, YYYY')}`}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 16 : 24 }}>
            {!isMobile && user?.role !== 'ADMIN' && (
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

        <Content
          style={{
            flex: 1,
            padding: location.pathname.includes('/form-builder') ? 0 : '16px',
            overflowY: location.pathname.includes('/form-builder') ? 'hidden' : 'auto',
            ...(location.pathname.includes('/form-builder')
              ? { display: 'flex', flexDirection: 'column' }
              : {}),
          }}
        >
          <Outlet />
        </Content>
      </Layout>

    </Layout>
  );
}
