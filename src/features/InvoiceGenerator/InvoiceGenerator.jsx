import React, { useState, useRef, useEffect } from 'react';
import { Card, Col, Row, Typography, Input, InputNumber, Button, Divider, message, DatePicker, Select, Table, Modal, Space } from 'antd';
import dayjs from 'dayjs';
import { Plus, Trash2, FileSignature, Printer, Eye, Edit } from 'lucide-react';
import { IndicTransliterate } from "@ai4bharat/indic-transliterate";
import html2pdf from 'html2pdf.js';
import { useTasks } from '../../hooks/useTasks';
import { useInvoices, useCreateInvoice, useUpdateInvoice } from '../../hooks/useInvoices';
import InvoicePrintLayout from './InvoicePrintLayout';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function InvoiceGenerator({ currentAccentColor }) {
  const componentRef = useRef();

  // Client Details
  const [clientName, setClientName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const previewPrintRef = useRef();

  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

  const { data: tasks } = useTasks('', 'ACTIVE');
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const createInvoiceMutation = useCreateInvoice();
  const updateInvoiceMutation = useUpdateInvoice();

  // Auto-set Invoice No based on total invoices
  useEffect(() => {
    if (invoices && !invoiceNo && !editingInvoiceId) {
      const nextNo = invoices.length + 1;
      setInvoiceNo(nextNo.toString().padStart(3, '0'));
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

  const formatMoney = (val) => Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const addItem = () => setItems([...items, { id: Date.now(), description: '', qty: 1, price: 0 }]);
  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

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
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        onclone: (doc) => {
          const clonedRoot = doc.querySelector('.invoice-print-wrapper.pdf-mode');
          if (!clonedRoot) return;
          clonedRoot.style.overflow = 'visible';
          clonedRoot.style.height = 'auto';
          clonedRoot.style.maxHeight = 'none';
        },
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait', compress: true },
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

  const handlePrintAndSave = async () => {
    if (!clientName || !clientName.trim()) {
      message.error('Please enter the Client Name (Invoice To).');
      return;
    }

    try {
      const payload = {
        invoiceNo,
        taskId: selectedTaskId,
        clientName,
        date: invoiceDate.toISOString(),
        discountAmount: discountVal,
        jamaAmount,
        subTotal,
        total,
        balance,
        items
      };

      if (editingInvoiceId) {
        await updateInvoiceMutation.mutateAsync({ id: editingInvoiceId, data: payload });
        setEditingInvoiceId(null);
      } else {
        await createInvoiceMutation.mutateAsync(payload);
      }
      
      await handleGeneratePDF(componentRef, clientName);
    } catch (error) {
      console.error(error);
      message.error('Failed to save invoice to database.');
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
    setClientName(invoice.clientName);
    setInvoiceDate(dayjs(invoice.date));
    setSelectedTaskId(invoice.taskId);
    setDiscountAmount(invoice.discountAmount || 0);
    setJamaAmount(invoice.jamaAmount || 0);
    setItems(invoice.items || [{ id: Date.now(), description: '', qty: 1, price: 0 }]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const invoiceColumns = [
    {
      title: 'Invoice No.',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
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
        <Space>
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
        </Space>
      ),
    },
  ];

  // Theme colors (black & gray)
  const themeBlue = '#333333';
  const tableHeaderBg = '#f4f4f4';

  return (
    <div className="invoice-generator-wrap" style={{ padding: '4px 0 12px' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileSignature size={16} style={{ fontSize: 20, color: currentAccentColor }} />
          <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>Invoice Generator</Title>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ position: 'relative', zIndex: 10 }}>
        {/* Editor Inputs */}
        <Col xs={24} lg={12}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>


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
                {/* <Col xs={24}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Address</Text>
                  <IndicTransliterate
                    containerClassName="transliterate-wrapper"
                    renderComponent={(props) => <textarea {...props} className="custom-transliterate-input" style={{ width: '100%', padding: '4px 8px', minHeight: '60px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }} />}
                    value={clientAddress}
                    onChangeText={setClientAddress}
                    lang="gu"
                  />
                </Col> */}
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

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <Button 
                size="large" 
                icon={<Printer size={18} />} 
                onClick={handlePrintOnly} 
                style={{ color: currentAccentColor, borderColor: currentAccentColor }}
              >
                Print
              </Button>
              <Button 
                type="primary" 
                size="large" 
                icon={<Printer size={18} />} 
                onClick={handlePrintAndSave} 
                style={{ backgroundColor: currentAccentColor }}
                loading={createInvoiceMutation.isLoading}
              >
                Print & Save
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

      {/* Preview Modal for Saved Invoices */}
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
              Print
            </Button>
          </div>
        }
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={850}
        footer={null}
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
