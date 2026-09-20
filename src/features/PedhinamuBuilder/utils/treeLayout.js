import { normalizeFamilyTree } from './treeModel.js';

/**
 * Recursive Multi-Generation Auto-Layout for Family Tree
 * Canvas width: 980pt (fits standard 1008pt legal landscape)
 */
export function calculateTreeLayout(treeData, deceased, overrides = {}) {
  const normalized = normalizeFamilyTree(treeData, deceased);
  const root = normalized.rootNode;

  // Calculate tree max depth (number of descendant levels under root)
  function getTreeMaxDepth(node, currentDepth = 0) {
    if (!node.children || node.children.length === 0) return currentDepth;
    return Math.max(currentDepth, ...node.children.map((c) => getTreeMaxDepth(c, currentDepth + 1)));
  }

  const maxDepth = getTreeMaxDepth(root);
  // Ultra-compact structure is strictly applied ONLY if 3 or more levels of nodes exist (maxDepth >= 3)
  const isUltraCompact = maxDepth >= 3;

  const baseCanvasWidth = 980;

  // Box dimensions and level coordinates
  let NODE_BOX_WIDTH = 100;
  let NODE_BOX_HEIGHT = 65;
  let ROOT_BOX_WIDTH = 260;
  let ROOT_BOX_HEIGHT = 30;
  let START_Y = 18;
  let LEVEL_HEIGHT = 100;
  let MIN_NODE_GAP = 12;

  let levelYMap = null;

  if (isUltraCompact) {
    // 3 or more descendant levels: comfortable balanced structure with proper spacing
    NODE_BOX_WIDTH = 92;
    NODE_BOX_HEIGHT = 56;
    ROOT_BOX_WIDTH = 240;
    ROOT_BOX_HEIGHT = 26;
    START_Y = 10;
    const ROOT_TO_L1_GAP = 48; // Generous drop arrow space for Level 1 so chips never overlap bus line
    const LEVEL_GAP = 28;
    MIN_NODE_GAP = 10;

    levelYMap = [START_Y];
    let curY = START_Y + ROOT_BOX_HEIGHT + ROOT_TO_L1_GAP;
    levelYMap[1] = curY;
    for (let lvl = 2; lvl <= Math.max(6, maxDepth + 2); lvl++) {
      curY += NODE_BOX_HEIGHT + LEVEL_GAP;
      levelYMap[lvl] = curY;
    }
  }

  if (!root) {
    return {
      canvasWidth: baseCanvasWidth,
      canvasHeight: 230,
      nodes: [],
      connections: [],
      busGroups: [],
      maxDepth: 0,
      isCompact: false,
      isUltraCompact: false
    };
  }

  // 1. Calculate subtree horizontal spans recursively
  function getSubtreeSpan(node) {
    const isRoot = node.id === root.id;
    const baseWidth = isRoot ? ROOT_BOX_WIDTH : NODE_BOX_WIDTH;
    if (!node.children || node.children.length === 0) {
      return baseWidth + MIN_NODE_GAP;
    }
    const childrenSpan = node.children.reduce((acc, child) => acc + getSubtreeSpan(child), 0);
    return Math.max(baseWidth + MIN_NODE_GAP, childrenSpan);
  }

  const nodes = [];

  // 2. Assign coordinates recursively
  function layoutNode(node, leftBound, rightBound, level, parentLayout = null, siblingIndex = null) {
    const isRoot = level === 0;
    const defaultX = Math.round((leftBound + rightBound) / 2);
    const defaultY = Math.round(
      isUltraCompact
        ? (levelYMap[level] !== undefined ? levelYMap[level] : (START_Y + 28 + level * 50))
        : (isRoot ? START_Y : START_Y + 40 + level * LEVEL_HEIGHT)
    );

    // Apply live drag override or saved manual position
    const customPos = overrides[node.id] || (node.position && node.position.x !== null ? node.position : null);
    const x = (customPos && customPos.x !== null && customPos.x !== undefined) ? customPos.x : defaultX;
    const y = (customPos && customPos.y !== null && customPos.y !== undefined) ? customPos.y : defaultY;

    const boxWidth = isRoot ? ROOT_BOX_WIDTH : NODE_BOX_WIDTH;
    const boxHeight = isRoot ? ROOT_BOX_HEIGHT : NODE_BOX_HEIGHT;

    const layoutItem = {
      ...node,
      level,
      siblingIndex: isRoot ? null : siblingIndex,
      x,
      y,
      defaultX,
      defaultY,
      boxWidth,
      boxHeight,
      topY: y,
      bottomY: y + boxHeight,
      leftX: x - boxWidth / 2,
      rightX: x + boxWidth / 2,
      isRoot,
      parentId: parentLayout ? parentLayout.id : null
    };

    nodes.push(layoutItem);

    // Layout children
    const children = node.children || [];
    if (children.length > 0) {
      const spans = children.map(getSubtreeSpan);
      const totalSpan = spans.reduce((a, b) => a + b, 0);

      let currentLeft = defaultX - totalSpan / 2;
      children.forEach((child, idx) => {
        const span = spans[idx];
        layoutNode(child, currentLeft, currentLeft + span, level + 1, layoutItem, idx + 1);
        currentLeft += span;
      });
    }

    return layoutItem;
  }

  const totalRootSpan = getSubtreeSpan(root);
  const canvasWidth = Math.max(baseCanvasWidth, totalRootSpan + 40);
  const rootLeft = Math.max(20, (canvasWidth - totalRootSpan) / 2);
  layoutNode(root, rootLeft, rootLeft + totalRootSpan, 0, null);

  // 3. Construct Unified Legal Bus-Bar Connectors
  const busGroups = [];
  const connections = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  nodes.forEach((parent) => {
    const children = (parent.children || []).map((c) => nodeMap.get(c.id)).filter(Boolean);
    if (children.length === 0) return;

    // Minimum child top edge
    const minChildTop = Math.min(...children.map((c) => c.topY));
    // When parent is root, position the bus line closer to root so level-1 drop lines are tall enough for chips
    const busY = parent.isRoot
      ? Math.round(parent.bottomY + 16)
      : Math.round((parent.bottomY + minChildTop) / 2);

    // Trunk line from parent bottom to busY
    const trunk = {
      fromX: parent.x,
      fromY: parent.bottomY,
      toX: parent.x,
      toY: busY
    };

    // Horizontal bus bar span
    const allX = [parent.x, ...children.map((c) => c.x)];
    const busFromX = Math.min(...allX);
    const busToX = Math.max(...allX);

    const busBar = {
      fromX: busFromX,
      toX: busToX,
      y: busY
    };

    // Vertical drop lines to each child
    const dropLines = children.map((child) => {
      // Connect to top center edge of child's bounding box
      const targetY = child.topY;
      const isDirect = Math.abs(parent.x - child.x) < 4 && children.length === 1;

      return {
        childId: child.id,
        isDirect,
        fromX: child.x,
        fromY: isDirect ? parent.bottomY : busY,
        toX: child.x,
        toY: targetY
      };
    });

    busGroups.push({
      parentId: parent.id,
      trunk,
      busBar,
      dropLines
    });

    // Generate path connections for SVG rendering
    if (children.length === 1 && Math.abs(parent.x - children[0].x) < 4) {
      // Single centered child: direct vertical line with arrow
      connections.push({
        id: `conn-${parent.id}-${children[0].id}`,
        path: `M ${parent.x} ${parent.bottomY} L ${children[0].x} ${children[0].topY}`
      });
    } else {
      // Trunk
      connections.push({
        id: `trunk-${parent.id}`,
        path: `M ${trunk.fromX} ${trunk.fromY} L ${trunk.toX} ${trunk.toY}`,
        noArrow: true
      });
      // Bus bar
      if (busBar.fromX < busBar.toX) {
        connections.push({
          id: `bus-${parent.id}`,
          path: `M ${busBar.fromX} ${busBar.y} L ${busBar.toX} ${busBar.y}`,
          noArrow: true
        });
      }
      // Drop lines
      dropLines.forEach((drop) => {
        connections.push({
          id: `drop-${parent.id}-${drop.childId}`,
          path: `M ${drop.fromX} ${drop.fromY} L ${drop.toX} ${drop.toY}`
        });
      });
    }
  });

  const maxNodeBottom = nodes.reduce((max, n) => Math.max(max, n.bottomY), 0);
  const canvasHeight = isUltraCompact
    ? Math.max(220, maxNodeBottom + 18)
    : Math.max(220, maxNodeBottom + 40);

  return {
    canvasWidth,
    canvasHeight,
    nodes,
    connections,
    busGroups,
    rootNode: nodes.find((n) => n.isRoot),
    maxDepth,
    isUltraCompact
  };
}
