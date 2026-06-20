const fs = require('fs');
const path = require('path');

const iconMap = {
  'PlusOutlined': 'Plus',
  'SearchOutlined': 'Search',
  'EditOutlined': 'Edit',
  'DeleteOutlined': 'Trash2',
  'FolderOpenOutlined': 'FolderOpen',
  'UserOutlined': 'User',
  'LockOutlined': 'Lock',
  'CopyOutlined': 'Copy',
  'DownloadOutlined': 'Download',
  'FieldStringOutlined': 'Hash',
  'BarChartOutlined': 'BarChart2',
  'PrinterOutlined': 'Printer',
  'SwapRightOutlined': 'ArrowRight',
  'ClearOutlined': 'XCircle',
  'SoundOutlined': 'Volume2',
  'SettingOutlined': 'Settings',
  'TranslationOutlined': 'Languages',
  'BgColorsOutlined': 'Palette',
  'FontSizeOutlined': 'Type',
  'MailOutlined': 'Mail',
  'SafetyCertificateOutlined': 'ShieldCheck',
  'CalendarOutlined': 'Calendar',
  'ReloadOutlined': 'RefreshCw',
  'CalculatorOutlined': 'Calculator',
  'FilePdfOutlined': 'FileText',
  'FormOutlined': 'FileSignature',
  'UserAddOutlined': 'UserPlus',
  'SaveOutlined': 'Save',
  'CloseOutlined': 'X',
  'ArrowLeftOutlined': 'ArrowLeft',
  'FileTextOutlined': 'FileText',
  'CheckCircleOutlined': 'CheckCircle',
  'SyncOutlined': 'RefreshCw'
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('@ant-design/icons')) return;

  console.log('Processing:', filePath);

  // Extract the imports
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]@ant-design\/icons['"];?/g;
  let match;
  let lucideImports = new Set();
  
  while ((match = importRegex.exec(content)) !== null) {
    const icons = match[1].split(',').map(i => i.trim()).filter(Boolean);
    icons.forEach(icon => {
      if (iconMap[icon]) {
        lucideImports.add(iconMap[icon]);
      } else {
        console.warn(`Unknown icon ${icon} in ${filePath}`);
      }
    });
  }

  // Replace import statement
  content = content.replace(importRegex, () => {
    if (lucideImports.size > 0) {
      return `import { ${Array.from(lucideImports).join(', ')} } from 'lucide-react';`;
    }
    return '';
  });

  // Replace JSX tags
  Object.keys(iconMap).forEach(antIcon => {
    const lucideIcon = iconMap[antIcon];
    // Replace <IconOutlined /> with <Icon size={16} />
    const selfClosingRegex = new RegExp(`<${antIcon}(\\s*[^>]*)/>`, 'g');
    content = content.replace(selfClosingRegex, `<${lucideIcon} size={16}$1/>`);
    
    // Replace icon={<IconOutlined />} with icon={<Icon size={16} />}
    // This is handled by the above regex usually, but let's be careful about props.
    // The self closing regex handles `<IconOutlined />` or `<IconOutlined className="x" />`
  });

  fs.writeFileSync(filePath, content, 'utf8');
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'src'));
console.log('Done replacing icons.');
