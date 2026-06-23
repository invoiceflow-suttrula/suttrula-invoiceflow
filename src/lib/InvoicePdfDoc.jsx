/* Vector invoice document for @react-pdf/renderer — true selectable text,
   crisp at any zoom, tiny files. Mirrors the two on-screen templates
   (1 = Standard, 2 = Travel Agency). Uses built-in Helvetica for reliability
   (no network font fetch that could fail mid-batch); amounts use "Rs" since the
   ₹ glyph isn't in the standard PDF fonts. */

import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';
import dmSans400 from '../assets/fonts/DMSans-400.ttf';
import dmSans500 from '../assets/fonts/DMSans-500.ttf';
import dmSans700 from '../assets/fonts/DMSans-700.ttf';
import mono400 from '../assets/fonts/JetBrainsMono-400.ttf';
import mono500 from '../assets/fonts/JetBrainsMono-500.ttf';

/* Register the app's real fonts (bundled by Vite — no runtime fetch). */
Font.register({ family: 'DM Sans', fonts: [
  { src: dmSans400, fontWeight: 400 },
  { src: dmSans500, fontWeight: 500 },
  { src: dmSans700, fontWeight: 700 },
] });
Font.register({ family: 'JetBrains Mono', fonts: [
  { src: mono400, fontWeight: 400 },
  { src: mono500, fontWeight: 500 },
] });
Font.registerHyphenationCallback((w) => [w]); // don't hyphenate-wrap words

const DARK = '#0E1B33';
const money = (v) => 'Rs ' + String(v ?? '');
const isDataImg = (v) => typeof v === 'string' && v.startsWith('data:');

/* Sizes scaled ~1.37× vs the compact draft to match the original HTML invoice,
   which was a 440px design enlarged to fill A4. */
const st = StyleSheet.create({
  page: { fontFamily: 'DM Sans', fontSize: 12, color: '#1A1A1A', paddingBottom: 70 },
  page2: { fontFamily: 'DM Sans', fontSize: 12, color: '#1A1A1A', paddingTop: 40, paddingHorizontal: 44, paddingBottom: 70 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  pad: { paddingHorizontal: 44, marginTop: 18 },

  band: { backgroundColor: DARK, color: '#fff', paddingVertical: 24, paddingHorizontal: 44 },
  bandCompany: { fontFamily: 'DM Sans', fontWeight: 700, fontSize: 16, color: '#fff' },
  bandEyebrow: { fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 3, letterSpacing: 1 },
  bandDate: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  invNo: { fontFamily: 'DM Sans', fontWeight: 700, fontSize: 15, textAlign: 'right' },

  logo: { height: 30, width: 110, objectFit: 'contain', marginRight: 10 },
  logo2: { height: 26, width: 96, objectFit: 'contain', marginRight: 10 },

  small: { fontSize: 11, color: '#3a3a3a', marginTop: 2 },
  billTo: { fontFamily: 'DM Sans', fontWeight: 700, fontSize: 18, color: DARK },
  billName: { fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, marginTop: 5 },

  trHead: { flexDirection: 'row', color: '#fff', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 3 },
  th: { fontFamily: 'DM Sans', fontWeight: 700, fontSize: 11, color: '#fff' },
  tr: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 0.75, borderColor: '#eceff1' },
  td: { fontSize: 11.5, color: DARK },
  num: { textAlign: 'right' },

  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, fontSize: 11.5 },
  totLabel: { color: '#888', fontFamily: 'DM Sans', fontWeight: 700 },
  totGrand: { flexDirection: 'row', justifyContent: 'space-between', color: '#fff', paddingVertical: 7, paddingHorizontal: 11, marginTop: 6, borderRadius: 3 },
  totGrandT: { fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, color: '#fff' },
  totBig: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1.5, borderColor: DARK },
  totBigT: { fontFamily: 'DM Sans', fontWeight: 700, fontSize: 22 },

  sectionTitle: { fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12, color: DARK, marginBottom: 4 },
  kvRow: { flexDirection: 'row', marginTop: 2 },
  kvKey: { fontSize: 11, color: '#888', width: 90 },
  kvVal: { fontSize: 11, fontFamily: 'DM Sans', fontWeight: 700, color: '#1A1A1A', flex: 1 },

  coName: { fontFamily: 'DM Sans', fontWeight: 700, fontSize: 15 },
  bigInvoice: { fontFamily: 'DM Sans', fontWeight: 700, fontSize: 38, color: DARK, marginTop: 14, letterSpacing: -0.5 },
  mono: { fontFamily: 'JetBrains Mono', fontSize: 11, color: '#888', marginTop: 6, letterSpacing: 1 },
  eyebrow: { fontFamily: 'JetBrains Mono', fontSize: 9, color: '#888', letterSpacing: 1 },
  bold: { fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, color: DARK, marginTop: 3 },
  hr: { borderBottomWidth: 1, borderColor: '#eee', marginVertical: 16 },
  rowHead2: { flexDirection: 'row', borderBottomWidth: 0.75, borderColor: '#ddd', paddingBottom: 7 },
  th2: { fontFamily: 'JetBrains Mono', fontSize: 9, color: '#888', letterSpacing: 1 },
  tr2: { flexDirection: 'row', paddingVertical: 8, borderTopWidth: 0.75, borderColor: '#f0f0f0' },
  td2: { fontSize: 11.5, color: DARK },

  footer: { position: 'absolute', bottom: 28, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.75, borderColor: '#e5e5e5', paddingTop: 10 },
  footer2: { position: 'absolute', bottom: 28, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.75, borderColor: '#e5e5e5', paddingTop: 10 },
  footerNo: { fontFamily: 'JetBrains Mono', fontSize: 11, color: '#888' },
  footerCo: { fontSize: 11, fontFamily: 'DM Sans', fontWeight: 700, color: '#1A1A1A' },
});

function BankBlock({ bank }) {
  if (!bank) return null;
  const lines = [
    ['Account Holder', bank.holder], ['Account No', bank.account],
    ['Bank', bank.bank], ['IFSC', bank.ifsc], ['UPI', bank.upi],
  ].filter(([, v]) => v);
  if (!lines.length) return <View style={{ flex: 1 }} />;
  return (
    <View style={{ flex: 1, paddingRight: 16 }}>
      <Text style={st.sectionTitle}>Bank Details</Text>
      {lines.map(([k, v], i) => (
        <View key={i} style={st.kvRow}><Text style={st.kvKey}>{k}:</Text><Text style={st.kvVal}>{v}</Text></View>
      ))}
    </View>
  );
}

function Extras({ items }) {
  if (!items?.length) return null;
  return (
    <View style={st.pad}>
      <Text style={st.sectionTitle}>Additional details</Text>
      {items.map((e, i) => (
        <View key={i} style={st.kvRow}><Text style={st.kvKey}>{e.label}:</Text><Text style={st.kvVal}>{e.value || '-'}</Text></View>
      ))}
    </View>
  );
}

function Footer({ s, variant }) {
  return (
    <View style={variant === 2 ? st.footer2 : st.footer} fixed>
      <Text style={st.footerNo}>{s.no}</Text>
      <Text style={st.footerCo}>{s.company}</Text>
    </View>
  );
}

function Standard({ s, accent, hide }) {
  return (
    <Document>
      <Page size="A4" style={st.page}>
        <View style={st.band}>
          <View style={st.rowBetween}>
            <View style={[st.rowCenter, { flex: 1, paddingRight: 16 }]}>
              {isDataImg(s.logo) && <Image src={s.logo} style={st.logo} />}
              <View style={{ flexShrink: 1 }}>
                <Text style={st.bandCompany}>{(s.company || '').toUpperCase()}</Text>
                <Text style={st.bandEyebrow}>BACK-OFFICE INVOICING</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', flexShrink: 0, width: 180 }}>
              <Text style={[st.invNo, { color: accent }]}>INVOICE # {String(s.ref || '').replace('INV-', '')}</Text>
              <Text style={st.bandDate}>Date · {s.date}</Text>
            </View>
          </View>
        </View>

        <View style={[st.rowBetween, st.pad]}>
          <View>
            {!!s.addr && <Text style={st.small}>{s.addr}</Text>}
            {!!s.mobile && <Text style={st.small}>Mobile: {s.mobile}</Text>}
            {!!s.email && <Text style={st.small}>{s.email}</Text>}
            {!!s.phone && <Text style={st.small}>{s.phone}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.billTo}>INVOICE TO:</Text>
            <Text style={st.billName}>{(s.pax || '').toUpperCase()}</Text>
            {!hide.email && !!s.paxLine2 && <Text style={st.small}>{s.paxLine2}</Text>}
            {!hide.phone && !!s.custPhone && <Text style={st.small}>{s.custPhone}</Text>}
            {!hide.city && !!s.city && <Text style={st.small}>{s.city}</Text>}
          </View>
        </View>

        <View style={st.pad}>
          <View style={[st.trHead, { backgroundColor: accent }]}>
            <Text style={[st.th, { flex: 0.6 }]}>No</Text>
            <Text style={[st.th, { flex: 4 }]}>Item Description</Text>
            <Text style={[st.th, st.num, { flex: 1.6 }]}>Price</Text>
            <Text style={[st.th, st.num, { flex: 1 }]}>Qty</Text>
            <Text style={[st.th, st.num, { flex: 1.6 }]}>Total</Text>
          </View>
          {(s.items || []).map((it, i) => (
            <View key={i} style={st.tr}>
              <Text style={[st.td, { flex: 0.6 }]}>{i + 1}</Text>
              <Text style={[st.td, { flex: 4 }]}>{it[1]}</Text>
              <Text style={[st.td, st.num, { flex: 1.6 }]}>{money(it[4])}</Text>
              <Text style={[st.td, st.num, { flex: 1 }]}>{it[3]}</Text>
              <Text style={[st.td, st.num, { flex: 1.6 }]}>{money(it[5])}</Text>
            </View>
          ))}
        </View>

        <View style={[st.pad, { alignItems: 'flex-end' }]}>
          <View style={{ width: 200 }}>
            <View style={st.totRow}><Text style={st.totLabel}>SUBTOTAL</Text><Text>{money(s.subtotal)}</Text></View>
            {!hide.tax && <View style={st.totRow}><Text style={st.totLabel}>TAXES</Text><Text>{money(s.gst)}</Text></View>}
            <View style={[st.totGrand, { backgroundColor: accent }]}><Text style={st.totGrandT}>TOTAL</Text><Text style={st.totGrandT}>{money(s.total)}</Text></View>
          </View>
        </View>

        <Extras items={s.extras} />

        <View style={[st.rowBetween, st.pad]}>
          <BankBlock bank={s.bank} />
          <View style={{ width: 190, flexShrink: 0, alignItems: 'flex-end' }}>
            <Text style={st.sectionTitle}>Payment terms</Text>
            <Text style={[st.small, { textAlign: 'right' }]}>Payment due within 14 days. Bank transfer, UPI, or card accepted.</Text>
          </View>
        </View>

        <Footer s={s} variant={1} />
      </Page>
    </Document>
  );
}

function TravelAgency({ s, accent, hide }) {
  return (
    <Document>
      <Page size="A4" style={st.page2}>
        <View style={st.rowBetween}>
          <View>
            <View style={st.rowCenter}>
              {isDataImg(s.logo) && <Image src={s.logo} style={st.logo2} />}
              <Text style={st.coName}>{s.company}</Text>
            </View>
            <Text style={st.bigInvoice}>Invoice.</Text>
            <Text style={st.mono}>{s.no}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.eyebrow}>ISSUE DATE</Text><Text style={st.bold}>{s.date}</Text>
            <Text style={[st.eyebrow, { marginTop: 6 }]}>DUE</Text><Text style={st.bold}>{s.due}</Text>
          </View>
        </View>

        <View style={[st.rowBetween, { marginTop: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={st.eyebrow}>FROM</Text>
            <Text style={st.bold}>{s.company}</Text>
            {!!s.addr && <Text style={st.small}>{s.addr}</Text>}
            {!!s.mobile && <Text style={st.small}>Mobile: {s.mobile}</Text>}
            {!!s.email && <Text style={st.small}>{s.email}</Text>}
            {!!s.phone && <Text style={st.small}>{s.phone}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.eyebrow}>BILL TO</Text>
            <Text style={st.bold}>{s.pax}</Text>
            {!hide.email && !!s.paxLine2 && <Text style={st.small}>{s.paxLine2}</Text>}
            {!hide.phone && !!s.custPhone && <Text style={st.small}>{s.custPhone}</Text>}
            {!hide.city && !!s.city && <Text style={st.small}>{s.city}</Text>}
          </View>
        </View>

        <View style={st.hr} />

        <View style={st.rowHead2}>
          <Text style={[st.th2, { flex: 4 }]}>ITEM</Text>
          <Text style={[st.th2, st.num, { flex: 1.6 }]}>RATE</Text>
          <Text style={[st.th2, st.num, { flex: 1 }]}>QTY</Text>
          <Text style={[st.th2, st.num, { flex: 1.6 }]}>AMOUNT</Text>
        </View>
        {(s.items || []).map((it, i) => (
          <View key={i} style={st.tr2}>
            <Text style={[st.td2, { flex: 4 }]}>{it[1]}</Text>
            <Text style={[st.td2, st.num, { flex: 1.6 }]}>{money(it[4])}</Text>
            <Text style={[st.td2, st.num, { flex: 1 }]}>{it[3]}</Text>
            <Text style={[st.td2, st.num, { flex: 1.6 }]}>{money(it[5])}</Text>
          </View>
        ))}

        <View style={{ alignItems: 'flex-end', marginTop: 14 }}>
          <View style={{ width: 200 }}>
            <View style={st.totRow}><Text style={st.totLabel}>Subtotal</Text><Text>{money(s.subtotal)}</Text></View>
            {!hide.tax && <View style={st.totRow}><Text style={st.totLabel}>GST</Text><Text>{money(s.gst)}</Text></View>}
            <View style={st.totBig}><Text style={[st.totBigT, { color: accent }]}>Total</Text><Text style={[st.totBigT, { color: accent }]}>{money(s.total)}</Text></View>
          </View>
        </View>

        {s.extras?.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={st.sectionTitle}>Additional details</Text>
            {s.extras.map((e, i) => (
              <View key={i} style={st.kvRow}><Text style={st.kvKey}>{e.label}:</Text><Text style={st.kvVal}>{e.value || '-'}</Text></View>
            ))}
          </View>
        )}

        <View style={[st.rowBetween, { marginTop: 16 }]}>
          <BankBlock bank={s.bank} />
          <View style={{ width: 190, flexShrink: 0, alignItems: 'flex-end' }}>
            <Text style={st.sectionTitle}>Payment terms</Text>
            <Text style={[st.small, { textAlign: 'right' }]}>Net 14 days. Bank transfer, UPI, or card accepted.</Text>
          </View>
        </View>

        <Footer s={s} variant={2} />
      </Page>
    </Document>
  );
}

/* accent presets mirror the app so a chosen brand colour drives the PDF. */
export function InvoiceDoc({ variant, sample = {}, accent }) {
  const ac = accent || '#1E9952';
  const hide = sample.hide || {};
  return variant === 2
    ? <TravelAgency s={sample} accent={ac} hide={hide} />
    : <Standard s={sample} accent={ac} hide={hide} />;
}
