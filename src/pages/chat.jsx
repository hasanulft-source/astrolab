// Astrolab — Chat & Broadcast
// Extracted from App.jsx (Wave 5)

import { useState, useEffect, useRef } from "react";
import { I } from '../components/icons';
import { fmtLastSeen, withTimeout, getFirstName } from '../utils/helpers';
import { UserAvatar, OnlineDot, Card } from '../components/visual';
import { LevelBadge } from '../components/gamification';

function BroadcastBox({ broadcasts, isGuru, onEdit, onDelete }) {
  if (!broadcasts.length) return null;
  const fmtSisa = (exp) => {
    const diff = exp - Date.now();
    if (diff <= 0) return "Berakhir";
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (d > 0) return `${d} hari lagi`;
    return `${h} jam lagi`;
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
      {broadcasts.map(b => (
        <div key={b.id} className="bc-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-2)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
                Pengumuman · {b.target === "semua" ? "Semua Kelas" : `Kelas ${b.target}`}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", lineHeight: 1.55 }}>{b.pesan}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>{fmtSisa(b.expiresAt)}</div>
            </div>
            {isGuru && (
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" style={{ padding: "4px 6px" }} onClick={() => onEdit(b)}><I n="edit" s={13} /></button>
                <button className="btn btn-ghost btn-sm" style={{ padding: "4px 6px", color: "var(--bad)" }} onClick={() => onDelete(b.id)}><I n="trash" s={13} /></button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function BroadcastModal({ existing, onSave, onClose }) {
  const [pesan, setPesan] = useState(existing?.pesan || "");
  const [target, setTarget] = useState(existing?.target || "semua");
  const [durasi, setDurasi] = useState(existing?.durasiHari || 3);
  const [err, setErr] = useState("");

  function submit() {
    if (!pesan.trim()) { setErr("Pesan tidak boleh kosong."); return; }
    onSave({ pesan, target, durasi });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3>{existing ? "Edit Pengumuman" : "Buat Pengumuman"}</h3>
        <p style={{ marginBottom: 16 }}>Broadcast akan otomatis hilang setelah masa waktu habis.</p>
        <div className="fg" style={{ marginBottom: 12 }}>
          <label className="lbl">Pesan</label>
          <textarea className="inp" rows={3} value={pesan} onChange={e => { setPesan(e.target.value); setErr(""); }} placeholder="Tulis pengumuman..." />
        </div>
        <div className="g2" style={{ marginBottom: 12 }}>
          <div className="fg">
            <label className="lbl">Target kelas</label>
            <select className="inp" value={target} onChange={e => setTarget(e.target.value)}>
              <option value="semua">Semua Kelas</option>
              <option value="VII">Kelas VII</option>
              <option value="VIII">Kelas VIII</option>
            </select>
          </div>
          <div className="fg">
            <label className="lbl">Durasi</label>
            <select className="inp" value={durasi} onChange={e => setDurasi(Number(e.target.value))}>
              <option value={1}>1 hari</option>
              <option value={3}>3 hari</option>
              <option value={7}>7 hari</option>
              <option value={14}>14 hari</option>
              <option value={30}>30 hari</option>
            </select>
          </div>
        </div>
        {err && <div style={{ fontSize: 12, color: "var(--bad)", marginBottom: 10 }}>{err}</div>}
        <div className="modal-actions">
          <button className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={submit}><I n="send" s={13} /> {existing ? "Simpan" : "Kirim"}</button>
        </div>
      </div>
    </div>
  );
}


function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

// ─── Mini modal: guru set deadline + nilai maks saat approve akses ───
function ApproveAksesModal({ meta, onApprove, onClose }) {
  // Default deadline = 3 hari dari sekarang
  const defaultDl = new Date(Date.now() + 3 * 86400000);
  const fmtDate = d => d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  const [deadline, setDeadline] = useState(fmtDate(defaultDl));
  const [nilaiMaks, setNilaiMaks] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!deadline) return;
    setSaving(true);
    const dlDate = new Date(deadline).toISOString();
    const cap = nilaiMaks.trim() ? Number(nilaiMaks) : null;
    await onApprove(meta.tugasId, meta.siswaId, dlDate, cap);
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 350 }}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>Izinkan Akses Susulan</h3>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>
          <b>{meta.siswaName}</b> meminta akses untuk mengerjakan <b>"{meta.tugasJudul}"</b>
        </p>
        <div className="fg" style={{ marginBottom: 12 }}>
          <label className="lbl">Deadline Baru *</label>
          <input className="inp" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </div>
        <div className="fg" style={{ marginBottom: 16 }}>
          <label className="lbl">Nilai Maksimal (opsional)</label>
          <input className="inp" type="number" min={0} max={100} placeholder="Contoh: 80 (kosongkan = tanpa batas)"
            value={nilaiMaks} onChange={e => setNilaiMaks(e.target.value)} />
          <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>Kosongkan jika tidak ingin membatasi nilai</div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving || !deadline}>
            {saving ? "Menyimpan..." : "Izinkan Akses"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── System message card for akses-request / akses-response ───
function AksesMessageCard({ m, user, store }) {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const isGuru = user.role === "guru";
  const meta = m.meta || {};

  // Check current status from aksesRequests (live state, not message snapshot)
  const aksReq = store.getAksesRequest?.(meta.tugasId, meta.siswaId || m.fromId);
  const liveStatus = aksReq?.status;

  if (m.type === "akses-request") {
    const isPending = liveStatus === "pending";
    const isApproved = liveStatus === "approved";
    const isRejected = liveStatus === "rejected";

    return (
      <div style={{
        background: "var(--surface)", border: "1.5px solid var(--line)",
        borderRadius: 14, padding: "12px 14px", maxWidth: 300, width: "100%"
      }}>
        {showApproveModal && (
          <ApproveAksesModal
            meta={meta}
            onApprove={store.approveAkses}
            onClose={() => setShowApproveModal(false)}
          />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center",
            background: isApproved ? "rgba(16,185,129,.1)" : isRejected ? "rgba(220,53,69,.08)" : "rgba(245,158,11,.1)"
          }}>
            <I n={isApproved ? "check" : isRejected ? "x" : "clock"} s={14}
              style={{ color: isApproved ? "var(--good)" : isRejected ? "var(--bad)" : "var(--warn)" }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em",
            color: isApproved ? "var(--good)" : isRejected ? "var(--bad)" : "var(--warn)"
          }}>
            {isApproved ? "Diizinkan" : isRejected ? "Ditolak" : "Permintaan Akses"}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5, marginBottom: 8 }}>{m.text}</div>
        <div className="msg-time" style={{ marginBottom: isGuru && isPending ? 10 : 0 }}>{fmtTime(m.ts)}</div>

        {/* Guru action buttons — only show if still pending */}
        {isGuru && isPending && (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={() => setShowApproveModal(true)} style={{
              flex: 1, padding: "9px 0", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #0d6b7a 0%, #0a8a7a 100%)",
              color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4
            }}><I n="check" s={14} /> Izinkan</button>
            <button onClick={async () => {
              setRejecting(true);
              await store.rejectAkses(meta.tugasId, meta.siswaId);
              setRejecting(false);
            }} disabled={rejecting} style={{
              flex: 1, padding: "9px 0", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)",
              color: "#fff", fontWeight: 700, fontSize: 13,
              cursor: rejecting ? "not-allowed" : "pointer", opacity: rejecting ? .6 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4
            }}>{rejecting ? "..." : <><I n="x" s={14} /> Tolak</>}</button>
          </div>
        )}
      </div>
    );
  }

  if (m.type === "akses-response") {
    const isApproved = meta.status === "approved";
    return (
      <div style={{
        background: isApproved ? "rgba(16,185,129,.06)" : "rgba(220,53,69,.04)",
        border: `1.5px solid ${isApproved ? "rgba(16,185,129,.2)" : "rgba(220,53,69,.15)"}`,
        borderRadius: 14, padding: "12px 14px", maxWidth: 300, width: "100%"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <I n={isApproved ? "check" : "x"} s={14}
            style={{ color: isApproved ? "var(--good)" : "var(--bad)" }} />
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em",
            color: isApproved ? "var(--good)" : "var(--bad)"
          }}>
            {isApproved ? "Akses Diizinkan" : "Akses Ditolak"}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5, marginBottom: 4 }}>{m.text}</div>
        <div className="msg-time">{fmtTime(m.ts)}</div>
      </div>
    );
  }

  return null;
}

function ChatThread({ user, contact, store, onBack }) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const msgs = store.getThread(user.id, contact.id);

  useEffect(() => {
    store.markRead(user.id, contact.id);
  }, [msgs.length]);

  useEffect(() => {
    const el = document.getElementById("chat-msgs-end");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function send() {
    if (!text.trim() || isSending) return;
    const t = text;
    setText("");
    setIsSending(true);
    try {
      await withTimeout(store.sendMessage(user.id, contact.id, t));
    } catch (e) {
      setText(t); // restore text agar bisa coba kirim ulang
      alert("Pesan gagal terkirim.\n\n" + (e?.message || "Coba lagi."));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="chat-thread">
      {/* Header */}
      <div className="chat-thread-hdr">
        <button className="topbar-back" onClick={onBack}><I n="chevL" s={18} /></button>
        <UserAvatar userId={contact.id} name={contact.nama} size="md" store={store} showOnline />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.nama}</span>
            {contact.role !== "guru" && <LevelBadge poin={(store.getStats(contact.id).poin) || 0} size="xs" />}
          </div>
          {(() => {
            const online = store.isOnline(contact.id);
            if (online) return <div style={{ fontSize: 11, color: "var(--good)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><OnlineDot size={7} /> Online</div>;
            const ls = fmtLastSeen(store.getLastSeen(contact.id));
            return <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{ls ? `Terakhir online ${ls}` : (contact.role === "guru" ? "Guru · IPA & Informatika" : `Kelas ${contact.jenjang}`)}</div>;
          })()}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-msgs" style={{ background: "var(--bg)" }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-3)", fontSize: 13 }}>
            <div style={{ marginBottom: 8, opacity: .3 }}><I n="chat" s={32} /></div>
            Belum ada pesan. Mulai percakapan!
          </div>
        )}
        {msgs.map((m, i) => {
          const isMe = m.fromId === user.id;
          const allAcc = store.getAllSiswa ? [...store.getAllSiswa(), store.fbGuru].filter(Boolean) : [];
          const sender = allAcc.find(a => a.id === m.fromId) || { namaDisplay: m.fromId };
          const prevMsg = msgs[i - 1];
          const showName = !isMe && (!prevMsg || prevMsg.fromId !== m.fromId);

          // System messages — akses-request & akses-response
          if (m.type === "akses-request" || m.type === "akses-response") {
            return (
              <div key={m.key || i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", width: "100%" }}>
                {showName && <div className="msg-name" style={{ marginLeft: 4 }}>{sender?.namaDisplay || getFirstName(sender?.nama || "")}</div>}
                <AksesMessageCard m={m} user={user} store={store} />
              </div>
            );
          }

          return (
            <div key={m.key || i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
              {showName && <div className="msg-name" style={{ marginLeft: 4 }}>{sender?.namaDisplay || getFirstName(sender?.nama || "")}</div>}
              <div className={`msg ${isMe ? "msg-me" : "msg-them"}`}>
                {m.text}
                <div className="msg-time">{fmtTime(m.ts)}</div>
              </div>
            </div>
          );
        })}
        <div id="chat-msgs-end" />
      </div>

      {/* Input */}
      <div className="chat-input-wrap">
        <textarea className="chat-input" rows={1} placeholder="Tulis pesan..." value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          style={{ boxShadow: "var(--shadow-sm)" }}
        />
        <button onClick={send} disabled={!text.trim() || isSending} style={{ width: 40, height: 40, borderRadius: "50%", background: (text.trim() && !isSending) ? "var(--accent)" : "var(--surface-alt)", color: (text.trim() && !isSending) ? "#fff" : "var(--ink-4)", border: "none", cursor: (text.trim() && !isSending) ? "pointer" : "default", display: "grid", placeItems: "center", flexShrink: 0, transition: "all .15s" }}>
          <I n="send" s={16} />
        </button>
      </div>
    </div>
  );
}

export function ChatScreen({ user, store, params = {} }) {
  const [activeContact, setActiveContact] = useState(null);
  const [tab, setTab] = useState("VII");
  const [showBcModal, setShowBcModal] = useState(false);
  const [editBc, setEditBc] = useState(null);
  const isGuru = user.role === "guru";
  const contacts = store.getContacts(user.id, user.jenjang, user.role);

  // Auto-open chat dari Follow Up button
  useEffect(() => {
    if (params.openChat && contacts.length > 0) {
      const target = contacts.find(c => c.id === params.openChat);
      if (target) setActiveContact(target);
    }
  }, [params.openChat, contacts.length]);
  const broadcasts = isGuru
    ? store.getAllBroadcasts() // guru lihat semua broadcast (semua target)
    : store.getBroadcasts(user.jenjang);

  async function handleSaveBc({ pesan, target, durasi }) {
    if (editBc) {
      await store.editBroadcast(editBc.id, pesan, target, durasi);
      setEditBc(null);
    } else {
      await store.addBroadcast(pesan, target, durasi);
    }
    setShowBcModal(false);
  }

  // Sort contacts — guru selalu paling atas untuk siswa, lainnya by last message
  const sortContacts = (list) => {
    return [...list].sort((a, b) => {
      // Guru selalu paling atas (untuk siswa)
      if (!isGuru) {
        if (a.role === "guru") return -1;
        if (b.role === "guru") return 1;
      }
      const la = store.getLastMsg(user.id, a.id);
      const lb = store.getLastMsg(user.id, b.id);
      if (la && lb) return lb.ts - la.ts;
      if (la) return -1;
      if (lb) return 1;
      return a.nama.localeCompare(b.nama);
    });
  };

  if (activeContact) {
    return <ChatThread user={user} contact={activeContact} store={store} onBack={() => setActiveContact(null)} />;
  }

  const ContactItem = ({ c }) => {
    const last = store.getLastMsg(user.id, c.id);
    const thread = store.getThread(user.id, c.id);
    const unread = thread.filter(m => m.toId === user.id && !m.read).length;
    return (
      <div className={`chat-item ${unread > 0 ? "unread" : ""}`} onClick={() => setActiveContact(c)}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <UserAvatar userId={c.id} name={c.nama} size="lg" store={store} showOnline={true} />
          {unread > 0 && <div style={{ position: "absolute", top: -2, right: -2, width: 18, height: 18, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", fontFamily: "var(--mono)", border: "2px solid var(--surface)" }}>{unread > 9 ? "9+" : unread}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: unread > 0 ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nama}</span>
              {c.role === "guru" && <span style={{ fontSize: 10, background: "var(--accent-soft)", color: "var(--accent-2)", borderRadius: 99, padding: "1px 6px", fontWeight: 600 }}>Guru</span>}
              {c.role !== "guru" && <LevelBadge poin={(store.getStats(c.id).poin) || 0} size="xs" showName={false} />}
            </div>
            {last && <div style={{ fontSize: 11, color: "var(--ink-4)", flexShrink: 0 }}>{fmtTime(last.ts)}</div>}
          </div>
          <div style={{ fontSize: 12, color: unread > 0 ? "var(--ink-2)" : "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2, fontWeight: unread > 0 ? 600 : 400 }}>
            {store.isOnline(c.id)
              ? <span style={{ color: "#0d9488", fontWeight: 500, fontSize: 11 }}>Online</span>
              : last ? (last.fromId === user.id ? `Kamu: ${last.text}` : last.text)
                : (() => { const ls = fmtLastSeen(store.getLastSeen(c.id)); return ls ? <span style={{ fontSize: 11 }}>Terakhir online {ls}</span> : (c.role === "guru" ? "IPA & Informatika" : `Kelas ${c.jenjang}`); })()
            }
          </div>
        </div>
        {unread === 0 && <I n="chevR" s={14} style={{ color: "var(--ink-4)", flexShrink: 0 }} />}
      </div>
    );
  };

  // Guru: filter by tab kelas
  const filtered = isGuru
    ? sortContacts(contacts.filter(c => c.jenjang === tab))
    : sortContacts(contacts);

  return (
    <div className="chat-wrap">
      {(showBcModal || editBc) && (
        <BroadcastModal
          existing={editBc}
          onSave={handleSaveBc}
          onClose={() => { setShowBcModal(false); setEditBc(null); }}
        />
      )}
      {isGuru && (
        <div className="topbar">
          <div style={{ width: 36 }} />
          <div className="topbar-title">Pesan</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowBcModal(true)} style={{ fontSize: 11, padding: "5px 10px" }}><I n="send" s={12} /> Broadcast</button>
        </div>
      )}
      <div className="page" style={{ paddingBottom: 0 }}>
        <div className="dt">
          <div><h1>Pesan</h1><p>{isGuru ? "Chat dengan semua siswa" : "Chat dengan guru dan teman sekelas"}</p></div>
          {isGuru && <button className="btn btn-primary btn-sm" onClick={() => setShowBcModal(true)}><I n="send" s={13} /> Broadcast</button>}
        </div>

        {/* Broadcast box */}
        {broadcasts.length > 0 && (
          <BroadcastBox
            broadcasts={broadcasts}
            isGuru={isGuru}
            onEdit={b => { setEditBc(b); }}
            onDelete={id => store.deleteBroadcast(id)}
          />
        )}

        {isGuru && (
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button className={`tab ${tab === "VII" ? "active" : ""}`} onClick={() => setTab("VII")}>Kelas VII</button>
            <button className={`tab ${tab === "VIII" ? "active" : ""}`} onClick={() => setTab("VIII")}>Kelas VIII</button>
          </div>
        )}
      </div>
      <div className="chat-list" style={{ marginTop: 8 }}>
        <Card pad="none" style={{ overflow: "hidden", margin: "0 16px" }}>
          {filtered.length === 0
            ? <div className="empty" style={{ padding: 32 }}>Belum ada siswa di kelas ini.</div>
            : filtered.map(c => <ContactItem key={c.id} c={c} />)
          }
        </Card>
      </div>
    </div>
  );
}
