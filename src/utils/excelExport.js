/**
 * Minimal SpreadsheetML (.xls, Excel 2003 XML) builder — opens natively in
 * Microsoft Excel / LibreOffice with real column headings, right-aligned
 * currency cells and a styled total row. No external dependency is used,
 * consistent with the project's zero-dependency exports.
 */

export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const CURRENCY_STYLE = '#,##0.00;[RED]-#,##0.00';
const NUMBER_STYLE = '0';

/**
 * rows: array of
 *   { type: 'header',  cells: [...] }      → bold header row
 *   { type: 'data',    cells: [...] }      → values; cell may be { v, type: 'number' | 'currency' | 'text' }
 *   { type: 'total',   cells: [...] }      → bold shaded total row
 *   { type: 'blank' }
 */
export function buildWorkbookXml({ sheetName = 'Sheet1', title = '', subtitleLines = [], rows = [], columnCount = 0 }) {
  const cols = new Array(Math.max(columnCount, 1))
    .fill(0)
    .map(() => '<Column ss:AutoFitWidth="0" ss:Width="110"/>')
    .join('');

  const body = [];

  if (title) {
    body.push(
      `<Row><Cell ss:StyleID="title"><Data ss:Type="String">${escapeXml(title)}</Data></Cell></Row>`
    );
  }
  for (const lineText of subtitleLines) {
    body.push(`<Row><Cell ss:StyleID="sub"><Data ss:Type="String">${escapeXml(lineText)}</Data></Cell></Row>`);
  }

  for (const row of rows) {
    if (row.type === 'blank') {
      body.push('<Row/>');
      continue;
    }
    const styleId =
      row.type === 'header' ? 'header' : row.type === 'total' ? 'total' : 'default';
    const cells = row.cells
      .map((cell) => {
        if (cell === null || cell === undefined || cell === '') {
          return '<Cell ss:StyleID="default"/>';
        }
        if (typeof cell === 'object') {
          if (cell.type === 'currency') {
            return `<Cell ss:StyleID="currency"><Data ss:Type="Number">${Number(cell.v) || 0}</Data></Cell>`;
          }
          if (cell.type === 'number') {
            return `<Cell ss:StyleID="number"><Data ss:Type="Number">${Number(cell.v) || 0}</Data></Cell>`;
          }
          return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(cell.v)}</Data></Cell>`;
        }
        const asNum = Number(cell);
        if (Number.isFinite(asNum) && String(cell).trim() !== '' && styleId === 'default') {
          return `<Cell ss:StyleID="number"><Data ss:Type="Number">${asNum}</Data></Cell>`;
        }
        return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`;
      })
      .join('');
    body.push(`<Row>${cells}</Row>`);
  }

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="default"><Font ss:FontName="Calibri" ss:Size="11"/></Style>
  <Style ss:ID="title"><Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1"/></Style>
  <Style ss:ID="sub"><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#64748b"/></Style>
  <Style ss:ID="section"><Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1"/></Style>
  <Style ss:ID="header">
    <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#ffffff"/>
    <Interior ss:Color="#2563eb" ss:Pattern="Solid"/>
    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    </Borders>
  </Style>
  <Style ss:ID="total">
    <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
    <Interior ss:Color="#e2e8f0" ss:Pattern="Solid"/>
    <Borders>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94a3b8"/>
    </Borders>
  </Style>
  <Style ss:ID="currency">
    <Font ss:FontName="Calibri" ss:Size="11"/>
    <NumberFormat ss:Format="${CURRENCY_STYLE}"/>
    <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="number">
    <Font ss:FontName="Calibri" ss:Size="11"/>
    <NumberFormat ss:Format="${NUMBER_STYLE}"/>
    <Alignment ss:Horizontal="Right"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName.slice(0, 30))}">
  <Table>${cols}
${body.join('\n')}
  </Table>
 </Worksheet>
</Workbook>`;
}

export function downloadWorkbook(filename, xml) {
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default { buildWorkbookXml, downloadWorkbook, escapeXml };
