import React, { useState, useRef, useEffect } from 'react';
import { Card, Col, Row, Typography, Input, InputNumber, Button, Divider, message, DatePicker, Select, Table, Modal, Space, Tag, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import { Plus, Trash2, FileSignature, Printer, Eye, Edit, Save, RefreshCw } from 'lucide-react';
import { IndicTransliterate } from "@ai4bharat/indic-transliterate";
import html2pdf from 'html2pdf.js';
import { useTasks } from '../../hooks/useTasks';
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice } from '../../hooks/useInvoices';
import InvoicePrintLayout from './InvoicePrintLayout';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function InvoiceGenerator({ currentAccentColor }) {
  const componentRef = useRef();
  const livePreviewRef = useRef();

  // Client Details
  const [clientName, setClientName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const [rightTab, setRightTab] = useState('preview'); // 'preview' | 'saved'
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const previewPrintRef = useRef();

  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

  const { data: tasks } = useTasks('', 'ACTIVE');
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const createInvoiceMutation = useCreateInvoice();
  const updateInvoiceMutation = useUpdateInvoice();
  const deleteInvoiceMutation = useDeleteInvoice();

  const isSaving = Boolean(
    createInvoiceMutation.isPending ||
    updateInvoiceMutation.isPending ||
    createInvoiceMutation.isLoading ||
    updateInvoiceMutation.isLoading
  );

  // Auto-set Invoice No based on max invoice number in list
  useEffect(() => {
    if (invoices && !invoiceNo && !editingInvoiceId) {
      const maxNo = invoices.reduce((max, inv) => {
        const num = parseInt(inv.invoiceNo, 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const nextNo = (maxNo + 1).toString().padStart(3, '0');
      setInvoiceNo(nextNo);
    }
  }, [invoices, editingInvoiceId, invoiceNo]);

  // Date Picker state
  const [invoiceDate, setInvoiceDate] = useState(dayjs());
  const displayDate = invoiceDate ? invoiceDate.format('DD/MM/YYYY') : '';

  // Items
  const [items, setItems] = useState([
    { id: 1, description: '', qty: 1, price: 0 }
  ]);

  // Footer & Financials
  const [discountAmount, setDiscountAmount] = useState(0);
  const [jamaAmount, setJamaAmount] = useState(0); // Paid amount
  const [paymentInfo, setPaymentInfo] = useState('Account No: 0123456789\nA/C Name: your name\nBank Detail: add your bank details');

  // Calculations
  const subTotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 0)), 0);
  const discountVal = parseFloat(discountAmount) || 0;
  const total = subTotal - discountVal;
  const balance = total - (jamaAmount || 0);

  const formatMoney = (val) => Math.round(Number(val || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const addItem = () => setItems([...items, { id: Date.now(), description: '', qty: 1, price: 0 }]);
  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  const handleResetForm = () => {
    setEditingInvoiceId(null);
    const maxNo = invoices?.reduce((max, inv) => {
      const num = parseInt(inv.invoiceNo, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0) || 0;
    const nextNo = (maxNo + 1).toString().padStart(3, '0');
    setInvoiceNo(nextNo);
    setClientName('');
    setSelectedTaskId(null);
    setInvoiceDate(dayjs());
    setDiscountAmount(0);
    setJamaAmount(0);
    setItems([{ id: Date.now(), description: '', qty: 1, price: 0 }]);
  };

  const handleGeneratePDF = async (ref, fileName) => {
    const element = ref.current;
    if (!element) return;

    const clone = element.cloneNode(true);
    clone.classList.add('pdf-mode');

    const container = document.createElement('div');
    container.className = 'pdf-export-container';
    Object.assign(container.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      width: '794px',
      overflow: 'visible',
      pointerEvents: 'none',
      zIndex: '-1',
    });

    Object.assign(clone.style, {
      overflow: 'visible',
      height: 'auto',
      maxHeight: 'none',
    });

    clone.querySelectorAll('.no-print').forEach(el => el.remove());

    container.appendChild(clone);
    document.body.appendChild(container);

    await new Promise((r) => setTimeout(r, 300));

    const A4_WIDTH_IN = 8.27;
    const PAGE_WIDTH_PX = A4_WIDTH_IN * 96;

    let captureHeight = Math.max(clone.scrollHeight, clone.offsetHeight);
    if (captureHeight === 0) {
      document.body.removeChild(container);
      message.error('Error calculating PDF size.');
      return;
    }

    const captureWidth = Math.max(clone.scrollWidth, clone.offsetWidth, PAGE_WIDTH_PX);

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'visible';
    document.documentElement.style.overflow = 'visible';

    const filename = fileName ? `${fileName}_Invoice.pdf` : 'Invoice.pdf';

    const opt = {
      margin: 0,
      filename,
      image: { type: 'png' },
      html2canvas: {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        logging: false,
        letterRendering: true,
        dpi: 300,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        onclone: (doc) => {
          const clonedRoot = doc.querySelector('.invoice-print-wrapper');
          if (!clonedRoot) return;
          clonedRoot.style.overflow = 'visible';
          clonedRoot.style.margin = '0 auto';
          clonedRoot.style.webkitFontSmoothing = 'antialiased';
          clonedRoot.style.mozOsxFontSmoothing = 'grayscale';
          clonedRoot.style.textRendering = 'geometricPrecision';
          clonedRoot.querySelectorAll('img').forEach((img) => {
            img.style.imageRendering = '-webkit-optimize-contrast';
          });
        },
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait', compress: true, precision: 16 },
      pagebreak: { mode: ['css', 'legacy'] },
    };

    try {
      await html2pdf().set(opt).from(clone).save();
      message.success('Invoice PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF generation failed:', err);
      message.error('Failed to generate Invoice PDF.');
    } finally {
      document.body.removeChild(container);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    }
  };

  const handlePrintOnly = async () => {
    if (!clientName || !clientName.trim()) {
      message.error('Please enter the Client Name (Invoice To).');
      return;
    }
    await handleGeneratePDF(componentRef, clientName);
  };

  const saveInvoiceData = async () => {
    if (!clientName || !clientName.trim()) {
      message.error('Please enter the Client Name (Invoice To).');
      return null;
    }

    const trimmedInvoiceNo = invoiceNo?.toString().trim();
    if (!trimmedInvoiceNo) {
      message.error('Please enter the Invoice Number.');
      return null;
    }

    const payload = {
      invoiceNo: trimmedInvoiceNo,
      taskId: selectedTaskId || null,
      clientName: clientName.trim(),
      date: invoiceDate ? invoiceDate.toISOString() : new Date().toISOString(),
      discountAmount: discountVal,
      jamaAmount: Number(jamaAmount) || 0,
      subTotal,
      total,
      balance,
      items
    };

    // Determine target ID to edit:
    // 1. If user explicitly clicked edit on an invoice -> editingInvoiceId
    // 2. OR if an existing active invoice matches this invoiceNo -> existingByNo.id
    const existingByNo = invoices?.find(
      inv => inv.invoiceNo?.toString().trim().toLowerCase() === trimmedInvoiceNo.toLowerCase()
    );
    const targetId = editingInvoiceId || existingByNo?.id;

    let result;
    if (targetId) {
      result = await updateInvoiceMutation.mutateAsync({ id: targetId, data: payload });
      // Keep editingInvoiceId set so subsequent clicks to Save or Print & Save continue to update this invoice
      setEditingInvoiceId(targetId);
      message.success(`Invoice #${trimmedInvoiceNo} updated successfully!`);
    } else {
      result = await createInvoiceMutation.mutateAsync(payload);
      if (result?.id) {
        setEditingInvoiceId(result.id);
      }
      message.success(`Invoice #${trimmedInvoiceNo} saved successfully!`);
    }
    return result;
  };

  const handleSaveOnly = async () => {
    try {
      await saveInvoiceData();
    } catch (error) {
      console.error('Save invoice error:', error);
      message.error(error?.response?.data?.error || 'Failed to save invoice.');
    }
  };

  const handlePrintAndSave = async () => {
    try {
      const saved = await saveInvoiceData();
      if (saved) {
        await handleGeneratePDF(componentRef, clientName);
      }
    } catch (error) {
      console.error('Print & Save error:', error);
      message.error(error?.response?.data?.error || 'Failed to save and print invoice.');
    }
  };

  const handleTaskChange = (val) => {
    setSelectedTaskId(val);
    const selectedTask = tasks?.find(t => t.id === val);
    if (selectedTask) {
      if (selectedTask.client?.name) setClientName(selectedTask.client.name);
      if (items.length > 0) {
        updateItem(items[0].id, 'description', selectedTask.documentType);
      }
    }
  };

  const handleViewInvoice = (invoice) => {
    setPreviewInvoice(invoice);
    setPreviewVisible(true);
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoiceId(invoice.id);
    setInvoiceNo(invoice.invoiceNo);
    setClientName(invoice.clientName || '');
    setInvoiceDate(invoice.date ? dayjs(invoice.date) : dayjs());
    setSelectedTaskId(invoice.taskId || null);
    setDiscountAmount(Number(invoice.discountAmount) || 0);
    setJamaAmount(Number(invoice.jamaAmount) || 0);

    let parsedItems = invoice.items;
    if (typeof parsedItems === 'string') {
      try {
        parsedItems = JSON.parse(parsedItems);
      } catch (e) {
        parsedItems = [];
      }
    }
    setItems(
      Array.isArray(parsedItems) && parsedItems.length > 0
        ? parsedItems.map((item, idx) => ({ ...item, id: item.id || Date.now() + idx }))
        : [{ id: Date.now(), description: '', qty: 1, price: 0 }]
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
    message.info(`Editing Invoice #${invoice.invoiceNo}`);
  };

  const invoiceColumns = [
    {
      title: 'Invoice No.',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      render: (val, record) => (
        <Space>
          <span>{val}</span>
          {record.id === editingInvoiceId && (
            <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>
              Editing
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Client Name',
      dataIndex: 'clientName',
      key: 'clientName',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total) => `₹${formatMoney(total)}`,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<Edit size={16} />}
            onClick={() => handleEditInvoice(record)}
            style={{ color: currentAccentColor }}
          >
            Edit
          </Button>
          <Button
            type="text"
            icon={<Eye size={16} />}
            onClick={() => handleViewInvoice(record)}
            style={{ color: currentAccentColor }}
          >
            View
          </Button>
          <Popconfirm
            title="Delete Invoice"
            description="Are you sure you want to delete this invoice?"
            onConfirm={async () => {
              try {
                await deleteInvoiceMutation.mutateAsync(record.id);
                message.success('Invoice moved to recycle bin');
                if (editingInvoiceId === record.id) {
                  handleResetForm();
                }
              } catch (err) {
                console.error(err);
                message.error('Failed to delete invoice');
              }
            }}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<Trash2 size={16} />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="invoice-generator-wrap" style={{ padding: '4px 0 12px' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileSignature size={16} style={{ fontSize: 20, color: currentAccentColor }} />
          <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>Invoice Generator</Title>
        </div>
        <Button
          icon={<Plus size={16} />}
          onClick={handleResetForm}
          style={{ borderColor: currentAccentColor, color: currentAccentColor }}
        >
          New Invoice
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ position: 'relative', zIndex: 10 }}>
        {/* Editor Inputs */}
        <Col xs={24} lg={12}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {editingInvoiceId && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(24, 144, 255, 0.08)',
                border: '1px solid rgba(24, 144, 255, 0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color="processing" style={{ margin: 0, fontWeight: 600 }}>Editing Mode</Tag>
                  <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    Editing Invoice #{invoiceNo}
                  </Text>
                </div>
                <Button size="small" onClick={handleResetForm} icon={<RefreshCw size={14} />}>
                  Cancel / New Invoice
                </Button>
              </div>
            )}

            <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>Invoice Details</span>} style={{ position: 'relative', zIndex: 99 }}>
              <Row gutter={[8, 8]}>
                <Col xs={24}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Link to Task (Optional)</Text>
                  <Select
                    showSearch
                    allowClear
                    placeholder="Select a Task"
                    style={{ width: '100%' }}
                    value={selectedTaskId}
                    onChange={handleTaskChange}
                    options={(tasks || []).map(t => ({
                      value: t.id,
                      label: `${t.client?.name} - ${t.documentType}`
                    }))}
                  />
                </Col>
                <Col xs={24}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Invoice To (Name) <span style={{ color: '#ff4d4f' }}>*</span></Text>
                  <IndicTransliterate
                    containerClassName="transliterate-wrapper"
                    renderComponent={(props) => <input {...props} className="custom-transliterate-input" style={{ width: '100%', padding: '4px 8px', height: '28px' }} />}
                    value={clientName}
                    onChangeText={setClientName}
                    lang="gu"
                  />
                </Col>
                <Col xs={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Invoice #</Text>
                  <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} style={{ height: '28px' }} />
                </Col>
                <Col xs={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Date</Text>
                  <DatePicker value={invoiceDate} onChange={setInvoiceDate} format="DD/MM/YYYY" style={{ width: '100%', height: '28px' }} />
                </Col>
              </Row>
            </Card>

            <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>Items</span>} style={{ position: 'relative', zIndex: 98 }}>
              {items.map((item, index) => (
                <Row gutter={8} key={item.id} style={{ marginBottom: 8 }} align="middle">
                  <Col xs={24} style={{ marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>#{index + 1}</Text>
                    <Button type="text" danger size="small" icon={<Trash2 size={16} />} onClick={() => removeItem(item.id)} style={{ float: 'right' }} />
                  </Col>
                  <Col xs={24}>
                    <IndicTransliterate
                      containerClassName="transliterate-wrapper"
                      renderComponent={(props) => <input {...props} className="custom-transliterate-input" placeholder="Item Description" style={{ width: '100%', padding: '4px 8px', height: '28px', marginBottom: 4 }} />}
                      value={item.description}
                      onChangeText={(text) => updateItem(item.id, 'description', text)}
                      lang="gu"
                    />
                  </Col>
                  <Col xs={12}>
                    <Input type="number" placeholder="Price" value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} prefix="₹" />
                  </Col>
                  <Col xs={12}>
                    <Input type="number" placeholder="Qty" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} />
                  </Col>
                  <Col xs={24}>
                    <Divider style={{ margin: '8px 0' }} />
                  </Col>
                </Row>
              ))}
              <Button type="dashed" block onClick={addItem} icon={<Plus size={16} />}>Add Item</Button>
            </Card>

            <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>Calculations & Footer</span>} style={{ position: 'relative', zIndex: 97 }}>
              <Row gutter={[8, 8]}>
                <Col xs={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Discount Amount</Text>
                  <InputNumber value={discountAmount} onChange={setDiscountAmount} style={{ width: '100%' }} min={0} />
                </Col>
                <Col xs={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>જમા (Paid)</Text>
                  <InputNumber value={jamaAmount} onChange={setJamaAmount} style={{ width: '100%' }} min={0} />
                </Col>
                <Col xs={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>બાકી (Balance)</Text>
                  <Input value={formatMoney(balance)} disabled style={{ width: '100%' }} />
                </Col>
              </Row>
            </Card>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
              <Button
                size="large"
                icon={<Eye size={18} />}
                onClick={() => {
                  setPreviewInvoice({
                    clientName,
                    invoiceNo,
                    date: invoiceDate,
                    items,
                    subTotal,
                    discountAmount: discountVal,
                    total,
                    jamaAmount,
                    balance
                  });
                  setPreviewVisible(true);
                }}
                style={{ color: currentAccentColor, borderColor: currentAccentColor }}
              >
                Preview
              </Button>
              <Button
                size="large"
                icon={<Printer size={18} />}
                onClick={handlePrintOnly}
                style={{ color: currentAccentColor, borderColor: currentAccentColor }}
              >
                Print
              </Button>
              <Button
                size="large"
                icon={<Save size={18} />}
                onClick={handleSaveOnly}
                loading={isSaving}
                style={{ color: currentAccentColor, borderColor: currentAccentColor }}
              >
                {editingInvoiceId ? 'Update' : 'Save'}
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<Printer size={18} />}
                onClick={handlePrintAndSave}
                style={{ backgroundColor: currentAccentColor }}
                loading={isSaving}
              >
                {editingInvoiceId ? 'Update & Print' : 'Print & Save'}
              </Button>
            </div>
          </div>
        </Col>

        {/* Saved Invoices Table */}
        <Col xs={24} lg={12}>
          <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>Saved Invoices</span>}>
            <Table
              dataSource={invoices}
              columns={invoiceColumns}
              rowKey="id"
              loading={invoicesLoading}
              pagination={{ pageSize: 10 }}
              size="small"
              rowClassName={(record) => (record.id === editingInvoiceId ? 'ant-table-row-selected' : '')}
            />
          </Card>
        </Col>
      </Row>

      {/* Hidden Print Component */}
      <div style={{ display: 'none' }}>
        <InvoicePrintLayout
          ref={componentRef}
          clientName={clientName}
          invoiceNo={invoiceNo}
          displayDate={displayDate}
          items={items}
          subTotal={subTotal}
          discountVal={discountVal}
          total={total}
          jamaAmount={jamaAmount}
          balance={balance}
        />
      </div>

      {/* Preview Modal for Invoices */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 32 }}>
            <span>Invoice Preview</span>
            <Button
              type="primary"
              icon={<Printer size={16} />}
              onClick={() => handleGeneratePDF(previewPrintRef, previewInvoice?.clientName)}
              style={{ backgroundColor: currentAccentColor }}
            >
              Print PDF
            </Button>
          </div>
        }
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={850}
        footer={null}
        destroyOnClose
      >
        <div style={{ overflowX: 'auto', background: '#e0e0e0', padding: 20, borderRadius: 8, display: 'flex', justifyContent: 'center' }}>
          <InvoicePrintLayout
            ref={previewPrintRef}
            clientName={previewInvoice?.clientName}
            invoiceNo={previewInvoice?.invoiceNo}
            displayDate={previewInvoice ? dayjs(previewInvoice.date).format('DD/MM/YYYY') : ''}
            items={previewInvoice?.items || []}
            subTotal={previewInvoice?.subTotal}
            discountVal={previewInvoice?.discountAmount}
            total={previewInvoice?.total}
            jamaAmount={previewInvoice?.jamaAmount}
            balance={previewInvoice?.balance}
          />
        </div>
      </Modal>
    </div>
  );
}
