const ReportsRepository = require('./repository');

function escapeCsv(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows = []) {
  if (!rows.length) return '';
  const headers = [...rows.reduce((set, row) => {
    Object.keys(row || {}).forEach((k) => set.add(k));
    return set;
  }, new Set())];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((key) => escapeCsv(row?.[key])).join(','));
  }
  return lines.join('\n');
}

function toSimplePdf(text) {
  const safe = String(text || '').replace(/[()\\]/g, (m) => `\\${m}`);
  const stream = `BT /F1 10 Tf 40 780 Td (${safe.slice(0, 3000)}) Tj ET`;
  const objects = [];
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  objects.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj');
  objects.push('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');
  objects.push(`5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`);

  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(body.length);
    body += `${obj}\n`;
  }
  const xrefStart = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(body, 'binary');
}

class ReportsService {
  constructor(repository = new ReportsRepository()) { this.repository = repository; }
  cashFlow(query = {}) { return this.repository.getCashFlow(query); }
  budgetVsActual(query = {}) { return this.repository.getBudgetVsActual(query); }
  arAging(query = {}) { return this.repository.getArAging(query); }
  apAging(query = {}) { return this.repository.getApAging(query); }

  resolveReport(reportId, query = {}) {
    const id = String(reportId || '').toLowerCase();
    if (id === 'cash-flow') return this.cashFlow(query);
    if (id === 'budget-vs-actual') return this.budgetVsActual(query);
    if (id === 'ar-aging') return this.arAging(query);
    if (id === 'ap-aging') return this.apAging(query);
    const error = new Error('Unknown report_id');
    error.statusCode = 404;
    throw error;
  }

  exportReport(reportId, format, query = {}, user = null) {
    const data = this.resolveReport(reportId, query);
    const metadata = {
      report_id: reportId,
      generated_at: new Date().toISOString(),
      generated_by: user?.email || user?.username || user?.id || 'system'
    };

    if (format === 'csv') {
      let rows = [];
      if (Array.isArray(data.groups)) rows = data.groups;
      else if (Array.isArray(data.invoices)) rows = data.invoices;
      else if (data.sections) rows = [
        { section: 'operating', ...data.sections.operating },
        { section: 'investing', ...data.sections.investing },
        { section: 'financing', ...data.sections.financing },
        { section: 'summary', opening_cash: data.opening_cash, closing_cash: data.closing_cash, net_change: data.net_change }
      ];
      else rows = [data];

      const csv = toCsv([metadata, ...rows]);
      return { filename: `${reportId}.csv`, contentType: 'text/csv; charset=utf-8', body: Buffer.from(csv, 'utf8') };
    }

    if (format === 'pdf') {
      const text = `${metadata.report_id}\nGenerated: ${metadata.generated_at}\nBy: ${metadata.generated_by}\n\n${JSON.stringify(data, null, 2)}`;
      return { filename: `${reportId}.pdf`, contentType: 'application/pdf', body: toSimplePdf(text) };
    }

    const error = new Error('format must be csv or pdf');
    error.statusCode = 400;
    throw error;
  }
}

module.exports = ReportsService;
