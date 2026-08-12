/**
 * Available pages definition and permission helpers for per-user access control
 */

export const AVAILABLE_PAGE_GROUPS = [
  {
    title: 'Advocate Management',
    description: 'Core legal workflow & case management modules',
    pages: [
      { key: '/app/dashboard', label: 'Dashboard', description: 'Overview, analytics & metrics' },
      { key: '/app/clients', label: 'Clients', description: 'Client profiles & records' },
      { key: '/app/tasks', label: 'Tasks', description: 'Task, case & financial ledger tracking' },
      { key: '/app/reports', label: 'Reports', description: 'Monthly & yearly financial reports' },
      { key: '/app/upad', label: 'Upad List', description: 'User profit withdrawal ledger' },
      { key: '/app/admin/document-types', label: 'Document Types', description: 'Document type configurations' },
    ],
  },
  {
    title: 'Tools & Utilities',
    description: 'Specialized document tools and converters',
    pages: [
      { key: '/app/tools/translator', label: 'Eng to Guj Translator', description: 'English to Gujarati phonetics' },
      { key: '/app/tools/universal', label: 'Universal Converter', description: 'Legacy font converter' },
      { key: '/app/tools/jantri', label: 'Jantri Calculator', description: 'Government land rate calculator' },
      { key: '/app/tools/rent_agreement', label: 'Rent Agreement', description: 'Stamp duty & registration fees' },
      { key: '/app/tools/invoice', label: 'Invoice Generator', description: 'Professional legal billing' },
      { key: '/app/tools/number_to_words', label: 'Numbers to Words', description: 'Cheque/legal word formatting' },
      { key: '/app/tools/document-ai', label: 'Document AI & OCR', description: 'Gujarati OCR & text extraction' },
    ],
  },
];

/**
 * Flat list of all available user pages
 */
export const ALL_AVAILABLE_PAGES = AVAILABLE_PAGE_GROUPS.flatMap((group) => group.pages);

/**
 * Default list of allowed pages assigned when no specific permissions are set
 */
export const DEFAULT_ALLOWED_PAGES = ALL_AVAILABLE_PAGES.map((p) => p.key);

/**
 * Check if a user has access to a specific page route
 * - ADMIN always has access to administrative pages (/app/admin/users, /app/admin/document-types, /app/profile)
 * - Regular users are checked against user.allowedPages
 */
export function hasPageAccess(user, pageKey) {
  if (!user) return false;

  // Profile is universally accessible
  if (pageKey === '/app/profile') return true;

  // ADMIN role access: strictly user management and document types
  if (user.role === 'ADMIN') {
    return pageKey === '/app/admin/users' || pageKey === '/app/admin/document-types';
  }

  // Non-admin cannot access admin panel users
  if (pageKey === '/app/admin/users') return false;

  const allowed = user.allowedPages;
  if (!Array.isArray(allowed) || allowed.length === 0) {
    // If no permissions array is defined on legacy user, fallback to default allowed pages
    return DEFAULT_ALLOWED_PAGES.includes(pageKey);
  }

  return allowed.includes(pageKey);
}

/**
 * Get the initial landing page route for a user
 */
export function getInitialUserRoute(user) {
  if (!user) return '/login';
  if (user.role === 'ADMIN') return '/app/admin/users';

  const allowed = user.allowedPages;
  if (Array.isArray(allowed) && allowed.length > 0) {
    return allowed[0];
  }
  return '/app/dashboard';
}
