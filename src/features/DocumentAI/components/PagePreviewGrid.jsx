import React, { useState, useMemo } from 'react';
import { Button, Tag, Typography, Tooltip, Popconfirm, Space, Input, Segmented } from 'antd';
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
  Sparkles
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
  onRestorePage,
  onResetAllPages,
  onRestoreAllPages
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'active' | 'excluded'

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

        {/* Center: Search & Filter */}
        <div className="header-center">
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

      {/* Pages Grid - Desktop 3 Columns */}
      {filteredPages.length > 0 ? (
        <div className="pages-grid">
          {filteredPages.map((page) => {
            const isDeleted = page.isDeleted;
            const isCropped = Boolean(page.isCropped || page.cropBox);
            const isRotated = Boolean(page.rotation && page.rotation !== 0);

            return (
              <div
                key={page.id}
                className={`page-thumbnail-card ${isDeleted ? 'deleted-page' : ''}`}
              >
                {/* Card Top: Page number badge & status tags */}
                <div className="card-top-bar">
                  <div className="page-badge-wrap">
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
