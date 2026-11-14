import {
  Calculator,
  FileSignature,
  FileText,
  GitFork,
  Hash,
  Languages,
  Palette,
  ScanText,
  Sparkles,
} from 'lucide-react';

/**
 * Mirrors the website's "Tools" menu exactly (src/layouts/MainLayout.jsx).
 * `permissionKey` is the page key used by the existing admin permissions.
 */
export const TOOL_GROUPS = [
  {
    title: 'Translate',
    description: 'English ↔ Gujarati and legacy font conversion',
    items: [
      {
        key: '/app/tools/translator',
        label: 'Eng to Guj',
        description: 'Type English, get Gujarati Unicode + legacy keystrokes',
        icon: Languages,
      },
      {
        key: '/app/tools/ai-translator',
        label: 'AI Translate',
        description: 'Gemini-powered English ↔ Gujarati translation',
        icon: Sparkles,
      },
      {
        key: '/app/tools/universal',
        label: 'Universal Converter',
        description: 'Unicode, Ghanshyam and phonetic English converter',
        icon: Palette,
      },
    ],
  },
  {
    title: 'Jantri',
    description: 'Property valuation and agreement fees',
    items: [
      {
        key: '/app/tools/jantri',
        label: 'Makan/Milkat Jantri',
        description: 'Government land rate & stamp duty calculator',
        icon: Calculator,
      },
      {
        key: '/app/tools/rent_agreement',
        label: 'Rent Agreement',
        description: 'Rent, deposit, GST and registration fees',
        icon: FileSignature,
      },
    ],
  },
  {
    title: 'Billing & documents',
    description: 'Invoices, amounts in words and OCR',
    items: [
      {
        key: '/app/tools/invoice',
        label: 'Invoice Generator',
        description: 'Create, save and print professional invoices',
        icon: FileText,
      },
      {
        key: '/app/tools/number_to_words',
        label: 'Numbers to Words',
        description: 'Cheque-ready Indian and international words',
        icon: Hash,
      },
      {
        key: '/app/tools/document-ai',
        label: 'Document AI & OCR',
        description: 'Extract and edit Gujarati text from scans/PDFs',
        icon: ScanText,
      },
    ],
  },
  {
    title: 'Form Builder',
    description: 'Government forms with saved drafts',
    items: [
      {
        key: '/app/tools/pedhinamu',
        permissionKey: '/app/tools/pedhinamu',
        label: 'Pedhinamu Builder',
        description: 'Family tree and legal heir application',
        icon: GitFork,
      },
      {
        key: '/app/tools/form-builder/pan-new-application',
        permissionKey: '/app/tools/form-builder',
        label: 'PAN Card – New',
        description: 'PAN application form with photo & signature',
        icon: FileText,
      },
      {
        key: '/app/tools/form-builder/pan-correction',
        permissionKey: '/app/tools/form-builder',
        label: 'PAN Card – Correction',
        description: 'PAN correction form and document export',
        icon: FileText,
      },
      {
        key: '/app/tools/form-builder/marriage-registration',
        permissionKey: '/app/tools/form-builder',
        label: 'Marriage Registration',
        description: 'Marriage registration form and print layout',
        icon: FileSignature,
      },
      {
        key: '/app/tools/form-builder/property-tax-name-transfer',
        permissionKey: '/app/tools/form-builder',
        label: 'Property Tax – Name Transfer',
        description: 'Property tax name transfer form',
        icon: FileText,
      },
    ],
  },
];

export const ALL_TOOL_ITEMS = TOOL_GROUPS.flatMap((group) => group.items);

export const TOOL_BY_KEY = Object.fromEntries(
  ALL_TOOL_ITEMS.map((item) => [item.key, item])
);

export const TOOL_TITLES = Object.fromEntries(
  ALL_TOOL_ITEMS.map((item) => [item.key, item.label])
);
