import { router } from '@inertiajs/react';
import {
    AlertCircle, Calendar, CheckCircle2, ChevronDown, ChevronUp,
    Clock, FileText, PenLine, Save, X,
} from 'lucide-react';
import axios from 'axios';
import { useEffect, useState } from 'react';

/* ── Types ─────────────────────────────────────────────────────────────── */
export interface GeneralVisit {
    id: number;
    visit_date: string;
    data: Record<string, unknown>;
    created_at: string;
}

interface Props {
    patientId: number;
    visits: GeneralVisit[];
    routePrefix: string;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmtDate(s: string) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s.slice(0, 10);
    return d.toLocaleDateString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

const INP: React.CSSProperties = {
    width: '100%', border: '1px solid var(--border)', borderRadius: 10,
    padding: '7px 10px', fontSize: 13, background: 'var(--background)',
    color: 'var(--foreground)', outline: 'none', boxSizing: 'border-box',
};

function Section({ title, children, color = '#2563eb' }: { title: string; children: React.ReactNode; color?: string }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 4, height: 18, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: 0.4 }}>{title}</span>
            </div>
            <div style={{ paddingLeft: 12 }}>{children}</div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   VISIT FORM
════════════════════════════════════════════════════════════════════════ */
function VisitForm({ patientId, routePrefix, visit, onClose }: {
    patientId: number;
    routePrefix: string;
    visit?: GeneralVisit;
    onClose: () => void;
}) {
    const today = new Date().toISOString().slice(0, 10);
    const initData = (visit?.data ?? {}) as Record<string, unknown>;

    const [visitDate, setVisitDate] = useState(visit?.visit_date?.slice(0, 10) ?? today);
    const [data, setData] = useState<Record<string, unknown>>(initData);
    const [processing, setProcessing] = useState(false);

    function set(k: string, v: unknown) { setData(d => ({ ...d, [k]: v })); }
    function str(k: string) { return (data[k] as string) ?? ''; }

    function handleSubmit() {
        setProcessing(true);
        const url = visit
            ? `${routePrefix}/general-visits/${visit.id}`
            : `${routePrefix}/general-visits`;
        const method = visit ? 'put' : 'post';
        router[method](url, { visit_date: visitDate, data } as any, {
            preserveScroll: true,
            onSuccess: () => { setProcessing(false); onClose(); },
            onError: () => setProcessing(false),
        });
    }

    return (
        <div style={{
            background: 'var(--card)', borderRadius: 20,
            border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 12,
        }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg,#2563eb,#0369a1)',
                padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={18} color="white" />
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>
                        {visit ? 'Үзлэг засах' : 'Ерөнхий эмчилгээ — шинэ'}
                    </span>
                </div>
                <button type="button" onClick={onClose}
                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '4px 6px', cursor: 'pointer' }}>
                    <X size={16} color="white" />
                </button>
            </div>

            <div style={{ padding: '18px 20px' }}>

                {/* Огноо */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', display: 'block', marginBottom: 6 }}>
                        ОГНОО
                    </label>
                    <div style={{ position: 'relative', maxWidth: 200 }}>
                        <Calendar size={14} color="var(--muted-foreground)"
                            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                        <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)}
                            style={{ ...INP, paddingLeft: 32 }} />
                    </div>
                </div>

                {/* Гомдол */}
                <Section title="ГОМДОЛ (Chief complaint)">
                    <textarea value={str('chief_complaint')} onChange={e => set('chief_complaint', e.target.value)}
                        rows={2} placeholder="Өвчтний гомдол..." style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }} />
                </Section>

                {/* Онош */}
                <Section title="ОНОШИЛГОО" color="#7c3aed">
                    <textarea value={str('diagnosis')} onChange={e => set('diagnosis', e.target.value)}
                        rows={2} placeholder="Онош..." style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }} />
                </Section>

                {/* Шүдний дугаар */}
                <Section title="ШҮДНИЙ ДУГААР" color="#059669">
                    <input type="text" value={str('tooth_numbers')} onChange={e => set('tooth_numbers', e.target.value)}
                        placeholder="Жнь: 16, 26, 36..." style={INP} />
                </Section>

                {/* Хийгдсэн эмчилгээ */}
                <Section title="ХИЙГДСЭН ЭМЧИЛГЭЭ" color="#dc2626">
                    <textarea value={str('treatment_done')} onChange={e => set('treatment_done', e.target.value)}
                        rows={4} placeholder="Хийгдсэн эмчилгээний дэлгэрэнгүй тайлбар..."
                        style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }} />
                </Section>

                {/* Хэрэглэсэн материал */}
                <Section title="ХЭРЭГЛЭСЭН МАТЕРИАЛ" color="#d97706">
                    <textarea value={str('materials')} onChange={e => set('materials', e.target.value)}
                        rows={2} placeholder="Хэрэглэсэн материал, эм..." style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }} />
                </Section>

                {/* Дараа сард хийгдэх эмчилгээ */}
                <Section title="ДАРАА САРД ХИЙГДЭХ ЭМЧИЛГЭЭ" color="#0891b2">
                    <textarea value={str('next_treatment')} onChange={e => set('next_treatment', e.target.value)}
                        rows={2} placeholder="Дараа сарын эмчилгээний төлөвлөгөө..."
                        style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }} />
                </Section>

                {/* Зөвлөгөө */}
                <Section title="ЗӨВЛӨГӨӨ" color="#16a34a">
                    <textarea value={str('advice')} onChange={e => set('advice', e.target.value)}
                        rows={2} placeholder="Зөвлөгөө..." style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }} />
                </Section>

                {/* Үзлэгийн хугацаа */}
                <Section title="ҮЗЛЭГИЙН ҮРГЭЛЖИЛСЭН ХУГАЦАА" color="#d97706">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[['arrival_time', 'Ирсэн цаг'], ['start_time', 'Эхэлсэн цаг'], ['end_time', 'Дууссан цаг']].map(([k, l]) => (
                            <div key={k}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>{l}</p>
                                <div style={{ position: 'relative' }}>
                                    <Clock size={12} color="var(--muted-foreground)"
                                        style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input type="time" value={str(k)} onChange={e => set(k, e.target.value)}
                                        style={{ ...INP, paddingLeft: 26 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Нийт дүн */}
                <Section title="НИЙТ ДҮН" color="#059669">
                    <input type="number" value={str('total_amount')} onChange={e => set('total_amount', e.target.value)}
                        placeholder="₮" style={{ ...INP, maxWidth: 200 }} />
                </Section>

                {/* Дараагийн ирэлт */}
                <Section title="ДАРААГИЙН ИРЭЛТ" color="#7c3aed">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>Огноо</p>
                            <input type="date" value={str('next_appt_date')} onChange={e => set('next_appt_date', e.target.value)} style={INP} />
                        </div>
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>Цаг</p>
                            <input type="time" value={str('next_appt_time')} onChange={e => set('next_appt_time', e.target.value)} style={INP} />
                        </div>
                    </div>
                </Section>

                {/* Submit */}
                <button type="button" onClick={handleSubmit} disabled={processing}
                    style={{
                        width: '100%', padding: '13px', borderRadius: 14, border: 'none',
                        background: processing ? '#999' : 'linear-gradient(135deg,#2563eb,#0369a1)',
                        color: 'white', fontSize: 14, fontWeight: 800, cursor: processing ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: processing ? 'none' : '0 6px 20px rgba(37,99,235,0.3)',
                    }}>
                    {processing
                        ? <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                        : <Save size={16} />}
                    Хадгалах
                </button>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   VISIT CARD
════════════════════════════════════════════════════════════════════════ */
function VisitCard({ visit, patientId, routePrefix }: { visit: GeneralVisit; patientId: number; routePrefix: string }) {
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing]   = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [reqSig, setReqSig]     = useState(false);

    function handleDelete() {
        if (!deleting) { setDeleting(true); return; }
        router.delete(`${routePrefix}/general-visits/${visit.id}`, { preserveScroll: true });
    }

    function handleRequestSignature(e: React.MouseEvent) {
        e.stopPropagation();
        setReqSig(true);
        router.post(`${routePrefix}/general-visits/${visit.id}/request-signature`, {}, {
            preserveScroll: true,
            onFinish: () => setReqSig(false),
        });
    }

    const d = (visit.data ?? {}) as Record<string, string | boolean | undefined>;
    const sigRequested = !!d.signature_requested_at;
    const sigSigned    = !!d.patient_signature;

    if (editing) {
        return <VisitForm patientId={patientId} routePrefix={routePrefix} visit={visit} onClose={() => setEditing(false)} />;
    }

    return (
        <div style={{
            background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)',
            overflow: 'hidden', marginBottom: 10,
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px',
                cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border)' : 'none',
            }} onClick={() => setExpanded(e => !e)}>
                <div style={{
                    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                    background: 'linear-gradient(135deg,#93c5fd,#2563eb)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <FileText size={18} color="white" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>
                            {fmtDate(visit.visit_date)}
                        </p>
                        {sigSigned ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', borderRadius: 99, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <CheckCircle2 size={10} /> Гарын үсэг зурагдсан
                            </span>
                        ) : sigRequested ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fffbeb', borderRadius: 99, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <PenLine size={10} /> Гарын үсэг хүлээгдэж байна
                            </span>
                        ) : null}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: '2px 0 0' }}>
                        Ерөнхий эмчилгээ · {d.chief_complaint ? String(d.chief_complaint).slice(0, 40) + (String(d.chief_complaint).length > 40 ? '…' : '') : d.treatment_done ? String(d.treatment_done).slice(0, 40) + '…' : 'Тэмдэглэл бичигдээгүй'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {!sigSigned && (
                        <button type="button" onClick={handleRequestSignature} disabled={reqSig}
                            style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: sigRequested ? '#fffbeb' : '#eff6ff', fontSize: 11, fontWeight: 700, color: sigRequested ? '#d97706' : '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <PenLine size={11} /> {sigRequested ? 'Дахин хүсэх' : 'Гарын үсэг хүсэх'}
                        </button>
                    )}
                    <button type="button" onClick={() => setEditing(true)}
                        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                        Засах
                    </button>
                    <button type="button" onClick={handleDelete}
                        style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: deleting ? '#dc2626' : '#fef2f2', fontSize: 11, fontWeight: 700, color: deleting ? 'white' : '#dc2626', cursor: 'pointer' }}>
                        {deleting ? 'Баталгаажуулах' : 'Устгах'}
                    </button>
                </div>
                {expanded ? <ChevronUp size={16} color="var(--muted-foreground)" /> : <ChevronDown size={16} color="var(--muted-foreground)" />}
            </div>

            {expanded && (
                <div style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        {[
                            ['Гомдол', 'chief_complaint'],
                            ['Оношилгоо', 'diagnosis'],
                            ['Шүдний дугаар', 'tooth_numbers'],
                            ['Хийгдсэн эмчилгээ', 'treatment_done'],
                            ['Материал', 'materials'],
                            ['Дараа сарын эмчилгээ', 'next_treatment'],
                            ['Зөвлөгөө', 'advice'],
                            ['Нийт дүн ₮', 'total_amount'],
                        ].map(([label, key]) => d[key] ? (
                            <div key={key}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</p>
                                <p style={{ fontSize: 13, color: 'var(--foreground)', margin: 0 }}>{String(d[key])}</p>
                            </div>
                        ) : null)}
                    </div>
                    {sigSigned && (
                        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <CheckCircle2 size={18} color="#16a34a" />
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', margin: 0 }}>Гарын үсэг зурагдсан</p>
                                {d.patient_signer_name && <p style={{ fontSize: 11, color: '#15803d', margin: '2px 0 0' }}>{String(d.patient_signer_name)}</p>}
                                {d.patient_signed_at && <p style={{ fontSize: 10, color: '#86efac', margin: '1px 0 0' }}>{new Date(String(d.patient_signed_at)).toLocaleString('mn-MN')}</p>}
                            </div>
                            {d.patient_signature && (
                                <img src={String(d.patient_signature)} alt="Гарын үсэг"
                                    style={{ height: 40, marginLeft: 'auto', border: '1px solid #bbf7d0', borderRadius: 8, background: 'white', padding: 4 }} />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════════════════════════════════════ */
export default function PatientGeneralVisitForm({ patientId, visits: initVisits, routePrefix }: Props) {
    const [showForm,    setShowForm]    = useState(false);
    const [localVisits, setLocalVisits] = useState<GeneralVisit[]>(initVisits);

    // Inertia props шинэчлэгдэхэд localVisits синхрончлох
    useEffect(() => {
        setLocalVisits(initVisits);
        setShowForm(false);
    }, [initVisits]);

    useEffect(() => {
        const poll = () => {
            axios.get(`${routePrefix}/general-visits/poll`)
                .then(res => {
                    if (Array.isArray(res.data.visits)) {
                        setLocalVisits(res.data.visits);
                    }
                })
                .catch(() => {});
        };
        const id = setInterval(poll, 15000);
        return () => clearInterval(id);
    }, [routePrefix]);

    return (
        <div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={18} color="#2563eb" />
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>
                        Ерөнхий эмчилгээний явц
                    </span>
                    <span style={{
                        fontSize: 11, fontWeight: 700, color: '#2563eb',
                        background: '#eff6ff', borderRadius: 99, padding: '2px 8px',
                    }}>
                        {localVisits.length} үзлэг
                    </span>
                </div>
                <button type="button" onClick={() => setShowForm(v => !v)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 12, border: 'none',
                        background: showForm ? 'var(--muted)' : '#2563eb',
                        color: showForm ? 'var(--muted-foreground)' : 'white',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}>
                    {showForm ? <><X size={14} /> Хаах</> : <>+ Шинэ үзлэг</>}
                </button>
            </div>

            {showForm && (
                <VisitForm patientId={patientId} routePrefix={routePrefix} onClose={() => setShowForm(false)} />
            )}

            {localVisits.length === 0 && !showForm ? (
                <div style={{
                    background: 'var(--muted)', borderRadius: 18, padding: '36px 20px', textAlign: 'center',
                }}>
                    <AlertCircle size={32} color="var(--muted-foreground)" style={{ margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted-foreground)', margin: 0 }}>Үзлэгийн тэмдэглэл байхгүй</p>
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '4px 0 0' }}>Шинэ үзлэг дарж тэмдэглэл нэмнэ үү</p>
                </div>
            ) : (
                localVisits.map(v => (
                    <VisitCard key={v.id} visit={v} patientId={patientId} routePrefix={routePrefix} />
                ))
            )}
        </div>
    );
}
