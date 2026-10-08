import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Button,
  Space,
  Typography,
  message,
  Select,
  Tooltip,
  Dropdown,
  Modal,
  Input,
  Tag
} from 'antd';
import {
  Save,
  Printer,
  Download,
  FolderOpen,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck,
  ChevronDown,
  PanelLeft,
  PanelLeftClose,
  CheckCircle2,
  RefreshCw,
  Copy,
  Cloud,
  MoreVertical,
  Trash2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toSvg, toPng } from 'html-to-image';

import PedhinamuForm from './components/PedhinamuForm';
import PedhinamuPrintDocument from './components/PedhinamuPrintDocument';
import SavedDraftsModal from './components/SavedDraftsModal';
import SavePedhinamuModal from './components/SavePedhinamuModal';
import GhanshyamInput from './components/GhanshyamInput';

import { DEFAULT_PEDHINAMU_DATA } from './constants/pedhinamuTemplate';
import { SAMPLE_MADHUBHAI_DATA } from './constants/sampleMadhubhaiData';
import { SAMPLE_HAYATI_DATA } from './constants/sampleHayatiData';
import { normalizeFamilyTree, updateNodePosition, updateMultipleNodePositions, updateNodeSize, updateNodeFontSize } from './utils/treeModel';
import { ensureUnicode } from './utils/unicodeUtils';
import api from '../../services/api';

import './styles/pedhinamu.scss';

const { Title, Text } = Typography;

export default function PedhinamuBuilder({ currentAccentColor }) {
  const printDocRef = useRef(null);
  const viewportRef = useRef(null);
  const previewPaneRef = useRef(null);
  const exportPage1Ref = useRef(null);
  const exportPage2Ref = useRef(null);

  // Active document data (defaulting to sample data for quick inspection & instant demo)
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('pedhinamu_active_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const normTree = normalizeFamilyTree(parsed.tree, parsed.deceased);
        const activeDeceasedName = normTree?.rootNode?.name || parsed.deceased?.name || '';
        return {
          pedhinamuType: parsed.pedhinamuType || 'DECEASED',
          ...parsed,
          deceased: {
            ...parsed.deceased,
            name: activeDeceasedName
          },
          tree: normTree
        };
      } catch (e) {
        console.error(e);
      }
    }
    return SAMPLE_MADHUBHAI_DATA;
  });

  const [selectedNodeId, setSelectedNodeId] = useState('root');
  const [selectedNodeIds, setSelectedNodeIds] = useState(['root']);

  const handleSelectNode = useCallback((id, multiIds) => {
    setSelectedNodeId(id);
    if (multiIds && Array.isArray(multiIds)) {
      setSelectedNodeIds(multiIds);
    } else if (id) {
      setSelectedNodeIds([id]);
    } else {
      setSelectedNodeIds([]);
    }
  }, []);

  const [draftTitle, setDraftTitle] = useState(() => {
    const saved = localStorage.getItem('pedhinamu_active_draft_title');
    if (saved && saved !== 'મધુભાઇ પરશોતમભાઇ જીકાદરા - પેઢીનામું') {
      return saved;
    }
    return '';
  });
  const [draftId, setDraftId] = useState(() => {
    return localStorage.getItem('pedhinamu_active_draft_id') || null;
  });
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [fontMode, setFontMode] = useState(() => {
    return localStorage.getItem('pedhinamu_font_mode') || 'ghanshyam';
  });
  const [zoom, setZoom] = useState(0.8);
  const [activePage, setActivePage] = useState('all'); // 'all' | '1' | '2'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [draftsModalVisible, setDraftsModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Autosave to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pedhinamu_active_data', JSON.stringify(data));
    } catch (err) {
      console.warn('Autosave quota exceeded:', err);
    }
  }, [data]);

  useEffect(() => {
    localStorage.setItem('pedhinamu_font_mode', fontMode);
  }, [fontMode]);

  useEffect(() => {
    if (draftId) {
      localStorage.setItem('pedhinamu_active_draft_id', draftId);
    } else {
      localStorage.removeItem('pedhinamu_active_draft_id');
    }
  }, [draftId]);

  useEffect(() => {
    if (draftTitle) {
      localStorage.setItem('pedhinamu_active_draft_title', draftTitle);
    }
  }, [draftTitle]);

  useEffect(() => {
    try {
      localStorage.removeItem('pedhinamu_saved_drafts');
    } catch (_) { }
  }, []);

  // Fit to screen width helper
  const handleFitToScreen = useCallback(() => {
    if (viewportRef.current) {
      const containerWidth = viewportRef.current.clientWidth - 64;
      const targetScale = Math.min(1.2, Math.max(0.35, (containerWidth / 1344) * 0.95));
      setZoom(Number(targetScale.toFixed(2)));
    }
  }, []);

  // Fit to screen width on mount
  useEffect(() => {
    handleFitToScreen();
  }, [handleFitToScreen]);

  // Auto fit when toggling sidebar
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitToScreen();
    }, 300);
    return () => clearTimeout(timer);
  }, [isSidebarCollapsed, handleFitToScreen]);

  // Handle Ctrl/Cmd + Wheel zoom in preview section with focal point preservation
  useEffect(() => {
    const previewEl = previewPaneRef.current;
    const viewportEl = viewportRef.current;
    if (!previewEl) return;

    const handleWheel = (e) => {
      // Intercept Ctrl/Cmd + Wheel or Trackpad Pinch
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        let delta = 0;
        if (Math.abs(e.deltaY) >= 40) {
          // Discrete mouse wheel notches
          delta = e.deltaY < 0 ? 0.08 : -0.08;
        } else {
          // Trackpad pinch-to-zoom (continuous smooth deltaY)
          delta = -e.deltaY * 0.003;
        }

        setZoom((prevZoom) => {
          const nextZoom = Number(Math.min(2.0, Math.max(0.3, prevZoom + delta)).toFixed(2));
          if (nextZoom === prevZoom) return prevZoom;

          // Keep point under cursor stable while zooming
          if (viewportEl) {
            const rect = viewportEl.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;
            const ratio = nextZoom / prevZoom;
            viewportEl.scrollLeft = Math.max(0, Math.round((viewportEl.scrollLeft + offsetX) * ratio - offsetX));
            viewportEl.scrollTop = Math.max(0, Math.round((viewportEl.scrollTop + offsetY) * ratio - offsetY));
          }

          return nextZoom;
        });
      }
    };

    previewEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      previewEl.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Handle node repositioning via drag on canvas (supports single node or batch map)
  const handleNodeMove = useCallback((nodeIdOrPositions, newX, newY) => {
    setData((prev) => {
      const normalized = normalizeFamilyTree(prev.tree, prev.deceased);
      let updatedRoot;
      if (typeof nodeIdOrPositions === 'object' && nodeIdOrPositions !== null) {
        updatedRoot = updateMultipleNodePositions(normalized.rootNode, nodeIdOrPositions);
      } else {
        updatedRoot = updateNodePosition(normalized.rootNode, nodeIdOrPositions, newX, newY);
      }
      return {
        ...prev,
        tree: { rootNode: updatedRoot }
      };
    });
  }, []);

  // Resize a node's box width from drag-resize handles in the canvas
  const handleNodeResize = useCallback((nodeId, updates) => {
    setData((prev) => {
      const normalized = normalizeFamilyTree(prev.tree, prev.deceased);
      const updatedRoot = updateNodeSize(normalized.rootNode, nodeId, updates);
      return { ...prev, tree: { rootNode: updatedRoot } };
    });
  }, []);

  // Change font size for a specific node
  const handleNodeFontSizeChange = useCallback((nodeId, fontSize) => {
    setData((prev) => {
      const normalized = normalizeFamilyTree(prev.tree, prev.deceased);
      const updatedRoot = updateNodeFontSize(normalized.rootNode, nodeId, fontSize);
      return { ...prev, tree: { rootNode: updatedRoot } };
    });
  }, []);

  // Switch Pedhinamu Type (ALIVE / DECEASED) without destroying family tree
  const handleTypeChange = (newType) => {
    setData((prev) => {
      const isAlive = newType === 'ALIVE';
      let updatedRoot = prev.tree?.rootNode;
      if (updatedRoot) {
        updatedRoot = {
          ...updatedRoot,
          deceased: !isAlive
        };
      }

      return {
        ...prev,
        pedhinamuType: newType,
        tree: updatedRoot ? { ...prev.tree, rootNode: updatedRoot } : prev.tree
      };
    });

    // message.success(
    //   newType === 'ALIVE'
    //     ? 'Pedhinamu mode switched to: 🟢 Alive / હયાતી (Hayati template loaded)'
    //     : 'Pedhinamu mode switched to: 🔴 Deceased / અવસાન પામેલ'
    // );
  };

  // Auto-arrange tree coordinates
  const handleAutoArrange = () => {
    setData((prev) => {
      const normalized = normalizeFamilyTree(prev.tree, prev.deceased);
      function clearPositions(node) {
        if (!node) return node;
        return {
          ...node,
          position: null,
          children: (node.children || []).map(clearPositions)
        };
      }

      return {
        ...prev,
        tree: { rootNode: clearPositions(normalized.rootNode) }
      };
    });
    message.success('Family Tree auto-arranged to symmetrical layout');
  };

  // Load sample data based on active mode
  const handleLoadSample = () => {
    const isAlive = data.pedhinamuType === 'ALIVE';
    const sampleToLoad = isAlive ? SAMPLE_HAYATI_DATA : SAMPLE_MADHUBHAI_DATA;
    const sampleTitle = isAlive
      ? 'ટાપણીયા છગનભાઇ પીતાંબરભાઇ - હયાતી પેઢીનામું'
      : 'મધુભાઇ પરશોતમભાઇ જીકાદરા - પેઢીનામું';

    Modal.confirm({
      title: isAlive ? 'Load Hayati Reference Sample?' : 'Load Deceased Reference Sample?',
      content: isAlive
        ? 'This will load reference data from "Pedhinamu DRAFT - Hayati.pdf" (Shri Chhaganbhai Pitambarbhai, wife, 7 alive heirs, 3 panchas).'
        : 'This will replace the current form with the Madhubhai Reference Pedhinamu data (Late Madhubhai, 2 wives, 7 children, 3 panchas).',
      okText: 'Load Sample',
      onOk: () => {
        setData(sampleToLoad);
        setSelectedNodeId('root');
        setSelectedNodeIds(['root']);
        setDraftTitle(sampleTitle);
        message.success(`${isAlive ? 'Hayati' : 'Deceased'} reference sample data loaded!`);
      }
    });
  };

  // Reset to empty template
  const handleReset = () => {
    Modal.confirm({
      title: 'Reset Pedhinamu Form?',
      content: 'This will clear all fields to empty defaults. Any unsaved progress will be lost.',
      okText: 'Reset Form',
      okType: 'danger',
      onOk: () => {
        setData(DEFAULT_PEDHINAMU_DATA);
        setSelectedNodeId('root');
        setSelectedNodeIds(['root']);
        setDraftTitle('');
        setDraftId(null);
        localStorage.removeItem('pedhinamu_active_draft_title');
        message.info('Form reset to blank template');
      }
    });
  };

  // Execute Save draft directly to PostgreSQL database
  const executeSaveDraft = async ({ title, saveAsNew = false }) => {
    setIsSaving(true);
    const applicantNameUni = ensureUnicode(data.applicant?.name) || '';
    const activeDeceasedName = data.tree?.rootNode?.name || data.deceased?.name || '';
    const deceasedNameUni = ensureUnicode(activeDeceasedName) || '';
    const primaryPersonUni = data.pedhinamuType === 'ALIVE'
      ? (applicantNameUni || deceasedNameUni)
      : (deceasedNameUni || applicantNameUni);

    const fallbackTitle = primaryPersonUni ? `${primaryPersonUni} - પેઢીનામું` : 'Untitled Pedhinamu';
    const finalTitle = (title || draftTitle || fallbackTitle).trim();
    const isNew = saveAsNew || !draftId || draftId.startsWith('draft-');

    const payloadData = {
      ...data,
      deceased: {
        ...data.deceased,
        name: activeDeceasedName
      }
    };

    try {
      if (!isNew && draftId) {
        const res = await api.put(`/pedhinamu/${draftId}`, {
          title: finalTitle,
          applicantName: applicantNameUni,
          deceasedName: deceasedNameUni,
          documentData: payloadData
        });
        if (res.data?.pedhinamu) {
          setDraftId(res.data.pedhinamu.id);
        }
        message.success(`Updated "${finalTitle}" in database!`);
      } else {
        const res = await api.post('/pedhinamu', {
          title: finalTitle,
          applicantName: applicantNameUni,
          deceasedName: deceasedNameUni,
          documentData: payloadData
        });
        if (res.data?.pedhinamu?.id) {
          setDraftId(res.data.pedhinamu.id);
        }
        message.success(`Saved "${finalTitle}" to database!`);
      }

      // Clean up any old legacy local storage draft backups
      try {
        localStorage.removeItem('pedhinamu_saved_drafts');
      } catch (_) { }

      setDraftTitle(finalTitle);
      setSaveModalVisible(false);
    } catch (err) {
      console.error('Database save error:', err);
      message.error(err.response?.data?.error || 'Failed to save to database');
    } finally {
      setIsSaving(false);
    }
  };

  // Save handler (shortcut or toolbar button click) -> Prompt user for title
  const handleSaveClick = () => {
    setSaveModalVisible(true);
  };

  // Load selected draft with its ID
  const handleLoadDraft = (draftData, title, id = null) => {
    const normTree = normalizeFamilyTree(draftData.tree, draftData.deceased);
    const activeDeceasedName = normTree?.rootNode?.name || draftData.deceased?.name || '';
    const normalized = {
      pedhinamuType: draftData.pedhinamuType || 'DECEASED',
      ...draftData,
      deceased: {
        ...draftData.deceased,
        name: activeDeceasedName
      },
      tree: normTree
    };
    setData(normalized);
    setSelectedNodeId('root');
    setSelectedNodeIds(['root']);
    if (title) setDraftTitle(title);
    setDraftId(id || null);
  };

  // Keyboard shortcut Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setSaveModalVisible(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);



  // SVG Export: Converts both pages to crisp scalable vector SVG with inlined Ghanshyam font
  const handleDownloadSVG = async () => {
    setIsExporting(true);
    message.loading({
      content: 'Generating vector SVG (both pages)...',
      key: 'svg-export',
      duration: 0
    });

    try {
      // Wait for fonts
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));

      const page1El =
        exportPage1Ref.current?.querySelector('.pedhinamu-page-1') ||
        printDocRef.current?.querySelector('.pedhinamu-page-1');
      const page2El =
        exportPage2Ref.current?.querySelector('.pedhinamu-page-2') ||
        printDocRef.current?.querySelector('.pedhinamu-page-2');

      if (!page1El || !page2El) {
        throw new Error('Could not locate Page 1 or Page 2 elements for SVG export.');
      }

      // html-to-image options:
      // - skipFonts:false  → inlines local fonts (Ghanshyam TTF)
      // - filter: skip cross-origin Google Fonts <link> nodes to suppress CORS SecurityError
      const svgOptions = {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        width: 1344,
        height: 816,
        skipFonts: false,
        style: {
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'geometricPrecision'
        },
        filter: (node) => {
          if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
            const href = node.href || '';
            if (href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com')) {
              return false;
            }
          }
          return true;
        }
      };

      // Capture both pages as standalone SVG data URIs.
      // toSvg() returns URL-encoded data URI: "data:image/svg+xml,<encoded>" — used directly as <image href>.
      const [svg1DataUrl, svg2DataUrl] = await Promise.all([
        toSvg(page1El, svgOptions),
        toSvg(page2El, svgOptions)
      ]);

      // Combine into a single 2-page vertical SVG (Page 1 on top, Page 2 below)
      // Each page is 1344 x 816 px at pixelRatio=2, representing 14in x 8.5in
      const docName = data.applicant?.name || 'Document';
      const combinedSvgParts = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"',
        '  width="1344" height="1680" viewBox="0 0 1344 1680">',
        `  <desc>Pedhinamu - ${docName} | Generated by Jikadara &amp; Pandav Associates</desc>`,
        '  <!-- Page 1 (Legal Landscape 14in x 8.5in) -->',
        '  <g id="page-1">',
        `    <image href="${svg1DataUrl}" x="0" y="0" width="1344" height="816" />`,
        '  </g>',
        '  <!-- Page 2 (Legal Landscape 14in x 8.5in) -->',
        '  <g id="page-2" transform="translate(0,840)">',
        `    <image href="${svg2DataUrl}" x="0" y="0" width="1344" height="816" />`,
        '  </g>',
        '</svg>'
      ];
      const combinedSvg = combinedSvgParts.join('\n');

      // Trigger file download
      const blob = new Blob([combinedSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.applicant?.name || 'Pedhinamu'}_Document.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success({
        content: 'SVG downloaded! Open in any browser or Inkscape for 100% vector sharpness.',
        key: 'svg-export',
        duration: 4
      });
    } catch (err) {
      console.error('SVG export failed:', err);
      message.error({
        content: 'SVG export failed. Please try again.',
        key: 'svg-export'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // PDF Export via html-to-image toPng at 576 DPI → jsPDF
  // Using toPng with pixelRatio:6 renders the DOM at 6× native density in one pass.
  // This is sharper than SVG→Canvas upscaling because the browser rasterizes
  // the font glyphs at full 576 DPI resolution with no intermediate upscale blur.
  const handleDownloadPDF = async () => {
    setIsExporting(true);
    message.loading({
      content: 'Generating crystal-clear 576 DPI PDF...',
      key: 'pdf-export',
      duration: 0
    });

    try {
      // 1. Wait for fonts
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 2. Identify Page 1 and Page 2 elements
      const page1El =
        exportPage1Ref.current?.querySelector('.pedhinamu-page-1') ||
        printDocRef.current?.querySelector('.pedhinamu-page-1');
      const page2El =
        exportPage2Ref.current?.querySelector('.pedhinamu-page-2') ||
        printDocRef.current?.querySelector('.pedhinamu-page-2');

      if (!page1El || !page2El) {
        throw new Error('Could not locate Page 1 or Page 2 elements for export.');
      }

      // 3. Ensure embedded photos are loaded
      const images = [
        ...Array.from(page1El.querySelectorAll('img')),
        ...Array.from(page2El.querySelectorAll('img'))
      ];
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      // 4. Capture at 576 DPI (pixelRatio:6 × 96 screen DPI)
      //    Output canvas: 8064 × 4896 px per page
      //    Sharp even at 400% PDF zoom on Retina displays
      const pngOptions = {
        backgroundColor: '#ffffff',
        pixelRatio: 6,
        width: 1344,
        height: 816,
        skipFonts: false,
        style: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'geometricPrecision'
        },
        filter: (node) => {
          if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
            const href = node.href || '';
            if (href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com')) {
              return false;
            }
          }
          return true;
        }
      };

      message.loading({ content: 'Rendering at 576 DPI...', key: 'pdf-export', duration: 0 });
      const [page1Png, page2Png] = await Promise.all([
        toPng(page1El, pngOptions),
        toPng(page2El, pngOptions)
      ]);

      // 5. Build PDF (Legal Landscape 14in × 8.5in = 1008pt × 612pt)
      message.loading({ content: 'Building PDF...', key: 'pdf-export', duration: 0 });
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: [1008, 612],
        compress: true
      });

      pdf.addImage(page1Png, 'PNG', 0, 0, 1008, 612, undefined, 'FAST');
      pdf.addPage([1008, 612], 'landscape');
      pdf.addImage(page2Png, 'PNG', 0, 0, 1008, 612, undefined, 'FAST');

      const filename = `${data.applicant?.name || 'Pedhinamu'}_Document.pdf`;
      pdf.save(filename);

      message.success({
        content: 'PDF downloaded at 576 DPI — crystal clear at any zoom!',
        key: 'pdf-export',
        duration: 3
      });
    } catch (err) {
      console.error('PDF export failed:', err);
      message.error({
        content: 'Failed to generate PDF. Please try again.',
        key: 'pdf-export'
      });
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <div className="pedhinamu-builder-container">
      {/* Top Header & Actions Bar */}
      <div className="pedhinamu-header-toolbar">
        <div className="pedhinamu-header-left">
          {/* Collapsible Sidebar Toggle */}
          <Tooltip title={isSidebarCollapsed ? "Expand Editor Panel" : "Collapse Editor Panel (Full Width Canvas)"}>
            <button
              type="button"
              className={`btn-sidebar-toggle ${isSidebarCollapsed ? 'active' : ''}`}
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            >
              {isSidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </Tooltip>

          <div className="pedhinamu-header-title-group">
            <div
              className="pedhinamu-header-icon-badge"
              style={{
                background: currentAccentColor ? `${currentAccentColor}14` : 'rgba(79, 70, 229, 0.08)',
                borderColor: currentAccentColor ? `${currentAccentColor}30` : 'rgba(79, 70, 229, 0.18)',
                color: currentAccentColor || '#4f46e5'
              }}
            >
              <FileCheck size={18} />
            </div>
            <span className="pedhinamu-header-title-text">
              પેઢીનામું
            </span>
          </div>

          <div className="pedhinamu-header-divider" />

          {/* Pedhinamu Type Mode Switcher: Alive / Hayati vs Deceased / Avsan */}
          <div className="pedhinamu-mode-selector-wrapper">
            <span className="mode-selector-label">પ્રકાર:</span>
            <div className="pedhinamu-mode-segmented">
              <button
                type="button"
                className={`pedhinamu-mode-btn ${data.pedhinamuType !== 'ALIVE' ? 'active-deceased' : ''}`}
                onClick={() => handleTypeChange('DECEASED')}
                title="Deceased Mode (અવસાન પામેલ - મૃત્યુ પામનારના વારસદારોનું પેઢીનામું)"
              >
                <span className="status-dot deceased-dot" />
                <span className="mode-text">અવસાન પામેલ (Deceased)</span>
              </button>
              <button
                type="button"
                className={`pedhinamu-mode-btn ${data.pedhinamuType === 'ALIVE' ? 'active-alive' : ''}`}
                onClick={() => handleTypeChange('ALIVE')}
                title="Alive Mode (હયાતી - હયાત વ્યક્તિના વારસદારોનું પેઢીનામું)"
              >
                <span className="status-dot alive-dot" />
                <span className="mode-text">હયાતી (Alive)</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pedhinamu-header-right">
          <Tooltip title="Load sample pedigree data">
            <Button
              className="btn-sample-data"
              icon={<Sparkles size={14} />}
              onClick={handleLoadSample}
            >
              <span className="btn-label">Sample</span>
            </Button>
          </Tooltip>

          <Tooltip title="View saved drafts in database">
            <Button
              className="btn-saved-drafts"
              icon={<FolderOpen size={14} />}
              onClick={() => setDraftsModalVisible(true)}
            >
              <span className="btn-label">Saved Documents</span>
            </Button>
          </Tooltip>

          {/* Save Button */}
          <Tooltip title="Save to Database (Ctrl+S / Cmd+S)">
            <Button
              type="default"
              className="btn-save-draft"
              icon={<Save size={14} style={{ color: '#4f46e5' }} />}
              loading={isSaving}
              onClick={handleSaveClick}
            >
              <span className="btn-label">Save</span>
            </Button>
          </Tooltip>

          <Space.Compact className="btn-download-group">
            <Button
              type="primary"
              className="btn-download-pdf"
              icon={<Download size={14} />}
              loading={isExporting}
              onClick={handleDownloadSVG}
              style={{ backgroundColor: currentAccentColor || '#4f46e5' }}
            >
              Download SVG
            </Button>

            <Dropdown
              menu={{
                items: [
                  {
                    key: 'download-pdf',
                    icon: <FileCheck size={14} style={{ color: '#ef4444' }} />,
                    label: 'Download PDF',
                    onClick: handleDownloadPDF
                  },
                  {
                    key: 'download-svg',
                    icon: <Download size={14} style={{ color: '#4f46e5' }} />,
                    label: 'Download SVG (Vector)',
                    onClick: handleDownloadSVG
                  }
                ]
              }}
              placement="bottomRight"
            >
              <Button
                type="primary"
                className="btn-download-arrow"
                icon={<ChevronDown size={14} />}
                style={{ backgroundColor: currentAccentColor || '#4f46e5' }}
              />
            </Dropdown>
          </Space.Compact>

          {/* More Actions Menu */}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'auto-arrange',
                  icon: <RefreshCw size={14} style={{ color: '#4f46e5' }} />,
                  label: 'Auto-Arrange Tree',
                  onClick: handleAutoArrange
                },
                {
                  type: 'divider'
                },
                {
                  key: 'reset',
                  icon: <Trash2 size={14} />,
                  label: 'Reset Form to Blank',
                  danger: true,
                  onClick: handleReset
                }
              ]
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Tooltip title="More Options">
              <Button
                className="btn-more-options"
                icon={<MoreVertical size={16} />}
              />
            </Tooltip>
          </Dropdown>
        </div>
      </div>

      {/* Main Workspace (Split View) */}
      <div className="pedhinamu-main-workspace">
        {/* Left Side: Form Editor (Smooth Collapsible) */}
        <div className={`pedhinamu-editor-pane ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <PedhinamuForm
            data={data}
            onChange={setData}
            onAutoArrangeTree={handleAutoArrange}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
          />
        </div>

        {/* Right Side: Live Canvas Preview Viewport */}
        <div className="pedhinamu-preview-pane" ref={previewPaneRef}>
          {/* Floating trigger to restore editor when collapsed */}
          {isSidebarCollapsed && (
            <button
              type="button"
              className="pedhinamu-floating-expand-btn"
              onClick={() => setIsSidebarCollapsed(false)}
            >
              <PanelLeft size={15} />
              <span>Expand Editor</span>
            </button>
          )}

          {/* Modern Floating Glassmorphism Control Dock */}
          <div className="pedhinamu-floating-control-dock">
            {/* Segmented Page Switcher */}
            <div className="dock-pill-switcher">
              <button
                type="button"
                className={`dock-pill-btn ${activePage === 'all' ? 'active' : ''}`}
                onClick={() => setActivePage('all')}
              >
                All (2 Pages)
              </button>
              <button
                type="button"
                className={`dock-pill-btn ${activePage === '1' ? 'active' : ''}`}
                onClick={() => setActivePage('1')}
              >
                Page 1 (Tree)
              </button>
              <button
                type="button"
                className={`dock-pill-btn ${activePage === '2' ? 'active' : ''}`}
                onClick={() => setActivePage('2')}
              >
                Page 2 (Panch)
              </button>
            </div>

            <div className="dock-divider" />

            {/* Font Selector */}
            <div className="dock-group">
              <Select
                size="small"
                value={fontMode}
                className="dock-select"
                style={{ width: 175 }}
                onChange={setFontMode}
                options={[
                  { value: 'ghanshyam', label: 'Nilkanth + Ghanshyam' },
                  { value: 'unicode', label: 'Gujarati Unicode' }
                ]}
              />
            </div>

            <div className="dock-divider" />

            {/* Zoom Controls */}
            <div className="dock-group">
              <button
                type="button"
                className="dock-zoom-btn"
                onClick={() => setZoom((z) => Math.max(0.35, Number((z - 0.1).toFixed(2))))}
              >
                <ZoomOut size={14} />
              </button>

              <span
                className="dock-zoom-badge"
                onClick={handleFitToScreen}
              >
                {Math.round(zoom * 100)}%
              </span>

              <button
                type="button"
                className="dock-zoom-btn"
                onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))}
              >
                <ZoomIn size={14} />
              </button>

              {/* <Tooltip title="Fit Canvas to Screen Width"> */}
              <button
                type="button"
                className="dock-fit-btn"
                onClick={handleFitToScreen}
              >
                Fit
              </button>
              {/* </Tooltip> */}
            </div>

            <div className="dock-divider" />

            {/* Quick Auto-Arrange Shortcut */}
            <Tooltip title="Auto-Arrange Tree Nodes">
              <button
                type="button"
                className="dock-zoom-btn auto-btn"
                onClick={handleAutoArrange}
              >
                <RefreshCw size={13} />
              </button>
            </Tooltip>
          </div>

          {/* Scrollable Viewport */}
          <div className="pedhinamu-preview-viewport" ref={viewportRef}>
            <div className="pedhinamu-scroll-track">
              <div
                className="pedhinamu-zoom-outer"
                style={{
                  width: `${Math.round(1344 * zoom)}px`,
                  minWidth: `${Math.round(1344 * zoom)}px`,
                  height: `${Math.round((activePage === 'all' ? 1632 : 816) * zoom)}px`,
                  minHeight: `${Math.round((activePage === 'all' ? 1632 : 816) * zoom)}px`,
                  position: 'relative',
                  flexShrink: 0
                }}
              >
                <div
                  className="pedhinamu-preview-sheet-wrapper"
                  style={{
                    width: '1008pt',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}
                >
                  <div ref={printDocRef}>
                    <PedhinamuPrintDocument
                      data={data}
                      onNodeMove={handleNodeMove}
                      onNodeResize={handleNodeResize}
                      onNodeFontSizeChange={handleNodeFontSizeChange}
                      interactive={true}
                      scale={zoom}
                      fontMode={fontMode}
                      activePage={activePage}
                      selectedNodeId={selectedNodeId}
                      selectedNodeIds={selectedNodeIds}
                      onSelectNode={handleSelectNode}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Clean Vector Print Container (rendered ONLY during @media print) */}
      <div className="pedhinamu-dedicated-print-container" aria-hidden="true">
        <PedhinamuPrintDocument
          data={data}
          activePage="all"
          interactive={false}
          scale={1}
          fontMode={fontMode}
        />
      </div>

      {/* Offscreen unscaled export containers dedicated for razor-sharp 2-page PDF generation */}
      <div
        className="pedhinamu-export-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '1008pt',
          height: '612pt',
          overflow: 'hidden',
          zIndex: -9999,
          pointerEvents: 'none',
          opacity: 1,
          backgroundColor: '#ffffff'
        }}
        aria-hidden="true"
      >
        <div ref={exportPage1Ref}>
          <PedhinamuPrintDocument
            data={data}
            activePage="1"
            interactive={false}
            scale={1}
            fontMode={fontMode}
          />
        </div>
      </div>

      <div
        className="pedhinamu-export-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '1008pt',
          height: '612pt',
          overflow: 'hidden',
          zIndex: -9999,
          pointerEvents: 'none',
          opacity: 1,
          backgroundColor: '#ffffff'
        }}
        aria-hidden="true"
      >
        <div ref={exportPage2Ref}>
          <PedhinamuPrintDocument
            data={data}
            activePage="2"
            interactive={false}
            scale={1}
            fontMode={fontMode}
          />
        </div>
      </div>

      {/* Save to Database Modal */}
      <SavePedhinamuModal
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        onSave={executeSaveDraft}
        currentData={data}
        currentDraftTitle={draftTitle}
        currentDraftId={draftId}
        isSaving={isSaving}
      />

      {/* Saved Drafts Modal */}
      <SavedDraftsModal
        visible={draftsModalVisible}
        onClose={() => setDraftsModalVisible(false)}
        onLoadDraft={handleLoadDraft}
        currentData={data}
        currentDraftId={draftId}
      />
    </div>
  );
}
