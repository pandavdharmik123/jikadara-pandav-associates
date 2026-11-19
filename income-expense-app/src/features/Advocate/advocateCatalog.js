import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart2,
  Wallet,
  Receipt,
  FileCheck,
  BookMarked,
  ReceiptText,
  Files,
  Trash2,
  Settings,
  CloudUpload,
} from 'lucide-react';
import { hasPageAccess } from '../../utils/pagePermissions';

/**
 * Mobile mirror of the website's "Advocate Management" menu.
 * `permissionKey` matches the key stored in Admin → Users so a user sees the
 * same modules they can open on the website.
 */
export const ADVOCATE_SECTIONS = [
  {
    title: 'Daily work',
    description: 'Clients, cases and the day-to-day desk',
    items: [
      {
        key: '/app/dashboard',
        label: 'Dashboard',
        description: 'Appointments, collections and office overview',
        icon: LayoutDashboard,
      },
      {
        key: '/app/clients',
        label: 'Clients',
        description: 'Client profiles, contacts and history',
        icon: Users,
      },
      {
        key: '/app/tasks',
        label: 'Tasks',
        description: 'Cases, documents, fees and payments',
        icon: CheckSquare,
      },
    ],
  },
  {
    title: 'Accounts & registers',
    description: 'Reports and the Excel-sheet registers',
    items: [
      {
        key: '/app/reports',
        label: 'Reports',
        description: 'Monthly and yearly income / expense',
        icon: BarChart2,
      },
      {
        key: '/app/upad',
        label: 'Upad List',
        description: 'User profit withdrawal ledger',
        icon: Wallet,
      },
      {
        key: '/app/excel-sheets/office-reports',
        permissionKey: '/app/office-expenses',
        label: 'Office Reports',
        description: 'Office income and expense sheet',
        icon: Receipt,
      },
      {
        key: '/app/excel-sheets/nondh-status',
        permissionKey: '/app/nondh-status',
        label: 'Nondh Status',
        description: 'Revenue mutation / nondh tracking',
        icon: FileCheck,
      },
      {
        key: '/app/excel-sheets/notary-hisab',
        permissionKey: '/app/notary-hisab',
        label: 'Notary Hisab',
        description: 'Monthly notary register and statements',
        icon: BookMarked,
      },
      {
        key: '/app/excel-sheets/verabill',
        permissionKey: '/app/verabill',
        label: 'Verabill / Light Bill',
        description: 'Verabill and light-bill clients',
        icon: ReceiptText,
      },
    ],
  },
  {
    title: 'Administration',
    description: 'Settings, recycling and backups',
    items: [
      {
        key: '/app/admin/document-types',
        label: 'Document Types',
        description: 'Manage the document type list',
        icon: Files,
      },
      {
        key: '/app/recycle-bin',
        label: 'Recycle Bin',
        description: 'Restore or permanently remove deleted records',
        icon: Trash2,
      },
      {
        key: '/app/admin/users',
        label: 'Admin Panel',
        description: 'Users, roles and page permissions',
        icon: Settings,
        adminOnly: true,
      },
      {
        key: '/app/admin/backup',
        label: 'Database Backups',
        description: 'Run and download database backups',
        icon: CloudUpload,
        adminOnly: true,
      },
    ],
  },
];

/**
 * Admin accounts own the whole office, but the website's permission helper
 * deliberately restricts ADMIN to admin/tool pages. In the mobile office hub
 * an admin should still be able to open the day-to-day modules, so grant it.
 */
export function canAccessAdvocatePage(user, pageKey) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return hasPageAccess(user, pageKey);
}

export function canAccessAdvocateItem(user, item) {
  if (!user) return false;
  if (item.adminOnly) return user.role === 'ADMIN';
  return canAccessAdvocatePage(user, item.permissionKey || item.key);
}

export function getAdvocateSections(user) {
  return ADVOCATE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccessAdvocateItem(user, item)),
  })).filter((section) => section.items.length > 0);
}
