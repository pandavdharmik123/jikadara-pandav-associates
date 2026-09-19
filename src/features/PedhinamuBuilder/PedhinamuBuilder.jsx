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
  Input
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
  ChevronDown
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import PedhinamuForm from './components/PedhinamuForm';
import PedhinamuPrintDocument from './components/PedhinamuPrintDocument';
import SavedDraftsModal from './components/SavedDraftsModal';
import GhanshyamInput from './components/GhanshyamInput';

import { DEFAULT_PEDHINAMU_DATA } from './constants/pedhinamuTemplate';
import { SAMPLE_MADHUBHAI_DATA } from './constants/sampleMadhubhaiData';
import { normalizeFamilyTree, updateNodePosition, updateMultipleNodePositions } from './utils/treeModel';
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
        return {
          ...parsed,
          tree: normalizeFamilyTree(parsed.tree, parsed.deceased)
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

  const [draftTitle, setDraftTitle] = useState('મધુભાઇ પરશોતમભાઇ જીકાદરા - પેઢીનામું');
  const [draftId, setDraftId] = useState(null);
  const [fontMode, setFontMode] = useState(() => {
    return localStorage.getItem('pedhinamu_font_mode') || 'ghanshyam';
  });
  const [zoom, setZoom] = useState(0.8);
  const [activePage, setActivePage] = useState('all'); // 'all' | '1' | '2'
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

  // Fit to screen width on mount
  useEffect(() => {
    if (viewportRef.current) {
      const containerWidth = viewportRef.current.clientWidth - 48;
      const targetScale = Math.min(1, Math.max(0.4, (containerWidth / 1344) * 0.95));
      setZoom(Number(targetScale.toFixed(2)));
    }
  }, []);

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

  // Load sample Madhubhai data
  const handleLoadSample = () => {
    Modal.confirm({
      title: 'Load Sample Reference Data?',
      content: 'This will replace the current form with the Madhubhai Reference Pedhinamu data (Late Madhubhai, 2 wives, 7 children, 3 panchas).',
      okText: 'Load Sample',
      onOk: () => {
        setData(SAMPLE_MADHUBHAI_DATA);
        setSelectedNodeId('root');
        setSelectedNodeIds(['root']);
        setDraftTitle('મધુભાઇ પરશોતમભાઇ જીકાદરા - પેઢીનામું');
        message.success('Sample reference data loaded!');
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
        setDraftTitle('Untitled Pedhinamu');
        setDraftId(null);
        message.info('Form reset to blank template');
      }
    });
  };

  // Save draft to cloud & local storage
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      // 1. Save locally
      const localDraftsRaw = localStorage.getItem('pedhinamu_saved_drafts') || '{}';
      const localDrafts = JSON.parse(localDraftsRaw);
      const draftKey = draftId || `draft-${Date.now()}`;
      localDrafts[draftKey] = {
        title: draftTitle || data.applicant?.name || 'Untitled',
        data,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('pedhinamu_saved_drafts', JSON.stringify(localDrafts));

      // 2. Save to Server DB
      try {
        if (draftId && !draftId.startsWith('draft-')) {
          await api.put(`/pedhinamu/${draftId}`, {
            title: draftTitle,
            applicantName: data.applicant?.name || '',
            deceasedName: data.deceased?.name || '',
            documentData: data
          });
        } else {
          const res = await api.post('/pedhinamu', {
            title: draftTitle,
            applicantName: data.applicant?.name || '',
            deceasedName: data.deceased?.name || '',
            documentData: data
          });
          if (res.data?.pedhinamu?.id) {
            setDraftId(res.data.pedhinamu.id);
          }
        }
      } catch (srvErr) {
        console.warn('Server sync failed, saved locally only:', srvErr.message);
      }

      message.success('Pedhinamu draft saved successfully!');
    } catch (err) {
      console.error(err);
      message.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  // Load selected draft
  const handleLoadDraft = (draftData, title) => {
    const normalized = {
      ...draftData,
      tree: normalizeFamilyTree(draftData.tree, draftData.deceased)
    };
    setData(normalized);
    setSelectedNodeId('root');
    setSelectedNodeIds(['root']);
    if (title) setDraftTitle(title);
  };

  // Standard Print Dialog (using legal landscape CSS @media print)
  const handlePrint = () => {
    window.print();
  };

  // Ultra High-Definition Legal Landscape PDF Export (336 DPI Lossless PNG via jsPDF)
  const handleDownloadPDF = async () => {
    setIsExporting(true);
    message.loading({
      content: 'Generating high-definition Legal Landscape PDF...',
      key: 'pdf-export',
      duration: 0
    });

    try {
      // 1. Ensure fonts (Ghanshyam, Gujarati) are completely loaded
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // 2. Identify Page 1 and Page 2 unscaled export elements
      const page1El =
        exportPage1Ref.current?.querySelector('.pedhinamu-page-1') ||
        printDocRef.current?.querySelector('.pedhinamu-page-1');
      const page2El =
        exportPage2Ref.current?.querySelector('.pedhinamu-page-2') ||
        printDocRef.current?.querySelector('.pedhinamu-page-2');

      if (!page1El || !page2El) {
        throw new Error('Could not locate Page 1 or Page 2 elements for export.');
      }

      // 3. Ensure all embedded images (photos) are fully loaded
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

      // Settle layout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Ultra-crisp html2canvas capture options:
      // scale: 3.5 creates a 4704 x 2856 canvas for each 14" x 8.5" page (= 336 DPI true print resolution)
      // lossless PNG data embedding eliminates all JPEG compression blurring, noise & edge ringing
      const h2cOptions = {
        scale: 3.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1344,
        windowHeight: 816
      };

      // Sequentially capture Page 1 and Page 2
      const page1Canvas = await html2canvas(page1El, h2cOptions);
      const page2Canvas = await html2canvas(page2El, h2cOptions);

      // Create jsPDF document with EXACT Legal Landscape dimensions (14in x 8.5in = 1008pt x 612pt)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: [1008, 612],
        compress: true
      });

      // Page 1
      const page1Png = page1Canvas.toDataURL('image/png');
      pdf.addImage(page1Png, 'PNG', 0, 0, 1008, 612, undefined, 'FAST');

      // Page 2
      pdf.addPage([1008, 612], 'landscape');
      const page2Png = page2Canvas.toDataURL('image/png');
      pdf.addImage(page2Png, 'PNG', 0, 0, 1008, 612, undefined, 'FAST');

      const filename = `${data.applicant?.name || 'Pedhinamu'}_Document.pdf`;
      pdf.save(filename);

      message.success({
        content: 'Pedhinamu PDF downloaded with crystal-clear quality!',
        key: 'pdf-export'
      });
    } catch (err) {
      console.error('PDF export failed:', err);
      message.error({
        content: 'Failed to generate high-resolution PDF. Please try again.',
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

          <div className="pedhinamu-header-draft-input">
            <GhanshyamInput
              value={draftTitle}
              placeholder="Draft Title (દા.ત. મધુભાઇ પેઢીનામું)"
              onChange={(e) => setDraftTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="pedhinamu-header-right">
          <Button
            className="btn-sample-data"
            icon={<Sparkles size={14} />}
            onClick={handleLoadSample}
          >
            Sample Data
          </Button>

          <Button
            icon={<FolderOpen size={14} />}
            onClick={() => setDraftsModalVisible(true)}
          >
            Saved Drafts
          </Button>

          <Button
            type="default"
            icon={<Save size={14} />}
            loading={isSaving}
            onClick={handleSaveDraft}
          >
            Save Draft
          </Button>

          <Button
            type="primary"
            className="btn-download-pdf"
            icon={<Download size={14} />}
            loading={isExporting}
            onClick={handleDownloadPDF}
            style={{ backgroundColor: currentAccentColor || '#4f46e5' }}
          >
            Download PDF
          </Button>

          <Dropdown
            menu={{
              items: [
                {
                  key: 'auto-arrange',
                  label: 'Auto-Arrange Tree',
                  onClick: handleAutoArrange
                },
                {
                  type: 'divider'
                },
                {
                  key: 'reset',
                  label: 'Reset Form to Blank',
                  danger: true,
                  onClick: handleReset
                }
              ]
            }}
          >
            <Button
              icon={<ChevronDown size={14} />}
              style={{ width: 34, padding: 0 }}
            />
          </Dropdown>
        </div>
      </div>

      {/* Main Workspace (Split View) */}
      <div className="pedhinamu-main-workspace">
        {/* Left Side: Form Editor */}
        <div className="pedhinamu-editor-pane">
          <PedhinamuForm
            data={data}
            onChange={setData}
            onAutoArrangeTree={handleAutoArrange}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </div>

        {/* Right Side: Live Canvas Preview Viewport */}
        <div className="pedhinamu-preview-pane" ref={previewPaneRef}>
          {/* Viewport Floating Controls */}
          <div className="pedhinamu-preview-controls">
            <Space size={16}>
              <Space>
                <Text style={{ color: '#fff', fontSize: 12 }}>Font:</Text>
                <Select
                  size="small"
                  value={fontMode}
                  style={{ width: 170 }}
                  onChange={setFontMode}
                  options={[
                    { value: 'ghanshyam', label: 'Ghanshyam (ઘનશ્યામ)' },
                    { value: 'unicode', label: 'Gujarati Unicode' }
                  ]}
                />
              </Space>

              <Space>
                <Text style={{ color: '#fff', fontSize: 12 }}>Page View:</Text>
                <Select
                  size="small"
                  value={activePage}
                  style={{ width: 120 }}
                  onChange={setActivePage}
                  options={[
                    { value: 'all', label: 'All (2 Pages)' },
                    { value: '1', label: 'Page 1 (Tree)' },
                    { value: '2', label: 'Page 2 (Panch)' }
                  ]}
                />
              </Space>
            </Space>

            <Space>
              <Tooltip title="Zoom Out">
                <Button
                  type="text"
                  size="small"
                  icon={<ZoomOut size={15} color="#fff" />}
                  onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                />
              </Tooltip>
              <Text style={{ color: '#fff', minWidth: 44, textAlign: 'center', fontSize: 12 }}>
                {Math.round(zoom * 100)}%
              </Text>
              <Tooltip title="Zoom In">
                <Button
                  type="text"
                  size="small"
                  icon={<ZoomIn size={15} color="#fff" />}
                  onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
                />
              </Tooltip>
              <Tooltip title="Fit to Width">
                <Button
                  type="text"
                  size="small"
                  icon={<Maximize2 size={14} color="#fff" />}
                  onClick={() => {
                    if (viewportRef.current) {
                      const containerWidth = viewportRef.current.clientWidth - 48;
                      const targetScale = Math.min(1, Math.max(0.4, (containerWidth / 1344) * 0.95));
                      setZoom(Number(targetScale.toFixed(2)));
                    }
                  }}
                />
              </Tooltip>
            </Space>
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

      {/* Offscreen unscaled export containers dedicated for razor-sharp 2-page PDF generation */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '1008pt',
          height: '612pt',
          overflow: 'hidden',
          zIndex: -9999,
          pointerEvents: 'none',
          opacity: 1
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
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '1008pt',
          height: '612pt',
          overflow: 'hidden',
          zIndex: -9999,
          pointerEvents: 'none',
          opacity: 1
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

      {/* Saved Drafts Modal */}
      <SavedDraftsModal
        visible={draftsModalVisible}
        onClose={() => setDraftsModalVisible(false)}
        onLoadDraft={handleLoadDraft}
        currentData={data}
      />
    </div>
  );
}
