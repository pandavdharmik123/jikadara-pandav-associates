import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  Button,
  Radio,
  Slider,
  Space,
  Typography,
  Tooltip,
  Divider,
  message
} from 'antd';
import {
  Scissors,
  Scaling,
  RotateCw,
  RotateCcw,
  Check,
  Undo2,
  Sliders,
  Rotate3D,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  CopyCheck,
  FileDown,
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  FILTER_PRESETS,
  generateFilteredDataUrl,
  generateFilterThumbnail,
  renderPipelineDataUrl
} from '../utils/imageFilters';

const { Text } = Typography;

// Helper to draw an image rotated by given angle (0, 90, 180, 270)
const generateRotatedDataUrl = (sourceUri, angle) => {
  return new Promise((resolve) => {
    if (!sourceUri) {
      resolve('');
      return;
    }
    const normAngle = ((angle % 360) + 360) % 360;
    if (normAngle === 0) {
      resolve(sourceUri);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      const isSideways = normAngle === 90 || normAngle === 270;
      const outW = isSideways ? srcH : srcW;
      const outH = isSideways ? srcW : srcH;

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');

      if (normAngle === 90) {
        ctx.translate(srcH, 0);
        ctx.rotate((90 * Math.PI) / 180);
      } else if (normAngle === 180) {
        ctx.translate(srcW, srcH);
        ctx.rotate((180 * Math.PI) / 180);
      } else if (normAngle === 270) {
        ctx.translate(0, srcW);
        ctx.rotate((270 * Math.PI) / 180);
      }

      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(sourceUri);
    img.src = sourceUri;
  });
};

export default function PageEditModal({
  visible,
  onCancel,
  onApply,
  onApplyToAll,
  onOpenExportPdf,
  page,
  pages = [],
  onNavigatePage,
  defaultTab = 'crop'
}) {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'crop' | 'resize' | 'rotate'
  const [rotation, setRotation] = useState(0);
  const [rotatedBaseUri, setRotatedBaseUri] = useState('');
  const [applyingAll, setApplyingAll] = useState(false);
  const [showFilmstrip, setShowFilmstrip] = useState(true);

  // Filter State
  const [filterId, setFilterId] = useState('original');
  const [filterAdjustments, setFilterAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    sharpness: 0,
    saturation: 0,
    exposure: 0
  });
  const [filteredPreviewUri, setFilteredPreviewUri] = useState('');
  const [filterThumbnails, setFilterThumbnails] = useState({});
  const [isProcessingPreview, setIsProcessingPreview] = useState(false);

  // Unified Confirmation Modal for Apply to All Pages
  const [applyAllModalVisible, setApplyAllModalVisible] = useState(false);

  // Crop state: normalized coordinates (0.0 to 1.0) relative to rotated image
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 1, height: 1 });
  const [dragging, setDragging] = useState(null); // 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, crop: null });

  // Resize state
  const [dimensionPreset, setDimensionPreset] = useState('current');
  const [customWidth, setCustomWidth] = useState(595);
  const [customHeight, setCustomHeight] = useState(842);
  const [scaleFactor, setScaleFactor] = useState(1.0);

  const containerRef = useRef(null);
  const cropImageRef = useRef(null);
  const filmstripRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Determine active pages and current page position
  const activePages = pages && pages.length > 0 ? pages : (page ? [page] : []);
  const currentIndex = activePages.findIndex((p) => p.id === page?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < activePages.length - 1;
  const prevPage = hasPrev ? activePages[currentIndex - 1] : null;
  const nextPage = hasNext ? activePages[currentIndex + 1] : null;

  // Initialize state when modal opens or page changes
  useEffect(() => {
    if (visible && page) {
      const initRotation = page.rotation || 0;
      setRotation(initRotation);
      setActiveTab(defaultTab || 'crop');

      if (page.cropBox) {
        setCrop(page.cropBox);
      } else {
        setCrop({ x: 0, y: 0, width: 1, height: 1 });
      }

      setDimensionPreset(page.dimensionPreset || 'current');
      setCustomWidth(page.targetWidth || page.width || 595);
      setCustomHeight(page.targetHeight || page.height || 842);
      setScaleFactor(page.scaleFactor || 1.0);

      // Load Filter settings
      const initFilterId = page.filterId || 'original';
      const initAdjustments = page.filterAdjustments || {
        brightness: 0,
        contrast: 0,
        sharpness: 0,
        saturation: 0,
        exposure: 0
      };
      setFilterId(initFilterId);
      setFilterAdjustments(initAdjustments);

      const pristineUri = page.originalImageUri || page.imageUri;
      generateRotatedDataUrl(pristineUri, initRotation).then((uri) => {
        setRotatedBaseUri(uri);
        setFilteredPreviewUri(uri);
      });
    }
  }, [visible, page, defaultTab]);

  // Generate lightweight thumbnails for filter cards whenever the rotated source changes
  useEffect(() => {
    if (!rotatedBaseUri) return;
    let isCancelled = false;

    const generateAllThumbnails = async () => {
      const thumbs = {};
      for (const preset of FILTER_PRESETS) {
        if (isCancelled) break;
        try {
          const thumbUri = await generateFilterThumbnail(rotatedBaseUri, preset.id);
          thumbs[preset.id] = thumbUri;
        } catch (err) {
          console.warn('Error generating filter thumbnail:', err);
        }
      }
      if (!isCancelled) {
        setFilterThumbnails(thumbs);
      }
    };

    generateAllThumbnails();

    return () => {
      isCancelled = true;
    };
  }, [rotatedBaseUri]);

  // Live filter preview update with responsive debouncing for sliders
  useEffect(() => {
    if (!rotatedBaseUri) return;

    const isOriginal =
      filterId === 'original' &&
      !filterAdjustments.brightness &&
      !filterAdjustments.contrast &&
      !filterAdjustments.sharpness &&
      !filterAdjustments.saturation &&
      !filterAdjustments.exposure;

    if (isOriginal) {
      setFilteredPreviewUri(rotatedBaseUri);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setIsProcessingPreview(true);
      generateFilteredDataUrl(rotatedBaseUri, filterId, filterAdjustments)
        .then((uri) => {
          setFilteredPreviewUri(uri);
        })
        .finally(() => {
          setIsProcessingPreview(false);
        });
    }, 25);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [rotatedBaseUri, filterId, filterAdjustments]);

  // Scroll active filmstrip thumbnail into view
  useEffect(() => {
    if (filmstripRef.current && currentIndex >= 0) {
      const activeEl = filmstripRef.current.querySelector(`.filmstrip-thumb.active`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  // Filter Selection Handler
  const handleSelectFilter = (presetId) => {
    setFilterId(presetId);
    const preset = FILTER_PRESETS.find((p) => p.id === presetId) || FILTER_PRESETS[0];
    const newAdjustments = {
      brightness: preset.defaults.brightness || 0,
      contrast: preset.defaults.contrast || 0,
      sharpness: preset.defaults.sharpness || 0,
      saturation: preset.defaults.saturation || 0,
      exposure: preset.defaults.exposure || 0
    };
    setFilterAdjustments(newAdjustments);

    // Immediate preview update on click without waiting for debounce
    if (rotatedBaseUri) {
      if (presetId === 'original') {
        setFilteredPreviewUri(rotatedBaseUri);
      } else {
        generateFilteredDataUrl(rotatedBaseUri, presetId, newAdjustments).then((uri) => {
          setFilteredPreviewUri(uri);
        });
      }
    }
  };

  // Slider change handler
  const handleAdjustmentChange = (prop, val) => {
    setFilterAdjustments((prev) => ({
      ...prev,
      [prop]: val
    }));
  };

  // Reset Filter only (does NOT undo crop or rotation)
  const handleResetFilter = () => {
    setFilterId('original');
    setFilterAdjustments({
      brightness: 0,
      contrast: 0,
      sharpness: 0,
      saturation: 0,
      exposure: 0
    });
    setFilteredPreviewUri(rotatedBaseUri);
    message.info('Filter reset to Original');
  };

  // Rotation handlers
  const handleUpdateRotation = (newAngle) => {
    const normalized = ((newAngle % 360) + 360) % 360;
    setRotation(normalized);

    const pristineUri = page?.originalImageUri || page?.imageUri;
    generateRotatedDataUrl(pristineUri, normalized).then((uri) => {
      setRotatedBaseUri(uri);
    });
    setCrop({ x: 0, y: 0, width: 1, height: 1 });
  };

  const handleRotateCW = () => handleUpdateRotation(rotation + 90);
  const handleRotateCCW = () => handleUpdateRotation(rotation - 90);
  const handleRotate180 = () => handleUpdateRotation(rotation + 180);
  const handleResetRotation = () => handleUpdateRotation(0);

  // Crop Preset Handlers
  const handleResetFullCrop = () => {
    setCrop({ x: 0, y: 0, width: 1, height: 1 });
  };

  const handleTrimMargins = () => {
    setCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
  };

  const handleCenterFocus = () => {
    setCrop({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
  };

  // Crop Drag Handlers
  const handleCropMouseDown = (e, handleType) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cropImageRef.current) return;

    setDragging(handleType);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      crop: { ...crop }
    });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!dragging || !cropImageRef.current || !dragStart.crop) return;

      const imgRect = cropImageRef.current.getBoundingClientRect();
      if (imgRect.width === 0 || imgRect.height === 0) return;

      const dx = (e.clientX - dragStart.x) / imgRect.width;
      const dy = (e.clientY - dragStart.y) / imgRect.height;
      const orig = dragStart.crop;

      let nextX = orig.x;
      let nextY = orig.y;
      let nextW = orig.width;
      let nextH = orig.height;

      const MIN_SIZE = 0.05;

      if (dragging === 'move') {
        nextX = Math.max(0, Math.min(1 - orig.width, orig.x + dx));
        nextY = Math.max(0, Math.min(1 - orig.height, orig.y + dy));
      } else {
        if (dragging.includes('w')) {
          const potentialX = Math.max(0, Math.min(orig.x + orig.width - MIN_SIZE, orig.x + dx));
          nextW = orig.width - (potentialX - orig.x);
          nextX = potentialX;
        }
        if (dragging.includes('e')) {
          nextW = Math.max(MIN_SIZE, Math.min(1 - orig.x, orig.width + dx));
        }
        if (dragging.includes('n')) {
          const potentialY = Math.max(0, Math.min(orig.y + orig.height - MIN_SIZE, orig.y + dy));
          nextH = orig.height - (potentialY - orig.y);
          nextY = potentialY;
        }
        if (dragging.includes('s')) {
          nextH = Math.max(MIN_SIZE, Math.min(1 - orig.y, orig.height + dy));
        }
      }

      setCrop({
        x: Math.round(nextX * 1000) / 1000,
        y: Math.round(nextY * 1000) / 1000,
        width: Math.round(nextW * 1000) / 1000,
        height: Math.round(nextH * 1000) / 1000
      });
    },
    [dragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Dimension preset change handler
  const handlePresetChange = (e) => {
    const val = e.target.value;
    setDimensionPreset(val);
    if (val === 'a4') {
      setCustomWidth(595);
      setCustomHeight(842);
    } else if (val === 'letter') {
      setCustomWidth(612);
      setCustomHeight(792);
    } else if (val === 'legal') {
      setCustomWidth(612);
      setCustomHeight(1008);
    } else if (val === 'current' && page) {
      setCustomWidth(page.width || 595);
      setCustomHeight(page.height || 842);
    }
  };

  // Revert all changes for this page back to original
  const handleResetToOriginal = () => {
    setRotation(0);
    setCrop({ x: 0, y: 0, width: 1, height: 1 });
    setDimensionPreset('current');
    setCustomWidth(page.originalWidth || page.width || 595);
    setCustomHeight(page.originalHeight || page.height || 842);
    setScaleFactor(1.0);
    setFilterId('original');
    setFilterAdjustments({
      brightness: 0,
      contrast: 0,
      sharpness: 0,
      saturation: 0,
      exposure: 0
    });

    const pristineUri = page.originalImageUri || page.imageUri;
    setRotatedBaseUri(pristineUri);
    setFilteredPreviewUri(pristineUri);
    message.success('Page reset to original state.');
  };

  // Auto-save current page modifications before navigating
  const saveCurrentChanges = async (callback) => {
    if (!page || !rotatedBaseUri) {
      callback && callback();
      return;
    }

    const isCropChanged = crop.x > 0 || crop.y > 0 || crop.width < 0.999 || crop.height < 0.999;
    const isRotChanged = rotation !== (page.rotation || 0);
    const isScaleChanged = scaleFactor !== (page.scaleFactor || 1.0);
    const isPresetChanged = dimensionPreset !== (page.dimensionPreset || 'current');
    const isFilterChanged =
      filterId !== (page.filterId || 'original') ||
      JSON.stringify(filterAdjustments) !== JSON.stringify(page.filterAdjustments || {});

    if (!isCropChanged && !isRotChanged && !isScaleChanged && !isPresetChanged && !isFilterChanged) {
      callback && callback();
      return;
    }

    const isWholePage = crop.x === 0 && crop.y === 0 && crop.width >= 0.999 && crop.height >= 0.999;
    const isCropped = !isWholePage;
    const currentPreset = FILTER_PRESETS.find((p) => p.id === filterId) || FILTER_PRESETS[0];

    const naturalBaseW = page.originalWidth || page.width || 1000;
    const naturalBaseH = page.originalHeight || page.height || 1400;
    const isSideways = rotation === 90 || rotation === 270;
    const rotW = isSideways ? naturalBaseH : naturalBaseW;
    const rotH = isSideways ? naturalBaseW : naturalBaseH;
    const outW = Math.round((isCropped ? crop.width * rotW : rotW) * scaleFactor);
    const outH = Math.round((isCropped ? crop.height * rotH : rotH) * scaleFactor);

    try {
      const finalImageUri = await renderPipelineDataUrl({
        sourceUri: page.originalImageUri || page.imageUri,
        rotation,
        crop: isCropped ? crop : null,
        filterId,
        adjustments: filterAdjustments,
        scaleFactor
      });

      onApply({
        pageId: page.id,
        imageUri: finalImageUri,
        originalImageUri: page.originalImageUri || page.imageUri,
        rotation,
        cropBox: isCropped ? crop : null,
        isCropped,
        scaleFactor,
        dimensionPreset,
        targetWidth: outW,
        targetHeight: outH,
        width: outW,
        height: outH,
        filterId,
        filterName: currentPreset.name,
        filterAdjustments,
        closeModal: false
      });
    } catch (err) {
      console.error('Error saving current changes:', err);
    } finally {
      callback && callback();
    }
  };

  // Navigation handlers
  const handlePrevPage = () => {
    if (!hasPrev || !prevPage) return;
    saveCurrentChanges(() => {
      onNavigatePage && onNavigatePage(prevPage);
    });
  };

  const handleNextPage = () => {
    if (!hasNext || !nextPage) return;
    saveCurrentChanges(() => {
      onNavigatePage && onNavigatePage(nextPage);
    });
  };

  const handleJumpToPage = (target) => {
    if (!target || target.id === page?.id) return;
    saveCurrentChanges(() => {
      onNavigatePage && onNavigatePage(target);
    });
  };

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

      if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        handleNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, hasPrev, hasNext, prevPage, nextPage, rotatedBaseUri, crop, rotation, scaleFactor, dimensionPreset, filterId, filterAdjustments]);

  // Apply changes to single page (Save & Apply / Apply to Page)
  const handleApplySinglePage = async (closeModal = true) => {
    if (!page || !rotatedBaseUri) return;

    const isWholePage = crop.x === 0 && crop.y === 0 && crop.width >= 0.999 && crop.height >= 0.999;
    const isCropped = !isWholePage;
    const currentPreset = FILTER_PRESETS.find((p) => p.id === filterId) || FILTER_PRESETS[0];

    const naturalBaseW = page.originalWidth || page.width || 1000;
    const naturalBaseH = page.originalHeight || page.height || 1400;
    const isSideways = rotation === 90 || rotation === 270;
    const rotW = isSideways ? naturalBaseH : naturalBaseW;
    const rotH = isSideways ? naturalBaseW : naturalBaseH;
    const outW = Math.round((isCropped ? crop.width * rotW : rotW) * scaleFactor);
    const outH = Math.round((isCropped ? crop.height * rotH : rotH) * scaleFactor);

    const finalImageUri = await renderPipelineDataUrl({
      sourceUri: page.originalImageUri || page.imageUri,
      rotation,
      crop: isCropped ? crop : null,
      filterId,
      adjustments: filterAdjustments,
      scaleFactor
    });

    onApply({
      pageId: page.id,
      imageUri: finalImageUri,
      originalImageUri: page.originalImageUri || page.imageUri,
      rotation,
      cropBox: isCropped ? crop : null,
      isCropped,
      scaleFactor,
      dimensionPreset,
      targetWidth: outW,
      targetHeight: outH,
      width: outW,
      height: outH,
      filterId,
      filterName: currentPreset.name,
      filterAdjustments,
      closeModal
    });
  };

  // Apply ALL edits (Crop + Rotation + Filter + Adjustments) to all active pages
  const handleApplyToAll = async () => {
    if (!pages || pages.length === 0) return;
    setApplyingAll(true);

    try {
      const isWholePage = crop.x === 0 && crop.y === 0 && crop.width >= 0.999 && crop.height >= 0.999;
      const isCropped = !isWholePage;
      const targetCrop = isCropped ? crop : null;
      const currentPreset = FILTER_PRESETS.find((p) => p.id === filterId) || FILTER_PRESETS[0];
      const updatedList = [];

      for (const p of pages) {
        if (p.isDeleted) {
          updatedList.push(p);
          continue;
        }

        const pristineUri = p.originalImageUri || p.imageUri;

        // Render through pipeline with CURRENT crop, rotation, filter & adjustments
        const finalImageUri = await renderPipelineDataUrl({
          sourceUri: pristineUri,
          rotation,
          crop: targetCrop,
          filterId,
          adjustments: filterAdjustments,
          scaleFactor
        });

        const naturalBaseW = p.originalWidth || p.width || 1000;
        const naturalBaseH = p.originalHeight || p.height || 1400;
        const isSideways = rotation === 90 || rotation === 270;
        const rotW = isSideways ? naturalBaseH : naturalBaseW;
        const rotH = isSideways ? naturalBaseW : naturalBaseH;
        const outW = Math.round((targetCrop ? targetCrop.width * rotW : rotW) * scaleFactor);
        const outH = Math.round((targetCrop ? targetCrop.height * rotH : rotH) * scaleFactor);

        updatedList.push({
          ...p,
          imageUri: finalImageUri,
          originalImageUri: pristineUri,
          rotation,
          cropBox: targetCrop,
          isCropped: Boolean(targetCrop),
          scaleFactor,
          dimensionPreset,
          targetWidth: outW,
          targetHeight: outH,
          width: outW,
          height: outH,
          filterId,
          filterName: currentPreset.name,
          filterAdjustments: { ...filterAdjustments }
        });
      }

      if (onApplyToAll) {
        onApplyToAll(updatedList);
      }
      setApplyAllModalVisible(false);
      message.success(`Applied crop, rotation & filter to all ${activePages.length} pages!`);
    } catch (err) {
      console.error('Error applying edits to all pages:', err);
      message.error('Failed to apply edits to all pages.');
    } finally {
      setApplyingAll(false);
    }
  };

  if (!page) return null;

  const isCropModified = crop.x > 0 || crop.y > 0 || crop.width < 0.999 || crop.height < 0.999;
  const isRotationModified = rotation !== 0;
  const isResizeModified = scaleFactor !== 1.0 || dimensionPreset !== 'current';
  const isFilterActive =
    filterId !== 'original' ||
    Boolean(
      filterAdjustments.brightness ||
      filterAdjustments.contrast ||
      filterAdjustments.sharpness ||
      filterAdjustments.saturation ||
      filterAdjustments.exposure
    );
  const currentFilterPreset = FILTER_PRESETS.find((p) => p.id === filterId) || FILTER_PRESETS[0];

  // Dimension helpers for live chip
  const naturalBaseW = page.originalWidth || page.width || 1000;
  const naturalBaseH = page.originalHeight || page.height || 1400;
  const isSideways = rotation === 90 || rotation === 270;
  const currentRotatedW = isSideways ? naturalBaseH : naturalBaseW;
  const currentRotatedH = isSideways ? naturalBaseW : naturalBaseH;
  const liveCropPixelW = Math.round(crop.width * currentRotatedW);
  const liveCropPixelH = Math.round(crop.height * currentRotatedH);

  return (
    <>
      <Modal
        open={visible}
        onCancel={onCancel}
        width={1160}
        destroyOnClose
        centered
        className="modern-studio-modal"
        closable={false}
        footer={null}
        styles={{
          content: {
            padding: 0,
            borderRadius: '20px',
            overflow: 'hidden',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 70px -15px rgba(15, 23, 42, 0.18), 0 0 1px rgba(15, 23, 42, 0.08)'
          },
          body: {
            padding: 0,
            background: '#ffffff'
          }
        }}
        style={{ maxWidth: '98vw', top: 15 }}
      >
        <div className="modern-studio-shell">
          {/* ============================================================ */}
          {/* TOP STUDIO BAR                                               */}
          {/* ============================================================ */}
          <div className="studio-top-bar">
            {/* Left: Page identity and pager */}
            <div className="top-bar-left">
              <div className="studio-page-selector">
                <span className="page-title">Page {page.pageNumber}</span>
                {activePages.length > 1 && (
                  <div className="page-stepper-pill">
                    <button
                      type="button"
                      className="stepper-arrow"
                      onClick={handlePrevPage}
                      disabled={!hasPrev}
                      title="Previous page"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="stepper-text">
                      {currentIndex + 1} / {activePages.length}
                    </span>
                    <button
                      type="button"
                      className="stepper-arrow"
                      onClick={handleNextPage}
                      disabled={!hasNext}
                      title="Next page"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Status Tags */}
              <div className="studio-status-tags">
                {isCropModified && <span className="glass-tag cyan">Cropped</span>}
                {isRotationModified && <span className="glass-tag purple">{rotation}°</span>}
                {isFilterActive && (
                  <span className="glass-tag emerald">
                    ✨ {currentFilterPreset.name}
                  </span>
                )}
              </div>
            </div>

            {/* Center: Tool Switcher Segmented Pill */}
            <div className="top-bar-center">
              <div className="modern-tool-dock">
                <button
                  type="button"
                  className={`tool-dock-btn ${activeTab === 'crop' ? 'active' : ''}`}
                  onClick={() => setActiveTab('crop')}
                >
                  <Scissors size={14} />
                  <span>Crop</span>
                  {isCropModified && <span className="dock-dot" />}
                </button>
                <button
                  type="button"
                  className={`tool-dock-btn ${activeTab === 'rotate' ? 'active' : ''}`}
                  onClick={() => setActiveTab('rotate')}
                >
                  <RotateCw size={14} />
                  <span>Rotate</span>
                  {isRotationModified && <span className="dock-dot" />}
                </button>
                <button
                  type="button"
                  className={`tool-dock-btn ${activeTab === 'resize' ? 'active' : ''}`}
                  onClick={() => setActiveTab('resize')}
                >
                  <Scaling size={14} />
                  <span>Resize</span>
                  {isResizeModified && <span className="dock-dot" />}
                </button>
              </div>
            </div>

            {/* Right: Quick shortcuts, filmstrip toggle & close button */}
            <div className="top-bar-right">
              {activePages.length > 1 && (
                <Tooltip title={showFilmstrip ? 'Hide thumbnail strip' : 'Show thumbnail strip'}>
                  <button
                    type="button"
                    className={`studio-filmstrip-toggle-btn ${showFilmstrip ? 'active' : ''}`}
                    onClick={() => setShowFilmstrip(!showFilmstrip)}
                  >
                    <Layers size={13} />
                    <span>{activePages.length} Pages</span>
                  </button>
                </Tooltip>
              )}

              <div className="quick-rot-group">
                <Tooltip title="Rotate 90° CCW">
                  <button type="button" className="quick-icon-btn" onClick={handleRotateCCW}>
                    <RotateCcw size={13} />
                    <span>-90°</span>
                  </button>
                </Tooltip>
                <Tooltip title="Rotate 90° CW">
                  <button type="button" className="quick-icon-btn" onClick={handleRotateCW}>
                    <RotateCw size={13} />
                    <span>+90°</span>
                  </button>
                </Tooltip>
              </div>

              <button
                type="button"
                className="studio-close-btn"
                onClick={onCancel}
                title="Close editor"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* MAIN TWO-COLUMN STUDIO WORKBENCH                             */}
          {/* (Left: Document Preview | Right: Filters Panel)              */}
          {/* ============================================================ */}
          <div className="studio-main-workbench">
            {/* ---------------------------------------------------------- */}
            {/* LEFT COLUMN: DOCUMENT PREVIEW (72% width)                  */}
            {/* ---------------------------------------------------------- */}
            <div className="studio-preview-col">
              {/* Context subbar for active tool presets */}
              {activeTab === 'crop' && (
                <div className="studio-context-subbar">
                  <div className="subbar-presets-group">
                    <span className="subbar-section-label">Crop:</span>
                    <button
                      type="button"
                      className={`subbar-chip ${!isCropModified ? 'active' : ''}`}
                      onClick={handleResetFullCrop}
                    >
                      Full Page
                    </button>
                    <button
                      type="button"
                      className="subbar-chip"
                      onClick={handleTrimMargins}
                    >
                      Trim Margins (-10%)
                    </button>
                    <button
                      type="button"
                      className="subbar-chip"
                      onClick={handleCenterFocus}
                    >
                      Center Focus (-20%)
                    </button>
                  </div>

                  {activePages.length > 1 && (
                    <button
                      type="button"
                      className="subbar-replicate-btn"
                      onClick={() => setApplyAllModalVisible(true)}
                    >
                      <CopyCheck size={13} />
                      <span>Apply Crop to All</span>
                    </button>
                  )}
                </div>
              )}

              {/* Viewport Darkroom Stage */}
              <div
                className={`studio-darkroom-container ${showFilmstrip && activePages.length > 1 ? 'with-filmstrip' : 'no-filmstrip'
                  }`}
                ref={containerRef}
              >
                {/* Floating Navigation Chevrons */}
                {activePages.length > 1 && (
                  <button
                    type="button"
                    className={`studio-floating-nav nav-left ${!hasPrev ? 'disabled' : ''}`}
                    onClick={handlePrevPage}
                    disabled={!hasPrev}
                    title={hasPrev ? `Previous: Page ${prevPage?.pageNumber}` : 'First Page'}
                  >
                    <ChevronLeft size={20} strokeWidth={2.5} />
                    {hasPrev && <span className="nav-page-indicator">P{prevPage?.pageNumber}</span>}
                  </button>
                )}

                {activePages.length > 1 && (
                  <button
                    type="button"
                    className={`studio-floating-nav nav-right ${!hasNext ? 'disabled' : ''}`}
                    onClick={handleNextPage}
                    disabled={!hasNext}
                    title={hasNext ? `Next: Page ${nextPage?.pageNumber}` : 'Last Page'}
                  >
                    <ChevronRight size={20} strokeWidth={2.5} />
                    {hasNext && <span className="nav-page-indicator">P{nextPage?.pageNumber}</span>}
                  </button>
                )}

                {/* 1. CROP MODE STAGE */}
                {activeTab === 'crop' && (
                  <div className="crop-darkroom-stage">
                    <div className="crop-image-wrapper">
                      <img
                        ref={cropImageRef}
                        src={filteredPreviewUri || rotatedBaseUri || page.originalImageUri || page.imageUri}
                        alt={`Page ${page.pageNumber}`}
                        className="stage-target-image"
                        draggable={false}
                      />

                      {/* Dark Vignette Shades outside crop box */}
                      <div
                        className="crop-shade top"
                        style={{ top: 0, left: 0, right: 0, height: `${crop.y * 100}%` }}
                      />
                      <div
                        className="crop-shade bottom"
                        style={{
                          top: `${(crop.y + crop.height) * 100}%`,
                          left: 0,
                          right: 0,
                          bottom: 0
                        }}
                      />
                      <div
                        className="crop-shade left"
                        style={{
                          top: `${crop.y * 100}%`,
                          left: 0,
                          width: `${crop.x * 100}%`,
                          height: `${crop.height * 100}%`
                        }}
                      />
                      <div
                        className="crop-shade right"
                        style={{
                          top: `${crop.y * 100}%`,
                          left: `${(crop.x + crop.width) * 100}%`,
                          right: 0,
                          height: `${crop.height * 100}%`
                        }}
                      />

                      {/* Active Crop Box with Corner Brackets & Edges */}
                      <div
                        className="active-crop-frame"
                        style={{
                          top: `${crop.y * 100}%`,
                          left: `${crop.x * 100}%`,
                          width: `${crop.width * 100}%`,
                          height: `${crop.height * 100}%`
                        }}
                        onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                      >
                        {/* Live dimensions indicator */}
                        {/* <div className="crop-live-pill inside">
                          <span>{liveCropPixelW} × {liveCropPixelH} px</span>
                          <span className="pct-badge">{Math.round(crop.width * 100)}%</span>
                        </div> */}

                        {/* Thirds Guides */}
                        <div className="frame-rule-h rule-h-1" />
                        <div className="frame-rule-h rule-h-2" />
                        <div className="frame-rule-v rule-v-1" />
                        <div className="frame-rule-v rule-v-2" />

                        {/* Corners */}
                        <div
                          className="corner-bracket corner-nw"
                          onMouseDown={(e) => handleCropMouseDown(e, 'nw')}
                        />
                        <div
                          className="corner-bracket corner-ne"
                          onMouseDown={(e) => handleCropMouseDown(e, 'ne')}
                        />
                        <div
                          className="corner-bracket corner-se"
                          onMouseDown={(e) => handleCropMouseDown(e, 'se')}
                        />
                        <div
                          className="corner-bracket corner-sw"
                          onMouseDown={(e) => handleCropMouseDown(e, 'sw')}
                        />

                        {/* Edge Grips */}
                        <div
                          className="edge-grip edge-n"
                          onMouseDown={(e) => handleCropMouseDown(e, 'n')}
                        />
                        <div
                          className="edge-grip edge-s"
                          onMouseDown={(e) => handleCropMouseDown(e, 's')}
                        />
                        <div
                          className="edge-grip edge-w"
                          onMouseDown={(e) => handleCropMouseDown(e, 'w')}
                        />
                        <div
                          className="edge-grip edge-e"
                          onMouseDown={(e) => handleCropMouseDown(e, 'e')}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ROTATE MODE STAGE */}
                {activeTab === 'rotate' && (
                  <div className="studio-tool-split-stage">
                    <div className="split-stage-preview">
                      <div className="preview-canvas-box">
                        <img
                          src={filteredPreviewUri || rotatedBaseUri || page.originalImageUri || page.imageUri}
                          alt="Rotate Preview"
                          className="preview-canvas-img"
                        />
                      </div>
                      <div className="preview-meta-chips">
                        <span className="meta-chip active" style={{ fontSize: 13 }}>
                          Orientation: {rotation}°
                        </span>
                      </div>
                    </div>

                    <div className="split-stage-controls">
                      <div className="control-card-pane">
                        <div className="pane-title">
                          <Rotate3D size={16} className="pane-icon" />
                          <span>Page Orientation Controls</span>
                        </div>

                        <div className="rotate-interactive-grid">
                          <button
                            type="button"
                            className="rotate-tile-btn"
                            onClick={handleRotateCCW}
                          >
                            <RotateCcw size={18} />
                            <span className="tile-title">Rotate Left</span>
                            <span className="tile-desc">-90° Counter-Clockwise</span>
                          </button>

                          <button
                            type="button"
                            className="rotate-tile-btn primary-tint"
                            onClick={handleRotateCW}
                          >
                            <RotateCw size={18} />
                            <span className="tile-title">Rotate Right</span>
                            <span className="tile-desc">+90° Clockwise</span>
                          </button>

                          <button
                            type="button"
                            className="rotate-tile-btn"
                            onClick={handleRotate180}
                          >
                            <Rotate3D size={18} />
                            <span className="tile-title">Flip 180°</span>
                            <span className="tile-desc">Invert Upside Down</span>
                          </button>

                          <button
                            type="button"
                            className="rotate-tile-btn"
                            onClick={handleResetRotation}
                            disabled={rotation === 0}
                          >
                            <Undo2 size={18} />
                            <span className="tile-title">Reset 0°</span>
                            <span className="tile-desc">Original Angle</span>
                          </button>
                        </div>

                        <div className="angle-quick-bar">
                          <span style={{ fontSize: 12, color: '#64748b' }}>Quick Jump:</span>
                          {[0, 90, 180, 270].map((deg) => (
                            <button
                              key={deg}
                              type="button"
                              className={`angle-chip ${rotation === deg ? 'active' : ''}`}
                              onClick={() => handleUpdateRotation(deg)}
                            >
                              {deg}°
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. RESIZE MODE STAGE */}
                {activeTab === 'resize' && (
                  <div className="studio-tool-split-stage">
                    <div className="split-stage-preview">
                      <div className="preview-canvas-box">
                        <img
                          src={filteredPreviewUri || rotatedBaseUri || page.originalImageUri || page.imageUri}
                          alt="Resize Preview"
                          className="preview-canvas-img"
                        />
                      </div>
                      <div className="preview-meta-chips">
                        <span className="meta-chip">Rotation: {rotation}°</span>
                        <span className="meta-chip active">DPI: {scaleFactor}x</span>
                        <span className="meta-chip">Format: {dimensionPreset.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="split-stage-controls">
                      <div className="control-card-pane">
                        <div className="pane-title">
                          <FileSpreadsheet size={16} className="pane-icon" />
                          <span>Target Paper Format</span>
                        </div>

                        <Radio.Group
                          value={dimensionPreset}
                          onChange={handlePresetChange}
                          className="modern-radio-grid"
                        >
                          <Radio.Button value="current" className="radio-card">
                            <span className="card-label">Current Dimensions</span>
                            <span className="card-sub">{naturalBaseW} × {naturalBaseH} pt</span>
                          </Radio.Button>
                          <Radio.Button value="a4" className="radio-card">
                            <span className="card-label">Standard A4</span>
                            <span className="card-sub">595 × 842 pt</span>
                          </Radio.Button>
                          <Radio.Button value="letter" className="radio-card">
                            <span className="card-label">US Letter</span>
                            <span className="card-sub">612 × 792 pt</span>
                          </Radio.Button>
                          <Radio.Button value="legal" className="radio-card">
                            <span className="card-label">Legal Format</span>
                            <span className="card-sub">612 × 1008 pt</span>
                          </Radio.Button>
                        </Radio.Group>

                        <Divider style={{ margin: '16px 0' }} />

                        <div className="pane-title between">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Scaling size={16} className="pane-icon" />
                            <span>Resolution / OCR Density Scale</span>
                          </div>
                          <span className="dpi-highlight">{scaleFactor}x Scale</span>
                        </div>

                        <Slider
                          min={0.75}
                          max={2.0}
                          step={0.25}
                          value={scaleFactor}
                          onChange={(val) => setScaleFactor(val)}
                          marks={{
                            0.75: '0.75x',
                            1.0: '1.0x',
                            1.5: '1.5x',
                            2.0: '2.0x'
                          }}
                          className="modern-studio-slider"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ---------------------------------------------------------- */}
            {/* RIGHT COLUMN: DOCUMENT FILTERS & ADJUSTMENTS (28% width)    */}
            {/* ---------------------------------------------------------- */}
            <div className="studio-filters-panel">
              <div className="filters-panel-header">
                <div className="filters-header-title">
                  <Sparkles size={16} className="title-icon" />
                  <span>FILTERS</span>
                </div>
                <span className="filters-active-badge">
                  {currentFilterPreset.name}
                </span>
              </div>

              {/* 2-Column Compact Filter Grid with Real Page Thumbnails */}
              <div className="filters-preset-grid">
                {FILTER_PRESETS.map((preset) => {
                  const isSelected = filterId === preset.id;
                  const thumbSrc = filterThumbnails[preset.id] || rotatedBaseUri;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`filter-card-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectFilter(preset.id)}
                      title={`${preset.name}: ${preset.desc}`}
                    >
                      <div className="filter-card-thumb-wrap">
                        {thumbSrc ? (
                          <img src={thumbSrc} alt={preset.name} loading="lazy" />
                        ) : (
                          <div className="filter-thumb-placeholder" />
                        )}
                        {isSelected && (
                          <div className="filter-active-check">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span className="filter-card-name">{preset.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Manual Adjustments Sliders */}
              <div className="filters-adjustments-section">
                <div className="adjustments-header">
                  <div className="adjustments-title-wrap">
                    <Sliders size={13} />
                    <span>Adjustments</span>
                  </div>
                  {isFilterActive && (
                    <button
                      type="button"
                      className="reset-mini-link"
                      onClick={handleResetFilter}
                      title="Reset filter adjustments to 0"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="adjustments-slider-list">
                  {/* 1. Brightness */}
                  <div className="adjustment-row">
                    <div className="adj-label-bar">
                      <span className="adj-name">Brightness</span>
                      <span className={`adj-val ${filterAdjustments.brightness !== 0 ? 'active' : ''}`}>
                        {filterAdjustments.brightness > 0 ? `+${filterAdjustments.brightness}` : filterAdjustments.brightness}
                      </span>
                    </div>
                    <Slider
                      min={-100}
                      max={100}
                      value={filterAdjustments.brightness}
                      onChange={(val) => handleAdjustmentChange('brightness', val)}
                      className="studio-sub-slider"
                    />
                  </div>

                  {/* 2. Contrast */}
                  <div className="adjustment-row">
                    <div className="adj-label-bar">
                      <span className="adj-name">Contrast</span>
                      <span className={`adj-val ${filterAdjustments.contrast !== 0 ? 'active' : ''}`}>
                        {filterAdjustments.contrast > 0 ? `+${filterAdjustments.contrast}` : filterAdjustments.contrast}
                      </span>
                    </div>
                    <Slider
                      min={-100}
                      max={100}
                      value={filterAdjustments.contrast}
                      onChange={(val) => handleAdjustmentChange('contrast', val)}
                      className="studio-sub-slider"
                    />
                  </div>

                  {/* 3. Sharpness */}
                  <div className="adjustment-row">
                    <div className="adj-label-bar">
                      <span className="adj-name">Sharpness</span>
                      <span className={`adj-val ${filterAdjustments.sharpness > 0 ? 'active' : ''}`}>
                        {filterAdjustments.sharpness > 0 ? `+${filterAdjustments.sharpness}` : filterAdjustments.sharpness}
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      value={filterAdjustments.sharpness}
                      onChange={(val) => handleAdjustmentChange('sharpness', val)}
                      className="studio-sub-slider"
                    />
                  </div>

                  {/* 4. Saturation */}
                  <div className="adjustment-row">
                    <div className="adj-label-bar">
                      <span className="adj-name">Saturation</span>
                      <span className={`adj-val ${filterAdjustments.saturation !== 0 ? 'active' : ''}`}>
                        {filterAdjustments.saturation > 0 ? `+${filterAdjustments.saturation}` : filterAdjustments.saturation}
                      </span>
                    </div>
                    <Slider
                      min={-100}
                      max={100}
                      value={filterAdjustments.saturation}
                      onChange={(val) => handleAdjustmentChange('saturation', val)}
                      className="studio-sub-slider"
                    />
                  </div>

                  {/* 5. Exposure */}
                  <div className="adjustment-row">
                    <div className="adj-label-bar">
                      <span className="adj-name">Exposure</span>
                      <span className={`adj-val ${filterAdjustments.exposure !== 0 ? 'active' : ''}`}>
                        {filterAdjustments.exposure > 0 ? `+${filterAdjustments.exposure}` : filterAdjustments.exposure}
                      </span>
                    </div>
                    <Slider
                      min={-100}
                      max={100}
                      value={filterAdjustments.exposure}
                      onChange={(val) => handleAdjustmentChange('exposure', val)}
                      className="studio-sub-slider"
                    />
                  </div>
                </div>

                {/* Panel Action Buttons */}
                <div className="panel-quick-actions">
                  <button
                    type="button"
                    className="panel-btn reset"
                    onClick={handleResetFilter}
                    title="Reset only the filter and adjustments"
                  >
                    <Undo2 size={13} />
                    <span>Reset Filter</span>
                  </button>

                  <button
                    type="button"
                    className="panel-btn apply"
                    onClick={() => handleApplySinglePage(false)}
                    title="Apply current filter & edits to this page"
                  >
                    <Check size={13} />
                    <span>Apply to Page</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* BOTTOM PAGE THUMBNAIL FILMSTRIP                              */}
          {/* ============================================================ */}
          {showFilmstrip && activePages.length > 1 && (
            <div className="studio-filmstrip-bar" ref={filmstripRef}>
              <div className="filmstrip-scroll-area">
                {activePages.map((p) => {
                  const isActive = p.id === page.id;
                  const isPageCropped = Boolean(p.isCropped || p.cropBox);
                  const isPageRotated = Boolean(p.rotation && p.rotation !== 0);
                  const isPageFiltered = Boolean(p.filterName && p.filterName !== 'Original' && p.filterId !== 'original');

                  return (
                    <div
                      key={p.id}
                      className={`filmstrip-thumb ${isActive ? 'active' : ''}`}
                      onClick={() => handleJumpToPage(p)}
                      title={`Jump to Page ${p.pageNumber}`}
                    >
                      <div className="thumb-img-wrap">
                        <img src={p.imageUri} alt={`P${p.pageNumber}`} loading="lazy" />
                      </div>
                      <div className="thumb-info">
                        <span className="thumb-num">P{p.pageNumber}</span>
                        {isPageCropped && <span className="dot crop-dot" title="Cropped" />}
                        {isPageRotated && <span className="dot rot-dot" title="Rotated" />}
                        {isPageFiltered && <span className="dot filter-dot" title={`Filter: ${p.filterName}`} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STUDIO FOOTER BAR                                            */}
          {/* ============================================================ */}
          <div className="studio-bottom-footer">
            {/* Left Action: Revert entire page to original */}
            <div className="footer-left-col">
              <PopconfirmReset onConfirm={handleResetToOriginal} />
            </div>

            {/* Center: Quick Tool shortcuts & Reset Filter */}
            <div className="footer-center-col">
              <Space size={6}>
                <button
                  type="button"
                  className={`footer-tool-chip ${activeTab === 'crop' ? 'active' : ''}`}
                  onClick={() => setActiveTab('crop')}
                >
                  <Scissors size={12} />
                  <span>Crop</span>
                </button>
                <button
                  type="button"
                  className={`footer-tool-chip ${activeTab === 'rotate' ? 'active' : ''}`}
                  onClick={() => setActiveTab('rotate')}
                >
                  <RotateCw size={12} />
                  <span>Rotate</span>
                </button>
                <button
                  type="button"
                  className="footer-tool-chip"
                  onClick={handleResetFilter}
                  title="Remove filter effects"
                >
                  <Undo2 size={12} />
                  <span>Reset Filter</span>
                </button>
              </Space>
            </div>

            {/* Right: Actions */}
            <div className="footer-right-col">
              <Space size={8}>
                {activePages.length > 1 && (
                  <Button
                    icon={<CopyCheck size={14} />}
                    onClick={() => setApplyAllModalVisible(true)}
                    className="studio-secondary-btn"
                  >
                    Apply to All Pages ({activePages.length})
                  </Button>
                )}

                {onOpenExportPdf && (
                  <Button
                    icon={<FileDown size={14} />}
                    onClick={async () => {
                      await handleApplySinglePage(true);
                      onOpenExportPdf();
                    }}
                    className="studio-secondary-btn"
                  >
                    Save & Export PDF
                  </Button>
                )}

                <Button onClick={onCancel} className="studio-ghost-btn">
                  Cancel
                </Button>

                <Button
                  type="primary"
                  icon={<Check size={14} />}
                  onClick={() => handleApplySinglePage(true)}
                  className="studio-primary-action-btn"
                >
                  Save & Apply
                </Button>
              </Space>
            </div>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* DIALOG: Apply All Edits (Crop, Rotation & Filter) to All Pages*/}
      {/* ============================================================ */}
      <Modal
        open={applyAllModalVisible}
        onCancel={() => !applyingAll && setApplyAllModalVisible(false)}
        centered
        width={480}
        destroyOnClose
        title={null}
        footer={null}
        className="apply-all-dialog-modal"
        styles={{
          content: {
            borderRadius: '16px',
            padding: '24px',
            background: '#ffffff',
            boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.22)'
          }
        }}
      >
        <div className="apply-all-dialog-shell">
          <div className="dialog-header">
            <div className="dialog-icon-badge">
              <CopyCheck size={22} />
            </div>
            <div className="dialog-title-group">
              <h3 className="dialog-heading">Apply to All Pages</h3>
              <p className="dialog-sub">
                Replicate this page's crop framing, rotation, and filter across all {activePages.length} active pages.
              </p>
            </div>
          </div>

          <div className="dialog-specs-card">
            <div className="spec-item">
              <span className="spec-label">Crop Framing</span>
              <span className="spec-val">
                {isCropModified
                  ? `${liveCropPixelW} × ${liveCropPixelH} px (${Math.round(crop.width * 100)}% crop)`
                  : 'Full Page (No Crop)'}
              </span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Selected Filter</span>
              <span className="spec-val highlight-filter">{currentFilterPreset.name}</span>
            </div>
            {isFilterActive && (
              <div className="spec-item">
                <span className="spec-label">Adjustments</span>
                <span className="spec-val">
                  B:{filterAdjustments.brightness > 0 ? '+' : ''}{filterAdjustments.brightness}{' '}
                  C:{filterAdjustments.contrast > 0 ? '+' : ''}{filterAdjustments.contrast}{' '}
                  S:{filterAdjustments.sharpness}
                </span>
              </div>
            )}
            <div className="spec-item">
              <span className="spec-label">Orientation</span>
              <span className="spec-val">{rotation}° {rotation === 0 ? '(Original)' : ''}</span>
            </div>
            <div className="spec-item highlight">
              <span className="spec-label">Pages Affected</span>
              <span className="spec-val badge">{activePages.length} Pages</span>
            </div>
          </div>

          <div className="dialog-info-box">
            <span>
              💡 <strong>All {activePages.length} pages</strong> will receive this page's exact crop framing, rotation, and filter styling for preview and PDF export.
            </span>
          </div>

          <div className="dialog-footer-actions">
            <Button
              onClick={() => setApplyAllModalVisible(false)}
              disabled={applyingAll}
              className="dialog-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              loading={applyingAll}
              icon={<Check size={15} />}
              onClick={handleApplyToAll}
              className="dialog-confirm-btn"
            >
              Apply to All {activePages.length} Pages
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Reset confirmation subcomponent
function PopconfirmReset({ onConfirm }) {
  return (
    <Button
      size="small"
      type="text"
      icon={<Undo2 size={13} />}
      onClick={() => {
        if (window.confirm('Revert this page to its original state (reset crop, rotation, resize, and filters)?')) {
          onConfirm();
        }
      }}
      className="studio-reset-btn"
    >
      Reset Page
    </Button>
  );
}
