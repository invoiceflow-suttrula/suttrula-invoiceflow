/* invoicePdf.js — the generation engine.
   Auto-maps spreadsheet columns to invoice fields, renders each row's Invoice
   component to an A4 PDF (html2canvas + jsPDF), uploads to Supabase Storage,
   writes invoices + invoice_batches rows, and bundles a ZIP. */

import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { createElement } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import Invoice from '../components/Invoice.jsx';
import { supabase } from './supabase.js';

/* The invoice fields we know how to fill, and the regex that auto-matches a
   spreadsheet column to each. Order matters — earlier fields claim a column first. */
export const FIELD_DEFS = [
  { key: 'name',  label: 'Client Name', re: /name|client|customer|passenger|contact(?!\s*no)|company/i },
  { key: 'email', label: 'Email',       re: /e-?mail/i },
  { key: 'phone', label: 'Phone',       re: /phone|mobile|contact\s*no|\btel\b/i },
  { key: 'city',  label: 'City',        re: /city|town|address|location/i },
  { key: 'item',  label: 'Item',        re: /item|service|package|product|description|tour|trip|\bdesc/i },
  { key: 'qty',   label: 'Quantity',    re: /\bqty\b|quantity|\bpax\b|count|night|\bday|unit(?!\s*price)/i },
  { key: 'rate',  label: 'Price',       re: /rate|price|unit\s*price|cost|fare|amount/i },
  { key: 'tax',   label: 'Tax',         re: /\btax|gst|vat/i },
];

/* columns: string[] -> { fieldKey: columnName } */
export function autoMap(columns) {
  const used = new Set();
  const map = {};
  for (const f of FIELD_DEFS) {
    const col = columns.find((c) => !used.has(c) && f.re.test(String(c)));
    if (col) { map[f.key] = col; used.add(col); }
  }
  return map;
}

function toNum(v) {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}
const inr = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

/* Group spreadsheet rows into one invoice per customer.
   Rows that share the same name + email belong to the same invoice, so a
   customer with several line items gets ONE invoice listing all of them. */
function customerKey(rowData, map) {
  const name = map.name ? rowData[map.name] : rowData[Object.keys(rowData)[0]];
  const email = map.email ? rowData[map.email] : '';
  return `${String(name || '').trim().toLowerCase()}|${String(email || '').trim().toLowerCase()}`;
}

export function groupRows(rowDatas, map) {
  const groups = new Map();
  for (const rd of rowDatas) {
    const k = customerKey(rd, map);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(rd);
  }
  return Array.from(groups.values());
}

/* Build the `sample` prop for the Invoice component + the DB row metadata,
   for one customer group (1..N line items). */
export function buildInvoiceFromGroup(group, map, { company, refNumber, dateStr, customFields = [] }) {
  const first = group[0];
  const get = (k, rd = first) => (map[k] ? rd[map[k]] : undefined);
  const clientName = String(get('name') || first[Object.keys(first)[0]] || 'Customer');

  const lines = group.map((rd) => {
    const qty = toNum(get('qty', rd)) || 1;
    const rate = toNum(get('rate', rd));
    const lineTax = toNum(get('tax', rd));
    return { desc: String(get('item', rd) || 'Service'), qty, rate, lineTax, amount: qty * rate };
  });

  const subtotal = lines.reduce((a, l) => a + l.amount, 0);
  const taxTotal = lines.reduce((a, l) => a + l.lineTax, 0);
  const total = subtotal + taxTotal;

  return {
    sample: {
      no: refNumber,
      ref: refNumber,
      date: dateStr,
      due: dateStr,
      pax: clientName,
      paxLine2: String(get('email') || ''),
      city: String(get('city') || ''),
      company: company?.name || 'My Company',
      addr: company?.address || '',
      email: company?.email || '',
      phone: company?.phone || '',
      mobile: company?.mobile || '',
      logo: company?.logo_url || '',
      bank: {
        holder: company?.account_holder || '',
        account: company?.account_number || '',
        bank: company?.bank_name || '',
        ifsc: company?.ifsc_code || '',
        upi: company?.upi_id || '',
      },
      items: lines.map((l) => ['', l.desc, '', l.qty, inr(l.rate), inr(l.amount)]),
      subtotal: inr(subtotal),
      gst: inr(taxTotal),
      total: inr(total),
      extras: customFields.filter((f) => f.label),
    },
    meta: {
      client_name: clientName,
      email: String(get('email') || ''),
      item_summary: lines.length === 1 ? lines[0].desc : `${lines[0].desc} +${lines.length - 1} more`,
      amount: total,
    },
  };
}

async function waitForAssets(node) {
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* ignore */ } }
  const imgs = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((res) => {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', res, { once: true });
          })
    )
  );
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

/* Brand colour presets (mirror Settings) so a saved accent that matches a
   preset renders with its proper dark/tint shades; custom colours fall back
   to the accent for all three. */
const COLOR_PRESETS = {
  '#2d5c4f': { dark: '#102C26', tint: '#E6EEEA' },
  '#4f46e5': { dark: '#2A2099', tint: '#E8E7F9' },
  '#a0344e': { dark: '#5B1C2A', tint: '#F4E6E9' },
  '#c8902b': { dark: '#7A5817', tint: '#FAF1D9' },
  '#1e3a5f': { dark: '#0E1B33', tint: '#E0E7EE' },
  '#c26a4e': { dark: '#7A3B26', tint: '#F8E6DC' },
  '#3a3a3a': { dark: '#1A1A1A', tint: '#E9E9E9' },
  '#5b3a6e': { dark: '#2F1C42', tint: '#EBE3F0' },
};
function applyTheme(host, accent) {
  if (!accent) return;
  const k = String(accent).toLowerCase();
  const p = COLOR_PRESETS[k] || { dark: accent, tint: '#EEF2F0' };
  host.style.setProperty('--brand-accent', accent);
  host.style.setProperty('--brand-accent-dark', p.dark);
  host.style.setProperty('--brand-accent-tint', p.tint);
  host.style.setProperty('--brand-accent-on', '#ffffff');
}

/* Branding for invoice PREVIEWS — real company fields layered over the demo
   line-items, so Templates / Settings / Generator all show the same invoice. */
export function brandingSample(company) {
  return {
    company: company?.name || 'My Company',
    addr: company?.address || '',
    email: company?.email || '',
    phone: company?.phone || '',
    mobile: company?.mobile || '',
    logo: company?.logo_url || '',
    bank: {
      holder: company?.account_holder || '',
      account: company?.account_number || '',
      bank: company?.bank_name || '',
      ifsc: company?.ifsc_code || '',
      upi: company?.upi_id || '',
    },
  };
}

/* CSS custom-property object so a preview wrapper renders in the brand colour. */
export function accentVars(accent) {
  if (!accent) return {};
  const p = COLOR_PRESETS[String(accent).toLowerCase()] || { dark: accent, tint: '#EEF2F0' };
  return {
    '--brand-accent': accent,
    '--brand-accent-dark': p.dark,
    '--brand-accent-tint': p.tint,
    '--brand-accent-on': '#ffffff',
  };
}

/* Render one Invoice to an A4 PDF Blob via an off-screen React root. */
export async function renderInvoicePdf({ variant, sample, accent }) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed; left:-10000px; top:0; width:480px; background:#fff; z-index:-1;';
  applyTheme(host, accent);
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(createElement(Invoice, { variant, sample, large: true })));
    const node = host.querySelector('.inv');
    await waitForAssets(node);
    const canvas = await html2canvas(node, {
      scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false,
    });
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const img = canvas.toDataURL('image/jpeg', 0.95);
    const imgH = canvas.height * (pw / canvas.width);
    if (imgH <= ph + 1) {
      pdf.addImage(img, 'JPEG', 0, 0, pw, imgH);
    } else {
      /* Taller than one A4 page → slice the image across pages. */
      let position = 0;
      let heightLeft = imgH;
      pdf.addImage(img, 'JPEG', 0, 0, pw, imgH);
      heightLeft -= ph;
      while (heightLeft > 0) {
        position -= ph;
        pdf.addPage();
        pdf.addImage(img, 'JPEG', 0, position, pw, imgH);
        heightLeft -= ph;
      }
    }
    return pdf.output('blob');
  } finally {
    root.unmount();
    host.remove();
  }
}

/* Full pipeline: rows -> PDFs -> Storage -> invoices/invoice_batches -> ZIP.
   onProgress(done, total) is called after each invoice. */
export async function generateBatch({ source, template, mapping, customFields = [], company, rows: providedRows }, onProgress) {
  const variant = parseInt(template?.layout_type, 10) || 1;

  let rowDatas = providedRows;
  if (!rowDatas) {
    const { data, error } = await supabase
      .from('data_rows')
      .select('row_data')
      .eq('data_source_id', source.id)
      .order('row_index', { ascending: true });
    if (error) throw error;
    rowDatas = (data || []).map((r) => r.row_data);
  }
  if (!rowDatas.length) throw new Error('This data source has no rows.');

  /* One invoice per customer (rows grouped by name + email). */
  const groups = groupRows(rowDatas, mapping);

  const batchId = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
  const stamp = Date.now().toString(36).toUpperCase();
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const issued = today.toISOString().slice(0, 10);

  const zip = new JSZip();
  const invoiceRows = [];
  let total = 0;
  let firstBlob = null;

  for (let i = 0; i < groups.length; i++) {
    const refNumber = `INV-${stamp}-${String(i + 1).padStart(4, '0')}`;
    const { sample, meta } = buildInvoiceFromGroup(groups[i], mapping, {
      company, refNumber, dateStr, customFields,
    });
    const blob = await renderInvoicePdf({ variant, sample, accent: company?.accent_color });
    const path = `${batchId}/${refNumber}.pdf`;

    const up = await supabase.storage.from('invoices').upload(path, blob, {
      contentType: 'application/pdf', upsert: true,
    });
    if (up.error) throw up.error;

    invoiceRows.push({
      company_id: company?.id ?? null,
      ref_number: refNumber,
      client_name: meta.client_name,
      email: meta.email,
      item_summary: meta.item_summary,
      amount: meta.amount,
      status: 'generated',
      issued_date: issued,
      pdf_storage_path: path,
      data_source_id: source.id,
      template_id: template.id,
    });
    zip.file(`${refNumber}.pdf`, blob);
    total += meta.amount;
    if (i === 0) firstBlob = blob;
    onProgress?.(i + 1, groups.length);
  }

  const { error: invErr } = await supabase.from('invoices').insert(invoiceRows);
  if (invErr) throw invErr;

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipPath = `${batchId}/batch.zip`;
  await supabase.storage.from('invoices').upload(zipPath, zipBlob, {
    contentType: 'application/zip', upsert: true,
  });

  await supabase.from('invoice_batches').insert({
    company_id: company?.id ?? null,
    batch_name: `${source.file_name} · ${invoiceRows.length} invoices`,
    invoice_count: invoiceRows.length,
    total_amount: total,
    zip_storage_path: zipPath,
  });

  if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage-changed'));
  return { count: invoiceRows.length, total, firstBlob, zipBlob, batchId, dateStr };
}

/* Browser download helper for a Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
