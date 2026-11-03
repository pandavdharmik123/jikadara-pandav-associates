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
  FileSpreadsheet,
  Pencil,
  FileDown,
  Save,
  X,
  Layers,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { formatCurrencyPrecise } from '../../utils/currency';
import {
  MONTH_NAMES,
  useNotaryRegister,
  useNotaryRegisters,
  useNotaryUsers,
  useNotarySummary,

  useDeleteNotaryRegister,
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

  // ── Edit All mode ─────────────────────────────────────────────────────────
  // Dropdowns are read-only until "Edit All" is clicked. While editing, every
  // change (per-row dropdown or bulk selection) is buffered locally in
  // draftAssignments (entryId -> userId | null); nothing hits the API until
  // "Save" is clicked, which batches the changes through the bulk endpoint.
  const [editMode, setEditMode] = useState(false);
  const [draftAssignments, setDraftAssignments] = useState({});
  const [savingEdits, setSavingEdits] = useState(false);

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
    setEditMode(false);
    setDraftAssignments({});
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

  // ── Edit All / Save flow ──────────────────────────────────────────────────
  // While editing, the effective assignment of an entry is its draft value
  // (if one was buffered) or its persisted value otherwise.
  const effectiveAssignedUserId = (entry) =>
    entry.id in draftAssignments ? draftAssignments[entry.id] : entry.assignedUserId || null;

  const hasDraftChanges = Object.keys(draftAssignments).length > 0;

  const enterEditMode = () => {
    setEditMode(true);
    setSelectedRowKeys([]);
  };

  const discardEdits = () => {
    setDraftAssignments({});
    setEditMode(false);
    setBulkUserId(null);
    setSelectedRowKeys([]);
    message.info('Edits discarded — assignments unchanged');
  };

  // Buffer a single row's dropdown change locally (no API call).
  const bufferRowAssignment = (entryId, userId) => {
    setDraftAssignments((prev) => ({ ...prev, [entryId]: userId || null }));
  };

  // "Assign Selected" no longer calls the bulk API directly — it applies the
  // chosen user to all selected rows locally (entering edit mode if needed).
  // Only "Save" in edit mode persists anything.
  const applyBulkSelectionLocally = () => {
    if (selectedRowKeys.length === 0) return;
    if (!bulkUserId) {
      message.warning('Choose a user to assign first');
      return;
    }
    const name = userNameById.get(bulkUserId)?.name || 'user';
    setDraftAssignments((prev) => {
      const next = { ...prev };
      selectedRowKeys.forEach((id) => {
        next[id] = bulkUserId;
      });
      return next;
    });
    setEditMode(true);
    message.info(
      `${selectedRowKeys.length} serial number(s) set to ${name} locally — click Save to apply`
    );
    setSelectedRowKeys([]);
  };

  // Save: batch all buffered changes per target user through the bulk API
  // (assignedUserId: null groups unassign their serial numbers).
  const saveEdits = async () => {
    if (!hasDraftChanges || !activeRegisterId) return;
    setSavingEdits(true);
    try {
      const groups = new Map(); // userId | null -> entryIds
      Object.entries(draftAssignments).forEach(([entryId, userId]) => {
        const key = userId || null;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(entryId);
      });
      let changed = 0;
      // Run sequentially so the summary/amount cache invalidations stay tidy.
      for (const [userId, entryIds] of groups.entries()) {
        const res = await bulkAssignMutation.mutateAsync({
          registerId: activeRegisterId,
          entryIds,
          assignedUserId: userId,
        });
        changed += res?.changed ?? entryIds.length;
      }
      message.success(`${changed} serial number(s) saved`);
      setDraftAssignments({});
      setEditMode(false);
      setBulkUserId(null);
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to save assignments');
    } finally {
      setSavingEdits(false);
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
      render: (_, entry) => {
        // Read-only until "Edit All" is clicked; while editing the dropdown
        // buffers the change locally (blue outline marks modified rows).
        if (!editMode) {
          const name = entry.assignedTo?.name;
          return name ? (
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{name}</span>
          ) : (
            <span style={{ color: '#94a3b8' }}>Unassigned</span>
          );
        }
        const changed = entry.id in draftAssignments;
        const value = effectiveAssignedUserId(entry);
        return (
          <Select
            size="small"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Unassigned"
            value={value || undefined}
            status={changed ? 'warning' : undefined}
            onChange={(v) => bufferRowAssignment(entry.id, v || null)}
            options={(notaryUsers.length ? notaryUsers : [entry.assignedTo].filter(Boolean)).map((u) => ({
              label: u.name,
              value: u.id,
            }))}
            style={{ width: '100%' }}
          />
        );
      },
    },
    {
      title: 'Amount',
      key: 'amount',
      width: 110,
      align: 'right',
      sorter: (a, b) => (a.assignedUserId ? 1 : 0) - (b.assignedUserId ? 1 : 0),
      render: (_, entry) =>
        // Live preview while editing: amounts follow the buffered assignment too.
        effectiveAssignedUserId(entry) ? (
          <span style={{ fontWeight: 700, color: '#16a34a', opacity: editMode && entry.id in draftAssignments ? 0.55 : 1 }}>
            {formatCurrencyPrecise(rate)}
          </span>
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
        effectiveAssignedUserId(entry) ? (
          <Tag color="success" style={{ borderRadius: 10, fontWeight: 600, opacity: editMode && entry.id in draftAssignments ? 0.55 : 1 }}>
            Assigned
          </Tag>
        ) : (
          <Tag style={{ borderRadius: 10, fontWeight: 600, color: '#94a3b8', borderColor: '#e2e8f0', opacity: editMode && entry.id in draftAssignments ? 0.55 : 1 }}>
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
        <Button
          type="text"
          size="small"
          icon={<FileSpreadsheet size={15} color="#2563eb" />}
          onClick={() => setStatementUser(row)}
        />
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
        </div>

        <Space wrap align="center" size={8}>
          <Text strong style={{ color: '#0f172a', whiteSpace: 'nowrap' }}>
            Register:
          </Text>
          <Select
            style={{ width: 220 }}
            placeholder="Select month / year"
            loading={registersLoading}
            value={activeRegisterId || undefined}
            options={registerOptions}
            onChange={selectRegister}
            status={register ? undefined : 'warning'}
          />
          {register && (
            <>
              <Tag
                icon={<Layers size={12} />}
                color="blue"
                style={{
                  borderRadius: 10,
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                }}
              >
                {(register.ranges || [])
                  .map((rg) => `${rg.startNumber}–${rg.endNumber}`)
                  .join(', ')}
              </Tag>
              <Button
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
                <Button danger icon={<Trash2 size={13} />} style={{ borderRadius: 8 }}>
                  Delete
                </Button>
              </Popconfirm>
            </>
          )}
          <Tooltip title="Refresh">
            <Button
              icon={<RefreshCw size={15} />}
              style={{ borderRadius: 8 }}
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['notaryRegisters'] });
                if (activeRegisterId) {
                  queryClient.invalidateQueries({ queryKey: ['notaryRegister', activeRegisterId] });
                  queryClient.invalidateQueries({ queryKey: ['notarySummary', activeRegisterId] });
                }
              }}
            />
          </Tooltip>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsCreateModalOpen(true)}
            style={{ borderRadius: 8 }}
          >
            Create Register
          </Button>
        </Space>
      </div>

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
              <Col
                key={label}
                xs={12}
                sm={12}
                md={8}
                style={{ flex: '1 1 160px', minWidth: 140, maxWidth: 'none', display: 'flex' }}
              >
                <Card
                  bordered={false}
                  style={{
                    borderRadius: 16,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    width: '100%',
                    height: '100%',
                  }}
                  styles={{
                    body: {
                      padding: '12px 14px',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      boxSizing: 'border-box',
                    },
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: `${color}1a`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={19} color={color} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text
                        type="secondary"
                        title={label}
                        style={{
                          display: 'block',
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: 0.4,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
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
              {/* Narrower in edit mode so Save/Discard/Export PDF fit one row */}
              <Col xs={24} md={editMode ? 6 : 7}>
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
              <Col xs={24} md={editMode ? 8 : 7} style={{ textAlign: 'right' }}>
                <Space wrap>
                  {/* Dropdowns are read-only until "Edit All"; Save batches all
                      buffered changes through the bulk API in one go. */}
                  {!editMode ? (
                    <Button
                      icon={<Pencil size={14} />}
                      onClick={enterEditMode}
                      style={{ borderRadius: 8 }}
                    >
                      Edit All
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="primary"
                        icon={<Save size={14} />}
                        onClick={saveEdits}
                        loading={savingEdits}
                        disabled={!hasDraftChanges}
                        style={{ borderRadius: 8, boxShadow: 'none' }}
                      >
                        Save
                      </Button>
                      <Button
                        icon={<X size={14} />}
                        onClick={discardEdits}
                        disabled={savingEdits}
                        style={{ borderRadius: 8 }}
                      >
                        Discard
                      </Button>
                    </>
                  )}
                  <Button
                    icon={<FileDown size={14} />}
                    onClick={handleExportRegisterPdf}
                    loading={isGeneratingPdf}
                    type="primary"
                    style={{ borderRadius: 8, boxShadow: 'none' }}
                  >
                    Export PDF
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
              {/* Applies locally — nothing is saved until "Save" in edit mode */}
              <Button
                type="primary"
                onClick={applyBulkSelectionLocally}
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
              <span style={{ fontSize: 15, fontWeight: 700 }}>User-wise Summary</span>
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
