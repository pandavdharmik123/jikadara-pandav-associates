import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Tag, Button, Typography, Empty, Space, message } from 'antd';
import { Printer, FileSpreadsheet } from 'lucide-react';
import { formatCurrencyPrecise } from '../../utils/currency';
import { buildWorkbookXml, downloadWorkbook } from '../../utils/excelExport';
import { MONTH_NAMES } from '../../hooks/useNotaryHisab';


const { Title, Text } = Typography;

/**
 * Individual user notary statement with print & export options.
 * All amounts are derived (entries × rate) — never stored.
 */
export default function NotaryUserStatementModal({ open, onClose, summaryRow, register, entries = [] }) {
  const [printing, setPrinting] = useState(false);

  const userEntries = useMemo(
    () =>
      entries
        .filter((e) => e.assignedUserId === summaryRow?.userId)
        .sort((a, b) => a.serialNumber - b.serialNumber),
    [entries, summaryRow]
  );

  if (!summaryRow || !register) return null;

  const rate = Number(register.ratePerEntry);
  const monthLabel = `${MONTH_NAMES[register.month - 1]} ${register.year}`;

  const documentHtml = () => {
    const rows = userEntries
      .map(
        (e) => `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;">${e.serialNumber}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">Notary</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">₹${rate.toLocaleString('en-IN')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">₹${summaryRow.totalAmount.toLocaleString('en-IN')}</td>
        </tr>`
      )
      .join('');
    return `<!doctype html><html><head><meta charset="utf-8"/><title>Notary Statement – ${summaryRow.userName}</title>
      <style>
        body { font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; color:#0f172a; margin:32px; }
        .head { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0f172a; padding-bottom:14px; margin-bottom:16px; gap:16px;}
        .firm { display:flex; align-items:center; gap:12px; }
        .firm img { height:50px; width:auto; }
        .firm h1 { font-size:19px; font-weight:800; letter-spacing:-0.3px; color:#0f172a; margin:0; }
        .firm small { display:block; font-size:11px; font-weight:600; color:#64748b; }
        .meta { text-align:right; }
        .meta .rtitle { font-size:14px; font-weight:800; color:#2563eb; text-transform:uppercase; letter-spacing:.04em; }
        .meta .per { font-size:13px; font-weight:700; color:#0f172a; margin-top:2px; }
        .meta .gen { font-size:10px; color:#64748b; margin-top:2px; }
        h2 { font-size:15px; margin:0 0 4px; }
        .cards { display:flex; gap:10px; margin:14px 0 18px; flex-wrap:wrap;}
        .card { border:1px solid #e2e8f0; border-radius:6px; padding:10px 16px; min-width:140px;}
        .card b { display:block; font-size:19px; margin-top:2px;}
        .card span { font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:.4px;}
        table { width:100%; border-collapse:collapse; font-size:12.5px;}
        thead th { background:#f8fafc; color:#64748b; padding:9px 12px; text-align:left; font-size:11px; letter-spacing:.4px; text-transform:uppercase;}
        thead th.r, td.r { text-align:right; }
        tfoot td { background:#f1f5f9; font-weight:800; padding:10px 12px; }
        .foot { margin-top:26px; border-top:1px dashed #cbd5e1; padding-top:10px; font-size:10.5px; color:#94a3b8; }
        @media print { body { margin:10px; } }
      </style></head><body>
      <div class="head">
        <div class="firm"><img src="/logo.png"/><div><h1>JIKADARA &amp; PANDAV ASSOCIATES</h1><small>Advocate &amp; Legal Consultants</small></div></div>
        <div class="meta"><div class="rtitle">Notary Statement</div><div class="per">${monthLabel}</div><div class="gen">Generated: ${dayjs().format('DD/MM/YYYY, hh:mm A')}</div></div>
      </div>
      <h2>Notary Statement – ${summaryRow.userName}</h2>
      <div class="cards">
        <div class="card"><span>Month</span><b>${monthLabel}</b></div>
        <div class="card"><span>Total Entries</span><b>${summaryRow.totalEntries}</b></div>
        <div class="card"><span>Per Entry Amount</span><b>₹${rate.toLocaleString('en-IN')}</b></div>
        <div class="card"><span>Total Amount</span><b>₹${summaryRow.totalAmount.toLocaleString('en-IN')}</b></div>
      </div>
      <table>
        <thead><tr><th>Serial No.</th><th>Work Type</th><th class="r">Per Entry (₹)</th><th class="r">Amount (₹)</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr><td colspan="3">Total (${summaryRow.totalEntries} entries × ₹${rate.toLocaleString('en-IN')})</td><td class="r">₹${summaryRow.totalAmount.toLocaleString('en-IN')}</td></tr></tfoot>
      </table>
      <div class="foot">Computer-generated statement from the office monthly notary register. Serial numbers in this period belonging to ${summaryRow.userName}: ${userEntries.map((e) => e.serialNumber).join(', ')}.</div>
    </body></html>`;
  };

  const handlePrint = () => {
    setPrinting(true);
    try {
      const w = window.open('', '_blank', 'width=850,height=950');
      if (!w) {
        message.error('Please allow pop-ups for printing');
        return;
      }
      w.document.write(documentHtml());
      w.document.close();
      w.focus();
      w.print();
    } finally {
      setPrinting(false);
    }
  };

  const handleExport = () => {
    const xml = buildWorkbookXml({
      sheetName: `Notary ${summaryRow.userName}`.slice(0, 28),
      title: `Notary Statement – ${summaryRow.userName}`,
      subtitleLines: [`Month: ${monthLabel}`, `Per Entry Amount: ₹${rate.toLocaleString('en-IN')}`],
      columnCount: 3,
      rows: [
        { type: 'header', cells: ['Serial No.', 'Work Type', 'Amount (₹)'] },
        ...userEntries.map((e) => ({
          type: 'data',
          cells: [e.serialNumber, 'Notary', { type: 'currency', v: rate }],
        })),
        {
          type: 'total',
          cells: [`Total (${summaryRow.totalEntries} entries)`, '', { type: 'currency', v: summaryRow.totalAmount }],
        },
      ],
    });
    downloadWorkbook(`Notary-Statement-${summaryRow.userName}-${monthLabel.replace(' ', '-')}`, xml);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button icon={<FileSpreadsheet size={15} />} onClick={handleExport} style={{ borderRadius: 8 }}>
            Export (Excel)
          </Button>
          <Button type="primary" icon={<Printer size={15} />} loading={printing} onClick={handlePrint} style={{ borderRadius: 8, boxShadow: 'none' }}>
            Print Statement
          </Button>
        </Space>
      }
      width={680}
      destroyOnHidden
      title={
        <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
          Notary Statement – {summaryRow.userName}
        </div>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          ['Month', monthLabel],
          ['Total Entries', String(summaryRow.totalEntries)],
          ['Per Entry Amount', formatCurrencyPrecise(rate)],
          ['Total Amount', formatCurrencyPrecise(summaryRow.totalAmount)],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '10px 14px',
              background: '#f8fafc',
            }}
          >
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {label}
            </Text>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      <Title level={5} style={{ margin: '8px 0 8px' }}>
        Assigned Serial Numbers
      </Title>
      {userEntries.length === 0 ? (
        <Empty description="No entries" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            maxHeight: 320,
            overflow: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 12,
          }}
        >
          {userEntries.map((e) => (
            <Tag
              key={e.id}
              color="blue"
              style={{ fontWeight: 700, borderRadius: 8, fontSize: 13 }}
            >
              {e.serialNumber}
            </Tag>
          ))}
        </div>
      )}
    </Modal>
  );
}
