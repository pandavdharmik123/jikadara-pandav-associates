import React, { useState, useMemo } from 'react';
import { Button, Tag, Typography, Tooltip, Popconfirm, Space, Input, Segmented, Checkbox, Modal } from 'antd';
import {
  RotateCw,
  Trash2,
  Undo2,
  FileCheck,
  Sliders,
  FileDown,
  Search,
  CheckCircle2,
  Layers,
  Sparkles,
  CheckSquare
} from 'lucide-react';

const { Text } = Typography;

export default function PagePreviewGrid({
  pages,
  onOpenEdit,
  onOpenCrop,
  onOpenResize,
  onOpenExportPdf,
  onQuickRotate,
  onDeletePage,
  onDeletePages,
  onRestorePage,
  onRestorePages,
  onResetAllPages,
  onRestoreAllPages
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'active' | 'excluded'
  const [selectedPageIds, setSelectedPageIds] = useState(new Set());
  const [excludeModalVisible, setExcludeModalVisible] = useState(false);

  const activeCount = useMemo(() => pages.filter((p) => !p.isDeleted).length, [pages]);
  const deletedCount = useMemo(() => pages.filter((p) => p.isDeleted).length, [pages]);

  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      // Filter mode match
      if (filterMode === 'active' && page.isDeleted) return false;
      if (filterMode === 'excluded' && !page.isDeleted) return false;

      // Search term match (by page number or original index)
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const pageNumMatch = `page ${page.pageNumber}`.includes(query) || `${page.pageNumber}` === query;
        const origNumMatch = `${page.originalIndex + 1}` === query;
        if (!pageNumMatch && !origNumMatch) return false;
      }

      return true;
    });
  }, [pages, filterMode, searchTerm]);

  // Selection states
  const isAllSelected = useMemo(() => {
    return filteredPages.length > 0 && filteredPages.every((p) => selectedPageIds.has(p.id));
  }, [filteredPages, selectedPageIds]);

  const isIndeterminate = useMemo(() => {
    return filteredPages.some((p) => selectedPageIds.has(p.id)) && !isAllSelected;
  }, [filteredPages, selectedPageIds, isAllSelected]);

  const selectedActiveCount = useMemo(() => {
    return pages.filter((p) => selectedPageIds.has(p.id) && !p.isDeleted).length;
  }, [pages, selectedPageIds]);

  const selectedDeletedCount = useMemo(() => {
    return pages.filter((p) => selectedPageIds.has(p.id) && p.isDeleted).length;
  }, [pages, selectedPageIds]);

  const toggleSelectPage = (pageId) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedPageIds(new Set(filteredPages.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedPageIds(new Set());
  };

  const handleDeleteSelected = () => {
    const idsToDelete = pages
      .filter((p) => selectedPageIds.has(p.id) && !p.isDeleted)
      .map((p) => p.id);

    if (idsToDelete.length > 0) {
      if (onDeletePages) {
        onDeletePages(idsToDelete);
      } else {
        idsToDelete.forEach((id) => onDeletePage(id));
      }
    }
    setSelectedPageIds(new Set());
  };

  const handleRestoreSelected = () => {
    const idsToRestore = pages
      .filter((p) => selectedPageIds.has(p.id) && p.isDeleted)
      .map((p) => p.id);

    if (idsToRestore.length > 0) {
      if (onRestorePages) {
        onRestorePages(idsToRestore);
      } else {
        idsToRestore.forEach((id) => onRestorePage(id));
      }
    }
    setSelectedPageIds(new Set());
  };

  const handlePageClick = (page) => {
    if (page.isDeleted) return;
    if (onOpenEdit) {
      onOpenEdit(page);
    } else if (onOpenCrop) {
      onOpenCrop(page);
    }
  };

  return (
    <div className="page-preview-grid-container">
      {/* Modern Top Toolbar */}
      <div className="grid-controls-header">
        <div className="header-left">
          <div className="header-title-group">
            <span className="section-heading">Document Pages</span>
            <span className="page-count-badge">
              {activeCount} {activeCount === 1 ? 'page' : 'pages'}
            </span>
            {deletedCount > 0 && (
              <span className="excluded-badge">
                {deletedCount} excluded
              </span>
            )}
          </div>
        </div>

        {/* Center: Search, Filter & Select All */}
        <div className="header-center">
          {filteredPages.length > 0 && (
            <Checkbox
              checked={isAllSelected}
              indeterminate={isIndeterminate}
              onChange={(e) => {
                if (e.target.checked) selectAllVisible();
                else deselectAll();
              }}
              className="select-all-header-checkbox"
            >
              Select All
            </Checkbox>
          )}

          <Input
            placeholder="Search page #..."
            prefix={<Search size={14} className="search-icon" />}
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-page-input"
          />
          <Segmented
            size="small"
            value={filterMode}
            onChange={setFilterMode}
            options={[
              { label: `All (${pages.length})`, value: 'all' },
              { label: `Active (${activeCount})`, value: 'active' },
              ...(deletedCount > 0 ? [{ label: `Excluded (${deletedCount})`, value: 'excluded' }] : [])
            ]}
            className="filter-segmented"
          />
        </div>

        {/* Right: Actions */}
        <div className="header-actions">
          <Space size={8}>
            {onOpenExportPdf && activeCount > 0 && (
              <Button
                size="middle"
                type="primary"
                icon={<FileDown size={14} />}
                onClick={onOpenExportPdf}
                className="export-pdf-top-btn"
              >
                Export Edited PDF
              </Button>
            )}

            {deletedCount > 0 && (
              <Button
                size="middle"
                icon={<Undo2 size={14} />}
                onClick={onRestoreAllPages}
                className="restore-all-btn"
              >
                Restore All
              </Button>
            )}

            <Popconfirm
              title="Reset all modifications?"
              description="This will restore all excluded pages and revert any crops or rotations."
              onConfirm={onResetAllPages}
              okText="Reset All"
              cancelText="Cancel"
              placement="bottomRight"
            >
              <Button size="middle" type="text" className="reset-edits-btn">
                Reset All Edits
              </Button>
            </Popconfirm>
          </Space>
        </div>
      </div>

      {/* Multiple Selection Batch Action Bar */}
      {selectedPageIds.size > 0 && (
        <div className="batch-selection-bar">
          <div className="batch-info">
            <Checkbox
              checked={isAllSelected}
              indeterminate={isIndeterminate}
              onChange={(e) => {
                if (e.target.checked) selectAllVisible();
                else deselectAll();
              }}
            >
              <span className="batch-count-text">
                <strong>{selectedPageIds.size}</strong> {selectedPageIds.size === 1 ? 'page' : 'pages'} selected
              </span>
            </Checkbox>
          </div>

          <div className="batch-actions">
            <Space size={8}>
              {selectedActiveCount > 0 && (
                <Button
                  type="primary"
                  danger
                  icon={<Trash2 size={14} />}
                  className="batch-delete-btn"
                  onClick={() => setExcludeModalVisible(true)}
                >
                  Exclude Selected ({selectedActiveCount})
                </Button>
              )}

              {selectedDeletedCount > 0 && (
                <Button
                  icon={<Undo2 size={14} />}
                  onClick={handleRestoreSelected}
                  className="batch-restore-btn"
                >
                  Restore Selected ({selectedDeletedCount})
                </Button>
              )}

              <Button
                type="text"
                onClick={deselectAll}
                className="batch-cancel-btn"
              >
                Clear Selection
              </Button>
            </Space>

            {/* Confirmation Modal for Exclude Selected */}
            <Modal
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      backgroundColor: '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626'
                    }}
                  >
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                      Exclude Selected Pages
                    </span>
                  </div>
                </div>
              }
              open={excludeModalVisible}
              onOk={() => {
                handleDeleteSelected();
                setExcludeModalVisible(false);
              }}
              onCancel={() => setExcludeModalVisible(false)}
              okText={`Exclude ${selectedActiveCount} ${selectedActiveCount === 1 ? 'Page' : 'Pages'}`}
              cancelText="Cancel"
              okButtonProps={{ danger: true, size: 'middle', style: { fontWeight: 600 } }}
              cancelButtonProps={{ size: 'middle' }}
              centered
              width={440}
            >
              <div style={{ padding: '12px 0 6px 0' }}>
                <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, margin: '0 0 8px 0' }}>
                  Are you sure you want to exclude <strong>{selectedActiveCount}</strong> selected {selectedActiveCount === 1 ? 'page' : 'pages'}?
                </p>
                <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
                  Excluded pages will be omitted from OCR text recognition and PDF export. You can restore them anytime using the "Restore" action.
                </p>
              </div>
            </Modal>
          </div>
        </div>
      )}

      {/* Pages Grid - Desktop 3 Columns */}
      {filteredPages.length > 0 ? (
        <div className="pages-grid">
          {filteredPages.map((page) => {
            const isDeleted = page.isDeleted;
            const isCropped = Boolean(page.isCropped || page.cropBox);
            const isRotated = Boolean(page.rotation && page.rotation !== 0);
            const isSelected = selectedPageIds.has(page.id);

            return (
              <div
                key={page.id}
                className={`page-thumbnail-card ${isDeleted ? 'deleted-page' : ''} ${isSelected ? 'selected-page' : ''}`}
              >
                {/* Card Top: Selection Checkbox, Page number badge & status tags */}
                <div
                  className="card-top-bar"
                  onClick={() => toggleSelectPage(page.id)}
                  title={isSelected ? "Click to deselect page" : "Click to select page"}
                >
                  <div className="page-badge-wrap">
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectPage(page.id);
                      }}
                      className="page-select-checkbox"
                    />
                    <span className={`page-number-pill ${isDeleted ? 'pill-muted' : ''}`}>
                      Page {page.pageNumber}
                    </span>
                    {page.originalIndex !== undefined && page.originalIndex + 1 !== page.pageNumber && (
                      <span className="original-page-hint">
                        #{page.originalIndex + 1}
                      </span>
                    )}
                  </div>

                  <div className="status-tags-wrap">
                    {isCropped && !isDeleted && (
                      <span className="status-tag status-cropped">
                        Cropped
                      </span>
                    )}
                    {isRotated && !isDeleted && (
                      <span className="status-tag status-rotated">
                        {page.rotation}°
                      </span>
                    )}
                    {Boolean(page.filterName && page.filterName !== 'Original' && page.filterId !== 'original') && !isDeleted && (
                      <span className="status-tag status-filter">
                        ✨ {page.filterName}
                      </span>
                    )}
                    {isDeleted && (
                      <span className="status-tag status-excluded">
                        Excluded
                      </span>
                    )}
                  </div>
                </div>

                {/* Center: Large Clean Document Preview */}
                <div
                  className={`thumbnail-view-wrap ${!isDeleted ? 'clickable-preview' : ''}`}
                  onClick={() => handlePageClick(page)}
                >
                  <div className="paper-container">
                    <img
                      src={page.imageUri}
                      alt={`Page ${page.pageNumber}`}
                      className="page-thumbnail-img"
                      loading="lazy"
                    />
                  </div>

                  {!isDeleted && (
                    <div className="thumbnail-hover-hint">
                      <Sparkles size={13} />
                      <span>Edit Page</span>
                    </div>
                  )}

                  {/* Excluded Overlay */}
                  {isDeleted && (
                    <div className="deleted-overlay" onClick={(e) => e.stopPropagation()}>
                      <span className="excluded-label">Excluded from OCR</span>
                      <Button
                        type="primary"
                        size="small"
                        icon={<Undo2 size={13} />}
                        onClick={() => onRestorePage(page.id)}
                        className="restore-page-btn"
                      >
                        Restore Page
                      </Button>
                    </div>
                  )}
                </div>

                {/* Bottom: Modern Compact Toolbar */}
                {!isDeleted ? (
                  <div className="card-bottom-actions">
                    <Button
                      size="middle"
                      icon={<Sparkles size={14} className="edit-btn-icon" />}
                      onClick={() => handlePageClick(page)}
                      className="page-action-btn edit-page-btn"
                    >
                      Edit Page
                    </Button>

                    <div className="quick-action-icons">
                      <Tooltip title="Rotate 90° Clockwise">
                        <Button
                          size="middle"
                          icon={<RotateCw size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickRotate(page.id);
                          }}
                          className="page-action-btn quick-rotate-btn"
                        />
                      </Tooltip>

                      <Tooltip title="Exclude from OCR">
                        <Button
                          size="middle"
                          icon={<Trash2 size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePage(page.id);
                          }}
                          className="page-action-btn delete-btn"
                        />
                      </Tooltip>
                    </div>
                  </div>
                ) : (
                  <div className="card-bottom-actions deleted-actions">
                    <Button
                      type="link"
                      size="small"
                      icon={<Undo2 size={13} />}
                      onClick={() => onRestorePage(page.id)}
                      className="undo-link-btn"
                    >
                      Restore to Document
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-pages-found">
          <Layers size={32} className="empty-search-icon" />
          <p className="empty-search-title">No matching pages found</p>
          <p className="empty-search-sub">Try changing your search query or filter options</p>
          <Button size="small" onClick={() => { setSearchTerm(''); setFilterMode('all'); }}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
