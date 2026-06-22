import React from 'react';

export function InvoiceFooter({ no = 'INV-PSG-0142', company = 'Nexivra Travel' }) {
  return (
    <div className="inv-footer">
      <span>{no}</span>
      <span className="sep"/>
      <span className="company">{company}</span>
    </div>
  );
}

// Optional custom-field strip, rendered just above the footer on every template.
export function ExtrasBlock({ items, dark = false }) {
  if (!items?.length) return null;
  return (
    <div style={{ padding: '12px 22px 0', display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 8 }}>
      {items.map((e, i) => (
        <div key={i}>
          <span style={{ color: dark ? '#888' : '#888' }}>{e.label}: </span>
          <span style={{ fontWeight: 600, color: dark ? '#fff' : '#1a1a1a' }}>{e.value || '—'}</span>
        </div>
      ))}
    </div>
  );
}

// Bank details block — bottom-left of the invoice. Renders only filled lines.
export function BankDetails({ bank, dark = false }) {
  if (!bank) return null;
  const lines = [
    ['Account Holder', bank.holder],
    ['Account No', bank.account],
    ['Bank', bank.bank],
    ['IFSC', bank.ifsc],
    ['UPI', bank.upi],
  ].filter(([, v]) => v);
  if (!lines.length) return null;
  return (
    <div style={{ fontSize: 8 }}>
      <div style={{ fontWeight: 700, color: dark ? '#fff' : '#1a1a1a', marginBottom: 3 }}>Bank Details</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px' }}>
        {lines.map(([k, v]) => (
          <React.Fragment key={k}>
            <span style={{ color: '#888' }}>{k}:</span>
            <span style={{ color: dark ? '#fff' : '#1a1a1a' }}>{v}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Shared sample data so all variants tell the same story
export const INV_SAMPLE = {
  no: 'INV-PSG-0142',
  date: '24 May 2026',
  due: '07 Jun 2026',
  pax: 'Anjali Rao',
  paxLine2: 'anjali.rao@gmail.com',
  city: 'Bengaluru · IN',
  company: 'Nexivra Travel',
  addr: '12/2 MG Road, Kochi 682011',
  email: 'invoice@nexivra.travel',
  phone: '+91 484 246 1100',
  mobile: '+91 98123 45678',
  bank: {
    holder: 'Nexivra Travel',
    account: '0001 2345 6789',
    bank: 'HDFC Bank',
    ifsc: 'HDFC0001234',
    upi: 'nexivra@hdfcbank',
  },
  items: [
    ['BWALR-3D', 'Backwaters Cruise · Alleppey', '3D · 2N', 1, '24,800', '24,800'],
    ['MUNHE-2D', 'Munnar Heritage Day Trip', '2D · 1N', 1, '18,200', '18,200'],
    ['ADD-INS', 'Travel insurance (covered)', 'flat', 1, '1,200', '1,200'],
    ['ADD-MEAL', 'Meal upgrade · vegetarian', '3 days', 3, '350', '1,050'],
  ],
  subtotal: '45,250',
  gst: '2,263',
  total: '47,513',
  ref: 'PSG-0142',
};

export default function Invoice({ variant = 1, sample = {}, scale = 1, large = false }) {
  const s = { ...INV_SAMPLE, ...sample };

  // ─────────────────────────────────────────────────────────
  // V1 · CORPORATE BAND
  // Dark header strip · accent grand-total chip
  // ─────────────────────────────────────────────────────────
  if (variant === 1) {
    return (
      <div className={'inv ' + (large?'large':'')} style={{transform:`scale(${scale})`, transformOrigin:'top left'}}>
        {/* Dark header band */}
        <div style={{background:'#0E1B33', color:'#fff', padding:'18px 22px', position:'relative'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <img src={s.logo || "/assets/invoice-flow-icon-light.png"} alt="" height="22" style={{display:'block', flex:'0 0 auto', width:'auto', maxWidth:90, maxHeight:22, objectFit:'contain'}}/>
              <div>
                <div style={{fontSize:12, fontWeight:700, letterSpacing:'-0.01em'}}>{s.company.toUpperCase()}</div>
                <div className="inv-eye" style={{marginTop:2, color:'rgba(255,255,255,0.65)'}}>BACK-OFFICE INVOICING</div>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="inv-h1" style={{color:'var(--brand-accent)'}}>INVOICE # {s.ref.replace('PSG-','')}</div>
              <div style={{fontSize:8, marginTop:3, color:'rgba(255,255,255,0.7)'}}>Date · {s.date}</div>
            </div>
          </div>
        </div>

        <div style={{padding:'14px 22px 0', display:'flex', justifyContent:'space-between', fontSize:8, color:'#0E1B33', position:'relative', zIndex:1}}>
          <div>
            <div>{s.addr}</div>
            {s.mobile && <div style={{marginTop:1}}>Mobile: {s.mobile}</div>}
            <div style={{marginTop:1}}>{s.email}</div>
            <div style={{marginTop:1}}>{s.phone}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div className="inv-h2" style={{color:'#0E1B33'}}>INVOICE TO:</div>
            <div style={{marginTop:6, fontWeight:700}}>{s.pax.toUpperCase()}</div>
            <div style={{opacity:0.7}}>{s.paxLine2}</div>
            <div style={{opacity:0.7}}>{s.city}</div>
          </div>
        </div>

        {/* Items */}
        <div style={{padding:'16px 22px 0', position:'relative', zIndex:1}}>
          <table>
            <thead>
              <tr style={{background:'var(--brand-accent)', color:'var(--brand-accent-on)'}}>
                <th style={{width:18, borderRadius:'4px 0 0 4px', paddingLeft:10}}>No</th>
                <th>Item Description</th>
                <th className="num">Price</th>
                <th className="num">Qty</th>
                <th className="num" style={{borderRadius:'0 4px 4px 0', paddingRight:14}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {s.items.map((it,i) => (
                <tr key={i} style={{borderBottom: i<s.items.length-1 ? '1px solid rgba(14,27,51,0.08)' : 'none'}}>
                  <td style={{paddingLeft:10, color:'#3a3a3a'}}>{i+1}</td>
                  <td style={{color:'#0E1B33'}}>{it[1]}</td>
                  <td className="num">{it[4]}</td>
                  <td className="num">{it[3]}</td>
                  <td className="num" style={{paddingRight:14}}>{it[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{padding:'10px 22px 0', display:'flex', justifyContent:'flex-end', position:'relative', zIndex:1}}>
          <div style={{width:160}}>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:8, padding:'3px 8px'}}><span style={{color:'#888', fontWeight:700, letterSpacing:'0.08em'}}>SUBTOTAL</span><span>₹ {s.subtotal}</span></div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:8, padding:'3px 8px'}}><span style={{color:'#888', fontWeight:700, letterSpacing:'0.08em'}}>TAXES</span><span>₹ {s.gst}</span></div>
            <div style={{display:'flex', justifyContent:'space-between', background:'var(--brand-accent)', color:'var(--brand-accent-on)', padding:'5px 8px', marginTop:4, fontSize:9.5, fontWeight:700, letterSpacing:'0.05em', borderRadius:3}}><span>TOTAL</span><span>₹ {s.total}</span></div>
          </div>
        </div>

        {/* Bottom-left bank details · bottom-right payment terms */}
        <div style={{padding:'14px 22px 0', position:'relative', zIndex:1, display:'flex', justifyContent:'space-between', gap:16, alignItems:'flex-start'}}>
          <BankDetails bank={s.bank}/>
          <div style={{fontSize:8, color:'#3a3a3a', textAlign:'right', maxWidth:170}}>
            <div style={{fontWeight:700, color:'#0E1B33'}}>Payment terms</div>
            <div style={{marginTop:3}}>Payment due within 14 days. Bank transfer, UPI, or card accepted.</div>
          </div>
        </div>

        <ExtrasBlock items={s.extras}/>
        <InvoiceFooter no={s.no} company={s.company}/>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // V2 · MODERN MINIMAL (clean, lots of white, oversized total)
  // ─────────────────────────────────────────────────────────
  if (variant === 2) {
    return (
      <div className={'inv ' + (large?'large':'')} style={{transform:`scale(${scale})`, transformOrigin:'top left', background:'#fff', color:'#0E1B33'}}>
        <div style={{padding:'22px 26px 0'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <div>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <img src={s.logo || "/assets/invoice-flow-icon-transparent.png"} alt="" height="20" style={{display:'block', flex:'0 0 auto', width:'auto', maxWidth:90, maxHeight:20, objectFit:'contain'}}/>
                <div style={{fontSize:11, fontWeight:700, letterSpacing:'-0.01em'}}>{s.company}</div>
              </div>
              <div style={{marginTop:10, fontSize:24, fontWeight:800, letterSpacing:'-0.025em', color:'#0E1B33', lineHeight:1}}>Invoice.</div>
              <div className="h-mono" style={{fontSize:8, marginTop:4, color:'#888', letterSpacing:'0.18em'}}>{s.no}</div>
            </div>
            <div style={{textAlign:'right', fontSize:8, color:'#666'}}>
              <div className="inv-eye" style={{color:'#888', fontSize:6.5}}>ISSUE DATE</div>
              <div style={{fontSize:11, fontWeight:700, color:'#0E1B33', marginTop:2}}>{s.date}</div>
              <div className="inv-eye" style={{color:'#888', fontSize:6.5, marginTop:6}}>DUE</div>
              <div style={{fontSize:11, fontWeight:700, color:'#0E1B33', marginTop:2}}>{s.due}</div>
            </div>
          </div>

          <div style={{marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, fontSize:8, color:'#666'}}>
            <div>
              <div className="inv-eye" style={{color:'#888', fontSize:6.5}}>FROM</div>
              <div style={{marginTop:4, color:'#0E1B33', fontWeight:600}}>{s.company}</div>
              <div style={{marginTop:1}}>{s.addr}</div>
              {s.mobile && <div>Mobile: {s.mobile}</div>}
              <div>{s.email}</div>
              {s.phone && <div>{s.phone}</div>}
            </div>
            <div>
              <div className="inv-eye" style={{color:'#888', fontSize:6.5}}>BILL TO</div>
              <div style={{marginTop:4, color:'#0E1B33', fontWeight:600}}>{s.pax}</div>
              <div style={{marginTop:1}}>{s.paxLine2}</div>
              <div>{s.city}</div>
            </div>
          </div>

          <div style={{height:1, background:'#eee', margin:'12px 0 8px'}}/>

          <div className="h-mono" style={{display:'grid', gridTemplateColumns:'1fr 60px 50px 70px', fontSize:7, color:'#888', letterSpacing:'0.18em', padding:'0 4px 5px'}}>
            <div>ITEM</div><div style={{textAlign:'right'}}>RATE</div><div style={{textAlign:'right'}}>QTY</div><div style={{textAlign:'right'}}>AMOUNT</div>
          </div>
          {s.items.map((it,i) => (
            <div key={i} style={{display:'grid', gridTemplateColumns:'1fr 60px 50px 70px', fontSize:8.5, padding:'5px 4px', borderTop:'1px solid #f0f0f0', color:'#0E1B33'}}>
              <div>
                <div style={{fontWeight:600}}>{it[1]}</div>
                <div style={{color:'#888', fontSize:7}}>{it[0]}</div>
              </div>
              <div style={{textAlign:'right'}}>{it[4]}</div>
              <div style={{textAlign:'right'}}>{it[3]}</div>
              <div style={{textAlign:'right', fontWeight:600}}>{it[5]}</div>
            </div>
          ))}

          <div style={{display:'flex', justifyContent:'flex-end', marginTop:10}}>
            <div style={{width:160, fontSize:8}}>
              <div style={{display:'flex', justifyContent:'space-between', padding:'2px 0', color:'#666'}}><span>Subtotal</span><span>₹ {s.subtotal}</span></div>
              <div style={{display:'flex', justifyContent:'space-between', padding:'2px 0', color:'#666'}}><span>GST 5%</span><span>₹ {s.gst}</span></div>
              <div style={{display:'flex', justifyContent:'space-between', marginTop:6, paddingTop:6, borderTop:'1px solid #0E1B33', fontSize:15, color:'var(--brand-accent)', fontWeight:800, letterSpacing:'-0.02em'}}>
                <span>Total</span><span>₹ {s.total}</span>
              </div>
            </div>
          </div>

          <div style={{marginTop:12, display:'flex', justifyContent:'space-between', gap:16, alignItems:'flex-start'}}>
            <BankDetails bank={s.bank}/>
            <div style={{fontSize:7.5, color:'#888', textAlign:'right', maxWidth:160, lineHeight:1.5}}>
              <div style={{fontWeight:700, color:'#0E1B33'}}>Payment terms</div>
              <div style={{marginTop:2}}>Net 14 days. Bank transfer, UPI, or card accepted.</div>
            </div>
          </div>
        </div>

        <ExtrasBlock items={s.extras}/>
        <InvoiceFooter no={s.no} company={s.company}/>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // V3 · GEOMETRIC BORDER (vertical accent rails)
  // inspired by ref 3
  // ─────────────────────────────────────────────────────────
  if (variant === 3) {
    const Tile = ({ x, y, kind }) => {
      const opacity = 0.85;
      if (kind === 'q1') return <path d={`M${x},${y} L${x+10},${y} A10,10 0 0 1 ${x},${y+10} Z`} fill="var(--brand-accent)" opacity={opacity}/>;
      if (kind === 'q2') return <path d={`M${x+10},${y} L${x+10},${y+10} A10,10 0 0 1 ${x},${y+10} Z`} fill="var(--brand-accent)" opacity={opacity}/>;
      if (kind === 'tri') return <path d={`M${x},${y} L${x+10},${y} L${x},${y+10} Z`} fill="var(--brand-accent-dark)" opacity={opacity}/>;
      return <circle cx={x+5} cy={y+5} r="3" fill="var(--brand-accent)" opacity={opacity}/>;
    };
    const tiles = ['q1','q2','tri','dot','q1','q2','tri','dot','q1','q2','tri','dot','q1','q2'];

    return (
      <div className={'inv ' + (large?'large':'')} style={{transform:`scale(${scale})`, transformOrigin:'top left'}}>
        {/* Left + right vertical pattern rails */}
        <svg viewBox="0 0 24 540" preserveAspectRatio="none" style={{position:'absolute', left:0, top:0, height:'100%', width:24}}>
          {tiles.map((k, i) => <Tile key={i} x={6} y={20 + i*36} kind={k}/>)}
        </svg>
        <svg viewBox="0 0 24 540" preserveAspectRatio="none" style={{position:'absolute', right:0, top:0, height:'100%', width:24}}>
          {tiles.map((k, i) => <Tile key={i} x={6} y={20 + i*36} kind={tiles[(i+2)%tiles.length]}/>)}
        </svg>

        <div style={{padding:'16px 32px 0'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginTop:6}}>
              <img src="/assets/invoice-flow-icon-transparent.png" alt="" width="22" height="22" style={{display:'block', flex:'0 0 auto', borderRadius:4}}/>
              <div style={{fontWeight:700, fontSize:11, color:'#1a1a1a'}}>{s.company}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:28, fontWeight:700, letterSpacing:'0.03em', color:'var(--brand-accent-dark)'}}>INVOICE</div>
              <div style={{height:2, background:'var(--brand-accent)', width:'70%', marginLeft:'auto', marginTop:2}}/>
            </div>
          </div>

          {/* Meta block */}
          <div style={{marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, fontSize:8}}>
            <div>
              <div className="inv-eye" style={{color:'var(--brand-accent)'}}>INVOICE NUMBER</div>
              <div style={{fontWeight:700, fontSize:11, marginTop:1, color:'#1a1a1a'}}>{s.no.replace('INV-','#')}</div>
              <div className="inv-eye" style={{color:'var(--brand-accent)', marginTop:6}}>INVOICE DATE</div>
              <div style={{fontWeight:700, fontSize:11, marginTop:1, color:'#1a1a1a'}}>{s.date}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="inv-eye" style={{color:'var(--brand-accent)'}}>INVOICE TO</div>
              <div style={{fontWeight:700, fontSize:11, marginTop:1, color:'#1a1a1a'}}>{s.pax}</div>
              <div style={{fontSize:8, color:'#666', marginTop:1}}>{s.paxLine2}</div>
              <div style={{fontSize:8, color:'#666', marginTop:1}}>{s.city}</div>
            </div>
          </div>

          {/* Items */}
          <table style={{marginTop:14}}>
            <thead>
              <tr style={{background:'var(--brand-accent-dark)', color:'#fff'}}>
                <th style={{borderRadius:'4px 0 0 4px', paddingLeft:14}}>Description</th>
                <th className="num">Price</th>
                <th className="num">Quantity</th>
                <th className="num" style={{borderRadius:'0 4px 4px 0', paddingRight:14}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {s.items.map((it,i) => (
                <tr key={i}>
                  <td style={{paddingLeft:14, color:'#1a1a1a'}}>{it[1]}</td>
                  <td className="num">{it[4]}</td>
                  <td className="num">{it[3]}</td>
                  <td className="num" style={{paddingRight:14}}>{it[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals + payment + signature */}
          <div style={{marginTop:14, display:'flex', gap:14, fontSize:8}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700, fontSize:9, color:'var(--brand-accent-dark)'}}>Payment Method :</div>
              <div style={{color:'#1a1a1a', marginTop:3}}>Bank Transfer</div>
              <div style={{color:'var(--brand-accent)', fontSize:7.5}}>HDFC · 0001 2345 6789</div>
              <div style={{color:'#1a1a1a', marginTop:6}}>UPI</div>
              <div style={{color:'var(--brand-accent)', fontSize:7.5}}>invoiceflow@hdfcbank</div>
            </div>
            <div style={{flex:1.1}}>
              <div style={{display:'flex', justifyContent:'space-between'}}><span style={{fontWeight:700}}>Sub Total</span><span>₹ {s.subtotal}</span></div>
              <div style={{display:'flex', justifyContent:'space-between', marginTop:2}}><span style={{fontWeight:700}}>Taxes (5%)</span><span>₹ {s.gst}</span></div>
              <div style={{display:'flex', justifyContent:'space-between', marginTop:2}}><span style={{fontWeight:700}}>Discount</span><span>₹ 0</span></div>
              <div style={{marginTop:8, padding:'6px 10px', background:'var(--brand-accent-dark)', color:'#fff', display:'flex', justifyContent:'space-between', borderRadius:3, fontSize:9, fontWeight:700}}>
                <span>Grand Total</span><span>₹ {s.total}</span>
              </div>
            </div>
          </div>

          <div style={{marginTop:14, fontSize:8}}>
            <div style={{fontWeight:700, color:'var(--brand-accent-dark)'}}>Terms &amp; Condition</div>
            <div style={{color:'var(--brand-accent)', fontSize:7, marginTop:2}}>Tickets are non-refundable within 7 days of departure. Reschedules subject to availability see contract for full terms.</div>
          </div>
        </div>

        <ExtrasBlock items={s.extras}/>
        <InvoiceFooter no={s.no} company={s.company}/>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // V4 · STUDIO DECORATIVE (confetti dots + accent badge)
  // inspired by ref 4
  // ─────────────────────────────────────────────────────────
  if (variant === 4) {
    return (
      <div className={'inv ' + (large?'large':'')} style={{transform:`scale(${scale})`, transformOrigin:'top left'}}>
        {/* Confetti decoration top-right */}
        <svg viewBox="0 0 100 60" style={{position:'absolute', top:6, right:6, width:100, height:60}}>
          <circle cx="80" cy="10" r="3" fill="var(--brand-accent)"/>
          <circle cx="60" cy="20" r="2" fill="#E8B931"/>
          <circle cx="90" cy="30" r="2.5" fill="var(--brand-accent-dark)"/>
          <circle cx="70" cy="42" r="1.8" fill="var(--brand-accent)"/>
          <circle cx="40" cy="10" r="2" fill="#1ABC9C"/>
          <circle cx="50" cy="35" r="1.5" fill="#E55"/>
          <path d="M30,30 a8,8 0 0 1 16,0" stroke="#1ABC9C" strokeWidth="1.2" fill="none"/>
          <path d="M10,18 a6,6 0 0 1 12,0" stroke="var(--brand-accent)" strokeWidth="1.2" fill="none"/>
        </svg>

        <div style={{padding:'18px 22px 0'}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <polygon points="9,1 11,7 17,7 12,11 14,17 9,13 4,17 6,11 1,7 7,7" fill="var(--brand-accent)"/>
            </svg>
            <div>
              <div style={{fontSize:14, fontWeight:700, letterSpacing:'-0.01em'}}>Studio<span style={{color:'var(--brand-accent)'}}>Invoice Flow</span></div>
              <div style={{fontSize:6, letterSpacing:'0.2em', color:'#888'}}>TRAVEL · TOURISM</div>
            </div>
          </div>

          <div style={{marginTop:14, display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <div>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <div style={{fontSize:30, fontWeight:800, letterSpacing:'-0.03em', color:'#1a1a1a'}}>INVOICE</div>
                <div style={{background:'var(--brand-accent)', color:'var(--brand-accent-on)', padding:'2px 8px', fontFamily:'var(--mono)', fontSize:8.5, fontWeight:700, borderRadius:3}}>{s.no.replace('INV-','#')}</div>
              </div>
              <div style={{fontSize:7.5, color:'#444', marginTop:3, display:'flex', gap:14}}>
                <div>Account No&nbsp;: <span style={{color:'#1a1a1a'}}>5446877654654</span></div>
                <div>Invoice Date&nbsp;: <span style={{color:'#1a1a1a'}}>{s.date}</span></div>
              </div>
            </div>
            <div style={{textAlign:'left', borderLeft:'1px solid #ddd', paddingLeft:10}}>
              <div className="inv-eye" style={{fontSize:6}}>INVOICE TO</div>
              <div style={{fontWeight:700, fontSize:9.5, marginTop:2}}>{s.pax}</div>
              <div style={{fontSize:7.5, color:'#666'}}>Manager, Travel co.</div>
              <div style={{fontSize:7.5, color:'#666'}}>Ph: +91 98123 45678</div>
              <div style={{fontSize:7.5, color:'#666'}}>Em: {s.paxLine2}</div>
            </div>
          </div>
        </div>

        <table style={{marginTop:14, padding:'0 22px'}}>
          <thead>
            <tr style={{background:'#0E1B33', color:'#fff'}}>
              <th style={{paddingLeft:18}}>Item Description</th>
              <th className="num">Unit Price</th>
              <th className="num">Qnt</th>
              <th className="num" style={{paddingRight:18}}>Total</th>
            </tr>
          </thead>
          <tbody>
            {s.items.map((it,i) => (
              <tr key={i} style={{background: i%2===0 ? 'var(--brand-accent-tint)' : '#fff', borderBottom:'1px dashed rgba(0,0,0,0.08)'}}>
                <td style={{paddingLeft:18}}>
                  <div style={{fontWeight:700, fontSize:8.5}}>{it[1]}</div>
                  <div style={{fontSize:7, color:'#888'}}>{it[0]}</div>
                </td>
                <td className="num">{it[4]}</td>
                <td className="num">{it[3]}</td>
                <td className="num" style={{paddingRight:18, fontWeight:600}}>{it[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{padding:'10px 22px 0', display:'flex', justifyContent:'flex-end', gap:14}}>
          <div style={{width:160}}>
            <div style={{display:'flex', justifyContent:'space-between', borderBottom:'1px dashed #aaa', fontSize:8, padding:'3px 0'}}><span>Sub Total :</span><span>₹ {s.subtotal}</span></div>
            <div style={{display:'flex', justifyContent:'space-between', borderBottom:'1px dashed #aaa', fontSize:8, padding:'3px 0'}}><span>Tax 5% :</span><span>₹ {s.gst}</span></div>
            <div style={{background:'var(--brand-accent-dark)', color:'#fff', padding:'4px 8px', marginTop:6, display:'flex', justifyContent:'space-between', fontSize:9.5, fontWeight:700, borderRadius:3}}><span>GRAND TOTAL</span><span>₹ {s.total}</span></div>
          </div>
        </div>

        <div style={{padding:'16px 22px 0', fontSize:7.5, color:'#666'}}>
          <div style={{fontWeight:700, color:'#1a1a1a'}}>Terms &amp; Condition :</div>
          <div style={{marginTop:2}}>· Payment should be made within 14 days</div>
          <div>· By Bank Transfer, UPI, or Card</div>
        </div>

        <ExtrasBlock items={s.extras}/>
        <InvoiceFooter no={s.no} company={s.company}/>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // V5 · DARK MINIMAL (full dark bg + accent header band)
  // inspired by ref 5
  // ─────────────────────────────────────────────────────────
  return (
    <div className={'inv ' + (large?'large':'')} style={{background:'#141414', color:'#E4E4E4', transform:`scale(${scale})`, transformOrigin:'top left'}}>
      <div style={{padding:'18px 22px 0', display:'flex', justifyContent:'space-between'}}>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:6}}>
            <img src="/assets/invoice-flow-icon-light.png" alt="" width="18" height="18" style={{display:'block', flex:'0 0 auto', borderRadius:4}}/>
            <div style={{fontSize:9, fontWeight:700, letterSpacing:'0.1em'}}>LOGO HERE</div>
          </div>
          <div style={{marginTop:18}}>
            <div style={{color:'var(--brand-accent)', fontSize:9, fontWeight:700, letterSpacing:'0.05em'}}>{s.pax.toUpperCase()}</div>
            <div style={{fontSize:8, marginTop:2, opacity:0.7}}>{s.paxLine2}</div>
            <div style={{fontSize:8, opacity:0.7}}>{s.city}</div>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:30, fontWeight:800, color:'var(--brand-accent)', letterSpacing:'-0.02em'}}>INVOICE</div>
          <div style={{fontSize:8, marginTop:4}}>Invoice No: <span style={{color:'#fff', fontWeight:600}}>{s.no.replace('INV-','')}</span></div>
          <div style={{fontSize:8, marginTop:2}}>Date: <span style={{color:'#fff', fontWeight:600}}>{s.date}</span></div>
        </div>
      </div>

      <div style={{padding:'18px 22px 0'}}>
        <table>
          <thead>
            <tr>
              <th style={{background:'var(--brand-accent)', color:'var(--brand-accent-on)', borderRadius:'4px 0 0 4px', paddingLeft:14, letterSpacing:'0.12em', textTransform:'uppercase', fontSize:7}}>DESCRIPTION</th>
              <th style={{background:'var(--brand-accent)', color:'var(--brand-accent-on)', letterSpacing:'0.12em', textTransform:'uppercase', fontSize:7}} className="num">PRICE</th>
              <th style={{background:'var(--brand-accent)', color:'var(--brand-accent-on)', letterSpacing:'0.12em', textTransform:'uppercase', fontSize:7}} className="num">QTY</th>
              <th style={{background:'var(--brand-accent)', color:'var(--brand-accent-on)', letterSpacing:'0.12em', textTransform:'uppercase', fontSize:7, borderRadius:'0 4px 4px 0', paddingRight:14}} className="num">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {s.items.map((it,i) => (
              <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                <td style={{paddingLeft:14, color:'#fff', fontSize:9, fontWeight:500}}>{it[1]}</td>
                <td className="num">₹{it[4]}</td>
                <td className="num">{it[3]}</td>
                <td className="num" style={{paddingRight:14}}>₹{it[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{padding:'14px 22px 0', display:'flex', gap:18}}>
        <div style={{flex:1, fontSize:8}}>
          <div style={{color:'var(--brand-accent)', fontWeight:700, fontSize:9}}>Payment Info:</div>
          <div style={{marginTop:6, display:'grid', gridTemplateColumns:'auto 1fr', gap:'2px 10px'}}>
            <span style={{color:'#888'}}>Bank Name:</span><span>HDFC Ltd.</span>
            <span style={{color:'#888'}}>Bank Code:</span><span>HDFC0001234</span>
            <span style={{color:'#888'}}>Account No:</span><span>0001 2345 6789</span>
          </div>
        </div>
        <div style={{minWidth:140}}>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:8, padding:'2px 0'}}><span style={{color:'#888'}}>SUBTOTAL</span><span style={{color:'#fff', fontWeight:600}}>₹ {s.subtotal}</span></div>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:8, padding:'2px 0', borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:6}}><span style={{color:'#888'}}>TAX</span><span style={{color:'#fff', fontWeight:600}}>₹ {s.gst}</span></div>
          <div style={{display:'flex', justifyContent:'space-between', background:'var(--brand-accent)', color:'var(--brand-accent-on)', padding:'5px 10px', marginTop:6, fontSize:10, fontWeight:700, borderRadius:3, letterSpacing:'0.05em'}}><span>TOTAL :</span><span>₹ {s.total}</span></div>
        </div>
      </div>

      <div style={{padding:'14px 22px 0', fontSize:7.5}}>
        <div style={{color:'var(--brand-accent)', fontWeight:700, letterSpacing:'0.05em'}}>TERMS &amp; CONDITIONS:</div>
        <div style={{marginTop:3, color:'#aaa', fontSize:7.5, lineHeight:1.5}}>Tickets non-refundable within 7 days of departure. Reschedule subject to availability. Insurance excludes pre-existing conditions.</div>
      </div>

      <ExtrasBlock items={s.extras} dark/>

      {/* Dark footer override keep the same content shape but light text */}
      <div className="inv-footer" style={{background:'#0a0a0a', borderTop:'1px solid rgba(255,255,255,0.12)', color:'#888'}}>
        <span>{s.no}</span>
        <span className="sep"/>
        <span style={{color:'#fff', fontWeight:600}}>{s.company}</span>
      </div>
    </div>
  );
}
