/**
 * Family Tree Recursive Node Model and Helper Utilities
 *
 * Each member is a FamilyTreeNode:
 * {
 *   id: string,
 *   name: string,
 *   age: string | number,
 *   gender: 'male' | 'female' | 'other',
 *   relationship: string, // e.g. 'પત્ની', 'પતિ', 'પુત્ર', 'પુત્રી', 'માતા', 'પિતા', 'ભાઈ', 'બહેન', 'અન્ય'
 *   parentId: string | null,
 *   children: FamilyTreeNode[],
 *   position?: { x: number, y: number },
 *   deceased?: boolean,
 *   deathDate?: string
 * }
 */

export function createEmptyRoot(deceased = {}) {
  return {
    id: 'root',
    name: deceased.name || 'મુખ્ય વ્યક્તિ',
    age: '',
    gender: 'male',
    relationship: '',
    parentId: null,
    deceased: true,
    deathDate: deceased.deathDate || '',
    position: null,
    children: []
  };
}

/**
 * Migration & normalization function:
 * Converts legacy { rootTitle, spouses: [...] } into the new recursive rootNode structure.
 * Guaranteed: children become DIRECT children of root, NOT children of the wife!
 */
export function normalizeFamilyTree(tree, deceased = {}) {
  if (!tree) {
    return { rootNode: createEmptyRoot(deceased) };
  }

  // Already using new model
  if (tree.rootNode && tree.rootNode.id) {
    return tree;
  }

  // Legacy structure conversion
  const root = createEmptyRoot(deceased);
  if (tree.rootTitle) {
    root.name = deceased.name || root.name;
    root.deathDate = deceased.deathDate || root.deathDate;
  }

  const directChildren = [];

  if (Array.isArray(tree.spouses)) {
    tree.spouses.forEach((spouse, sIdx) => {
      // Spouse becomes direct child of root
      const spouseNode = {
        id: spouse.id || `spouse-${sIdx + 1}`,
        name: spouse.name || '',
        age: spouse.age || '',
        gender: 'female',
        relationship: spouse.label || 'પત્ની',
        parentId: root.id,
        deceased: !!spouse.isDeceased,
        deathDate: spouse.deathDate || '',
        position: (spouse.customX !== null && spouse.customX !== undefined)
          ? { x: spouse.customX, y: spouse.customY }
          : null,
        children: []
      };
      directChildren.push(spouseNode);

      // CRITICAL: Spouse's children also become DIRECT children of Root!
      if (Array.isArray(spouse.children)) {
        spouse.children.forEach((child, cIdx) => {
          const childNode = {
            id: child.id || `child-${sIdx + 1}-${cIdx + 1}`,
            name: child.name || '',
            age: child.age || '',
            gender: child.role === 'પુત્રી' || child.role === 'પૌત્રી' ? 'female' : 'male',
            relationship: child.role || 'પુત્ર',
            parentId: root.id, // Direct child of Root!
            deceased: !!child.isDeceased,
            deathDate: child.deathDate || '',
            position: (child.customX !== null && child.customX !== undefined)
              ? { x: child.customX, y: child.customY }
              : null,
            children: []
          };
          directChildren.push(childNode);
        });
      }
    });
  }

  root.children = directChildren;
  return { rootNode: root };
}

/**
 * Find a node by ID in the recursive tree
 */
export function findNodeById(root, id) {
  if (!root || !id) return null;
  if (root.id === id) return root;

  for (const child of root.children || []) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Add a new node as a direct child of parentId
 */
export function addNodeToParent(root, parentId, newNode) {
  if (!root) return root;

  if (root.id === parentId) {
    return {
      ...root,
      children: [
        ...(root.children || []),
        {
          ...newNode,
          parentId: root.id,
          children: newNode.children || []
        }
      ]
    };
  }

  return {
    ...root,
    children: (root.children || []).map((child) => addNodeToParent(child, parentId, newNode))
  };
}

/**
 * Update an existing node's fields (preserves parentId and children)
 */
export function updateNodeInTree(root, nodeId, updates) {
  if (!root || !nodeId) return root;

  if (root.id === nodeId) {
    return {
      ...root,
      ...updates,
      id: root.id, // Preserve ID
      parentId: root.parentId, // Preserve parent relationship!
      children: updates.children !== undefined ? updates.children : root.children
    };
  }

  return {
    ...root,
    children: (root.children || []).map((child) => updateNodeInTree(child, nodeId, updates))
  };
}

/**
 * Delete a node and all its descendants
 */
export function deleteNodeFromTree(root, nodeId) {
  if (!root || root.id === nodeId) return null;

  return {
    ...root,
    children: (root.children || [])
      .filter((child) => child.id !== nodeId)
      .map((child) => deleteNodeFromTree(child, nodeId))
  };
}

/**
 * Update node visual position without touching relationships
 */
export function updateNodePosition(root, nodeId, x, y) {
  if (!root || !nodeId) return root;

  if (root.id === nodeId) {
    return {
      ...root,
      position: { x, y }
    };
  }

  return {
    ...root,
    children: (root.children || []).map((child) => updateNodePosition(child, nodeId, x, y))
  };
}

/**
 * Update multiple nodes visual positions simultaneously
 */
export function updateMultipleNodePositions(root, positionsMap) {
  if (!root || !positionsMap || Object.keys(positionsMap).length === 0) return root;

  function updateRec(node) {
    if (!node) return node;
    const newPos = positionsMap[node.id];
    const updatedNode = newPos ? { ...node, position: { x: newPos.x, y: newPos.y } } : node;
    return {
      ...updatedNode,
      children: (node.children || []).map(updateRec)
    };
  }

  return updateRec(root);
}

/**
 * Count descendants of a node
 */
export function countDescendants(node) {
  if (!node || !Array.isArray(node.children)) return 0;
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

/**
 * Flatten tree into array of nodes with level information
 */
export function getAllNodesFlat(root, level = 0) {
  if (!root) return [];
  const list = [{ ...root, level }];
  for (const child of root.children || []) {
    list.push(...getAllNodesFlat(child, level + 1));
  }
  return list;
}
