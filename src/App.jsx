import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ← Cambiá este PIN por el que quieras
const ADMIN_PIN = "1234";
// Sesión dura 4 horas
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000;

const LOCATIONS = ["LDM", "LZA", "LMVO", "LMVD"];
const TYPES = ["Eléctrico", "Plomería", "Carpintería", "Limpieza", "Equipamiento", "Infraestructura", "Otro"];
const PRIORITIES = ["Urgente", "Alta", "Media", "Baja"];
const STATUSES = ["Abierto", "En Proceso", "Resuelto", "Cerrado"];

const priorityStyle = {
  Urgente: { bg: "#FCEBEB", color: "#A32D2D", border: "#F09595" },
  Alta:    { bg: "#FFF3E0", color: "#E65100", border: "#FFCC80" },
  Media:   { bg: "#E3F2FD", color: "#1565C0", border: "#90CAF9" },
  Baja:    { bg: "#F3F3F3", color: "#555",    border: "#CCC"    },
};
const statusStyle = {
  Abierto:      { bg: "#EAF3DE", color: "#3B6D11", border: "#C0DD97" },
  "En Proceso": { bg: "#FFF8E1", color: "#F57F17", border: "#FFE082" },
  Resuelto:     { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
  Cerrado:      { bg: "#F5F5F5", color: "#757575", border: "#E0E0E0" },
};

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(() => {
    const stored = sessionStorage.getItem("admin_until");
    return stored && Date.now() < parseInt(stored);
  });

  const login = () => {
    const until = Date.now() + SESSION_DURATION_MS;
    sessionStorage.setItem("admin_until", String(until));
    setIsAdmin(true);
  };

  const logout = () => {
    sessionStorage.removeItem("admin_until");
    setIsAdmin(false);
  };

  return { isAdmin, login, logout };
}

async function uploadFiles(files, ticketId) {
  const urls = [];
  for (const file of files) {
    const ext  = file.name.split(".").pop();
    const path = `${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("ticket-attachments").upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
  }
  return urls;
}

function isImage(url) {
  return /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(url);
}

function FilePreview({ url, onRemove }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {isImage(url) ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #E0E0E0", display: "block" }} />
        </a>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
          width: 72, height: 72, borderRadius: 8, border: "1px solid #E0E0E0",
          background: "#F7F7F8", fontSize: 10, color: "#666", textDecoration: "none", gap: 4,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          archivo
        </a>
      )}
      {onRemove && (
        <button onClick={onRemove} style={{
          position: "absolute", top: -6, right: -6, width: 18, height: 18,
          borderRadius: "50%", border: "none", background: "#E53E3E", color: "#fff",
          cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
        }}>✕</button>
      )}
    </div>
  );
}

function UploadZone({ files, setFiles }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);
  const handleFiles = (incoming) => setFiles(prev => [...prev, ...Array.from(incoming).filter(f => f.size < 10 * 1024 * 1024)]);
  return (
    <div>
      <input ref={inputRef} type="file" multiple accept="image/*,application/pdf,.doc,.docx"
        style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
      <div onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${dragging ? "#4F46E5" : "#E0E0E0"}`, borderRadius: 10,
          padding: "14px", textAlign: "center", cursor: "pointer", color: "#888",
          background: dragging ? "#F5F4FF" : "transparent", transition: "all 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "#4F46E5"}
        onMouseLeave={e => { if (!dragging) e.currentTarget.style.borderColor = "#E0E0E0"; }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
          Subir archivos o fotos · máx 10MB
        </div>
      </div>
      {files.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: "relative" }}>
              {f.type.startsWith("image/") ? (
                <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #E0E0E0" }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 8, border: "1px solid #E0E0E0", background: "#F7F7F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
              )}
              <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} style={{
                position: "absolute", top: -6, right: -6, width: 18, height: 18,
                borderRadius: "50%", border: "none", background: "#E53E3E", color: "#fff",
                cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
              }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ label, type = "status" }) {
  const s = type === "status" ? statusStyle[label] : priorityStyle[label];
  if (!s) return null;
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{label}</span>;
}

const IPin    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const ICal    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IUser   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IChev   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IBack   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IX      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IDash   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const ITicket = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>;
const IPlus   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const ILock   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IOpen   = ({c}) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IClock  = ({c}) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const ICheck  = ({c}) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IClosed = ({c}) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
const ISearch = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

function fromDb(t) {
  const days = Math.floor((Date.now() - new Date(t.created_at)) / 86400000);
  return { ...t, daysAgo: days, reportedBy: t.reported_by, attachments: t.attachments || [], notes: t.notes || [] };
}

const fieldInp = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E0E0E0", fontSize: 14, boxSizing: "border-box", outline: "none", color: "#333", background: "#fff" };
const fieldSel = { ...fieldInp, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" };
const lbl = (txt, required) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
    {txt}{required && <span style={{ color: "#E24B4A", marginLeft: 3 }}>*</span>}
  </label>
);

/* ── PIN Modal ── */
function PinModal({ onSuccess, onClose }) {
  const [pin, setPin]     = useState("");
  const [error, setError] = useState(false);
  const inputRef          = useRef();

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  const handleSubmit = () => {
    if (pin === ADMIN_PIN) { onSuccess(); }
    else { setError(true); setPin(""); setTimeout(() => setError(false), 1500); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F0EEFF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#4F46E5" }}>
          <ILock />
        </div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a1a", marginBottom: 6 }}>Acceso de administrador</div>
        <div style={{ fontSize: 14, color: "#888", marginBottom: 24 }}>Ingresá el PIN para editar este ticket</div>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="PIN"
          maxLength={8}
          style={{
            ...fieldInp,
            textAlign: "center", fontSize: 24, letterSpacing: 8, marginBottom: 12,
            border: `2px solid ${error ? "#E53E3E" : "#E0E0E0"}`,
            transition: "border-color 0.2s",
          }}
        />
        {error && <div style={{ color: "#E53E3E", fontSize: 13, marginBottom: 10 }}>PIN incorrecto</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #DDD", background: "#fff", color: "#555", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!pin} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#4F46E5", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: pin ? 1 : 0.5 }}>Entrar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Notes section ── */
function NotesSection({ notes, onAddNote }) {
  const [text, setText]     = useState("");
  const [author, setAuthor] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setAdding(true);
    await onAddNote({ text: text.trim(), author: author.trim() || "Anónimo", created_at: new Date().toISOString() });
    setText("");
    setAdding(false);
  };

  return (
    <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 16, marginTop: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
        Notas {notes.length > 0 && `(${notes.length})`}
      </div>
      {notes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {[...notes].reverse().map((n, i) => (
            <div key={i} style={{ background: "#FAFAFA", borderRadius: 8, padding: "10px 12px", border: "1px solid #F0F0F0" }}>
              <div style={{ fontSize: 14, color: "#333", lineHeight: 1.5, marginBottom: 6 }}>{n.text}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#4F46E5" }}>{n.author}</span>
                <span style={{ fontSize: 11, color: "#BBB" }}>
                  {new Date(n.created_at).toLocaleDateString("es-UY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ background: "#F8F7FF", borderRadius: 10, padding: "12px", border: "1px solid #E0DEFF" }}>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Escribí una nota..."
          style={{ ...fieldInp, height: 72, resize: "none", fontFamily: "inherit", background: "#fff", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Tu nombre (opcional)"
            style={{ ...fieldInp, flex: 1, padding: "7px 10px", fontSize: 13 }} />
          <button onClick={handleAdd} disabled={adding || !text.trim()} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", background: "#4F46E5", color: "#fff",
            cursor: "pointer", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
            opacity: adding || !text.trim() ? 0.6 : 1,
          }}>{adding ? "..." : "Agregar"}</button>
        </div>
      </div>
    </div>
  );
}

function TicketRow({ ticket, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB",
      padding: "14px 16px", cursor: "pointer",
      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
          <Badge label={ticket.status} type="status" />
          <Badge label={ticket.priority} type="priority" />
        </div>
        <div style={{ fontWeight: 600, fontSize: 15, color: "#1a1a1a", marginBottom: 3 }}>{ticket.title}</div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticket.description}</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#888" }}><IPin />{ticket.location}</span>
          {ticket.reportedBy && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#888" }}><IUser />{ticket.reportedBy}</span>}
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#888" }}><ICal />{ticket.daysAgo === 0 ? "hoy" : `hace ${ticket.daysAgo} días`}</span>
          {ticket.attachments?.length > 0 && <span style={{ fontSize: 12, color: "#888" }}>📎 {ticket.attachments.length}</span>}
          {ticket.notes?.length > 0 && <span style={{ fontSize: 12, color: "#888" }}>💬 {ticket.notes.length}</span>}
        </div>
      </div>
      <div style={{ color: "#CCC", flexShrink: 0, marginTop: 2 }}><IChev /></div>
    </div>
  );
}

/* ── Ticket Modal ── */
function TicketModal({ ticket, onClose, onUpdate, onDelete, isMobile, isAdmin, onRequestAdmin }) {
  const [form, setForm] = useState({
    title: ticket.title || "", description: ticket.description || "",
    location: ticket.location || "", priority: ticket.priority || "Media",
    status: ticket.status || "Abierto", type: ticket.type || "",
    reportedBy:  ticket.reportedBy || "",
    deadline: ticket.deadline || "",
  });
  const [existingAttachments, setExistingAttachments] = useState(ticket.attachments || []);
  const [notes, setNotes]   = useState(ticket.notes || []);
  const [newFiles, setNewFiles] = useState([]);
  const [saving, setSaving]     = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    let attachments = existingAttachments;
    if (newFiles.length > 0) {
      const uploaded = await uploadFiles(newFiles, ticket.id);
      attachments = [...attachments, ...uploaded];
    }
    await supabase.from("tickets").update({
      title: form.title, description: form.description, location: form.location,
      priority: form.priority, status: form.status, type: form.type,
      reported_by: form.reportedBy || null,
      deadline: form.deadline || null, attachments, notes,
    }).eq("id", ticket.id);
    setSaving(false);
    onUpdate({ ...ticket, ...form, reportedBy: form.reportedBy, attachments, notes });
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar este ticket? Esta acción no se puede deshacer.")) return;
    await supabase.from("tickets").delete().eq("id", ticket.id);
    onDelete(ticket.id);
    onClose();
  };

  const handleAddNote = async (note) => {
    const newNotes = [...notes, note];
    setNotes(newNotes);
    await supabase.from("tickets").update({ notes: newNotes }).eq("id", ticket.id);
    onUpdate({ ...ticket, ...form, reportedBy: form.reportedBy, notes: newNotes });
  };

  const readOnly = !isAdmin;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
      display: "flex", alignItems: isMobile ? "flex-end" : "center",
      justifyContent: "center", padding: isMobile ? 0 : 24,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: isMobile ? "16px 16px 0 0" : 16,
        width: "100%", maxWidth: isMobile ? "100%" : 600,
        maxHeight: isMobile ? "92vh" : "92vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      }}>
        {/* Mobile drag handle */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#DDD" }} />
          </div>
        )}
        {/* Header */}
        <div style={{ padding: isMobile ? "10px 16px 12px" : "18px 20px 14px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isMobile && (
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: "4px 8px 4px 0", display: "flex", alignItems: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            )}
            <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a1a" }}>Ticket #{ticket.id}</div>
            {readOnly && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#888", background: "#F5F5F5", padding: "3px 8px", borderRadius: 20, border: "1px solid #E0E0E0" }}>
                <ILock /> Solo lectura
              </span>
            )}
            {isAdmin && (
              <span style={{ fontSize: 11, color: "#4F46E5", background: "#F0EEFF", padding: "3px 8px", borderRadius: 20, border: "1px solid #E0DEFF" }}>
                ✓ Admin
              </span>
            )}
          </div>
          {!isMobile && <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 4 }}><IX /></button>}
        </div>

        <div style={{ padding: "20px" }}>
          {/* Título */}
          <div style={{ marginBottom: 14 }}>
            {lbl("Problema")}
            {readOnly
              ? <div style={{ ...fieldInp, background: "#FAFAFA", color: "#333", fontWeight: 600, fontSize: 15 }}>{form.title}</div>
              : <input value={form.title} onChange={e => set("title", e.target.value)} style={{ ...fieldInp, fontWeight: 600, fontSize: 15 }} />
            }
          </div>

          {/* Descripción */}
          <div style={{ marginBottom: 14 }}>
            {lbl("Descripción")}
            {readOnly
              ? <div style={{ ...fieldInp, background: "#FAFAFA", minHeight: 60, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{form.description || <span style={{ color: "#CCC" }}>Sin descripción</span>}</div>
              : <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Sin descripción..." style={{ ...fieldInp, height: 80, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
            }
          </div>

          {/* Estado + Prioridad */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              {lbl("Estado")}
              {readOnly
                ? <div style={{ ...fieldInp, background: "#FAFAFA" }}><Badge label={form.status} type="status" /></div>
                : <select value={form.status} onChange={e => set("status", e.target.value)} style={fieldSel}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
              }
            </div>
            <div>
              {lbl("Prioridad")}
              {readOnly
                ? <div style={{ ...fieldInp, background: "#FAFAFA" }}><Badge label={form.priority} type="priority" /></div>
                : <select value={form.priority} onChange={e => set("priority", e.target.value)} style={fieldSel}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select>
              }
            </div>
          </div>

          {/* Ubicación + Tipo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              {lbl("Ubicación")}
              {readOnly
                ? <div style={{ ...fieldInp, background: "#FAFAFA" }}>{form.location || "—"}</div>
                : <select value={form.location} onChange={e => set("location", e.target.value)} style={fieldSel}><option value="">Seleccionar</option>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select>
              }
            </div>
            <div>
              {lbl("Tipo")}
              {readOnly
                ? <div style={{ ...fieldInp, background: "#FAFAFA" }}>{form.type || "—"}</div>
                : <select value={form.type} onChange={e => set("type", e.target.value)} style={fieldSel}><option value="">Seleccionar</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
              }
            </div>
          </div>

          {/* Reportado por + Fecha + Creado */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              {lbl("Reportado por")}
              {readOnly
                ? <div style={{ ...fieldInp, background: "#FAFAFA" }}>{form.reportedBy || "—"}</div>
                : <input value={form.reportedBy} onChange={e => set("reportedBy", e.target.value)} placeholder="Nombre..." style={fieldInp} />
              }
            </div>
            <div>
              {lbl("Creado")}
              <div style={{ ...fieldInp, background: "#F7F7F8", color: "#888", cursor: "default" }}>hace {ticket.daysAgo} días</div>
            </div>
            <div>
              {lbl("Fecha límite")}
              {readOnly
                ? <div style={{ ...fieldInp, background: "#FAFAFA" }}>{form.deadline || "—"}</div>
                : <input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} style={fieldInp} />
              }
            </div>
          </div>

          {/* Archivos */}
          {existingAttachments.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {lbl("Archivos adjuntos")}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {existingAttachments.map(url => (
                  <FilePreview key={url} url={url} onRemove={isAdmin ? () => setExistingAttachments(prev => prev.filter(u => u !== url)) : undefined} />
                ))}
              </div>
            </div>
          )}
          {isAdmin && (
            <div style={{ marginBottom: 14 }}>
              {lbl(existingAttachments.length > 0 ? "Agregar más archivos" : "Archivos adjuntos")}
              <UploadZone files={newFiles} setFiles={setNewFiles} />
            </div>
          )}

          {/* Botón admin o guardar */}
          {readOnly ? (
            <div style={{ marginBottom: 20 }}>
              <button onClick={onRequestAdmin} style={{
                width: "100%", padding: "11px", borderRadius: 8, border: "1px dashed #C0B7F5",
                background: "#F8F7FF", color: "#4F46E5", cursor: "pointer", fontSize: 14, fontWeight: 500,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <ILock /> Ingresar como administrador para editar
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap" }}>
              <button onClick={handleDelete} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #FECACA", background: "#FFF5F5", color: "#E53E3E", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                🗑 Eliminar
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #DDD", background: "#fff", color: "#555", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving || !form.title.trim()} style={{
                  padding: "10px 24px", borderRadius: 8, border: "none",
                  background: "#4F46E5", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600,
                  opacity: saving || !form.title.trim() ? 0.6 : 1,
                }}>{saving ? "Guardando..." : "Guardar cambios"}</button>
              </div>
            </div>
          )}

          {/* Notas — siempre visibles para todos */}
          <NotesSection notes={notes} onAddNote={handleAddNote} />
        </div>
      </div>
    </div>
  );
}

function Dashboard({ tickets, onNavigate, onOpenTicket, isMobile, loading }) {
  const counts = {
    Abierto: tickets.filter(t => t.status === "Abierto").length,
    "En Proceso": tickets.filter(t => t.status === "En Proceso").length,
    Resuelto: tickets.filter(t => t.status === "Resuelto").length,
    Cerrado: tickets.filter(t => t.status === "Cerrado").length,
  };
  const recent = tickets.filter(t => t.status !== "Cerrado").slice(0, 5);
  const stats = [
    { label: "Abiertos",   val: counts["Abierto"],    icon: <IOpen c="#1565C0" /> },
    { label: "En Proceso", val: counts["En Proceso"], icon: <IClock c="#F57F17" /> },
    { label: "Resueltos",  val: counts["Resuelto"],   icon: <ICheck c="#2E7D32" /> },
    { label: "Cerrados",   val: counts["Cerrado"],    icon: <IClosed c="#9E9E9E" /> },
  ];
  return (
    <div style={{ padding: isMobile ? "20px 16px" : "40px 48px", overflowY: "auto", paddingBottom: isMobile ? "80px" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Dashboard</h1>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: 14 }}>Resumen general de tickets</p>
        </div>
        {!isMobile && (
          <button onClick={() => onNavigate("new")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "none", borderRadius: 8, background: "#4F46E5", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            <IPlus />Nuevo Ticket
          </button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", padding: "16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div>{s.icon}</div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a1a", lineHeight: 1 }}>{loading ? "…" : s.val}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", padding: isMobile ? "16px" : "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            <span style={{ fontWeight: 600, fontSize: 15, color: "#1a1a1a" }}>Tickets Activos Recientes</span>
          </div>
          <button onClick={() => onNavigate("tickets")} style={{ background: "none", border: "none", cursor: "pointer", color: "#4F46E5", fontSize: 13, fontWeight: 500 }}>Ver todos →</button>
        </div>
        {loading
          ? <div style={{ textAlign: "center", color: "#CCC", padding: "32px 0" }}>Cargando...</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{recent.map(t => <TicketRow key={t.id} ticket={t} onClick={() => onOpenTicket(t)} />)}</div>
        }
      </div>
    </div>
  );
}

function TicketsList({ tickets, onUpdate, onNavigate, isMobile, loading, isAdmin, onRequestAdmin }) {
  const [search, setSearch]           = useState("");
  const [filterStatus, setFS]         = useState("Todos");
  const [filterPriority, setFP]       = useState("Todos");
  const [filterLocation, setFL]       = useState("Todas");
  const [selectedTicket, setSel]      = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => tickets.filter(t => {
    const ms  = !search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.reportedBy || "").toLowerCase().includes(search.toLowerCase());
    const mst = filterStatus === "Todos"   || t.status === filterStatus;
    const mp  = filterPriority === "Todos" || t.priority === filterPriority;
    const ml  = filterLocation === "Todas" || t.location === filterLocation;
    return ms && mst && mp && ml;
  }), [tickets, search, filterStatus, filterPriority, filterLocation]);

  const selBase = { padding: "8px 12px", borderRadius: 8, border: "1px solid #E0E0E0", background: "#fff", fontSize: 13, color: "#444", cursor: "pointer" };

  return (
    <div style={{ padding: isMobile ? "16px" : "40px 48px", overflowY: "auto", paddingBottom: isMobile ? "80px" : undefined }}>
      {selectedTicket && (
        <TicketModal ticket={selectedTicket} isMobile={isMobile} isAdmin={isAdmin} onRequestAdmin={onRequestAdmin}
          onClose={() => setSel(null)}
          onUpdate={u => { onUpdate(u); setSel(u); }}
          onDelete={id => { onUpdate({ id, _deleted: true }); setSel(null); }} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Tickets</h1>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: 14 }}>{filtered.length} ticket{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        {!isMobile && (
          <button onClick={() => onNavigate("new")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", border: "none", borderRadius: 8, background: "#4F46E5", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
            <IPlus />Nuevo Ticket
          </button>
        )}
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #F0F0F0" }}>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#AAA" }}><ISearch /></div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tickets..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #E0E0E0", fontSize: 14, boxSizing: "border-box", outline: "none" }} />
          </div>
          {isMobile ? (
            <>
              <button onClick={() => setShowFilters(f => !f)} style={{ fontSize: 13, color: "#4F46E5", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500 }}>
                {showFilters ? "▲ Ocultar filtros" : "▼ Mostrar filtros"}
              </button>
              {showFilters && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                  <select value={filterStatus}   onChange={e => setFS(e.target.value)} style={{ ...selBase, width: "100%" }}><option value="Todos">Todos los estados</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
                  <select value={filterPriority} onChange={e => setFP(e.target.value)} style={{ ...selBase, width: "100%" }}><option value="Todos">Todas las prioridades</option>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select>
                  <select value={filterLocation} onChange={e => setFL(e.target.value)} style={{ ...selBase, width: "100%" }}><option value="Todas">Todas las ubicaciones</option>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <select value={filterStatus}   onChange={e => setFS(e.target.value)} style={selBase}><option value="Todos">Todos los estados</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
              <select value={filterPriority} onChange={e => setFP(e.target.value)} style={selBase}><option value="Todos">Todas las prioridades</option>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select>
              <select value={filterLocation} onChange={e => setFL(e.target.value)} style={selBase}><option value="Todas">Todas las ubicaciones</option>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select>
            </div>
          )}
        </div>
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {loading
            ? <div style={{ textAlign: "center", color: "#CCC", padding: "40px 0" }}>Cargando...</div>
            : filtered.length === 0
              ? <div style={{ textAlign: "center", color: "#AAA", padding: "40px 0", fontSize: 15 }}>No se encontraron tickets</div>
              : filtered.map(t => <TicketRow key={t.id} ticket={t} onClick={() => setSel(t)} />)
          }
        </div>
      </div>
    </div>
  );
}

function NewTicket({ onNavigate, onCreateTicket, isMobile }) {
  const [form, setForm] = useState({ title: "", description: "", location: "", priority: "Media", type: "", deadline: "", reportedBy: "" });
  const [files, setFiles]   = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.title.trim())      e.title = true;
    if (!form.location)          e.location = true;
    if (!form.type)              e.type = true;
    if (!form.reportedBy.trim()) e.reportedBy = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const { data, error } = await supabase.from("tickets").insert({
      title: form.title, description: form.description, location: form.location,
      priority: form.priority, type: form.type, deadline: form.deadline || null,
      reported_by: form.reportedBy, status: "Abierto", attachments: [], notes: [],
    }).select().single();
    if (!error && data) {
      let attachments = [];
      if (files.length > 0) {
        attachments = await uploadFiles(files, data.id);
        await supabase.from("tickets").update({ attachments }).eq("id", data.id);
      }
      onCreateTicket(fromDb({ ...data, attachments }));
    }
    setSaving(false);
    onNavigate("tickets");
  };

  const inp = (err) => ({ ...fieldInp, border: `1px solid ${err ? "#E24B4A" : "#E0E0E0"}` });

  return (
    <div style={{ padding: isMobile ? "16px" : "40px 48px", overflowY: "auto", paddingBottom: isMobile ? "80px" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => onNavigate("tickets")} style={{ background: "none", border: "none", cursor: "pointer", color: "#666", display: "flex", alignItems: "center", padding: 4 }}><IBack /></button>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Nuevo Ticket</h1>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Reporta un problema o solicitud</p>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EBEBEB", padding: isMobile ? "20px" : "32px" }}>
        <div style={{ marginBottom: 16, padding: "14px 16px", background: "#F8F7FF", borderRadius: 10, border: "1px solid #E0DEFF" }}>
          {lbl("Reportado por", true)}
          <input value={form.reportedBy} onChange={e => set("reportedBy", e.target.value)} placeholder="Tu nombre completo" style={inp(errors.reportedBy)} />
          {errors.reportedBy && <div style={{ color: "#E24B4A", fontSize: 12, marginTop: 4 }}>Este campo es requerido</div>}
        </div>
        <div style={{ marginBottom: 14 }}>
          {lbl("Problema", true)}
          <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Describe brevemente el problema" style={inp(errors.title)} />
          {errors.title && <div style={{ color: "#E24B4A", fontSize: 12, marginTop: 4 }}>Este campo es requerido</div>}
        </div>
        <div style={{ marginBottom: 14 }}>
          {lbl("Descripción")}
          <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe el problema con detalle..."
            style={{ ...inp(false), height: 90, resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            {lbl("Ubicación", true)}
            <select value={form.location} onChange={e => set("location", e.target.value)} style={{ ...fieldSel, border: `1px solid ${errors.location ? "#E24B4A" : "#E0E0E0"}` }}>
              <option value="">Seleccionar ubicación</option>
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
            {errors.location && <div style={{ color: "#E24B4A", fontSize: 12, marginTop: 4 }}>Este campo es requerido</div>}
          </div>
          <div>
            {lbl("Prioridad")}
            <select value={form.priority} onChange={e => set("priority", e.target.value)} style={fieldSel}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            {lbl("Tipo", true)}
            <select value={form.type} onChange={e => set("type", e.target.value)} style={{ ...fieldSel, border: `1px solid ${errors.type ? "#E24B4A" : "#E0E0E0"}` }}>
              <option value="">Seleccionar tipo</option>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            {errors.type && <div style={{ color: "#E24B4A", fontSize: 12, marginTop: 4 }}>Este campo es requerido</div>}
          </div>
          <div>
            {lbl("Fecha límite")}
            <input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} style={fieldInp} />
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          {lbl("Archivos adjuntos")}
          <UploadZone files={files} setFiles={setFiles} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => onNavigate("tickets")} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #DDD", background: "#fff", color: "#555", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ flex: isMobile ? 1 : undefined, padding: "10px 24px", borderRadius: 8, border: "none", background: "#4F46E5", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Creando..." : "Crear Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView]          = useState("dashboard");
  const [tickets, setTickets]    = useState([]);
  const [loading, setLoading]    = useState(true);
  const [selectedTicket, setSel] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const isMobile                 = useIsMobile();
  const { isAdmin, login, logout } = useAdmin();

  useEffect(() => {
    supabase.from("tickets").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setTickets(data.map(fromDb)); setLoading(false); });
  }, []);

  const updateTicket = u => setTickets(ts => ts.map(t => t.id === u.id ? u : t));
  const createTicket = t => setTickets(ts => [t, ...ts]);

  const handlePinSuccess = () => { login(); setShowPinModal(false); };
  const handleRequestAdmin = () => setShowPinModal(true);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <IDash /> },
    { id: "tickets",   label: "Tickets",   icon: <ITicket /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100vh", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#F7F7F8" }}>
      {showPinModal && <PinModal onSuccess={handlePinSuccess} onClose={() => setShowPinModal(false)} />}

      {selectedTicket && (
        <TicketModal ticket={selectedTicket} isMobile={isMobile} isAdmin={isAdmin} onRequestAdmin={handleRequestAdmin}
          onClose={() => setSel(null)}
          onUpdate={u => { updateTicket(u); setSel(u); }}
          onDelete={id => { setTickets(ts => ts.filter(t => t.id !== id)); setSel(null); }} />
      )}

      {!isMobile && (
        <div style={{ width: 200, background: "#fff", borderRight: "1px solid #EBEBEB", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #F5F5F5" }}>
            <img src="/favicon.png" alt="LIFE" style={{ height: 28, display: "block" }} />
            <div style={{ fontSize: 11, color: "#AAA", marginTop: 6 }}>Mesa de Ayuda · Sistema de Tickets</div>
          </div>
          <nav style={{ flex: 1, padding: "10px 10px 0" }}>
            {[...navItems, { id: "new", label: "Nuevo Ticket", icon: <IPlus /> }].map(item => (
              <button key={item.id} onClick={() => setView(item.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                borderRadius: 8, border: "none", background: view === item.id ? "#4F46E5" : "none",
                color: view === item.id ? "#fff" : item.id === "new" ? "#888" : "#555",
                cursor: "pointer", fontSize: 14, fontWeight: view === item.id ? 600 : 400,
                marginBottom: 2, textAlign: "left", transition: "background 0.15s",
              }}
                onMouseEnter={e => { if (view !== item.id) e.currentTarget.style.background = "#F5F5F5"; }}
                onMouseLeave={e => { if (view !== item.id) e.currentTarget.style.background = "none"; }}
              >{item.icon}{item.label}</button>
            ))}
          </nav>
          {/* Admin status in sidebar */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid #F5F5F5" }}>
            {isAdmin ? (
              <button onClick={logout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 8, border: "1px solid #E0DEFF", background: "#F0EEFF", color: "#4F46E5", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                <ILock /> Admin activo · Salir
              </button>
            ) : (
              <button onClick={() => setShowPinModal(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 8, border: "1px solid #E0E0E0", background: "none", color: "#999", cursor: "pointer", fontSize: 12 }}>
                <ILock /> Acceso admin
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {isMobile && (
          <div style={{ background: "#fff", borderBottom: "1px solid #EBEBEB", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <img src="/favicon.png" alt="LIFE" style={{ height: 24 }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {isAdmin
                ? <button onClick={logout} style={{ fontSize: 11, color: "#4F46E5", background: "#F0EEFF", border: "1px solid #E0DEFF", borderRadius: 20, padding: "4px 10px", cursor: "pointer" }}>✓ Admin</button>
                : <button onClick={() => setShowPinModal(true)} style={{ fontSize: 11, color: "#999", background: "none", border: "1px solid #E0E0E0", borderRadius: 20, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><ILock />Admin</button>
              }
              <button onClick={() => setView("new")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "none", borderRadius: 8, background: "#4F46E5", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                <IPlus />Nuevo
              </button>
            </div>
          </div>
        )}
        <div style={{ flex: 1, overflow: "auto" }}>
          {view === "dashboard" && <Dashboard tickets={tickets} onNavigate={setView} onOpenTicket={setSel} isMobile={isMobile} loading={loading} />}
          {view === "tickets"   && <TicketsList tickets={tickets} onUpdate={updateTicket} onNavigate={setView} isMobile={isMobile} loading={loading} isAdmin={isAdmin} onRequestAdmin={handleRequestAdmin} />}
          {view === "new"       && <NewTicket onNavigate={setView} onCreateTicket={createTicket} isMobile={isMobile} />}
        </div>
      </div>

      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #EBEBEB", display: "flex", zIndex: 500, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 4, padding: "10px 0", border: "none", background: "none", cursor: "pointer",
              color: view === item.id ? "#4F46E5" : "#999", fontSize: 11, fontWeight: view === item.id ? 600 : 400,
              borderTop: view === item.id ? "2px solid #4F46E5" : "2px solid transparent",
            }}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
