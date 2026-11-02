import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Typography,
  Button,
  Card,
  Table,
  Select,
  Input,
  Space,
  Tag,
  Row,
  Col,
  Modal,
  Popconfirm,
  message,
  Tooltip,
} from 'antd';
import {
  Plus,
  Search,
  RefreshCw,
  Users,
  BookMarked,
  CheckCircle2,
  CircleDashed,
  IndianRupee,
  Trash2,
  Pencil,
  FileSpreadsheet,
  FileDown,
  Printer,

  X,
  Layers,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import dayjs from 'dayjs';
import { formatCurrencyPrecise } from '../../utils/currency';
import {
  buildWorkbookXml,
  downloadWorkbook,
} from '../../utils/excelExport';
import {
  MONTH_NAMES,
  useNotaryRegister,
  useNotaryRegisters,
  useNotaryUsers,
  useNotarySummary,

  useDeleteNotaryRegister,
  useAssignNotaryEntry,
  useBulkAssignNotaryEntries,
} from '../../hooks/useNotaryHisab';
import NotaryRegisterModal from './NotaryRegisterModal';
import NotaryUserStatementModal from './NotaryUserStatementModal';
import NotaryPdfLayout from './NotaryPdfLayout';
import EmptyState from '../../components/EmptyState';

const { Title, Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// Notary Hisab – monthly notary register with automatic serial-number
// generation, user assignment, derived (never-stored) user-wise amounts,
// Excel/print exports.
// ─────────────────────────────────────────────────────────────────────────────

export default function NotaryHisabPage() {
  const queryClient = useQueryClient();
  const { data: registers = [], isLoading: registersLoading } = useNotaryRegisters();
  const { data: notaryUsers = [] } = useNotaryUsers();

  const [registerId, setRegisterId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRegister, setEditingRegister] = useState(null);
  const [statementUser, setStatementUser] = useState(null);

  // Auto-select the newest register without a setState-in-effect cascade:
  // null registerId always falls back to the newest record.
  const activeRegisterId = registerId ?? (registers.length > 0 ? registers[0].id : null);

  const {
    data: register,
    isLoading: registerLoading,
  } = useNotaryRegister(activeRegisterId);
  const { data: summary = [], isLoading: summaryLoading } = useNotarySummary(activeRegisterId);

  const deleteRegisterMutation = useDeleteNotaryRegister();
  const assignMutation = useAssignNotaryEntry();
  const bulkAssignMutation = useBulkAssignNotaryEntries();

  // Hidden (off-screen) Excel-style PDF template captured by html2pdf.
  const pdfLayoutRef = useRef(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [userFilter, setUserFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null); // assigned | unassigned | all
  const [serialSearch, setSerialSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkUserId, setBulkUserId] = useState(null);

  // ── Controlled pagination ─────────────────────────────────────────────────
  // antd's internal page state stays out of range when filtering, searching or
  // switching page-size shrinks the dataset — showing a blank table. We own
  // the state, clamp it to the dataset, and reset to page 1 whenever the
  // visible dataset changes size.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const applySerialSearch = (value) => {
    setSerialSearch(value);
    setPage(1);
  };
  const applyUserFilter = (value) => {
    setUserFilter(value);
    setPage(1);
  };
  const applyStatusFilter = (value) => {
    setStatusFilter(value ?? null);
    setPage(1);
  };
  const handlePaginationChange = (p, ps) => {
    if (ps !== pageSize) {
      setPageSize(ps);
      setPage(1);
    } else {
      setPage(p);
    }
  };

  // Register switches happen only through explicit actions, so selection and
  // bulk state are cleared right where those actions occur. Filters/search
  // are also reset — a filter from another month must never silently hide
  // rows (which reads as "filter not working").
  const selectRegister = (id) => {
    setRegisterId(id);
    setSelectedRowKeys([]);
    setBulkUserId(null);
    setPage(1);
    setSerialSearch('');
    setUserFilter(null);
    setStatusFilter(null);
  };

  const rate = register ? Number(register.ratePerEntry) : 0;

  // ── Derived stats (never stored; always accurate) ─────────────────────────
  const stats = useMemo(() => {
    if (!register?.entries) return null;
    const entries = register.entries;
    const assigned = entries.filter((e) => e.assignedUserId);
    const totalAmount = assigned.length * rate;
    return {
      total: entries.length,
      assigned: assigned.length,
      unassigned: entries.length - assigned.length,
      totalAmount,
      users: new Set(assigned.map((e) => e.assignedUserId)).size,
    };
  }, [register, rate]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    if (!register?.entries) return [];
    return register.entries.filter((e) => {
      if (userFilter && e.assignedUserId !== userFilter) return false;
      if (statusFilter === 'assigned' && !e.assignedUserId) return false;
      if (statusFilter === 'unassigned' && e.assignedUserId) return false;
      if (serialSearch.trim()) {
        return String(e.serialNumber).includes(serialSearch.trim());
      }
      return true;
    });
  }, [register, userFilter, statusFilter, serialSearch]);

  // Clamp the visible page to the dataset so a shrunken result set can never
  // render an out-of-range (blank) page.
  const totalFiltered = filteredEntries.length;
  const safePage = Math.min(page, Math.max(1, Math.ceil(totalFiltered / pageSize)));

  const userNameById = useMemo(() => {
    const m = new Map(notaryUsers.map((u) => [u.id, u]));
    // include names that appear in entries even if not in directory yet
    (register?.entries || []).forEach((e) => {
      if (e.assignedTo && !m.has(e.assignedTo.id)) m.set(e.assignedTo.id, e.assignedTo);
    });
    (summary || []).forEach((s) => {
      if (s.userId && !m.has(s.userId)) m.set(s.userId, { id: s.userId, name: s.userName });
    });
    return m;
  }, [notaryUsers, register, summary]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const handleAssign = async (entry, userId) => {
    try {
      await assignMutation.mutateAsync({ entryId: entry.id, assignedUserId: userId, registerId: activeRegisterId });
      if (userId) {
        const name = userNameById.get(userId)?.name || 'user';
        message.success(`Serial #${entry.serialNumber} assigned to ${name}`);
      } else {
        message.success(`Serial #${entry.serialNumber} marked as Unassigned`);
      }
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to save assignment');
    }
  };

  const handleBulkAssign = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      const res = await bulkAssignMutation.mutateAsync({
        registerId: activeRegisterId,
        entryIds: selectedRowKeys,
        assignedUserId: bulkUserId,
      });
      message.success(`${res?.changed ?? selectedRowKeys.length} serial number(s) updated`);
      setSelectedRowKeys([]);
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to assign selected serial numbers');
    }
  };

  const handleDeleteRegister = async () => {
    const confirm = (stats?.assigned || 0) > 0;
    await confirmDeleteRegister(confirm);
  };

  const confirmDeleteRegister = async (confirm) => {
    try {
      await deleteRegisterMutation.mutateAsync({ id: activeRegisterId, confirm });
      message.success('Register deleted');
      setRegisterId(null);
    } catch (err) {
      if (err?.response?.status === 409) {
        // Ask the user to confirm the data loss explicitly
        Modal.confirm({
          title: 'Delete register with assignments?',
          content:
            err?.response?.data?.error ||
            'Assigned serial numbers will also be deleted. This cannot be undone.',
          okText: 'Delete permanently',
          okType: 'danger',
          cancelText: 'Cancel',
          onOk: () => confirmDeleteRegister(true),
        });
        return;
      }
      message.error(err?.response?.data?.error || 'Failed to delete register');
    }
  };

  // ── Exports & print ───────────────────────────────────────────────────────
  const registerSubtitle = register
    ? [`Month: ${MONTH_NAMES[register.month - 1]} ${register.year}`, `Per Entry Amount: ₹${rate.toLocaleString('en-IN')}`]
    : [];

  const exportFullRegister = () => {
    const xml = buildWorkbookXml({
      sheetName: 'Monthly Register',
      title: 'Monthly Notary Register',
      subtitleLines: registerSubtitle,
      columnCount: 4,
      rows: [
        { type: 'header', cells: ['Serial No.', 'Assigned User', 'Amount (₹)', 'Status'] },
        ...(register?.entries || []).map((e) => ({
          type: 'data',
          cells: [
            e.serialNumber,
            e.assignedTo?.name || 'Unassigned',
            e.assignedUserId ? { type: 'currency', v: rate } : { v: 0, type: 'currency' },
            e.assignedUserId ? 'Assigned' : 'Pending',
          ],
        })),
        {
          type: 'total',
          cells: [
            `Total (${stats?.total || 0} serials, ${stats?.assigned || 0} assigned)`,
            '',
            { type: 'currency', v: stats?.totalAmount || 0 },
            '',
          ],
        },
      ],
    });
    downloadWorkbook(`Notary-Register-${MONTH_NAMES[register.month - 1]}-${register.year}`, xml);
  };

  // Serial numbers with no user yet — shown as a grayed row for the PDF too.
  const unassignedSerials = useMemo(
    () => (register?.entries || []).filter((e) => !e.assignedUserId).map((e) => e.serialNumber),
    [register]
  );

  // Export the monthly register as a PDF laid out like the office
  // "Notary Hisab.xlsx" sheet: user rows with their serial numbers
  // flowing left→right and the count per user on the right.
  const handleExportRegisterPdf = async () => {
    const template = pdfLayoutRef.current;
    if (!template || !register) return;

    setIsGeneratingPdf(true);
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    let container = null;

    try {
      // Same clone-into-fresh-body-container approach as OfficeLedger —
      // capturing deep fixed-position React content directly yields blank
      // PDFs when an ancestor has a CSS transform.
      const clone = template.cloneNode(true);
      Object.assign(clone.style, {
        overflow: 'visible',
        height: 'auto',
        maxHeight: 'none',
        position: 'static',
        width: '794px',
        opacity: '1',
      });

      container = document.createElement('div');
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

      container.appendChild(clone);
      document.body.appendChild(container);

      document.body.style.overflow = 'visible';
      document.documentElement.style.overflow = 'visible';

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));

      const captureWidth = 794;
      const captureHeight = Math.max(clone.scrollHeight, clone.offsetHeight, 1120);
      const renderScale = Math.max(1, Math.min(4, 30000 / captureHeight));
      const safeMonth = `${MONTH_NAMES[register.month - 1].slice(0, 3).toUpperCase()}-${String(
        register.year
      ).slice(2)}`;

      const opt = {
        margin: 0,
        filename: `Notary_${safeMonth}.pdf`,
        image: { type: 'png' },
        html2canvas: {
          scale: renderScale,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          width: captureWidth,
          height: captureHeight,
          windowWidth: captureWidth,
          windowHeight: captureHeight,
        },
        jsPDF: {
          unit: 'in',
          format: 'a4',
          orientation: 'portrait',
          compress: true,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(clone).save();
      message.success('Notary register PDF exported successfully!');
    } catch (exportError) {
      console.error('Notary register PDF export error:', exportError);
      message.error('Failed to generate PDF');
    } finally {
      if (container?.parentNode) {
        container.parentNode.removeChild(container);
      }
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      setIsGeneratingPdf(false);
    }
  };

  const exportSummary = () => {
    const totalAmount = summary.reduce((s, r) => s + r.totalAmount, 0);
    const totalEntries = summary.reduce((s, r) => s + r.totalEntries, 0);
    const xml = buildWorkbookXml({
      sheetName: 'User-wise Summary',
      title: 'User-wise Notary Summary',
      subtitleLines: registerSubtitle,
      columnCount: 4,
      rows: [
        { type: 'header', cells: ['User Name', 'Total Entries', 'Rate (₹)', 'Total Amount (₹)'] },
        ...summary.map((r) => ({
          type: 'data',
          cells: [r.userName, r.totalEntries, { type: 'currency', v: r.rate }, { type: 'currency', v: r.totalAmount }],
        })),
        {
          type: 'total',
          cells: ['Total', totalEntries, '', { type: 'currency', v: totalAmount }],
        },
      ],
    });
    downloadWorkbook(`Notary-Summary-${register ? MONTH_NAMES[register.month - 1] : ''}-${register?.year ?? ''}`, xml);
  };

  const printRegister = () => {
    const rows = (register?.entries || [])
      .map(
        (e) => `<tr>
      <td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;">${e.serialNumber}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;">${e.assignedTo?.name || '—'}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${e.assignedUserId ? `₹${rate.toLocaleString('en-IN')}` : '—'}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${e.assignedUserId ? 'Assigned' : 'Pending'}</td>
    </tr>`
      )
      .join('');
    const w = window.open('', '_blank', 'width=900,height=950');
    if (!w) {
      message.error('Please allow pop-ups for printing');
      return;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Monthly Notary Register</title>
      <style>
        body{font-family:'Inter',-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a;margin:28px;}
        .head{border-bottom:2px solid #0f172a;padding-bottom:14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:16px;}
        .firm{display:flex;align-items:center;gap:12px;}
        .firm img{height:50px;width:auto;}
        .firm h1{font-size:19px;margin:0;font-weight:800;letter-spacing:-0.3px;}
        .firm small{display:block;font-size:11px;font-weight:600;color:#64748b;}
        .meta{text-align:right;}
        .meta .rtitle{font-size:14px;font-weight:800;color:#2563eb;text-transform:uppercase;letter-spacing:.04em;}
        .meta .per{font-size:13px;font-weight:700;margin-top:2px;}
        .meta .gen{font-size:10px;color:#64748b;margin-top:2px;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        thead th{background:#f8fafc;color:#64748b;padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:.03em;}
        th:nth-child(2){text-align:left;}
        tfoot td{background:#f1f5f9;font-weight:800;padding:9px 12px;}
        .sum{float:right;margin-top:16px;font-size:12.5px;width:290px;}
        .sum div{display:flex;justify-content:space-between;padding:3px 0;}
        .sum .big{font-size:16px;font-weight:800;color:#2563eb;border-top:2px solid #cbd5e1;padding-top:5px;margin-top:4px;}
        @media print{body{margin:10px}}
      </style></head><body>
      <div class="head">
        <div class="firm"><img src="/logo.png"/><div><h1>JIKADARA &amp; PANDAV ASSOCIATES</h1><small>Advocate &amp; Legal Consultants</small></div></div>
        <div class="meta"><div class="rtitle">Notary Register</div><div class="per">${MONTH_NAMES[register.month - 1]} ${register.year}</div><div class="gen">Generated: ${dayjs().format('DD/MM/YYYY, hh:mm A')}</div></div>
      </div>
      <table><thead><tr><th>Sr. No.</th><th>Assigned User</th><th>Amount (₹)</th><th>Status</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
      <tfoot><tr><td colspan="4">Total: ${stats?.total || 0} serial numbers • ${stats?.assigned || 0} assigned • ₹${(stats?.totalAmount || 0).toLocaleString('en-IN')}</td></tr></tfoot></table>
      <div class="sum">
        <div><span>Total Serial Numbers</span><b>${stats?.total || 0}</b></div>
        <div><span>Assigned</span><b>${stats?.assigned || 0}</b></div>
        <div><span>Unassigned</span><b>${stats?.unassigned || 0}</b></div>
        <div class="big"><span>Total Notary Amount</span><span>₹${(stats?.totalAmount || 0).toLocaleString('en-IN')}</span></div>
      </div>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  // ── Register selector ─────────────────────────────────────────────────────
  const registerOptions = registers.map((r) => ({
    label: `${MONTH_NAMES[r.month - 1]} ${r.year}`,
    value: r.id,
  }));

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Serial No.',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      width: 100,
      align: 'center',
      fixed: 'left',
      sorter: (a, b) => a.serialNumber - b.serialNumber,
      render: (v) => <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{v}</span>,
    },
    {
      title: 'Assigned User',
      dataIndex: 'assignedUserId',
      key: 'assignedUserId',
      width: 220,
      render: (_, entry) => (
        <Select
          size="small"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Unassigned"
          value={entry.assignedUserId || undefined}
          loading={assignMutation.isPending}
          onChange={(v) => handleAssign(entry, v || null)}
          options={(notaryUsers.length ? notaryUsers : [entry.assignedTo].filter(Boolean)).map((u) => ({
            label: u.name,
            value: u.id,
          }))}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      width: 110,
      align: 'right',
      sorter: (a, b) => (a.assignedUserId ? 1 : 0) - (b.assignedUserId ? 1 : 0),
      render: (_, entry) =>
        entry.assignedUserId ? (
          <span style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrencyPrecise(rate)}</span>
        ) : (
          <span style={{ fontWeight: 700, color: '#cbd5e1' }}>₹0</span>
        ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      align: 'center',
      filters: [
        { text: 'Assigned', value: 'assigned' },
        { text: 'Pending', value: 'unassigned' },
      ],
      onFilter: (val, entry) => (val === 'assigned' ? Boolean(entry.assignedUserId) : !entry.assignedUserId),
      render: (_, entry) =>
        entry.assignedUserId ? (
          <Tag color="success" style={{ borderRadius: 10, fontWeight: 600 }}>
            Assigned
          </Tag>
        ) : (
          <Tag style={{ borderRadius: 10, fontWeight: 600, color: '#94a3b8', borderColor: '#e2e8f0' }}>
            Pending
          </Tag>
        ),
    },
  ];

  const summaryColumns = [
    {
      title: 'User Name',
      dataIndex: 'userName',
      key: 'userName',
      sorter: (a, b) => a.userName.localeCompare(b.userName),
      render: (name) => <span style={{ fontWeight: 700, color: '#0f172a' }}>{name}</span>,
    },
    {
      title: 'Assigned Serial Numbers',
      dataIndex: 'serialNumbers',
      key: 'serialNumbers',
      render: (serials) =>
        serials.length ? (
          <span style={{ fontSize: 12, color: '#475569' }}>
            {serials.slice(0, 12).join(', ')}
            {serials.length > 12 ? ` … (+${serials.length - 12})` : ''}
          </span>
        ) : (
          '—'
        ),
    },
    {
      title: 'Total Entries',
      dataIndex: 'totalEntries',
      key: 'totalEntries',
      width: 110,
      align: 'center',
      sorter: (a, b) => a.totalEntries - b.totalEntries,
      render: (v) => <span style={{ fontWeight: 700 }}>{v}</span>,
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      key: 'rate',
      width: 100,
      align: 'right',
      render: (v) => formatCurrencyPrecise(v),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.totalAmount - b.totalAmount,
      render: (v) => <span style={{ fontWeight: 800, color: '#16a34a' }}>{formatCurrencyPrecise(v)}</span>,
    },
    {
      title: 'Statement',
      key: 'statement',
      width: 110,
      align: 'center',
      render: (_, row) => (
        <Tooltip title="Open detailed statement">
          <Button
            type="text"
            size="small"
            icon={<FileSpreadsheet size={15} color="#2563eb" />}
            onClick={() => setStatementUser(row)}
          />
        </Tooltip>
      ),
    },
  ];

  const noRegister = !registersLoading && registers.length === 0;

  return (
    <div className="advocate-module">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Title
            level={3}
            style={{ margin: 0, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <BookMarked size={26} color="#2563eb" />
            Notary Hisab
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Monthly notary register & user-wise notary amount calculation
          </Text>
        </div>

        <Space wrap>
          <Tooltip title="Refresh">
            <Button
              icon={<RefreshCw size={15} />}
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['notaryRegisters'] });
                if (activeRegisterId) {
                  queryClient.invalidateQueries({ queryKey: ['notaryRegister', activeRegisterId] });
                  queryClient.invalidateQueries({ queryKey: ['notarySummary', activeRegisterId] });
                }
              }}
            />
          </Tooltip>
          <Button icon={<Plus size={16} />} onClick={() => setIsCreateModalOpen(true)} style={{ borderRadius: 8, height: 40 }}>
            Create Register
          </Button>
        </Space>
      </div>

      {/* Register selector + actions */}
      <Card
        bordered={false}
        style={{ borderRadius: 16, marginBottom: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
        styles={{ body: { padding: 16 } }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Text strong style={{ color: '#0f172a' }}>
            Register:
          </Text>
          <Select
            style={{ width: 260 }}
            placeholder="Select month / year"
            loading={registersLoading}
            value={activeRegisterId || undefined}
            options={registerOptions}
            onChange={selectRegister}
            status={register ? undefined : 'warning'}
          />
          {register && (
            <>
              <Tag icon={<Layers size={12} />} color="blue" style={{ borderRadius: 10 }}>
                {(register.ranges || [])
                  .map((rg) => `${rg.startNumber}–${rg.endNumber}`)
                  .join(', ')}
              </Tag>
              <Button
                size="small"
                icon={<Pencil size={13} />}
                onClick={() => setEditingRegister(register)}
                style={{ borderRadius: 8 }}
              >
                Edit
              </Button>
              <Popconfirm
                title="Delete this register?"
                description={
                  stats?.assigned > 0
? 'All assignments inside it will be permanently deleted.'
                    : 'This cannot be undone.'
                }
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={handleDeleteRegister}
              >
                <Button size="small" danger icon={<Trash2 size={13} />} style={{ borderRadius: 8 }}>
                  Delete
                </Button>
              </Popconfirm>
            </>
          )}
        </div>
      </Card>

      {noRegister ? (
        <Card bordered={false} style={{ borderRadius: 16 }}>
          <EmptyState
            icon={BookMarked}
            title="No notary register yet"
            description="Click 'Create Register' to set up your first monthly notary register with its serial-number ranges."
          />
        </Card>
      ) : (
        !register && !registersLoading && (
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <EmptyState
              icon={BookMarked}
              title="Select a register"
              description="Choose a month/year register above, or create a new one."
            />
          </Card>
        )
      )}

      {register && stats && (
        <>
          {/* Summary cards */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {[
              { label: 'Total Serials', value: stats.total, icon: BookMarked, color: '#2563eb' },
              { label: 'Assigned', value: stats.assigned, icon: CheckCircle2, color: '#16a34a' },
              { label: 'Unassigned', value: stats.unassigned, icon: CircleDashed, color: '#94a3b8' },
              { label: 'Total Amount', value: formatCurrencyPrecise(stats.totalAmount), icon: IndianRupee, color: '#16a34a' },
              { label: 'Users Involved', value: stats.users, icon: Users, color: '#7c3aed' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Col xs={12} md={8} lg={4} key={label} style={{ flex: '1 1 150px' }}>
                <Card
                  bordered={false}
                  style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                  styles={{ body: { padding: '14px 16px' } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: `${color}1a`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} color={color} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                        {label}
                      </Text>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{value}</div>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Filters */}
          <div style={{ marginBottom: 12 }}>
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} md={7}>
                <Input
                  allowClear
                  prefix={<Search size={15} color="#94a3b8" />}
                  placeholder="Search serial number…"
                  value={serialSearch}
                  onChange={(e) => applySerialSearch(e.target.value)}
                  style={{ height: 40, borderRadius: 8 }}
                />
              </Col>
              <Col xs={12} md={5}>
                <Select
                  allowClear
                  placeholder="Filter by user"
                  style={{ width: '100%', height: 40 }}
                  value={userFilter || undefined}
                  options={notaryUsers.map((u) => ({ label: u.name, value: u.id }))}
                  onChange={applyUserFilter}
                  showSearch
                  optionFilterProp="label"
                />
              </Col>
              <Col xs={12} md={5}>
                <Select
                  allowClear
                  placeholder="Assignment status"
                  style={{ width: '100%', height: 40 }}
                  value={statusFilter || undefined}
                  options={[
                    { label: 'Assigned', value: 'assigned' },
                    { label: 'Unassigned', value: 'unassigned' },
                    { label: 'All', value: 'all' },
                  ]}
                  onChange={applyStatusFilter}
                />
              </Col>
              <Col xs={24} md={7} style={{ textAlign: 'right' }}>
                <Space wrap>
                  <Button
                    icon={<FileDown size={14} />}
                    onClick={handleExportRegisterPdf}
                    loading={isGeneratingPdf}
                    type="primary"
                    style={{ borderRadius: 8, boxShadow: 'none' }}
                  >
                    Export PDF
                  </Button>
                  <Tooltip title="Excel workbook version of this register">
                    <Button icon={<FileSpreadsheet size={14} />} onClick={exportFullRegister} style={{ borderRadius: 8 }}>
                      Excel
                    </Button>
                  </Tooltip>
                  <Button icon={<Printer size={14} />} onClick={printRegister} style={{ borderRadius: 8 }}>
                    Print
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>

          {/* Bulk assign bar */}
          {selectedRowKeys.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 12,
                padding: '10px 14px',
                marginBottom: 12,
              }}
            >
              <span style={{ fontWeight: 700, color: '#1d4ed8' }}>
                {selectedRowKeys.length} selected
              </span>
              <Select
                placeholder="Choose user to assign"
                style={{ width: 220 }}
                value={bulkUserId || undefined}
                options={notaryUsers.map((u) => ({ label: u.name, value: u.id }))}
                onChange={setBulkUserId}
              />
              <Button
                type="primary"
                onClick={handleBulkAssign}
                loading={bulkAssignMutation.isPending}
                style={{ borderRadius: 8, boxShadow: 'none' }}
              >
                Assign Selected
              </Button>
              <Button
                icon={<X size={14} />}
                onClick={() => setSelectedRowKeys([])}
                style={{ borderRadius: 8 }}
              >
                Clear Selection
              </Button>
            </div>
          )}

          {/* Serial number table */}
          <Card
            bordered={false}
            style={{ borderRadius: 16, marginBottom: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              className="modern-dashboard-table"
              rowKey="id"
              columns={columns}
              dataSource={filteredEntries}
              loading={registerLoading}
              rowSelection={{
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys),
              }}
              pagination={{
                current: safePage,
                pageSize,
                total: totalFiltered,
                showSizeChanger: true,
                pageSizeOptions: [20, 50, 100, 500],
                showTotal: (t, range) => `${range[0]}–${range[1]} of ${t} serial numbers`,
                onChange: handlePaginationChange,
              }}
              scroll={{ y: 420 }}
              size="middle"
              bordered
              locale={{
                emptyText: (
                  <EmptyState
                    icon={BookMarked}
                    title="No serial numbers match"
                    description="Adjust the filters to see more serial numbers."
                  />
                ),
              }}
            />
          </Card>

          {/* User-wise summary */}
          <Card
            bordered={false}
            style={{ borderRadius: 16, marginBottom: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
            styles={{ body: { padding: 0 } }}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>User-wise Summary</span>
                <Space>
                  <Button
                    size="small"
                    icon={<FileSpreadsheet size={13} />}
                    onClick={exportSummary}
                    style={{ borderRadius: 8 }}
                  >
                    Export Summary
                  </Button>
                </Space>
              </div>
            }
          >
            <Table
              rowKey="userId"
              columns={summaryColumns}
              dataSource={summary}
              loading={summaryLoading}
              pagination={false}
              footer={() => (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px' }}>
                  <Text strong style={{ color: '#0f172a' }}>
                    Total ({summary.reduce((s, r) => s + r.totalEntries, 0)} entries)
                  </Text>
                  <Text strong style={{ color: '#16a34a', fontSize: 15 }}>
                    {formatCurrencyPrecise(summary.reduce((s, r) => s + r.totalAmount, 0))}
                  </Text>
                </div>
              )}
              size="middle"
            />
          </Card>

        </>
      )}

      {/* Off-screen Excel-sheet-style PDF template (cloned on export —
          html2canvas cannot reliably capture deep fixed-position elements,
          so we clone into a fresh body-level container at export time) */}
      {register && (
        <div
          style={{
            position: 'fixed',
            left: '-10000px',
            top: '0',
            pointerEvents: 'none',
            zIndex: '-1',
          }}
        >
          <div ref={pdfLayoutRef}>
            <NotaryPdfLayout
              register={register}
              summary={summary}
              unassignedSerials={unassignedSerials}
            />
          </div>
        </div>
      )}

      {/* Create / edit register modal */}
      <NotaryRegisterModal
        open={isCreateModalOpen || Boolean(editingRegister)}
        editRegister={editingRegister}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingRegister(null);
        }}
        onCreated={(created) => { if (created?.id) { selectRegister(created.id); } }}
      />

      {/* Individual user statement */}
      <NotaryUserStatementModal
        open={Boolean(statementUser)}
        summaryRow={statementUser}
        register={register}
        entries={register?.entries || []}
        onClose={() => setStatementUser(null)}
      />
    </div>
  );
}
