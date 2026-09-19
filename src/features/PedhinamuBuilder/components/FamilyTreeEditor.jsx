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

  // Open Add Node Modal with presets
  const openAddModal = (defaultRel = 'પુત્ર', defaultGender = 'male') => {
    addForm.resetFields();
    addForm.setFieldsValue({
      relationship: defaultRel,
      gender: defaultGender,
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

  // Open Edit Node Modal
  const openEditModal = () => {
    editForm.resetFields();
    editForm.setFieldsValue({
      name: selectedNode.name,
      age: selectedNode.age,
      gender: selectedNode.gender || (selectedNode.relationship === 'પત્ની' || selectedNode.relationship === 'પુત્રી' ? 'female' : 'male'),
      relationship: selectedNode.relationship || (selectedNode.id === rootNode.id ? 'મુખ્ય વ્યક્તિ' : 'પુત્ર'),
      deceased: !!selectedNode.deceased,
      deathDate: selectedNode.deathDate || ''
    });
    setEditModalVisible(true);
  };

  // Submit Edit Node
  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      const updatedFields = {
        name: values.name.trim(),
        age: values.age ? String(values.age).trim() : '',
        gender: values.gender,
        relationship: values.relationship,
        deceased: !!values.deceased,
        deathDate: values.deceased ? (values.deathDate ? String(values.deathDate).trim() : '') : ''
      };

      const updatedRoot = updateNodeInTree(rootNode, selectedNode.id, updatedFields);
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
        title: 'Cannot Delete Root Member',
        content: 'મુખ્ય વ્યક્તિ (Root Person) ને ડિલીટ કરી શકાતો નથી.'
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
        title: 'Delete Member and Descendants?',
        icon: <AlertTriangle color="#ef4444" />,
        content: (
          <div>
            <p>
              "<strong>{selectedNode.name}</strong>" ના આગળના{' '}
              <strong>{descendantCount}</strong> વંશજો પણ સાથે ડિલીટ થઈ જશે!
            </p>
            <p style={{ color: '#ef4444', fontWeight: 600 }}>
              Are you sure you want to proceed?
            </p>
          </div>
        ),
        okText: 'Delete All',
        okType: 'danger',
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

  // Build Antd Tree Data recursively with modern row items and search filtering
  const buildAntdTreeData = (node, index = 0, level = 0) => {
    if (!node) return [];

    const isRoot = level === 0;
    const isSelected = activeSelectedId && node.id === activeSelectedId;
    const siblingIndex = isRoot ? null : index + 1;
    const isFemale = node.gender === 'female' || node.relationship === 'પત્ની' || node.relationship === 'પુત્રી';

    const titleContent = (
      <div
        className="tree-node-row-item"
        style={{
          background: isSelected ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
          padding: '4px 8px',
          borderRadius: 8,
          border: isSelected ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid transparent'
        }}
      >
        <div className="node-row-left">
          {siblingIndex && (
            <span className="node-row-order">
              {siblingIndex}
            </span>
          )}
          {node.name ? (
            <span
              className="node-row-name font-ghanshyam"
              style={{
                fontFamily: "'Ghanshyam', sans-serif",
                fontSize: '15px'
              }}
            >
              {toFont(node.name)}
            </span>
          ) : (
            <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
              (નામ વગર)
            </span>
          )}
        </div>

        <div className="node-row-right">
          {node.relationship && (
            <Tag
              color={isRoot ? 'gold' : isFemale ? 'magenta' : 'blue'}
              className="font-ghanshyam"
              style={{
                fontFamily: "'Ghanshyam', sans-serif",
                fontSize: '12px',
                padding: '0 6px',
                lineHeight: '18px',
                margin: 0,
                borderRadius: 4
              }}
            >
              {toFont(node.relationship)}
            </Tag>
          )}
          {node.deceased ? (
            <Tag
              color="default"
              className="font-ghanshyam"
              style={{
                fontFamily: "'Ghanshyam', sans-serif",
                fontSize: '11px',
                padding: '0 4px',
                lineHeight: '18px',
                margin: 0,
                borderRadius: 4
              }}
            >
              {toFont('સ્વ.')}
            </Tag>
          ) : node.age ? (
            <span
              className="font-ghanshyam"
              style={{
                fontFamily: "'Ghanshyam', sans-serif",
                fontSize: '12px',
                color: '#64748b'
              }}
            >
              {toFont(`(${node.age} વ.)`)}
            </span>
          ) : null}
        </div>
      </div>
    );

    return [{
      key: node.id,
      title: titleContent,
      children: (node.children || []).flatMap((child, idx) => buildAntdTreeData(child, idx, level + 1))
    }];
  };

  const antdTreeData = buildAntdTreeData(rootNode);
  const isSelectedFemale = selectedNode.gender === 'female' || selectedNode.relationship === 'પત્ની' || selectedNode.relationship === 'પુત્રી';

  return (
    <div className="family-tree-editor">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Text strong style={{ fontSize: 13.5, color: '#0f172a' }}>
            કુટુંબ વૃક્ષ વારસદારોની વિગત
          </Text>
          <div style={{ fontSize: 11.5, color: '#64748b' }}>Family Tree Nodes & Hierarchy</div>
        </div>
        <Button size="small" icon={<RefreshCw size={13} />} onClick={onAutoArrange}>
          Auto Arrange
        </Button>
      </div>

      {/* Selected Person Hero Profile Card */}
      <div className="selected-person-hero-card">
        <div className="hero-top-row">
          <div className="hero-avatar-group">
            <div className={`hero-avatar ${isSelectedFemale ? 'female' : ''} ${selectedNode.deceased ? 'deceased' : ''}`}>
              {selectedNode.deceased ? 'સ્વ.' : isSelectedFemale ? '♀' : '♂'}
            </div>
            <div className="hero-info">
              <span className="hero-name font-ghanshyam" style={{ fontFamily: "'Ghanshyam', sans-serif" }}>
                {selectedNode.deceased ? `${toFont('સ્વ.')} ${toFont(selectedNode.name)}` : toFont(selectedNode.name)}
              </span>
              <div className="hero-badges">
                {selectedNode.relationship && (
                  <Tag
                    color={selectedNode.id === rootNode.id ? 'gold' : isSelectedFemale ? 'magenta' : 'blue'}
                    className="font-ghanshyam"
                    style={{ fontFamily: "'Ghanshyam', sans-serif", fontSize: '12px', margin: 0, borderRadius: 4 }}
                  >
                    {toFont(selectedNode.relationship)}
                  </Tag>
                )}
                <Tag
                  color={selectedNode.deceased ? 'default' : 'success'}
                  style={{ fontSize: '11px', margin: 0, borderRadius: 4 }}
                >
                  {selectedNode.deceased ? 'સ્વર્ગસ્થ (Deceased)' : 'હયાત (Alive)'}
                </Tag>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Meta Grid */}
        <div className="hero-meta-grid">
          <div className="meta-item">
            {selectedNode.deceased ? (
              <span>
                અવસાન તારીખ:
                <strong className="font-ghanshyam" style={{ fontFamily: "'Ghanshyam', sans-serif" }}>
                  {selectedNode.deathDate ? toFont(selectedNode.deathDate) : 'તારીખ નથી'}
                </strong>
              </span>
            ) : (
              <span>
                ઉંમર:
                <strong className="font-ghanshyam" style={{ fontFamily: "'Ghanshyam', sans-serif" }}>
                  {selectedNode.age ? `${toFont(selectedNode.age)} વર્ષ` : 'વિગત નથી'}
                </strong>
              </span>
            )}
          </div>
          <div className="meta-item" style={{ textAlign: 'right' }}>
            વારસદારો (Children): <strong>{selectedNode.children?.length || 0}</strong>
          </div>
        </div>

        {/* Quick Action Shortcuts on Hero Card */}
        <div className="hero-actions">
          <Button
            type="primary"
            className="btn-add-child"
            icon={<UserPlus size={13} />}
            onClick={() => openAddModal('પુત્ર', 'male')}
          >
            + વારસદાર ઉમેરો (+ Child)
          </Button>

          {selectedNode.id === rootNode.id && (
            <Button
              size="small"
              icon={<UserPlus size={13} />}
              onClick={() => openAddModal('પત્ની', 'female')}
            >
              + પત્ની ઉમેરો (+ Wife)
            </Button>
          )}

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
      </div>

      {/* Tree Hierarchy Navigator */}
      <div className="hierarchy-tree-container">
        <div className="hierarchy-header">
          <span className="hierarchy-title">
            <GitCommit size={14} color="#4f46e5" /> Tree Hierarchy (વંશાવળી ક્રમ)
          </span>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Click node to select
          </span>
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
