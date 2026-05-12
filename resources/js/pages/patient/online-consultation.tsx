import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import PatientLayout from '@/layouts/patient-layout';
import { NotificationBell } from '@/components/notification-bell';
import { CheckCircle2, ChevronRight, Clock, Video } from 'lucide-react';

interface Slot   { id: string; date: string; start_time: string; end_time: string; is_booked: boolean }
interface Doctor { id: number; name: string; specialization: string | null; photo_url: string | null; available_slots: Slot[] }
interface Props  { doctors: Doctor[]; fee: number }

const HERO_G = 'linear-gradient(155deg, #059669 0%, #10b981 45%, #0891b2 100%)';
const E      = '#059669';

const MN_WD_SHORT = ['Ня','Да','Мя','Лх','Пү','Ба','Бя'];
const MN_WD_LONG  = ['Ням','Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба'];
const MN_MON      = ['','1','2','3','4','5','6','7','8','9','10','11','12'];

function parseD(s: string) { return new Date(s + 'T00:00:00'); }
function dayNum(s: string) { return parseD(s).getDate(); }
function dayWd(s: string)  { return MN_WD_SHORT[parseD(s).getDay()]; }
function dayMon(s: string) { return MN_MON[parseD(s).getMonth() + 1] + '-р сар'; }
function fmtLong(s: string) {
    const d = parseD(s);
    return `${d.getFullYear()} оны ${MN_MON[d.getMonth()+1]}-р сарын ${d.getDate()}, ${MN_WD_LONG[d.getDay()]}`;
}

export default function OnlineConsultation({ doctors, fee }: Props) {
    const { props } = usePage<{ auth?: any }>();
    const userName: string = (props as any)?.auth?.user?.name ?? 'Үйлчлүүлэгч';

    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    useEffect(() => {
        const fn = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);

    const [selDoc,  setSelDoc]  = useState<Doctor | null>(null);
    const [selDate, setSelDate] = useState<string | null>(null);
    const [selSlot, setSelSlot] = useState<Slot | null>(null);
    const [notes,   setNotes]   = useState('');
    const [busy,    setBusy]    = useState(false);

    function pickDoc(d: Doctor)  { setSelDoc(d); setSelDate(null); setSelSlot(null); }
    function pickDate(dt: string) { setSelDate(dt); setSelSlot(null); }
    function pickSlot(s: Slot)   { setSelSlot(s); }

    function submit() {
        if (!selDoc || !selSlot) return;
        setBusy(true);
        router.post('/patient/online-consultation',
            { doctor_id: selDoc.id, slot_id: selSlot.id, notes },
            { onError: () => setBusy(false) }
        );
    }

    const dates        = selDoc ? [...new Set(selDoc.available_slots.map(s => s.date))].sort() : [];
    const slotsForDate = selDate ? (selDoc?.available_slots.filter(s => s.date === selDate) ?? []) : [];

    /* ── Doctor card (shared mobile/desktop) ── */
    const DocCard = ({ doc }: { doc: Doctor }) => {
        const on = selDoc?.id === doc.id;
        return (
            <button onClick={() => pickDoc(doc)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '12px 10px', width: 96, flexShrink: 0,
                borderRadius: 16, cursor: 'pointer', transition: 'all .15s',
                border: `2px solid ${on ? E : 'var(--my-divider)'}`,
                background: on ? 'rgba(5,150,105,.09)' : 'var(--my-page-bg)',
            }}>
                {doc.photo_url
                    ? <img src={doc.photo_url} alt={doc.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${on ? E : 'var(--my-divider)'}` }} />
                    : <div style={{ width: 44, height: 44, borderRadius: '50%', background: HERO_G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{doc.name.charAt(0)}</span>
                      </div>
                }
                <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: on ? E : 'var(--my-text)', lineHeight: 1.3 }}>{doc.name}</p>
                    {doc.specialization && <p style={{ margin: '2px 0 0', fontSize: 9, color: 'var(--my-muted)', lineHeight: 1.3 }}>{doc.specialization}</p>}
                    <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 700, color: E }}>{doc.available_slots.length} цаг</p>
                </div>
                {on && <CheckCircle2 size={12} color={E} />}
            </button>
        );
    };

    /* ── Date card ── */
    const DateCard = ({ date }: { date: string }) => {
        const on = selDate === date;
        return (
            <button onClick={() => pickDate(date)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '10px 6px', minWidth: 56, flexShrink: 0,
                borderRadius: 16, cursor: 'pointer', transition: 'all .15s',
                border: `1.5px solid ${on ? E : 'var(--my-divider)'}`,
                background: on ? E : 'var(--my-page-bg)',
            }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: on ? 'rgba(255,255,255,0.8)' : 'var(--my-muted)', letterSpacing: 0.2 }}>
                    {dayWd(date)}
                </span>
                <span style={{ fontSize: 24, fontWeight: 900, color: on ? '#fff' : 'var(--my-text)', lineHeight: 1.1 }}>
                    {dayNum(date)}
                </span>
                <span style={{ fontSize: 9, fontWeight: 600, color: on ? 'rgba(255,255,255,0.7)' : 'var(--my-muted)' }}>
                    {dayMon(date)}
                </span>
            </button>
        );
    };

    /* ── Time chip (shared) ── */
    const TimeChip = ({ slot }: { slot: Slot }) => {
        const on = selSlot?.id === slot.id;
        return (
            <button onClick={() => pickSlot(slot)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                padding: '10px 8px', borderRadius: 12, cursor: 'pointer', transition: 'all .15s',
                border: `1.5px solid ${on ? E : 'var(--my-divider)'}`,
                background: on ? E : 'var(--my-page-bg)',
                color: on ? '#fff' : 'var(--my-text)',
            }}>
                <Clock size={12} color={on ? 'rgba(255,255,255,0.8)' : 'var(--my-muted)'} />
                <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1 }}>{slot.start_time}</span>
                <span style={{ fontSize: 9, fontWeight: 500, color: on ? 'rgba(255,255,255,0.65)' : 'var(--my-muted)' }}>–{slot.end_time}</span>
            </button>
        );
    };

    /* ── Card header (mobile) ── */
    const CardHead = ({ n, label, right, check }: { n: number; label: string; right?: string; check?: boolean }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', borderBottom: '1px solid var(--my-divider)' }}>
            <span style={{ width: 22, height: 22, borderRadius: 7, background: HERO_G, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{n}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-text)' }}>{label}</span>
            {right && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--my-muted)' }}>{right}</span>}
            {check && !right && <CheckCircle2 size={14} color={E} style={{ marginLeft: 'auto' }} />}
        </div>
    );

    /* ══════════════════════════════════════════════════════════════
       RENDER
    ══════════════════════════════════════════════════════════════ */
    return (
        <PatientLayout breadcrumbs={isMobile ? [] : [
            { title: 'Хянах самбар', href: '/patient/dashboard' },
            { title: 'Онлайн үзлэг', href: '/patient/online-consultation' },
        ]}>
            <Head title="Онлайн үзлэг зөвлөгөө" />

            {isMobile ? (
                /* ════════════════════ MOBILE ════════════════════ */
                <div style={{
                    flex: 1, overflowY: 'auto', background: 'var(--my-page-bg)',
                    WebkitOverflowScrolling: 'touch',
                    paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))',
                }}>
                    {/* Hero */}
                    <div style={{ background: HERO_G, padding: '20px 20px 64px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', right: -24, top: -24, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', left: '35%', bottom: -24, width: 90, height: 90, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', pointerEvents: 'none' }} />

                        {/* Top bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, position: 'relative' }}>
                            <Link href="/patient/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.2)',
                                    border: '2px solid rgba(255,255,255,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
                                        {userName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </Link>
                            <h1 style={{ flex: 1, fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, textAlign: 'center' }}>
                                Онлайн үзлэг
                            </h1>
                            <NotificationBell variant="ghost" />
                        </div>

                        {/* Info row */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative', gap: 12 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Video size={14} color="#fff" />
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Google Meet зөвлөгөө</span>
                                </div>
                                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Линк захиалсны дараа имэйлээр ирнэ</p>
                            </div>
                            <div style={{ flexShrink: 0, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 14, padding: '8px 12px', textAlign: 'right' }}>
                                <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.65)' }}>Төлбөр</p>
                                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>{fee.toLocaleString()}₮</p>
                            </div>
                        </div>
                    </div>

                    {/* Step 1 — overlaps hero */}
                    <div style={{ margin: '-28px 16px 0', background: 'var(--my-card-bg)', borderRadius: 18, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative', zIndex: 2 }}>
                        <CardHead n={1} label="Эмч сонгох" check={!!selDoc} />
                        {doctors.length === 0
                            ? <p style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--my-muted)', margin: 0 }}>Боломжтой эмч байхгүй байна</p>
                            : <div style={{ display: 'flex', overflowX: 'auto', gap: 8, padding: '12px 14px 14px', WebkitOverflowScrolling: 'touch' }}>
                                {doctors.map(d => <DocCard key={d.id} doc={d} />)}
                              </div>
                        }
                    </div>

                    {/* Step 2 */}
                    {selDoc && (
                        <div style={{ margin: '12px 16px 0', background: 'var(--my-card-bg)', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                            <CardHead n={2} label="Цаг сонгох" right={selDoc.name} />

                            {/* Date scroll */}
                            <div style={{ display: 'flex', overflowX: 'auto', gap: 8, padding: '12px 14px 12px', WebkitOverflowScrolling: 'touch' }}>
                                {dates.map(d => <DateCard key={d} date={d} />)}
                            </div>

                            {/* Time grid */}
                            {selDate && (
                                <>
                                    <div style={{ padding: '0 14px 4px', borderTop: '1px solid var(--my-divider)' }}>
                                        <p style={{ margin: '10px 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--my-text)' }}>
                                            {fmtLong(selDate)}
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, paddingBottom: 14 }}>
                                            {slotsForDate.map(s => <TimeChip key={s.id} slot={s} />)}
                                        </div>
                                    </div>
                                </>
                            )}

                            {!selDate && (
                                <p style={{ padding: '4px 14px 14px', fontSize: 12, color: 'var(--my-muted)', margin: 0 }}>
                                    Дээрээс өдрөө сонгоно уу
                                </p>
                            )}
                        </div>
                    )}

                    {/* Step 3 */}
                    {selSlot && (
                        <div style={{ margin: '12px 16px 0', background: 'var(--my-card-bg)', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                            <CardHead n={3} label="Батлах" />
                            <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ background: 'rgba(5,150,105,.07)', borderRadius: 12, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                                    {[
                                        { label: 'Эмч',     val: selDoc!.name },
                                        { label: 'Цаг',     val: `${fmtLong(selSlot.date)} · ${selSlot.start_time}–${selSlot.end_time}` },
                                        { label: 'Холболт', val: 'Google Meet (имэйлээр)' },
                                    ].map(r => (
                                        <div key={r.label} style={{ display: 'flex', gap: 6 }}>
                                            <span style={{ fontSize: 11, color: 'var(--my-muted)', flexShrink: 0 }}>{r.label}:</span>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--my-text)' }}>{r.val}</span>
                                        </div>
                                    ))}
                                </div>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                                    placeholder="Тэмдэглэл (заавал биш)..."
                                    style={{ width: '100%', borderRadius: 11, padding: '9px 11px', border: '1.5px solid var(--my-divider)', background: 'var(--my-page-bg)', color: 'var(--my-text)', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                />
                                <button onClick={submit} disabled={busy} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                    width: '100%', padding: '13px', borderRadius: 13, border: 'none',
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    background: busy ? 'rgba(5,150,105,.5)' : HERO_G,
                                    boxShadow: busy ? 'none' : '0 4px 14px rgba(5,150,105,.35)',
                                    fontSize: 14, fontWeight: 700, color: '#fff', transition: 'all .15s',
                                }}>
                                    {busy
                                        ? <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        : <ChevronRight size={16} />}
                                    {fee.toLocaleString()}₮ төлбөр төлж захиалах
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* ════════════════════ DESKTOP ════════════════════ */
                <>
                    {/* Hero */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 px-6 pt-8 pb-14">
                        <div className="pointer-events-none absolute -right-8 -top-8 size-44 rounded-full bg-white/10" />
                        <div className="pointer-events-none absolute left-1/3 -bottom-6 size-32 rounded-full bg-black/10" />
                        <div className="relative flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-white/60">Үйлчлүүлэгчийн портал</p>
                                <h1 className="mt-1 text-2xl font-bold text-white">Онлайн үзлэг зөвлөгөө</h1>
                                <p className="mt-0.5 text-sm text-white/60">Google Meet линк захиалсны дараа имэйлээр ирнэ</p>
                            </div>
                            <div className="shrink-0 rounded-2xl bg-white/15 px-5 py-3 text-right ring-1 ring-white/25">
                                <p className="text-xs text-white/65">Үзлэгийн төлбөр</p>
                                <p className="text-2xl font-bold text-white">{fee.toLocaleString()}₮</p>
                            </div>
                        </div>
                    </div>

                    {/* Step 1 — overlaps hero (same as appointments filter card) */}
                    <div className="relative -mt-5 mx-4 md:mx-6 overflow-hidden rounded-2xl border bg-card shadow-md">
                        <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
                            <span className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-bold text-white">1</span>
                            <span className="text-sm font-semibold text-foreground">Эмч сонгох</span>
                            {selDoc && <CheckCircle2 className="ml-auto size-4 text-emerald-500" />}
                        </div>
                        {doctors.length === 0
                            ? <p className="py-8 text-center text-sm text-muted-foreground">Одоогоор боломжтой эмч байхгүй байна</p>
                            : <div className="flex gap-3 overflow-x-auto px-5 py-4">
                                {doctors.map(d => <DocCard key={d.id} doc={d} />)}
                              </div>
                        }
                    </div>

                    {/* Content (same pattern as appointments desktop content) */}
                    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">

                        {/* Step 2 */}
                        {selDoc && (
                            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                                <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
                                    <span className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-bold text-white">2</span>
                                    <span className="text-sm font-semibold text-foreground">Цаг сонгох</span>
                                    <span className="ml-auto text-xs text-muted-foreground">{selDoc.name}</span>
                                </div>

                                {/* Date scroll */}
                                <div className="flex gap-2 overflow-x-auto px-5 py-4">
                                    {dates.map(d => <DateCard key={d} date={d} />)}
                                </div>

                                {/* Time grid */}
                                {selDate ? (
                                    <div className="border-t border-border px-5 pb-5">
                                        <p className="py-3 text-sm font-semibold text-foreground">{fmtLong(selDate)}</p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {slotsForDate.map(s => <TimeChip key={s.id} slot={s} />)}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="px-5 pb-5 text-sm text-muted-foreground">Дээрээс өдрөө сонгоно уу</p>
                                )}
                            </div>
                        )}

                        {/* Step 3 */}
                        {selSlot && (
                            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                                <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
                                    <span className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-bold text-white">3</span>
                                    <span className="text-sm font-semibold text-foreground">Батлах</span>
                                </div>
                                <div className="space-y-4 px-5 py-4">
                                    <div className="grid grid-cols-3 gap-3 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/20">
                                        {[
                                            { label: 'Эмч',     val: selDoc!.name },
                                            { label: 'Цаг',     val: `${fmtLong(selSlot.date)} · ${selSlot.start_time}–${selSlot.end_time}` },
                                            { label: 'Холболт', val: 'Google Meet (имэйлээр)' },
                                        ].map(r => (
                                            <div key={r.label}>
                                                <p className="text-[10px] text-muted-foreground">{r.label}</p>
                                                <p className="text-xs font-semibold text-foreground leading-snug">{r.val}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Тэмдэглэл (заавал биш)</label>
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                                            placeholder="Шалтгаан, асуулт..."
                                            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        />
                                    </div>
                                    <button onClick={submit} disabled={busy}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg disabled:opacity-60 active:scale-[.98]">
                                        {busy
                                            ? <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            : <ChevronRight className="size-4" />}
                                        {fee.toLocaleString()}₮ төлбөр төлж захиалах
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </PatientLayout>
    );
}
