import React, { useState } from 'react';
import { Typography, Card, Table, Button, Space, Input, Modal, message } from 'antd';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useDocumentTypes, useCreateDocumentType, useUpdateDocumentType, useDeleteDocumentType } from '../../hooks/useDocumentTypes';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function DocumentTypesAdmin() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeName, setTypeName] = useState('');

  const { data: documentTypes, isLoading } = useDocumentTypes();
  const createMutation = useCreateDocumentType();
  const updateMutation = useUpdateDocumentType();
  const deleteMutation = useDeleteDocumentType();

  const handleOpenModal = (docType = null) => {
    setEditingType(docType);
    setTypeName(docType ? docType.name : '');
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingType(null);
    setTypeName('');
  };

  const handleSubmit = async () => {
    if (!typeName.trim()) {
      message.error('Document type name is required');
      return;
    }

    try {
      if (editingType) {
        await updateMutation.mutateAsync({ id: editingType.id, name: typeName.trim() });
        message.success('Document type updated');
      } else {
        await createMutation.mutateAsync({ name: typeName.trim() });
        message.success('Document type added');
      }
      handleCloseModal();
    } catch (error) {
      message.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Document Type?',
      content: 'Are you sure you want to delete this document type?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          message.success('Document type deleted');
        } catch (error) {
          message.error('Failed to delete document type');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text style={{ fontWeight: 600, color: '#0f172a' }}>{text}</Text>,
    },
    {
      title: 'Added On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<Edit size={16} />}
            onClick={() => handleOpenModal(record)}
            title="Edit"
          />
          <Button
            type="text"
            danger
            icon={<Trash2 size={16} />}
            onClick={() => handleDelete(record.id)}
            title="Delete"
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="advocate-module">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>Document Types</Title>
          <Text type="secondary">Manage the list of document types available when adding a task.</Text>
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => handleOpenModal()}
          style={{ borderRadius: '8px', height: 40, boxShadow: 'none' }}
        >
          Add New Type
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: 0 } }}>
        <Table
          className="modern-dashboard-table"
          columns={columns}
          dataSource={documentTypes}
          rowKey="id"
          loading={{ spinning: isLoading, indicator: <Loader size={60} /> }}
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: (
              <EmptyState 
                title="No document types found" 
                description="Click 'Add New Type' to create one." 
              />
            )
          }}
        />
      </Card>

      <Modal
        title={editingType ? "Edit Document Type" : "Add Document Type"}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText="Save"
        cancelText="Cancel"
      >
        <div style={{ padding: '20px 0' }}>
          <Input 
            placeholder="e.g., Will, Rent Agreement, Sale Deed" 
            size="large"
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
            onPressEnter={handleSubmit}
          />
        </div>
      </Modal>
    </div>
  );
}
