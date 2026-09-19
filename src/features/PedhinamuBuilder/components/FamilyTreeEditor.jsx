import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Switch,
  Space,
  Typography,
  Modal,
  Form,
  Tag,
  Divider,
  Tree,
  Alert
} from 'antd';
import {
  UserPlus,
  Edit2,
  Trash2,
  RefreshCw,
  User,
  GitCommit,
  AlertTriangle
} from 'lucide-react';
import {
  normalizeFamilyTree,
  findNodeById,
  addNodeToParent,
  updateNodeInTree,
  deleteNodeFromTree,
  countDescendants
} from '../utils/treeModel';
import { convertUnicodeToGhanshyamLegacy } from '../../../utils/ghanshyamLegacy';
import GhanshyamInput from './GhanshyamInput';

const { Text } = Typography;

const RELATIONSHIP_OPTIONS = [
  { value: 'પત્ની', label: 'પત્ની (Wife)' },
  { value: 'પતિ', label: 'પતિ (Husband)' },
  { value: 'પુત્ર', label: 'પુત્ર (Son)' },
  { value: 'પુત્રી', label: 'પુત્રી (Daughter)' },
  { value: 'પૌત્ર', label: 'પૌત્ર (Grandson)' },
  { value: 'પૌત્રી', label: 'પૌત્રી (Granddaughter)' },
  { value: 'માતા', label: 'માતા (Mother)' },
  { value: 'પિતા', label: 'પિતા (Father)' },
  { value: 'ભાઈ', label: 'ભાઈ (Brother)' },
  { value: 'બહેન', label: 'બહેન (Sister)' },
  { value: 'અન્ય', label: 'અન્ય (Other)' }
];

export default function FamilyTreeEditor({
  tree,
  deceased,
  onChange,
  onAutoArrange,
  selectedNodeId,
  onSelectNode
}) {
  const normalized = normalizeFamilyTree(tree, deceased);
  const rootNode = normalized.rootNode;

  const [activeSelectedId, setActiveSelectedId] = useState(selectedNodeId || rootNode.id);
  const selectedNode = findNodeById(rootNode, activeSelectedId) || rootNode;

  useEffect(() => {
    setActiveSelectedId(selectedNodeId);
  }, [selectedNodeId]);

  const toFont = (text) => {
    if (!text) return '';
    const str = String(text);
    if (str === ')') return '}';
    if (str === '(') return '{';
    if (/[\u0A80-\u0AFF]/.test(str)) {
      return convertUnicodeToGhanshyamLegacy(str);
    }
    return str;
  };

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Form instances
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const handleSelect = (id) => {
    setActiveSelectedId(id);
    if (onSelectNode) {
      onSelectNode(id);
    }
  };

  // Open Add Node Modal
  const openAddModal = () => {
    addForm.resetFields();
    addForm.setFieldsValue({
      relationship: 'પુત્ર',
      gender: 'male',
      deceased: false
    });
    setAddModalVisible(true);
  };

  // Submit Add Node
  const handleAddSubmit = async () => {
    try {
      const values = await addForm.validateFields();
      const newNode = {
        id: `node-${Date.now()}`,
        name: values.name.trim(),
        age: values.age ? String(values.age).trim() : '',
        gender: values.gender,
        relationship: values.relationship,
        deceased: !!values.deceased,
        deathDate: values.deceased ? (values.deathDate ? String(values.deathDate).trim() : '') : '',
        position: null,
        children: []
      };

      const updatedRoot = addNodeToParent(rootNode, selectedNode.id, newNode);
      onChange({ rootNode: updatedRoot });
      setAddModalVisible(false);
      handleSelect(newNode.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Open Edit Modal
  const openEditModal = () => {
    editForm.resetFields();
    editForm.setFieldsValue({
      name: selectedNode.name,
      age: selectedNode.age,
      gender: selectedNode.gender || 'male',
      relationship: selectedNode.relationship || '',
      deceased: !!selectedNode.deceased,
      deathDate: selectedNode.deathDate || ''
    });
    setEditModalVisible(true);
  };

  // Submit Edit Node
  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      const updates = {
        name: values.name.trim(),
        age: values.age ? String(values.age).trim() : '',
        gender: values.gender,
        relationship: selectedNode.id === rootNode.id ? 'મુખ્ય વ્યક્તિ' : values.relationship,
        deceased: !!values.deceased,
        deathDate: values.deceased ? (values.deathDate ? String(values.deathDate).trim() : '') : ''
      };

      const updatedRoot = updateNodeInTree(rootNode, selectedNode.id, updates);
      onChange({ rootNode: updatedRoot });
      setEditModalVisible(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Node
  const handleDeleteNode = () => {
    if (selectedNode.id === rootNode.id) {
      Modal.warning({
        title: 'Cannot Delete Root Node',
        content: 'The root person (deceased ancestor) cannot be deleted. You can edit their name in the Deceased tab.'
      });
      return;
    }

    const descendantCount = countDescendants(selectedNode);

    const performDelete = () => {
      const updatedRoot = deleteNodeFromTree(rootNode, selectedNode.id);
      onChange({ rootNode: updatedRoot });
      handleSelect(rootNode.id);
    };

    if (descendantCount > 0) {
      Modal.confirm({
        title: 'Delete Node and Descendants?',
        icon: <AlertTriangle color="#ef4444" />,
        content: (
          <span>
            "<span className="font-ghanshyam" style={{ fontFamily: "'Ghanshyam', sans-serif" }}>{toFont(selectedNode.name || 'This node')}</span>" has {descendantCount} child node(s). Deleting it will also remove all its descendant nodes.
          </span>
        ),
        okText: 'Delete node and its descendants',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: performDelete
      });
    } else {
      Modal.confirm({
        title: 'Delete Member?',
        content: (
          <span>
            Are you sure you want to remove "<span className="font-ghanshyam" style={{ fontFamily: "'Ghanshyam', sans-serif" }}>{toFont(selectedNode.name)}</span>" from the family tree?
          </span>
        ),
        okText: 'Delete',
        okType: 'danger',
        onOk: performDelete
      });
    }
  };

  // Build Antd Tree Data recursively
  const buildAntdTreeData = (node, index = 0, level = 0) => {
    if (!node) return [];

    const isRoot = level === 0;
    const isSelected = activeSelectedId && node.id === activeSelectedId;
    const siblingIndex = isRoot ? null : index + 1;

    const titleContent = (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 6px',
          borderRadius: 4,
          background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
          fontWeight: isSelected ? 600 : 400
        }}
      >
        {siblingIndex && (
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              fontSize: 10,
              fontWeight: 700,
              background: '#e2e8f0',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            {siblingIndex}
          </span>
        )}
        {node.name ? (
          <span
            className="font-ghanshyam"
            style={{
              fontFamily: "'Ghanshyam', sans-serif",
              fontSize: '15px',
              lineHeight: 1.25
            }}
          >
            {toFont(node.name)}
          </span>
        ) : (
          <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
            (નામ વગર)
          </span>
        )}
        {node.relationship && (
          <Tag
            color={isRoot ? 'gold' : node.gender === 'female' ? 'magenta' : 'blue'}
            className="font-ghanshyam"
            style={{
              fontFamily: "'Ghanshyam', sans-serif",
              fontSize: '12.5px',
              padding: '0 6px',
              lineHeight: '20px',
              margin: 0
            }}
          >
            {toFont(node.relationship)}
          </Tag>
        )}
        {node.deceased && (
          <Tag
            color="default"
            className="font-ghanshyam"
            style={{
              fontFamily: "'Ghanshyam', sans-serif",
              fontSize: '11.5px',
              padding: '0 5px',
              lineHeight: '20px',
              margin: 0
            }}
          >
            {toFont('સ્વ.')}
          </Tag>
        )}
        {node.age && (
          <span
            className="font-ghanshyam"
            style={{
              fontFamily: "'Ghanshyam', sans-serif",
              fontSize: '12.5px',
              color: '#64748b'
            }}
          >
            {toFont(`(${node.age} વ.)`)}
          </span>
        )}
      </div>
    );

    return [{
      key: node.id,
      title: titleContent,
      children: (node.children || []).flatMap((child, idx) => buildAntdTreeData(child, idx, level + 1))
    }];
  };

  const antdTreeData = buildAntdTreeData(rootNode);

  return (
    <div className="family-tree-editor">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text strong style={{ fontSize: 13.5 }}>
          કુટુંબ વૃક્ષ વારસદારોની વિગત (Family Tree Nodes)
        </Text>
        <Button size="small" icon={<RefreshCw size={13} />} onClick={onAutoArrange}>
          Auto Arrange
        </Button>
      </div>

      {/* Selected Node Action Card */}
      <Card
        size="small"
        style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          marginBottom: 14
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Selected Person / પસંદ કરેલ વ્યક્તિ:
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <User size={16} />
              <span
                className="font-ghanshyam"
                style={{
                  fontFamily: "'Ghanshyam', sans-serif",
                  fontSize: '16px'
                }}
              >
                {selectedNode.deceased ? `${toFont('સ્વ.')} ${toFont(selectedNode.name)}` : toFont(selectedNode.name)}
              </span>
              {selectedNode.relationship && (
                <Tag
                  color={selectedNode.id === rootNode.id ? 'gold' : 'blue'}
                  className="font-ghanshyam"
                  style={{
                    fontFamily: "'Ghanshyam', sans-serif",
                    fontSize: '13px'
                  }}
                >
                  {toFont(selectedNode.relationship)}
                </Tag>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
              {selectedNode.deceased ? (
                selectedNode.deathDate ? (
                  <span>
                    અવસાન તારીખ:{' '}
                    <span
                      className="font-ghanshyam"
                      style={{ fontFamily: "'Ghanshyam', sans-serif", fontSize: '13px' }}
                    >
                      {toFont(selectedNode.deathDate)}
                    </span>
                  </span>
                ) : (
                  'અવસાન થયેલ'
                )
              ) : selectedNode.age ? (
                <span>
                  ઉંમર:{' '}
                  <span
                    className="font-ghanshyam"
                    style={{ fontFamily: "'Ghanshyam', sans-serif", fontSize: '13px' }}
                  >
                    {toFont(selectedNode.age)}
                  </span>{' '}
                  વર્ષ
                </span>
              ) : (
                ''
              )}
              &nbsp;•&nbsp; Direct Children: <strong>{selectedNode.children?.length || 0}</strong>
            </div>
          </div>
        </div>

        {/* Action Buttons: Add Node, Edit, Delete */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
          <Button
            type="primary"
            size="small"
            icon={<UserPlus size={14} />}
            onClick={openAddModal}
            style={{ backgroundColor: '#4f46e5' }}
          >
            + Add Node (નોડ ઉમેરો)
          </Button>

          <Button
            size="small"
            icon={<Edit2 size={13} />}
            onClick={openEditModal}
          >
            Edit
          </Button>

          {selectedNode.id !== rootNode.id && (
            <Button
              danger
              size="small"
              icon={<Trash2 size={13} />}
              onClick={handleDeleteNode}
            >
              Delete
            </Button>
          )}
        </div>
      </Card>

      {/* Tree Hierarchy Navigator */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
          Tree Hierarchy (વંશાવળી ક્રમ):
        </div>
        <Tree
          treeData={antdTreeData}
          selectedKeys={activeSelectedId ? [activeSelectedId] : []}
          onSelect={(keys) => handleSelect(keys[0] || null)}
          defaultExpandAll
          blockNode
        />
      </div>

      {/* ================= ADD NODE MODAL ================= */}
      <Modal
        title={
          <span>
            નવો કુટુંબ સભ્ય ઉમેરો (+ Add Child to "
            <span
              className="font-ghanshyam"
              style={{ fontFamily: "'Ghanshyam', sans-serif" }}
            >
              {toFont(selectedNode.name)}
            </span>
            ")
          </span>
        }
        open={addModalVisible}
        onOk={handleAddSubmit}
        onCancel={() => setAddModalVisible(false)}
        okText="Add Node"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" initialValues={{ relationship: 'પુત્ર', gender: 'male', deceased: false }}>
          <Alert
            message={
              <span>
                This person will be added as a direct child of:{' '}
                <strong
                  className="font-ghanshyam"
                  style={{ fontFamily: "'Ghanshyam', sans-serif", fontSize: '15px' }}
                >
                  {toFont(selectedNode.name)}
                </strong>
              </span>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="name"
            label="નામ"
            rules={[{ required: true, message: 'Please enter member name' }]}
          >
            <GhanshyamInput placeholder="દા.ત. રમેશભાઈ મધુભાઇ જીકાદરા" autoFocus />
          </Form.Item>

          <Form.Item
            name="relationship"
            label="સંબંધ"
            rules={[{ required: true, message: 'Please select relationship' }]}
          >
            <Select options={RELATIONSHIP_OPTIONS} />
          </Form.Item>

          <Form.Item name="age" label="ઉંમર">
            <GhanshyamInput placeholder="દા.ત. ૪૫" />
          </Form.Item>

          <Form.Item name="gender" label="જાતિ">
            <Select
              options={[
                { value: 'male', label: 'પુરુષ' },
                { value: 'female', label: 'સ્ત્રી' },
                { value: 'other', label: 'અન્ય' }
              ]}
            />
          </Form.Item>

          <Form.Item name="deceased" valuePropName="checked" label="અવસાન થયેલ છે? (Is Deceased?)">
            <Switch />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.deceased !== curr.deceased}
          >
            {({ getFieldValue }) =>
              getFieldValue('deceased') ? (
                <Form.Item name="deathDate" label="અવસાન તારીખ (Death Date)">
                  <GhanshyamInput placeholder="દા.ત. ૦૮-૦૧-૧૯૯૪" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* ================= EDIT NODE MODAL ================= */}
      <Modal
        title={
          <span>
            વ્યક્તિ વિગત સુધારો (Edit Member:{' '}
            <span
              className="font-ghanshyam"
              style={{ fontFamily: "'Ghanshyam', sans-serif" }}
            >
              {toFont(selectedNode.name)}
            </span>
            )
          </span>
        }
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
        okText="Save Changes"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="name"
            label="નામ"
            rules={[{ required: true, message: 'Please enter member name' }]}
          >
            <GhanshyamInput />
          </Form.Item>

          {selectedNode.id !== rootNode.id && (
            <Form.Item
              name="relationship"
              label="સંબંધ (Relationship to Parent)"
              rules={[{ required: true, message: 'Please select relationship' }]}
            >
              <Select options={RELATIONSHIP_OPTIONS} />
            </Form.Item>
          )}

          <Form.Item name="age" label="ઉંમર">
            <GhanshyamInput />
          </Form.Item>

          <Form.Item name="gender" label="જાતિ">
            <Select
              options={[
                { value: 'male', label: 'પુરુષ' },
                { value: 'female', label: 'સ્ત્રી' },
                { value: 'other', label: 'અન્ય' }
              ]}
            />
          </Form.Item>

          <Form.Item name="deceased" valuePropName="checked" label="અવસાન થયેલ છે?">
            <Switch />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.deceased !== curr.deceased}
          >
            {({ getFieldValue }) =>
              getFieldValue('deceased') ? (
                <Form.Item name="deathDate" label="અવસાન તારીખ">
                  <GhanshyamInput placeholder="દા.ત. ૦૮-૦૧-૧૯૯૪" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
