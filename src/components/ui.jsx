// Astrolab — komponen dasar redesign (Fase 0c, Okt 2026)
// Dipakai semua layar yang sudah dirombak. Tampilan saja: tidak membaca store atau Firebase.
// Prinsip: satu warna utama (teal), amber untuk perhatian, status ditulis dengan kata, KKTP sebagai garis tipis.
import "../styles/ui.css";

export const KKTP = 70;

// size: "narrow" (480 px, default) | "mid" (680 px di laptop) | "wide" (960 px di laptop). `wide` lama tetap jalan.
export function Page({ wide = false, size, children }) {
  const sz = size || (wide ? "wide" : "narrow");
  return <div className={`ui-page${sz === "narrow" ? "" : " " + sz}`}>{children}</div>;
}

// Topbar HP (main.css menyembunyikannya di layar >= 768px; judul halaman tetap tampil di PageHeader)
export function TopBar({ title, onBack }) {
  return (
    <div className="topbar">
      <button className="topbar-back" onClick={onBack} aria-label="Kembali">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <div className="topbar-title">{title}</div>
      <div style={{ width: 36 }} />
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <header className="ui-head">
      {eyebrow && <span className="ui-head-ey">{eyebrow}</span>}
      <h1>{title}</h1>
      {subtitle && <span className="ui-head-sub">{subtitle}</span>}
    </header>
  );
}

// Kartu bagian: label huruf kapital kecil di kiri, keterangan mono di kanan (opsional)
export function Card({ label, aside, center = false, ariaLabel, children }) {
  return (
    <section className={`ui-card${center ? " center" : ""}`} aria-label={ariaLabel || label}>
      {(label || aside) && (
        <div className="ui-label-row">{label && <span className="ui-label">{label}</span>}{aside && <span className="ui-aside">{aside}</span>}</div>
      )}
      {children}
    </section>
  );
}

export function Tabs({ items, value, onChange }) {
  return (
    <div className="ui-tabs" role="tablist">
      {items.map(it => {
        const key = typeof it === "string" ? it : it.value;
        const label = typeof it === "string" ? it : it.label;
        return <button key={key} role="tab" aria-selected={key === value} onClick={() => onChange(key)}>{label}</button>;
      })}
    </div>
  );
}

// Titik kecil: berapa dari sekian bagian yang sudah terisi
export function Dots({ filled }) {
  return <div className="ui-dots" aria-hidden="true">{filled.map((on, i) => <i key={i} className={on ? "on" : ""} />)}</div>;
}

// Angka besar + penjelasan di sampingnya
export function StatBlock({ value, children, dots }) {
  return (
    <div className="ui-stat">
      <div className="ui-stat-num">{value}</div>
      <div>{children}{dots && <Dots filled={dots} />}</div>
    </div>
  );
}

export function ScoreBar({ value, kktp = KKTP }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="ui-bar">
      <i className={value < kktp ? "below" : ""} style={{ width: `${v}%` }} />
      <span className="ref" style={{ left: `${kktp}%` }} />
    </div>
  );
}

export function KktpLegend({ kktp = KKTP }) {
  return <span className="ui-legend"><i />KKTP {kktp}</span>;
}

// Satu baris komponen nilai: nama + bobot, bar, angka (atau "Belum"), keterangan
export function ScoreRow({ label, weight, value, detail, kktp = KKTP }) {
  const has = typeof value === "number";
  const below = has && value < kktp;
  return (
    <div className="ui-row">
      <div className="ui-row-name">{label}{weight != null && <small>{weight}%</small>}</div>
      <div className={`ui-row-val ${has ? (below ? "below" : "") : "none"}`}>{has ? Math.round(value) : "Belum"}</div>
      <div>
        {has && <ScoreBar value={value} kktp={kktp} />}
        {detail && <div className="ui-row-det" style={{ marginTop: has ? 5 : 0 }}>{detail}</div>}
      </div>
    </div>
  );
}

export function ScoreRows({ children }) {
  return <div className="ui-rows">{children}</div>;
}

// tone: "teal" (default) | "amber" | "muted" | "danger"
export function StatusChip({ tone = "teal", children }) {
  return <span className={`ui-chip${tone === "teal" ? "" : " " + tone}`}>{children}</span>;
}

export function DeltaBadge({ delta, unit = "poin" }) {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
  return <span className={`ui-badge${delta < 0 ? " down" : ""}`}>{sign}{Math.abs(delta)} {unit}</span>;
}

// "Yang bisa kamu lakukan": satu hal yang perlu ditindaklanjuti + tombolnya
export function ActionCallout({ title, note, actionLabel, onAction, tone = "amber" }) {
  return (
    <div className={`ui-callout${tone === "teal" ? " teal" : ""}`}>
      <p>{title}{note && <span>{note}</span>}</p>
      {actionLabel && onAction && <button type="button" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="ui-empty">
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></g></svg>
      <div className="ui-title">{title}</div>
      {children && <p className="ui-text">{children}</p>}
    </div>
  );
}

// Garis gerak dari → ke pada skala 0–100, dengan garis KKTP
export function MoveTrack({ from, to, kktp = KKTP, labelFrom = "awal", labelTo = "akhir" }) {
  const W = 360, X = v => 12 + v / 100 * (W - 24);
  const up = to >= from, col = up ? "var(--accent-mid)" : "var(--warn)";
  return (
    <svg className="ui-move" viewBox={`0 0 ${W} 56`} role="img" aria-label={`${labelFrom} ${from}, ${labelTo} ${to}, KKTP ${kktp}, skala 0 sampai 100`}>
      <rect x={X(0)} y="22" width={X(100) - X(0)} height="8" rx="4" fill="var(--line-soft)" />
      {[0, 50, 100].map(v => <text key={v} x={X(v)} y="52" textAnchor="middle" fontFamily="DM Mono, monospace" fontSize="11" fill="var(--ink-3)">{v}</text>)}
      <line x1={X(kktp)} y1="13" x2={X(kktp)} y2="39" stroke="var(--ink)" strokeOpacity=".5" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x={X(kktp)} y="9" textAnchor="middle" fontFamily="DM Mono, monospace" fontSize="10.5" fill="var(--ink-2)">KKTP</text>
      <line x1={X(from)} y1="26" x2={X(to)} y2="26" stroke={col} strokeWidth="5" strokeLinecap="round" />
      <circle cx={X(from)} cy="26" r="7" fill="var(--surface)" stroke="var(--ink-4)" strokeWidth="2.5" />
      <circle cx={X(to)} cy="26" r="8" fill={col} stroke="var(--surface)" strokeWidth="2.5" />
    </svg>
  );
}

// ─── Fase 1 ───

// Tombol. variant: "primary" | "outline" | "amber". full = selebar kartu.
// size: "md" (default) | "sm" (tombol di dalam baris daftar)
export function Button({ variant = "primary", full = false, size = "md", children, ...rest }) {
  return <button type="button" className={`ui-btn ${variant}${full ? " full" : ""}${size === "sm" ? " sm" : ""}`} {...rest}>{children}</button>;
}

// Daftar baris yang bisa diketuk (tugas, siswa, dll). Dipakai di dalam Card.
export function Items({ children }) {
  return <div className="ui-items">{children}</div>;
}

// icon: elemen ikon; tone ikon: "teal" | "amber" | "muted"; end: chip/angka di kanan
export function Item({ icon, tone = "teal", title, meta, end, onClick, dim = false }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} className={`ui-item${dim ? " dim" : ""}`} onClick={onClick}>
      {icon && <span className={`ui-item-ic ${tone}`} aria-hidden="true">{icon}</span>}
      <span className="ui-item-main"><b>{title}</b>{meta && <small>{meta}</small>}</span>
      {end != null && <span className="ui-item-end">{end}</span>}
    </Tag>
  );
}

// Angka kecil berderet: [{ label, value }]
export function Facts({ items }) {
  return (
    <dl className="ui-facts">
      {items.map(it => <div key={it.label}><dt>{it.label}</dt><dd>{it.value}</dd></div>)}
    </dl>
  );
}

// Bar kemajuan polos (tanpa garis KKTP), mis. "12 dari 34 sudah mengerjakan"
export function Meter({ value, max = 100, label }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;
  return <div className="ui-meter" role="img" aria-label={label || `${value} dari ${max}`}><i style={{ width: `${pct}%` }} /></div>;
}
