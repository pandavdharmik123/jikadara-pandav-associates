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
  selectedNodeIds,
  onSelectNode
}) {
  const containerRef = useRef(null);

  // Multi-selection state
  const [internalSelectedIds, setInternalSelectedIds] = useState(() => {
    if (selectedNodeIds && selectedNodeIds.length > 0) return selectedNodeIds;
    return selectedNodeId ? [selectedNodeId] : ['root'];
  });

  useEffect(() => {
    if (selectedNodeIds && Array.isArray(selectedNodeIds)) {
      setInternalSelectedIds(selectedNodeIds);
    } else if (selectedNodeId) {
      setInternalSelectedIds([selectedNodeId]);
    } else {
      setInternalSelectedIds([]);
    }
  }, [selectedNodeIds, selectedNodeId]);

  // Group drag state & local position overrides for 60fps responsiveness
  const [localDragPositions, setLocalDragPositions] = useState({});
  const isDraggingRef = useRef(false);
  const dragStartClientRef = useRef({ x: 0, y: 0 });
  const dragAnchorCanvasRef = useRef({ x: 0, y: 0 });
  const activeDragNodeIdsRef = useRef([]);
  const initialPositionsRef = useRef({});
  const clickedNodeInfoRef = useRef(null);

  // Marquee box selection state
  const [marqueeBox, setMarqueeBox] = useState(null);
  const marqueeStartRef = useRef(null);
  const isMarqueeActiveRef = useRef(false);

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

  // Node mouse down: handles Shift/Ctrl multi-toggle and initiates group drag
  const handleNodeMouseDown = (e, node) => {
    if (!interactive) return;
    e.stopPropagation();

    isDraggingRef.current = false;
    dragStartClientRef.current = { x: e.clientX, y: e.clientY };

    const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;
    const isCurrentlySelected = internalSelectedIds.includes(node.id);

    let nextSelectedIds = [...internalSelectedIds];

    if (isModifier) {
      // Toggle selection of this node
      if (isCurrentlySelected) {
        nextSelectedIds = nextSelectedIds.filter((id) => id !== node.id);
      } else {
        nextSelectedIds.push(node.id);
      }
      setInternalSelectedIds(nextSelectedIds);
      if (onSelectNode) {
        onSelectNode(node.id, nextSelectedIds);
      }
    } else {
      if (!isCurrentlySelected) {
        // Single select this node
        nextSelectedIds = [node.id];
        setInternalSelectedIds(nextSelectedIds);
        if (onSelectNode) {
          onSelectNode(node.id, nextSelectedIds);
        }
      }
      // If already part of multi-selection, preserve selection so all selected nodes can be dragged together!
    }

    // Determine nodes to drag together
    const nodesToDrag = nextSelectedIds.includes(node.id) && nextSelectedIds.length > 0
      ? nextSelectedIds
      : [node.id];

    activeDragNodeIdsRef.current = nodesToDrag;

    const rect = containerRef.current.getBoundingClientRect();
    const currentMouseX = (e.clientX - rect.left) / scale;
    const currentMouseY = (e.clientY - rect.top) / scale;
    dragAnchorCanvasRef.current = { x: currentMouseX, y: currentMouseY };

    // Capture initial positions of all dragged nodes
    const initialPos = {};
    nodesToDrag.forEach((id) => {
      const found = nodes.find((n) => n.id === id);
      if (found) {
        initialPos[id] = { x: found.x, y: found.y };
      }
    });
    initialPositionsRef.current = initialPos;

    clickedNodeInfoRef.current = {
      nodeId: node.id,
      wasSelected: isCurrentlySelected,
      isModifier,
      multiSelectionBeforeClick: internalSelectedIds.length > 1
    };
  };

  // Canvas background mouse down: initiate marquee selection or prepare deselect
  const handleCanvasMouseDown = (e) => {
    if (!interactive) return;
    if (e.target.closest('.tree-node')) return;
    if (e.button !== 0) return; // Primary button only

    const rect = containerRef.current.getBoundingClientRect();
    const startX = (e.clientX - rect.left) / scale;
    const startY = (e.clientY - rect.top) / scale;

    marqueeStartRef.current = {
      canvasX: startX,
      canvasY: startY,
      clientX: e.clientX,
      clientY: e.clientY,
      isModifier: e.shiftKey || e.ctrlKey || e.metaKey
    };
    isMarqueeActiveRef.current = true;
    isDraggingRef.current = false;
  };

  // Global mouse move & mouse up listeners for group dragging & marquee selection
  useEffect(() => {
    if (!interactive) return;

    const handleWindowMouseMove = (e) => {
      if (!containerRef.current) return;

      // 1. Marquee Box Selection
      if (isMarqueeActiveRef.current && marqueeStartRef.current) {
        const dist = Math.hypot(
          e.clientX - marqueeStartRef.current.clientX,
          e.clientY - marqueeStartRef.current.clientY
        );
        if (dist > 4) {
          isDraggingRef.current = true;
          const rect = containerRef.current.getBoundingClientRect();
          const curX = (e.clientX - rect.left) / scale;
          const curY = (e.clientY - rect.top) / scale;

          const boxLeft = Math.min(marqueeStartRef.current.canvasX, curX);
          const boxTop = Math.min(marqueeStartRef.current.canvasY, curY);
          const boxWidth = Math.abs(curX - marqueeStartRef.current.canvasX);
          const boxHeight = Math.abs(curY - marqueeStartRef.current.canvasY);

          setMarqueeBox({ left: boxLeft, top: boxTop, width: boxWidth, height: boxHeight });

          // Intersect with nodes in layout
          const intersected = nodes
            .filter((n) => {
              const w = n.isRoot ? (n.boxWidth || 260) : (n.boxWidth || 100);
              const h = n.isRoot ? (n.boxHeight || 30) : (n.boxHeight || 65);
              const nLeft = n.x - w / 2;
              const nRight = n.x + w / 2;
              const nTop = n.y;
              const nBottom = n.y + h;

              return (
                nLeft < boxLeft + boxWidth &&
                nRight > boxLeft &&
                nTop < boxTop + boxHeight &&
                nBottom > boxTop
              );
            })
            .map((n) => n.id);

          let nextIds;
          if (marqueeStartRef.current.isModifier) {
            nextIds = Array.from(new Set([...internalSelectedIds, ...intersected]));
          } else {
            nextIds = intersected;
          }
          setInternalSelectedIds(nextIds);
        }
        return;
      }

      // 2. Group Dragging
      if (activeDragNodeIdsRef.current && activeDragNodeIdsRef.current.length > 0) {
        const dist = Math.hypot(
          e.clientX - dragStartClientRef.current.x,
          e.clientY - dragStartClientRef.current.y
        );
        if (dist > 3) {
          isDraggingRef.current = true;
        }

        if (isDraggingRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const currentMouseX = (e.clientX - rect.left) / scale;
          const currentMouseY = (e.clientY - rect.top) / scale;

          const dx = Math.round(currentMouseX - dragAnchorCanvasRef.current.x);
          const dy = Math.round(currentMouseY - dragAnchorCanvasRef.current.y);

          const updated = {};
          activeDragNodeIdsRef.current.forEach((id) => {
            const init = initialPositionsRef.current[id];
            if (init) {
              updated[id] = {
                x: init.x + dx,
                y: init.y + dy
              };
            }
          });

          setLocalDragPositions(updated);
        }
      }
    };

    const handleWindowMouseUp = () => {
      // 1. Finalize Marquee Selection
      if (isMarqueeActiveRef.current) {
        if (isDraggingRef.current) {
          if (onSelectNode) {
            const primary = internalSelectedIds[0] || null;
            onSelectNode(primary, internalSelectedIds);
          }
        } else {
          // Plain click on empty canvas -> deselect all
          setInternalSelectedIds([]);
          if (onSelectNode) {
            onSelectNode(null, []);
          }
        }
        setMarqueeBox(null);
        isMarqueeActiveRef.current = false;
        marqueeStartRef.current = null;
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 50);
        return;
      }

      // 2. Finalize Group Dragging
      if (activeDragNodeIdsRef.current && activeDragNodeIdsRef.current.length > 0) {
        if (isDraggingRef.current) {
          // Commit all dragged nodes' positions
          if (onNodeMove && Object.keys(localDragPositions).length > 0) {
            onNodeMove(localDragPositions);
          }
        } else {
          // Clicked an already selected node without dragging in a multi-selection:
          // Collapse selection to just the clicked node
          const info = clickedNodeInfoRef.current;
          if (info && info.wasSelected && !info.isModifier && info.multiSelectionBeforeClick) {
            setInternalSelectedIds([info.nodeId]);
            if (onSelectNode) {
              onSelectNode(info.nodeId, [info.nodeId]);
            }
          }
        }

        setLocalDragPositions({});
        activeDragNodeIdsRef.current = [];
        initialPositionsRef.current = {};
        clickedNodeInfoRef.current = null;
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 50);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [interactive, scale, nodes, internalSelectedIds, localDragPositions, onNodeMove, onSelectNode]);

  // Keyboard shortcuts: Escape to deselect, Ctrl/Cmd+A to select all
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setInternalSelectedIds([]);
        if (onSelectNode) onSelectNode(null, []);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        e.preventDefault();
        const allIds = nodes.map((n) => n.id);
        setInternalSelectedIds(allIds);
        if (onSelectNode) onSelectNode(allIds[0], allIds);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [interactive, nodes, onSelectNode]);

  const docFontFamily = fontMode === 'ghanshyam'
    ? "'Ghanshyam', sans-serif"
    : "'Anek Gujarati', 'Noto Sans Gujarati', sans-serif";

  // Helper to cleanly render Gujarati names on compact lines without horizontal overflow
  const renderNodeName = (name, isDeceased) => {
    if (!name) return <span>(અનામી)</span>;
    const str = String(name).trim();
    const words = str.split(/\s+/).filter(Boolean);

    const wrapStyle = {
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      wordBreak: 'break-all',
      lineBreak: 'anywhere',
      overflowWrap: 'anywhere',
      whiteSpace: 'normal',
      overflow: 'visible',
      paddingBottom: '2px'
    };

    if (words.length <= 1) {
      const singleFontSize = str.length > 14
        ? (fontMode === 'ghanshyam' ? '8.5px' : '7.5px')
        : str.length > 10
          ? (fontMode === 'ghanshyam' ? '9.5px' : '8.5px')
          : undefined;

      return (
        <div
          className="node-name-part"
          style={{
            ...wrapStyle,
            fontSize: singleFontSize,
            lineHeight: 1.25,
            paddingBottom: '2px'
          }}
        >
          {isDeceased ? <>{toFont('સ્વ. ')}{toFont(str)}</> : toFont(str)}
        </div>
      );
    }

    const firstPart = words[0];
    const secondPart = words.slice(1).join(' ');
    const totalLen = str.length;

    let secondFontSize = isUltraCompact
      ? (fontMode === 'ghanshyam' ? '9.5px' : '8.5px')
      : (fontMode === 'ghanshyam' ? '10.5px' : '9.5px');

    if (totalLen > 24) {
      secondFontSize = fontMode === 'ghanshyam' ? '8px' : '7.5px';
    } else if (totalLen > 16) {
      secondFontSize = fontMode === 'ghanshyam' ? '9px' : '8.5px';
    }

    return (
      <div style={{ lineHeight: 1.28, width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'visible' }}>
        <div
          className="node-name-part"
          style={{
            ...wrapStyle,
            paddingBottom: '1px'
          }}
        >
          {isDeceased ? <>{toFont('સ્વ. ')}{toFont(firstPart)}</> : toFont(firstPart)}
        </div>
        <div
          className="node-name-part"
          style={{
            ...wrapStyle,
            fontSize: secondFontSize,
            color: '#000000',
            marginTop: 0,
            lineHeight: 1.28,
            paddingBottom: '3px'
          }}
        >
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
      onMouseDown={handleCanvasMouseDown}
    >

      {/* Marquee Box Selection Overlay */}
      {marqueeBox && (
        <div
          className="pedhinamu-marquee-box"
          style={{
            position: 'absolute',
            left: `${marqueeBox.left}px`,
            top: `${marqueeBox.top}px`,
            width: `${marqueeBox.width}px`,
            height: `${marqueeBox.height}px`,
            border: '1.5px dashed #4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.12)',
            borderRadius: '3px',
            pointerEvents: 'none',
            zIndex: 25
          }}
        />
      )}

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
        const isSelected = internalSelectedIds.includes(node.id);

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
                maxWidth: '420px',
                wordBreak: 'break-all',
                lineBreak: 'anywhere',
                overflowWrap: 'anywhere',
                whiteSpace: 'normal',
                cursor: interactive ? 'grab' : 'default',
                padding: rootPadding,
                borderRadius: '5px',
                border: isSelected ? '2.5px solid #4f46e5' : '1.5px solid #475569',
                backgroundColor: isSelected ? '#ede9fe' : '#ffffff',
                boxShadow: isSelected ? '0 0 0 2px rgba(79, 70, 229, 0.3), 0 2px 6px rgba(79, 70, 229, 0.2)' : '0 1px 3px rgba(0,0,0,0.08)',
                boxSizing: 'border-box',
                zIndex: isSelected ? 4 : 2
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
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
        const isDeathDate = Boolean(node.deceased && node.deathDate);
        const detailFontSize = isDeathDate
          ? (fontMode === 'ghanshyam' ? (isUltraCompact ? '8.5px' : '9.5px') : (isUltraCompact ? '7.5px' : '8.5px'))
          : isUltraCompact
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
              width: `${node.boxWidth || 100}px`,
              minHeight: `${node.boxHeight || 65}px`,
              textAlign: 'center',
              color: '#000',
              cursor: interactive ? 'grab' : 'default',
              padding: isUltraCompact ? '2px 3px 3px 3px' : '2px 3px 3px 3px',
              borderRadius: '5px',
              border: isSelected ? '2.5px solid #4f46e5' : '1px solid #94a3b8',
              backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
              boxShadow: isSelected ? '0 0 0 2px rgba(79, 70, 229, 0.3), 0 2px 6px rgba(79, 70, 229, 0.2)' : '0 1px 2px rgba(0,0,0,0.06)',
              boxSizing: 'border-box',
              zIndex: isSelected ? 4 : 1,
              wordBreak: 'break-all',
              lineBreak: 'anywhere',
              overflowWrap: 'anywhere'
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
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

            {/* Inner Content Wrapper strictly containing all text within node box */}
            <div
              className="tree-node-content"
              style={{
                width: '100%',
                maxWidth: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'visible',
                boxSizing: 'border-box',
                wordBreak: 'break-all',
                lineBreak: 'anywhere',
                overflowWrap: 'anywhere'
              }}
            >
              {node.relationship && (
                <div
                  className="node-relationship"
                  style={{
                    fontWeight: 700,
                    fontSize: relFontSize,
                    color: '#000000',
                    marginBottom: isUltraCompact ? 0 : 1,
                    lineHeight: 1.2,
                    paddingBottom: '1px',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    wordBreak: 'break-all',
                    lineBreak: 'anywhere',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                    overflow: 'visible'
                  }}
                >
                  {fmt(node.relationship)}
                </div>
              )}
              <div
                className="node-name-wrapper"
                style={{
                  fontWeight: 600,
                  fontSize: nameFontSize,
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  wordBreak: 'break-all',
                  lineBreak: 'anywhere',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'normal',
                  overflow: 'visible',
                  paddingBottom: '1px'
                }}
              >
                {renderNodeName(node.name, node.deceased)}
              </div>
              <div
                className="node-detail"
                style={{
                  fontSize: detailFontSize,
                  color: '#000000',
                  marginTop: isUltraCompact ? 0 : 1,
                  lineHeight: 1.25,
                  paddingBottom: '3px',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                  wordBreak: 'normal',
                  lineBreak: 'normal',
                  overflowWrap: 'normal',
                  overflow: 'visible'
                }}
              >
                {node.deceased
                  ? node.deathDate ? toFont(`(મરણ તા. ${node.deathDate})`) : toFont('(અવસાન)')
                  : node.age ? toFont(`(ઉ.આ.વ. ${node.age})`) : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
