import React, { useState, useRef, useEffect } from 'react';
import { calculateTreeLayout } from '../utils/treeLayout';
import { convertUnicodeToGhanshyamLegacy } from '../../../utils/ghanshyamLegacy';

export default function FamilyTreeCanvas({
  tree,
  deceased,
  onNodeMove,
  interactive = true,
  scale = 1,
  fontMode = 'ghanshyam',
  selectedNodeId,
  onSelectNode
}) {
  const containerRef = useRef(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [localDragPositions, setLocalDragPositions] = useState({});
  const isDraggingRef = useRef(false);
  const dragStartMouseRef = useRef({ x: 0, y: 0 });

  const toFont = (text) => {
    if (!text) return '';
    const str = String(text);
    if (fontMode !== 'ghanshyam') return str;
    if (str === ')') return '}';
    if (str === '(') return '{';
    if (/[\u0A80-\u0AFF]/.test(str)) {
      return convertUnicodeToGhanshyamLegacy(str);
    }
    return str;
  };
  const fmt = toFont;

  // Compute layout with live local dragging overrides for 60fps responsiveness
  const layout = calculateTreeLayout(tree, deceased, localDragPositions);
  const { nodes, connections, canvasWidth, canvasHeight, isUltraCompact } = layout;

  const handleMouseDown = (e, node) => {
    if (!interactive) return;
    e.stopPropagation();

    isDraggingRef.current = false;
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };

    if (onSelectNode) {
      onSelectNode(node.id);
    }

    const rect = containerRef.current.getBoundingClientRect();
    const currentMouseX = (e.clientX - rect.left) / scale;
    const currentMouseY = (e.clientY - rect.top) / scale;

    setDraggingNodeId(node.id);
    setDragOffset({
      x: currentMouseX - node.x,
      y: currentMouseY - node.y
    });
  };

  useEffect(() => {
    if (!draggingNodeId) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const dist = Math.hypot(
        e.clientX - dragStartMouseRef.current.x,
        e.clientY - dragStartMouseRef.current.y
      );
      if (dist > 3) {
        isDraggingRef.current = true;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / scale;
      const mouseY = (e.clientY - rect.top) / scale;

      const newX = Math.round(mouseX - dragOffset.x);
      const newY = Math.round(mouseY - dragOffset.y);

      setLocalDragPositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x: newX, y: newY }
      }));
    };

    const handleMouseUp = () => {
      if (draggingNodeId && localDragPositions[draggingNodeId] && onNodeMove) {
        const finalPos = localDragPositions[draggingNodeId];
        onNodeMove(draggingNodeId, finalPos.x, finalPos.y);
      }
      setLocalDragPositions({});
      setDraggingNodeId(null);
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 60);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNodeId, dragOffset, localDragPositions, onNodeMove, scale]);

  // Global outside-click listener to deselect active node when clicking canvas or outside
  useEffect(() => {
    if (!interactive || !onSelectNode) return;

    const handleGlobalClick = (e) => {
      if (isDraggingRef.current) return;
      // Do not deselect if click was on a tree node
      if (e.target.closest('.tree-node')) return;
      // Do not deselect if click was inside the left sidebar tree editor controls or modals
      if (
        e.target.closest('.family-tree-editor') ||
        e.target.closest('.ant-modal') ||
        e.target.closest('.ant-select-dropdown')
      ) {
        return;
      }

      onSelectNode(null);
    };

    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [interactive, onSelectNode]);

  const docFontFamily = fontMode === 'ghanshyam'
    ? "'Ghanshyam', sans-serif"
    : "'Anek Gujarati', 'Noto Sans Gujarati', sans-serif";

  // Helper to cleanly render Gujarati names on 2 compact lines to prevent horizontal overlap
  const renderNodeName = (name, isDeceased) => {
    if (!name) return <span>(અનામી)</span>;
    const str = String(name).trim();
    const words = str.split(/\s+/);
    if (words.length <= 1) {
      return (
        <div style={{ whiteSpace: 'nowrap' }}>
          {isDeceased ? <>{toFont('સ્વ. ')}{toFont(str)}</> : toFont(str)}
        </div>
      );
    }
    const firstPart = words[0];
    const secondPart = words.slice(1).join(' ');
    const secondFontSize = isUltraCompact
      ? (fontMode === 'ghanshyam' ? '10px' : '9px')
      : (fontMode === 'ghanshyam' ? '11px' : '10px');

    return (
      <div style={{ lineHeight: 1.12 }}>
        <div style={{ whiteSpace: 'nowrap' }}>
          {isDeceased ? <>{toFont('સ્વ. ')}{toFont(firstPart)}</> : toFont(firstPart)}
        </div>
        <div style={{ whiteSpace: 'nowrap', fontSize: secondFontSize, color: '#000000' }}>
          {toFont(secondPart)}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`pedhinamu-family-tree-canvas ${interactive ? 'interactive' : 'print-mode'}`}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        margin: '0 auto',
        userSelect: 'none',
        fontFamily: docFontFamily
      }}
      onClick={(e) => {
        if (!interactive) return;
        if (isDraggingRef.current) return;
        if (e.target.closest('.tree-node')) return;
        if (onSelectNode) {
          onSelectNode(null);
        }
      }}
    >
      {/* SVG Connecting Lines Layer: Clean Legal Pedhinamu Bus-Bar Architecture */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible'
        }}
      >
        <defs>
          <marker
            id="tree-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000" />
          </marker>
        </defs>

        {connections.map((conn) => (
          <path
            key={conn.id}
            d={conn.path}
            fill="none"
            stroke="#000000"
            strokeWidth="1.4"
            markerEnd={conn.noArrow ? 'none' : 'url(#tree-arrow)'}
          />
        ))}
      </svg>

      {/* Render All Recursive Nodes with explicit non-overlapping bounding boxes */}
      {nodes.map((node) => {
        const isRoot = node.isRoot;
        const isSelected = selectedNodeId === node.id;

        if (isRoot) {
          const rootFontSize = isUltraCompact
            ? (fontMode === 'ghanshyam' ? '12.5px' : '11.5px')
            : (fontMode === 'ghanshyam' ? '13.5px' : '12px');
          const rootPadding = isUltraCompact ? '3px 12px' : '4px 14px';

          return (
            <div
              key={node.id}
              className={`tree-node tree-node-root ${interactive ? 'draggable' : ''}`}
              style={{
                position: 'absolute',
                left: `${node.x}px`,
                top: `${node.y}px`,
                transform: 'translate(-50%, 0)',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: rootFontSize,
                color: '#000000',
                whiteSpace: 'nowrap',
                cursor: interactive ? 'grab' : 'default',
                padding: rootPadding,
                borderRadius: '5px',
                border: isSelected ? '2px solid #4f46e5' : '1.5px solid #475569',
                backgroundColor: isSelected ? '#ede9fe' : '#ffffff',
                boxShadow: isSelected ? '0 0 0 2px rgba(79, 70, 229, 0.25)' : '0 1px 3px rgba(0,0,0,0.08)',
                boxSizing: 'border-box',
                zIndex: isSelected ? 3 : 2
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (interactive && onSelectNode) onSelectNode(node.id);
              }}
              onMouseDown={(e) => handleMouseDown(e, node)}
            >
              {toFont(
                node.deceased
                  ? `સ્વ. ${node.name}${node.deathDate ? ` - (મરણ તા. ${node.deathDate})` : ''}`
                  : `${node.name}${node.age ? ` - (ઉ.આ.વ. ${node.age})` : ''}`
              )}
            </div>
          );
        }

        const nodePadding = '3px 4px';
        const relFontSize = isUltraCompact
          ? (fontMode === 'ghanshyam' ? '11px' : '10px')
          : (fontMode === 'ghanshyam' ? '12px' : '10.5px');
        const nameFontSize = isUltraCompact
          ? (fontMode === 'ghanshyam' ? '11px' : '10px')
          : (fontMode === 'ghanshyam' ? '12px' : '10.5px');
        const detailFontSize = isUltraCompact
          ? (fontMode === 'ghanshyam' ? '9.5px' : '8.5px')
          : (fontMode === 'ghanshyam' ? '10.5px' : '9.5px');

        const badgeTop = isUltraCompact ? '-24px' : '-30px';
        const badgeSize = isUltraCompact ? '19px' : '22px';
        const badgeFont = isUltraCompact ? '10px' : '11px';
        const badgeRight = isUltraCompact ? 'calc(50% - 28px)' : 'calc(50% - 30px)';

        return (
          <div
            key={node.id}
            className={`tree-node ${interactive ? 'draggable' : ''}`}
            style={{
              position: 'absolute',
              left: `${node.x}px`,
              top: `${node.y}px`,
              transform: 'translate(-50%, 0)',
              width: `${node.boxWidth || 90}px`,
              minHeight: `${node.boxHeight || 62}px`,
              textAlign: 'center',
              color: '#000',
              cursor: interactive ? 'grab' : 'default',
              padding: nodePadding,
              borderRadius: '5px',
              border: isSelected ? '2px solid #4f46e5' : '1px solid #94a3b8',
              backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
              boxShadow: isSelected ? '0 0 0 2px rgba(79, 70, 229, 0.25)' : '0 1px 2px rgba(0,0,0,0.06)',
              boxSizing: 'border-box',
              zIndex: isSelected ? 3 : 1
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (interactive && onSelectNode) onSelectNode(node.id);
            }}
            onMouseDown={(e) => handleMouseDown(e, node)}
          >
            {/* Sibling-Index Numbering Badge (Chip Circle) */}
            {node.siblingIndex && (
              <div
                className="node-sibling-badge"
                style={{
                  position: 'absolute',
                  top: badgeTop,
                  width: badgeSize,
                  height: badgeSize,
                  borderRadius: '50%',
                  fontSize: badgeFont,
                  fontWeight: 'bold',
                  background: 'rgb(226, 232, 240)',
                  color: '#000000',
                  border: '1px solid rgb(203, 213, 225)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 5,
                  boxShadow: 'rgba(0, 0, 0, 0.1) 0px 1px 2px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  pointerEvents: 'none',
                  right: badgeRight
                }}
              >
                {node.siblingIndex}
              </div>
            )}

            {node.relationship && (
              <div
                style={{
                  fontWeight: 700,
                  fontSize: relFontSize,
                  color: '#000000',
                  marginBottom: isUltraCompact ? 0 : 1,
                  lineHeight: 1.05
                }}
              >
                {fmt(node.relationship)}
              </div>
            )}
            <div
              style={{
                fontWeight: 600,
                fontSize: nameFontSize
              }}
            >
              {renderNodeName(node.name, node.deceased)}
            </div>
            <div
              style={{
                fontSize: detailFontSize,
                color: '#000000',
                marginTop: isUltraCompact ? 0 : 1,
                lineHeight: 1.05,
                whiteSpace: 'nowrap'
              }}
            >
              {node.deceased
                ? node.deathDate ? toFont(`(મરણ તા. ${node.deathDate})`) : toFont('(અવસાન)')
                : node.age ? toFont(`(ઉ.આ.વ. ${node.age})`) : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
