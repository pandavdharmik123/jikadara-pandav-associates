import React, { useState, useRef } from 'react';
import { Typography, Card, Table, Select, DatePicker, Row, Col, Space, Button, Empty, Modal, Form, Input, message } from 'antd';
import { BarChart2, FileLineChart, Plus, Edit, Trash2, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useMonthlyReport, useYearlyReport } from '../../hooks/useReports';
import { useGeneralExpenses, useCreateGeneralExpense, useUpdateGeneralExpense, useDeleteGeneralExpense } from '../../hooks/useGeneralExpenses';
import useAuthStore from '../../store/authStore';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import FinancialReportPrintLayout from './FinancialReportPrintLayout';
import AddIncomeModal from './AddIncomeModal';
import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/currency';

const { Title, Text } = Typography;
const { Option } = Select;

export default function ExpenseReport() {
  const { user, activeFinancialYear } = useAuthStore();

  const reportPrintRef = useRef(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const currentYear = dayjs().year();
  const currentMonth = dayjs().month() + 1; // 1-12

  const [reportType, setReportType] = useState('MONTHLY'); // MONTHLY or YEARLY
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Income Modal State
  const [isIncomeModalVisible, setIsIncomeModalVisible] = useState(false);

  // General Expense Modal State
  const [isExpenseModalVisible, setIsExpenseModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm] = Form.useForm();

  if (user?.role === 'JUNIOR') {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={4}>Access Denied</Title>
        <Text>Only Senior or Admin can view reports.</Text>
      </div>
    );
  }

  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyReport(
    reportType === 'MONTHLY' ? activeFinancialYear?.startDate : null,
    reportType === 'MONTHLY' ? activeFinancialYear?.endDate : null,
    reportType === 'MONTHLY' ? selectedYear : null,
    reportType === 'MONTHLY' ? selectedMonth : null
  );

  const { data: yearlyData, isLoading: yearlyLoading } = useYearlyReport(
    reportType === 'YEARLY' ? activeFinancialYear?.startDate : null,
    reportType === 'YEARLY' ? activeFinancialYear?.endDate : null,
    reportType === 'YEARLY' ? selectedYear : null
  );

  let geStart, geEnd;
  if (reportType === 'MONTHLY') {
    geStart = dayjs().year(selectedYear).month(selectedMonth - 1).startOf('month').format('YYYY-MM-DD');
    geEnd = dayjs().year(selectedYear).month(selectedMonth - 1).endOf('month').format('YYYY-MM-DD');
  } else {
    geStart = activeFinancialYear?.startDate;
    geEnd = activeFinancialYear?.endDate;
  }

  const { data: generalExpenses, isLoading: generalExpensesLoading } = useGeneralExpenses(geStart, geEnd);

  const createExpenseMutation = useCreateGeneralExpense();
  const updateExpenseMutation = useUpdateGeneralExpense();
  const deleteExpenseMutation = useDeleteGeneralExpense();

  const handleOpenExpenseModal = (expense = null) => {
    setEditingExpense(expense);
    if (expense) {
      expenseForm.setFieldsValue({
        date: dayjs(expense.date),
        description: expense.description,
        amount: expense.amount,
      });
    } else {
      expenseForm.resetFields();
      expenseForm.setFieldsValue({ date: dayjs() });
    }
    setIsExpenseModalVisible(true);
  };

  const handleCloseExpenseModal = () => {
    setIsExpenseModalVisible(false);
    setEditingExpense(null);
    expenseForm.resetFields();
  };

  const handleExpenseSubmit = async () => {
    try {
      const values = await expenseForm.validateFields();
      const payload = {
        date: values.date.format('YYYY-MM-DD'),
        description: values.description,
        amount: values.amount,
      };

      if (editingExpense) {
        await updateExpenseMutation.mutateAsync({ id: editingExpense.id, ...payload });
        message.success('General expense updated successfully');
      } else {
        await createExpenseMutation.mutateAsync(payload);
        message.success('General expense added successfully');
      }
      handleCloseExpenseModal();
    } catch (error) {
      if (error.name !== 'ValidationError') {
        message.error('Operation failed');
      }
    }
  };

  const handleDeleteExpense = (id) => {
    Modal.confirm({
      title: 'Delete Expense?',
      content: 'Are you sure you want to delete this general expense?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await deleteExpenseMutation.mutateAsync(id);
          message.success('General expense deleted');
        } catch (error) {
          message.error('Operation failed');
        }
      },
    });
  };

  const monthlyColumns = [
    {
      title: 'Sr.',
      key: 'srNo',
      width: 55,
      align: 'center',
      render: (_, __, index) => <Text style={{ color: '#64748b', fontSize: '13px' }}>{index + 1}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'completedDate',
      key: 'completedDate',
      render: (_, record) => dayjs(record.completedDate || record.startDate).format('DD/MM/YYYY'),
    },
    {
      title: 'Document Type',
      dataIndex: 'documentType',
      key: 'documentType',
    },
    {
      title: 'Place',
      dataIndex: 'place',
      key: 'place',
      render: (text) => text || '-',
    },
    {
      title: 'Client',
      key: 'client',
      render: (_, record) => record.client?.name || record.clientName || '-',
    },
    {
      title: 'Reference',
      dataIndex: 'referenceName',
      key: 'referenceName',
      render: (text) => text || '-',
    },
    {
      title: 'Net Profit',
      dataIndex: 'netAmount',
      key: 'netAmount',
      align: 'right',
      render: (val) => (
        <Text type={Number(val) >= 0 ? 'success' : 'danger'} strong>
          {formatCurrency(val)}
        </Text>
      ),
    },
  ];

  const yearlyColumns = [
    {
      title: 'Sr.',
      key: 'srNo',
      width: 55,
      align: 'center',
      render: (_, __, index) => <Text style={{ color: '#64748b', fontSize: '13px' }}>{index + 1}</Text>,
    },
    {
      title: 'Month',
      dataIndex: 'month',
      key: 'month',
      render: (val, record) => dayjs().month(val - 1).year(record.year || dayjs().year()).format('MMM YYYY'),
    },
    {
      title: 'Completed Tasks',
      dataIndex: 'taskCount',
      key: 'taskCount',
      align: 'center',
    },
    {
      title: 'Net Profit',
      dataIndex: 'netAmount',
      key: 'netAmount',
      align: 'right',
      render: (val) => (
        <Text type={Number(val) >= 0 ? 'success' : 'danger'} strong>
          {formatCurrency(val)}
        </Text>
      ),
    },
  ];

  const generalExpenseColumns = [
    {
      title: 'Sr.',
      key: 'srNo',
      width: 55,
      align: 'center',
      render: (_, __, index) => <Text style={{ color: '#64748b', fontSize: '13px' }}>{index + 1}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val) => <Text type="danger">{formatCurrency(val)}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<Edit size={16} />} onClick={() => handleOpenExpenseModal(record)} />
          <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => handleDeleteExpense(record.id)} />
        </Space>
      ),
    }
  ];

  const isLoading = reportType === 'MONTHLY' ? monthlyLoading : yearlyLoading;
  const hasData = reportType === 'MONTHLY' ? monthlyData?.tasks?.length > 0 : yearlyData?.yearlyTotals?.taskCount > 0;

  const tasksNetProfit = reportType === 'MONTHLY' ? (monthlyData?.totals?.netAmount || 0) : (yearlyData?.yearlyTotals?.netAmount || 0);

  const totalGeneralExpense = (generalExpenses || []).reduce((sum, item) => sum + Number(item.amount), 0);
  const finalNetProfit = Number(tasksNetProfit) - totalGeneralExpense;

  const handleGeneratePDF = async () => {
    const element = reportPrintRef.current;
    if (!element) return;

    setIsGeneratingPDF(true);
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    try {
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

      container.appendChild(clone);
      document.body.appendChild(container);

      document.body.style.overflow = 'visible';
      document.documentElement.style.overflow = 'visible';

      await new Promise((r) => setTimeout(r, 300));

      const captureWidth = 794;
      const captureHeight = Math.max(clone.scrollHeight, clone.offsetHeight, 1120);

      const periodName =
        reportType === 'MONTHLY'
          ? `${dayjs().month(selectedMonth - 1).format('MMMM')}_${selectedYear}`
          : (activeFinancialYear?.name?.replace(/[^a-zA-Z0-9]/g, '_') || `FY_${selectedYear}`);

      const filename = `Financial_Report_${periodName}.pdf`;

      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: captureWidth,
          height: captureHeight,
          windowWidth: captureWidth,
          windowHeight: captureHeight,
        },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(clone).save();
      document.body.removeChild(container);
      message.success('Financial report PDF exported successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      message.error('Failed to generate PDF');
    } finally {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="advocate-module">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Financial Reports</Title>
        </div>
        <Space wrap>
          <Select
            value={reportType}
            onChange={setReportType}
            size="middle"
            style={{ width: 120 }}
            variant="filled"
          >
            <Option value="MONTHLY">Monthly</Option>
            <Option value="YEARLY">Yearly</Option>
          </Select>

          {reportType === 'MONTHLY' && (
            <Select
              value={selectedMonth}
              onChange={setSelectedMonth}
              size="middle"
              style={{ width: 120 }}
              variant="filled"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <Option key={i + 1} value={i + 1}>{dayjs().month(i).format('MMMM')}</Option>
              ))}
            </Select>
          )}

          {(reportType === 'MONTHLY' || !activeFinancialYear) && (
            <DatePicker
              picker="year"
              value={dayjs().year(selectedYear)}
              onChange={(date) => setSelectedYear(date ? date.year() : currentYear)}
              size="middle"
              style={{ width: 100 }}
              allowClear={false}
              variant="filled"
            />
          )}

          <Button
            type="primary"
            icon={<Download size={16} />}
            onClick={handleGeneratePDF}
            loading={isGeneratingPDF}
            disabled={isLoading}
            style={{
              borderRadius: '8px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#10b981',
              borderColor: '#10b981',
              fontWeight: 500,
            }}
          >
            Export PDF
          </Button>
        </Space>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <Card bordered={false} style={{ flex: 1, minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
              <Space align="center" size="small">
                <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontSize: 16, fontWeight: 600 }}>₹</div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Profit</Text>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>
                    {formatCurrency(tasksNetProfit)}
                  </div>
                </div>
              </Space>
            </Card>

            <Card bordered={false} style={{ flex: 1, minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
              <Space align="center" size="small">
                <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 16, fontWeight: 600 }}>₹</div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>General Expense</Text>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>
                    {formatCurrency(totalGeneralExpense)}
                  </div>
                </div>
              </Space>
            </Card>

            <Card bordered={false} style={{ flex: 1, minWidth: 150, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: '12px 16px' } }}>
              <Space align="center" size="small">
                <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: 16, fontWeight: 600 }}>₹</div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Profit</Text>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb' }}>
                    {formatCurrency(finalNetProfit)}
                  </div>
                </div>
              </Space>
            </Card>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>Income List</Title>
            <Button type="primary" icon={<Plus size={16} />} onClick={() => setIsIncomeModalVisible(true)}>
              Add Income
            </Button>
          </div>
          {hasData ? (
            <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: 24 }} styles={{ body: { padding: 0 } }}>
              {reportType === 'MONTHLY' ? (
                <Table
                  className="modern-dashboard-table"
                  columns={monthlyColumns}
                  dataSource={monthlyData.tasks}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  size="small"
                  summary={() => (
                    <Table.Summary>
                      <Table.Summary.Row style={{ backgroundColor: '#f9fafb' }}>
                        <Table.Summary.Cell index={0} colSpan={6}>
                          <Text strong>Total</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <Text type={Number(tasksNetProfit) >= 0 ? 'success' : 'danger'} strong>
                            {formatCurrency(tasksNetProfit)}
                          </Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              ) : (
                <Table
                  className="modern-dashboard-table"
                  columns={yearlyColumns}
                  dataSource={yearlyData.months.filter(m => m.taskCount > 0)}
                  rowKey="key"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  size="small"
                  summary={() => (
                    <Table.Summary>
                      <Table.Summary.Row style={{ backgroundColor: '#f9fafb' }}>
                        <Table.Summary.Cell index={0} colSpan={2}>
                          <Text strong>Total</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="center">
                          <Text strong>{yearlyData?.yearlyTotals?.taskCount || 0}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                          <Text type={Number(tasksNetProfit) >= 0 ? 'success' : 'danger'} strong>
                            {formatCurrency(tasksNetProfit)}
                          </Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              )}
            </Card>
          ) : (
            <Card className="glass-panel" bordered={false} style={{ marginBottom: 24 }}>
              <EmptyState
                icon={FileLineChart}
                title="No tasks found"
                description="There are no completed tasks for the selected period."
              />
            </Card>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>General Expenses</Title>
            <Button type="primary" icon={<Plus size={16} />} onClick={() => handleOpenExpenseModal()}>
              Add Expense
            </Button>
          </div>

          <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: 0 } }}>
            <Table
              className="modern-dashboard-table"
              columns={generalExpenseColumns}
              dataSource={generalExpenses || []}
              rowKey="id"
              pagination={false}
              loading={generalExpensesLoading}
              scroll={{ x: 'max-content' }}
              size="small"
              locale={{ emptyText: <Empty description="No general expenses found for this period" /> }}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row style={{ backgroundColor: '#f9fafb' }}>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text type="danger" strong>{formatCurrency(totalGeneralExpense)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}></Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </>
      )}

      {/* Add Income Modal */}
      <AddIncomeModal
        visible={isIncomeModalVisible}
        onClose={() => setIsIncomeModalVisible(false)}
      />

      {/* General Expense Modal */}
      <Modal
        title={editingExpense ? "Edit General Expense" : "Add General Expense"}
        open={isExpenseModalVisible}
        onCancel={handleCloseExpenseModal}
        onOk={handleExpenseSubmit}
        confirmLoading={createExpenseMutation.isPending || updateExpenseMutation.isPending}
        okText="Save"
      >
        <Form form={expenseForm} layout="vertical">
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input placeholder="e.g., Office Rent, Internet Bill" />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Amount"
            rules={[{ required: true, message: 'Please enter the amount' }]}
          >
            <Input type="number" prefix="₹" placeholder="0.00" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Hidden Printable Component for PDF Generation */}
      <div style={{ position: 'absolute', left: '-10000px', top: 0, overflow: 'hidden' }}>
        <div ref={reportPrintRef}>
          <FinancialReportPrintLayout
            reportType={reportType}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            activeFinancialYear={activeFinancialYear}
            monthlyData={monthlyData}
            yearlyData={yearlyData}
            generalExpenses={generalExpenses}
            tasksNetProfit={tasksNetProfit}
            totalGeneralExpense={totalGeneralExpense}
            finalNetProfit={finalNetProfit}
          />
        </div>
      </div>
    </div>
  );
}
