import MyLayout from '@/layouts/my-layout';
import { ChatIcon } from '@/components/chat-icon';
import { NotificationBell } from '@/components/notification-bell';
import SignatureInput, { type SignatureInputRef } from '@/components/signature-input';
import DocumentViewer, { signatureBlockHtml } from '@/components/document-viewer';
import {
    CompletionRing, HR_PANEL_FX, SignProgress, StepBadge, statusOf,
} from '@/components/hr/document-status';
import { useIsMobile } from '@/hooks/use-mobile';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle, ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Clock,
    Download, Eye, FileSignature, FileText, PenLine, ShieldCheck, X, XCircle,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, FormEvent } from 'react';

const RED = '#dc2626';
const RED2 = '#b91c1c';
const RED3 = '#7f1d1d';

interface Employee { full_name: string; short_name: string; position: string | null; photo_url: string | null; initials: string; }

interface Doc {
    id: number;
    type: string; type_label: string;
    title: string; doc_number: string | null;
    status: string; status_label: string;
    body: string;
    employer_name: string | null;
    employer_position: string | null;
    employer_signature: string | null;
    employer_signed_at: string | null;
    employee_name: string | null;
    employee_position: string | null;
    employee_signature: string | null;
    employee_signed_at: string | null;
    effective_date: string | null;
    expires_at: string | null;
    sent_at: string | null;
    completed_at: string | null;
    decline_reason: string | null;
}

type TabKey = 'all' | 'pending' | 'completed' | 'declined';

interface PageProps {
    employee: Employee | null;
    pending: Doc[];
    signed: Doc[];
    flash?: { success?: string; error?: string };
    [key: string]: unknown;
}


export default function MyContracts() {
    const { employee, pending, signed, flash } = usePage<PageProps>().props;

    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [openDoc, setOpenDoc] = useState<Doc | null>(null);
    // Компьютерын жагсаалтын төлвийн шүүлтүүр — бүх баримт аль хэдийн ирсэн тул клиент талдаа шүүнэ
    const [tab, setTab] = useState<TabKey>('all');

    useEffect(() => { const t = setInterval(() => router.reload({ only: ['pending', 'signed'] }), 30_000); return () => clearInterval(t); }, []);
    useEffect(() => {
        if (flash?.success) setToast({ msg: flash.success, type: 'success' });
        if (flash?.error) setToast({ msg: flash.error, type: 'error' });
    }, [flash]);
    useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4500); return () => clearTimeout(t); }, [toast]);

    const completedCount = signed.filter(d => d.status === 'completed').length;
    const declinedCount = signed.filter(d => d.status === 'declined').length;
    const allDocs = [...pending, ...signed];
    const visibleDocs = tab === 'all' ? allDocs
        : tab === 'pending' ? pending
            : signed.filter(d => d.status === (tab === 'completed' ? 'completed' : 'declined'));

    return (
        <MyLayout breadcrumbs={[{ title: 'Гэрээ', href: '/my/contracts' }]}>
            <Head title="Гэрээ" />

            {toast && (
                <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 80, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 14, background: toast.type === 'success' ? '#16a34a' : RED, color: 'white', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxWidth: 340 }}>
                    {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span style={{ flex: 1 }}>{toast.msg}</span>
                    <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={13} color="white" /></button>
                </div>
            )}

            {/* ═══════════════════ MOBILE ═══════════════════ */}
            <div className="md:hidden print:hidden" style={{ flex: 1, background: 'var(--my-page-bg)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' } as React.CSSProperties}>
                <div style={{ background: `linear-gradient(160deg, #ef4444 0%, ${RED} 30%, ${RED2} 65%, ${RED3} 100%)`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -70, right: -70, pointerEvents: 'none' }} />

                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 0', gap: 10, position: 'relative' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, flex: 1, letterSpacing: 0.3 }}>HR · ГЭРЭЭ</span>
                        <ChatIcon variant="ghost" />
                        <NotificationBell variant="ghost" />
                        <Link href="/my/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {employee?.photo_url
                                    ? <img src={employee.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                                    : <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{employee?.initials ?? '?'}</span>}
                            </div>
                        </Link>
                    </div>

                    <div style={{ padding: '14px 18px 18px', position: 'relative' }}>
                        <h1 style={{ margin: '0 0 5px', lineHeight: 1.1, letterSpacing: -0.8 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>Миний </span>
                            <span style={{ fontSize: 28, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontFamily: 'Georgia, serif' }}>гэрээ</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 16px', fontWeight: 500 }}>
                            {employee?.full_name ?? '—'}{employee?.position ? ` · ${employee.position}` : ''}
                        </p>

                        <div style={{ borderRadius: 20, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[
                                    { val: pending.length, label: 'Гарын үсэг хүлээж', dot: '#fbbf24' },
                                    { val: completedCount, label: 'Баталгаажсан', dot: '#4ade80' },
                                ].map(({ val, label, dot }, i) => (
                                    <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 8px', textAlign: 'center' }}>
                                        <p style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{val}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 5 }}>
                                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
                                            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 600 }}>{label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px 14px 8px' }}>
                    <DocList pending={pending} signed={signed} onOpen={setOpenDoc} />
                </div>
            </div>

            {/* ═══════════════════ DESKTOP — HR талын гэрээний загвартай нэг мөр ═══════════════════ */}
            <div className="hidden space-y-3 p-4 print:hidden md:block md:p-5">

                {/* ── Толгой + төлвийн шүүлтүүр (нэг самбар) ── */}
                <section className="relative isolate overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-emerald-50/80 via-card to-teal-50/50 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(16,185,129,0.35)] dark:from-emerald-950/30 dark:via-card dark:to-teal-950/20">
                    {/* Гоёл — хөвөгч туяа ба нарийн торон бүтэц */}
                    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                        <div className="hr-drift absolute -left-20 -top-28 size-64 rounded-full bg-emerald-400/25 blur-3xl dark:bg-emerald-500/20" />
                        <div className="hr-drift-2 absolute -right-16 -top-32 size-64 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/15" />
                        <div className="hr-drift-2 absolute -bottom-32 left-1/3 size-56 rounded-full bg-sky-400/10 blur-3xl" />
                        <div className="hr-grid absolute inset-0 opacity-[0.55]" />
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
                    </div>

                    <div className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-3 px-4 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/35 ring-1 ring-inset ring-white/30">
                                <span aria-hidden className="absolute inset-x-1.5 top-1 h-1/3 rounded-full bg-white/25 blur-[2px]" />
                                <FileSignature className="relative size-5" />
                            </span>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h1 className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-lg font-extrabold leading-none tracking-tight text-transparent">
                                        Миний гэрээ
                                    </h1>
                                    <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/25 sm:inline dark:text-emerald-300">
                                        цахим гарын үсэг
                                    </span>
                                </div>
                                <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] leading-none text-muted-foreground">
                                    {['Захирал зурна', 'Та уншина', 'Гарын үсэг', 'PDF'].map((step, i) => (
                                        <span key={step} className="inline-flex items-center gap-1">
                                            {i > 0 && <ChevronRight className="size-3 text-emerald-500/50" />}
                                            {step}
                                        </span>
                                    ))}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-1 shrink-0 items-center justify-end gap-2">
                            <CompletionRing value={completedCount} total={allDocs.length}
                                title={`Нийт ${allDocs.length} баримтаас ${completedCount} нь баталгаажсан`} />

                            <div className="flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 shadow-sm backdrop-blur">
                                <Clock className="size-3.5 shrink-0 text-blue-500" />
                                <span className="text-[11px] leading-tight text-muted-foreground">Гарын үсэг хүлээж</span>
                                <span className="text-[13px] font-bold leading-none tabular-nums text-foreground">{pending.length}</span>
                            </div>

                            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-1.5 shadow-sm backdrop-blur">
                                <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                    {employee?.photo_url
                                        ? <img src={employee.photo_url} alt="" className="size-full object-cover object-top" />
                                        : (employee?.initials ?? '?')}
                                </span>
                                <span className="min-w-0 text-[10px] leading-tight text-muted-foreground">
                                    Ажилтан
                                    <span className="block truncate font-semibold text-foreground">{employee?.short_name ?? employee?.full_name ?? '—'}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-border/50 bg-background/40 px-3 py-2 backdrop-blur-sm">
                        <div className="flex items-center gap-1 overflow-x-auto">
                            {TABS.map(({ key, label, Icon, on }) => {
                                const active = tab === key;
                                const value = key === 'all' ? allDocs.length
                                    : key === 'pending' ? pending.length
                                        : key === 'completed' ? completedCount : declinedCount;

                                return (
                                    <button key={key} onClick={() => setTab(key)}
                                        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all active:scale-[0.97] ${
                                            active
                                                ? `${on} text-white shadow-md ring-1 ring-inset ring-white/25`
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                        <Icon className="size-3.5 shrink-0" />
                                        {label}
                                        <span className={`rounded px-1 text-[10px] font-semibold tabular-nums ${
                                            active ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            {value}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <p className="hidden pr-1 text-[11px] text-muted-foreground lg:block">
                            Гарын үсэг зурсан баримтаа хэдийд ч PDF-ээр татаж авах боломжтой.
                        </p>
                    </div>
                </section>

                {/* ── Жагсаалт ── */}
                {visibleDocs.length === 0 ? (
                    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-card/40 px-6 py-14 text-center">
                        <div aria-hidden className="pointer-events-none absolute left-1/2 top-8 size-40 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
                        <span className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/40 ring-1 ring-inset ring-border">
                            <FileSignature className="size-5 text-muted-foreground/70" />
                        </span>
                        <p className="relative mt-3 text-sm font-semibold text-foreground">
                            {tab === 'all' ? 'Танд одоогоор гэрээ ирээгүй байна' : 'Энэ төлөвт баримт алга'}
                        </p>
                        <p className="relative mt-1 max-w-sm text-xs text-muted-foreground">
                            {tab === 'all'
                                ? 'Хүний нөөцөөс гэрээ илгээмэгц энд шууд харагдаж, мэдэгдэл очно.'
                                : 'Өөр төлөв сонгоод үзнэ үү.'}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-20px_rgba(0,0,0,0.25)]">
                        {/* Баганын гарчиг */}
                        <div className={`hidden gap-x-3 rounded-t-2xl border-b border-border/60 bg-gradient-to-b from-muted/70 to-muted/25 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur lg:grid ${MY_ROW_COLS}`}>
                            <span>Гэрээ</span>
                            <span>Төлөв</span>
                            <span>Гарын үсэг</span>
                            <span>Хүчинтэй</span>
                            <span className="text-right">Үйлдэл</span>
                        </div>

                        <div className="divide-y divide-border/50 [&>*:first-child]:rounded-t-[15px] [&>*:last-child]:rounded-b-[15px] lg:[&>*:first-child]:rounded-t-none">
                            {visibleDocs.map((d, i) => (
                                <MyDocRow key={d.id} doc={d} index={i} onOpen={setOpenDoc} />
                            ))}
                        </div>
                    </div>
                )}

                <style>{HR_PANEL_FX}</style>
            </div>

            {openDoc && <DocumentModal doc={openDoc} employee={employee} onClose={() => setOpenDoc(null)} />}

        </MyLayout>
    );
}

/* ───────────────────────── Компьютерын жагсаалт (HR талтай ижил мөр) ───────────────────────── */

const MY_ROW_COLS = 'lg:grid-cols-[minmax(0,1.9fr)_140px_152px_110px_128px]';

const TABS: Array<{ key: TabKey; label: string; Icon: LucideIcon; on: string }> = [
    { key: 'all', label: 'Бүгд', Icon: FileText, on: 'bg-gradient-to-b from-slate-600 to-slate-700 shadow-slate-900/30' },
    { key: 'pending', label: 'Гарын үсэг зурах', Icon: PenLine, on: 'bg-gradient-to-b from-blue-500 to-blue-600 shadow-blue-600/40' },
    { key: 'completed', label: 'Баталгаажсан', Icon: CheckCircle2, on: 'bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-emerald-600/40' },
    { key: 'declined', label: 'Татгалзсан', Icon: XCircle, on: 'bg-gradient-to-b from-red-500 to-red-600 shadow-red-600/40' },
];

function MyDocRow({ doc: d, index, onOpen }: { doc: Doc; index: number; onOpen: (doc: Doc) => void }) {
    const s = statusOf(d.status);
    const needsSign = d.status === 'pending_employee';
    const isCompleted = d.status === 'completed';

    return (
        <div
            style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
            className={`group relative grid animate-in items-center gap-x-3 gap-y-2 px-4 py-2.5 transition-colors duration-200 fade-in slide-in-from-bottom-1 fill-mode-backwards hover:bg-gradient-to-r hover:from-muted/70 hover:via-muted/40 hover:to-transparent ${MY_ROW_COLS}`}>

            {/* Хулганаар дээгүүр очиход төлвийн өнгө сэмхэн гарч ирнэ */}
            <span aria-hidden className={`absolute inset-y-1.5 left-0 w-[3px] rounded-r-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${s.accent}`} />

            {/* Гэрээ */}
            <div className="flex min-w-0 items-center gap-2.5">
                <span className="relative shrink-0" title={d.status_label}>
                    <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-muted to-muted/40 text-muted-foreground shadow-sm ring-1 ring-inset ring-border transition-transform duration-200 group-hover:scale-105">
                        <FileSignature className="size-4" />
                    </span>
                    <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card ${s.dot}`} />
                    {needsSign && <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 animate-ping rounded-full opacity-60 ${s.dot}`} />}
                </span>
                <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{d.title}</p>
                        {d.doc_number && (
                            <span className="shrink-0 rounded bg-muted px-1 py-px font-mono text-[10px] leading-tight text-muted-foreground ring-1 ring-inset ring-border/60">{d.doc_number}</span>
                        )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                        {[d.type_label, d.sent_at ? `Ирсэн: ${d.sent_at}` : null].filter(Boolean).join(' · ')}
                    </p>
                </div>
            </div>

            {/* Төлөв — HR талын хэлбэр, ажилтанд зориулсан үг */}
            <div className="min-w-0">
                <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ring-1 ring-inset ${s.pill}`}>
                    <span className={`size-1.5 shrink-0 rounded-full ${s.dot}`} />
                    <span className="truncate">{d.status_label}</span>
                </span>
            </div>

            {/* Гарын үсгийн явц */}
            <div className="min-w-0">
                <SignProgress employerAt={d.employer_signed_at} employeeAt={d.employee_signed_at} status={d.status} />
            </div>

            {/* Хүчинтэй */}
            <div className="min-w-0 truncate text-[11px] leading-tight tabular-nums text-muted-foreground">
                {d.effective_date ?? '—'}
            </div>

            {/* Үйлдэл */}
            <div className="flex items-center justify-end gap-1">
                {needsSign ? (
                    <button onClick={() => onOpen(d)} title="Уншиж гарын үсэг зурах"
                        className="flex h-7 items-center gap-1 rounded-md bg-gradient-to-b from-emerald-500 to-emerald-600 px-2.5 text-[11px] font-semibold text-white shadow-sm shadow-emerald-600/30 ring-1 ring-inset ring-white/20 transition-all hover:shadow-md hover:shadow-emerald-600/40 hover:brightness-110 active:scale-95">
                        <PenLine className="size-3" /> Зурах
                    </button>
                ) : (
                    <button onClick={() => onOpen(d)} title="Гэрээг харах"
                        className="flex h-7 items-center gap-1 rounded-md border bg-background/60 px-2.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-emerald-500/40 hover:bg-muted hover:text-foreground active:scale-95">
                        <Eye className="size-3" /> Харах
                    </button>
                )}

                {isCompleted && (
                    <a href={`/my/contracts/${d.id}/pdf`} title="PDF татах"
                        className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background/60 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95">
                        <Download className="size-3.5" />
                    </a>
                )}
            </div>

            {/* Татгалзсан шалтгаан */}
            {d.status === 'declined' && d.decline_reason && (
                <p className="col-span-full rounded-lg bg-red-500/[0.07] px-2.5 py-1.5 text-[11px] leading-snug text-red-700 ring-1 ring-inset ring-red-500/15 dark:text-red-400">
                    <span className="font-semibold">Татгалзсан шалтгаан:</span> {d.decline_reason}
                </p>
            )}
        </div>
    );
}

/* ───────────────────────── Жагсаалт ───────────────────────── */

function DocList({ pending, signed, onOpen }: { pending: Doc[]; signed: Doc[]; onOpen: (d: Doc) => void }) {
    if (pending.length === 0 && signed.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed bg-card px-6 py-12 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
                    <FileText className="size-7 text-muted-foreground/50" />
                </div>
                <p className="mt-3 text-[15px] font-bold text-foreground">Гэрээ алга байна</p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">Хүний нөөцөөс баримт илгээмэгц энд шууд харагдана.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {pending.length > 0 && (
                <section>
                    <SectionHead Icon={Clock} title="Гарын үсэг зурах" count={pending.length} tone="amber" />
                    <div className="space-y-3">
                        {pending.map(d => <DocCard key={d.id} doc={d} onOpen={onOpen} highlight />)}
                    </div>
                </section>
            )}

            {signed.length > 0 && (
                <section>
                    <SectionHead Icon={ShieldCheck} title="Түүх" count={signed.length} tone="emerald" />
                    <div className="grid gap-3 xl:grid-cols-2">
                        {signed.map(d => <DocCard key={d.id} doc={d} onOpen={onOpen} />)}
                    </div>
                </section>
            )}
        </div>
    );
}

function SectionHead({ Icon, title, count, tone }: {
    Icon: LucideIcon; title: string; count: number; tone: 'amber' | 'emerald';
}) {
    const color = tone === 'amber'
        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';

    return (
        <div className="mb-3 flex items-center gap-2.5">
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon className="size-4" />
            </span>
            <h2 className="text-[14px] font-extrabold text-foreground">{title}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${color}`}>{count}</span>
            <span className="ml-1 hidden h-px flex-1 bg-border sm:block" />
        </div>
    );
}

function DocCard({ doc, onOpen, highlight = false }: { doc: Doc; onOpen: (d: Doc) => void; highlight?: boolean }) {
    const isDeclined = doc.status === 'declined';
    const isCompleted = doc.status === 'completed';
    const needsSign = doc.status === 'pending_employee';

    const tone = isCompleted
        ? {
            accent: '#10b981',
            tint: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
            pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        }
        : isDeclined
            ? {
                accent: RED,
                tint: 'bg-red-500/12 text-red-600 dark:text-red-400',
                pill: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
            }
            : {
                accent: '#f59e0b',
                tint: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
                pill: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
            };

    const Icon = isCompleted ? ShieldCheck : isDeclined ? XCircle : FileSignature;

    return (
        <div className={`group relative flex gap-3.5 overflow-hidden rounded-2xl border bg-card p-4 pl-5 shadow-sm transition-all hover:shadow-md sm:gap-4 sm:p-5 sm:pl-6 ${
            highlight ? 'border-amber-300/70 dark:border-amber-800/60' : 'hover:border-foreground/15'}`}>
            <span className="absolute inset-y-0 left-0 w-1" style={{ background: tone.accent }} />
            {highlight && (
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-500/[0.07] to-transparent" />
            )}

            <div className={`relative flex size-11 shrink-0 items-center justify-center rounded-2xl ${tone.tint}`}>
                <Icon className="size-5" />
            </div>

            <div className="relative min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tone.pill}`}>
                        <span className="size-1.5 rounded-full" style={{ background: tone.accent }} />
                        {doc.status_label}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">{doc.type_label}</span>
                    {doc.doc_number && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">{doc.doc_number}</span>
                    )}
                </div>

                <h3 className="mt-2 text-[15px] font-bold leading-snug text-foreground">{doc.title}</h3>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
                    {doc.employer_signed_at && (
                        <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 text-emerald-500" /> Захирал: {doc.employer_signed_at}
                        </span>
                    )}
                    {doc.employee_signed_at ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5" /> Та: {doc.employee_signed_at}
                        </span>
                    ) : needsSign && (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                            <Clock className="size-3.5" /> Таны гарын үсэг хүлээгдэж байна
                        </span>
                    )}
                    {doc.effective_date && (
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="size-3.5" /> Хүчинтэй: {doc.effective_date}
                        </span>
                    )}
                </div>

                {isDeclined && doc.decline_reason && (
                    <p className="mt-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-[11.5px] leading-snug text-red-700 dark:text-red-400">
                        <span className="font-bold">Татгалзсан шалтгаан:</span> {doc.decline_reason}
                    </p>
                )}

                <div className="mt-3.5 flex flex-wrap gap-2">
                    <button onClick={() => onOpen(doc)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold transition-all ${
                            needsSign ? 'text-white' : 'border text-foreground hover:bg-muted'}`}
                        style={needsSign
                            ? { background: `linear-gradient(135deg, #ef4444, ${RED2})`, boxShadow: '0 4px 14px rgba(220,38,38,0.28)' }
                            : undefined}>
                        {needsSign
                            ? <><PenLine className="size-3.5" /> Уншиж гарын үсэг зурах</>
                            : <><FileText className="size-3.5" /> Харах</>}
                        <ChevronRight className="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
                    </button>
                    {isCompleted && (
                        <a href={`/my/contracts/${doc.id}/pdf`}
                            className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[12.5px] font-bold text-foreground transition-colors hover:bg-muted">
                            <Download className="size-3.5" /> PDF татах
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────── Гэрээ унших + гарын үсэг ───────────────────────── */

const SHEET_CSS = `
@keyframes docSheetIn { from { transform: translateY(18px); opacity: .4 } to { transform: none; opacity: 1 } }
@keyframes docStepIn  { from { transform: translateX(14px); opacity: .5 } to { transform: none; opacity: 1 } }
`;

function DocumentModal({ doc, employee, onClose }: { doc: Doc; employee: Employee | null; onClose: () => void }) {
    const sigRef = useRef<SignatureInputRef>(null);
    const isMobile = useIsMobile();

    // Гэрээг бүтэн дэлгэцээр уншиж, дараа нь гарын үсгийн алхам руу орно
    const [step, setStep] = useState<'read' | 'sign' | 'decline'>('read');
    const [signature, setSignature] = useState('');
    const [agreed, setAgreed] = useState(false);
    // Гэрээг сүүлийн хуудас хүртэл уншсаны дараа л гарын үсгийн алхам нээгдэнэ
    const [scrolledToEnd, setScrolledToEnd] = useState(false);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    const [reason, setReason] = useState('');

    const canSign = doc.status === 'pending_employee';
    const isCompleted = doc.status === 'completed';

    /* Esc товчоор хаана */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    /* Гар утсанд цонх нээлттэй үед ард талын хуудас гүйлгэгдэхгүй байх */
    useEffect(() => {
        if (!isMobile) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => { document.body.style.overflow = prev; };
    }, [isMobile]);

    function sign(e: FormEvent) {
        e.preventDefault();
        if (!agreed) { setError('Гэрээний нөхцөлтэй танилцсанаа баталгаажуулна уу'); return; }
        const value = sigRef.current?.getValue() ?? '';
        if (!value) { setError('Гарын үсгээ зурах, зургаар оруулах эсвэл хадгалсанаас сонгоно уу'); return; }

        setProcessing(true);
        router.post(`/my/contracts/${doc.id}/sign`, {
            signature: value,
            agreed: true,
        }, {
            preserveScroll: true,
            onSuccess: onClose,
            onFinish: () => setProcessing(false),
        });
    }

    function decline(e: FormEvent) {
        e.preventDefault();
        if (!reason.trim()) { setError('Шалтгаанаа бичнэ үү'); return; }
        setProcessing(true);
        router.post(`/my/contracts/${doc.id}/decline`, { reason }, {
            preserveScroll: true,
            onSuccess: onClose,
            onFinish: () => setProcessing(false),
        });
    }

    const viewer = (
        <DocumentViewer
            html={doc.body}
            footerHtml={signatureBlockHtml(doc, employee?.short_name ?? '')}
            onReachEnd={() => setScrolledToEnd(true)}
        />
    );

    const employerNote = doc.employer_signature
        ? `${doc.employer_position ?? ''} ${doc.employer_name ?? ''} ${doc.employer_signed_at ?? ''}-нд гарын үсэг зурсан.`.trim()
        : '';

    /* ═══════════════════ ГАР УТАС ═══════════════════ */
    if (isMobile) {
        const stepTitle = step === 'read' ? doc.title : step === 'sign' ? 'Гарын үсэг зурах' : 'Татгалзах';
        const ghost: React.CSSProperties = {
            width: 34, height: 34, borderRadius: 999, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer',
            textDecoration: 'none',
        };
        const bottomBar: React.CSSProperties = {
            flexShrink: 0,
            padding: '10px 12px calc(12px + env(safe-area-inset-bottom,0px))',
        };

        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 70,
                display: 'flex', flexDirection: 'column',
                background: 'var(--my-page-bg)',
                animation: 'docSheetIn .28s cubic-bezier(.22,1,.36,1)',
            }}>
                <style>{SHEET_CSS}</style>

                {/* ── Дээд мөр ── */}
                <div style={{
                    flexShrink: 0,
                    background: `linear-gradient(135deg, #ef4444 0%, ${RED} 48%, ${RED2} 100%)`,
                    paddingTop: 'env(safe-area-inset-top,0px)',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                        <button
                            onClick={() => { if (step === 'read') onClose(); else { setStep('read'); setError(''); } }}
                            style={ghost} aria-label={step === 'read' ? 'Хаах' : 'Буцах'}>
                            {step === 'read' ? <X size={18} color="white" /> : <ArrowLeft size={18} color="white" />}
                        </button>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                                margin: 0, fontSize: 14.5, fontWeight: 800, color: 'white', lineHeight: 1.25,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{stepTitle}</p>
                            <p style={{
                                margin: '1px 0 0', fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.68)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                                {doc.type_label}{doc.doc_number ? ` · ${doc.doc_number}` : ''}
                            </p>
                        </div>

                        {isCompleted && (
                            <a href={`/my/contracts/${doc.id}/pdf`} style={ghost} aria-label="PDF татах">
                                <Download size={17} color="white" />
                            </a>
                        )}
                    </div>

                    {step === 'read' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 12px 11px' }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                borderRadius: 999, padding: '4px 10px',
                                background: 'rgba(0,0,0,0.22)', fontSize: 10.5, fontWeight: 700, color: 'white',
                            }}>
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: isCompleted ? '#4ade80' : doc.status === 'declined' ? '#fca5a5' : '#fbbf24',
                                }} />
                                {doc.status_label}
                            </span>
                            {doc.effective_date && (
                                <span style={{
                                    borderRadius: 999, padding: '4px 10px', background: 'rgba(255,255,255,0.14)',
                                    fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.9)',
                                }}>
                                    Хүчинтэй: {doc.effective_date}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── 1. Унших ── */}
                {step === 'read' && (
                    <>
                        {employerNote && (
                            <div className="mx-3 mt-2.5 flex shrink-0 items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-[11.5px] font-semibold leading-snug text-emerald-700 dark:text-emerald-400">
                                <ShieldCheck className="size-4 shrink-0" />
                                <span>{employerNote}</span>
                            </div>
                        )}

                        <div className="bg-card" style={{
                            flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
                            margin: '10px 10px 0', borderRadius: 20, overflow: 'hidden',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        }}>
                            {viewer}
                        </div>

                        {canSign ? (
                            <div className="border-t border-border bg-card" style={bottomBar}>
                                {!scrolledToEnd && (
                                    <p className="mb-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                        <AlertCircle className="size-3.5 shrink-0" />
                                        Гэрээг эцэс хүртэл уншсаны дараа идэвхжинэ
                                    </p>
                                )}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" onClick={() => { setStep('decline'); setError(''); }}
                                        className="h-12 shrink-0 rounded-2xl border border-red-200 px-4 text-[13px] font-bold text-red-600 dark:border-red-900/50 dark:text-red-400">
                                        Татгалзах
                                    </button>
                                    <button type="button" disabled={!scrolledToEnd}
                                        onClick={() => { setStep('sign'); setError(''); }}
                                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-white transition-opacity disabled:opacity-45"
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            boxShadow: scrolledToEnd ? '0 6px 18px rgba(5,150,105,0.32)' : 'none',
                                        }}>
                                        <PenLine className="size-[18px]" /> Гарын үсэг зурах
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ flexShrink: 0, height: 'calc(10px + env(safe-area-inset-bottom,0px))' }} />
                        )}
                    </>
                )}

                {/* ── 2. Гарын үсэг ── */}
                {step === 'sign' && (
                    <form onSubmit={sign} style={{
                        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
                        animation: 'docStepIn .22s ease-out',
                    }}>
                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 4px' }}>
                            <div className="rounded-2xl bg-card p-3 shadow-sm">
                                <p className="mb-2 text-[13px] font-bold text-foreground">
                                    Гарын үсгээ зурна уу <span className="text-red-500">*</span>
                                </p>
                                <SignatureInput
                                    ref={sigRef}
                                    height={200}
                                    onChange={value => { setSignature(value); if (value) setError(''); }}
                                />
                            </div>

                            <label className="mt-3 flex items-start gap-2.5 rounded-2xl bg-card p-3.5 shadow-sm">
                                <input type="checkbox" checked={agreed}
                                    onChange={e => { setAgreed(e.target.checked); setError(''); }}
                                    className="mt-0.5 size-5 shrink-0 rounded accent-emerald-600" />
                                <span className="text-[12.5px] font-medium leading-snug text-foreground">
                                    Би энэхүү баримтын агуулгатай бүрэн танилцаж, нөхцөлийг зөвшөөрч байна.
                                </span>
                            </label>

                            {error && (
                                <p className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11.5px] font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-400">
                                    <AlertCircle className="size-3.5 shrink-0" /> {error}
                                </p>
                            )}

                            <button type="button" onClick={() => setStep('read')}
                                className="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-[12px] font-semibold text-muted-foreground">
                                <ArrowLeft className="size-3.5" /> Гэрээг дахин харах
                            </button>
                        </div>

                        <div className="border-t border-border bg-card" style={bottomBar}>
                            <button type="submit" disabled={processing || !signature || !agreed}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-white transition-opacity disabled:opacity-45"
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    boxShadow: '0 6px 18px rgba(5,150,105,0.3)',
                                }}>
                                {processing
                                    ? 'Илгээж байна…'
                                    : <><ShieldCheck className="size-[18px]" /> Гарын үсэг зурж баталгаажуулах</>}
                            </button>
                        </div>
                    </form>
                )}

                {/* ── Татгалзах ── */}
                {step === 'decline' && (
                    <form onSubmit={decline} style={{
                        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
                        animation: 'docStepIn .22s ease-out',
                    }}>
                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 4px' }}>
                            <div className="mb-3 flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-[11.5px] font-semibold leading-snug text-amber-700 dark:text-amber-400">
                                <AlertCircle className="size-4 shrink-0" />
                                <span>Татгалзсан шалтгаан хүний нөөцөд шууд очно. Тодорхой бичнэ үү.</span>
                            </div>

                            <div className="rounded-2xl bg-card p-3 shadow-sm">
                                <p className="mb-2 text-[13px] font-bold text-foreground">
                                    Татгалзах шалтгаан <span className="text-red-500">*</span>
                                </p>
                                <textarea value={reason} onChange={e => { setReason(e.target.value); setError(''); }} rows={7}
                                    placeholder="Ямар зүйл дээр тохиролцоогүй байгаагаа бичнэ үү."
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>

                            {error && (
                                <p className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11.5px] font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-400">
                                    <AlertCircle className="size-3.5 shrink-0" /> {error}
                                </p>
                            )}

                            <button type="button" onClick={() => { setStep('read'); setError(''); }}
                                className="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-[12px] font-semibold text-muted-foreground">
                                <ArrowLeft className="size-3.5" /> Гэрээг дахин харах
                            </button>
                        </div>

                        <div className="border-t border-border bg-card" style={bottomBar}>
                            <button type="submit" disabled={processing || !reason.trim()}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-white transition-opacity disabled:opacity-45"
                                style={{
                                    background: `linear-gradient(135deg, #ef4444 0%, ${RED2} 100%)`,
                                    boxShadow: '0 6px 18px rgba(220,38,38,0.3)',
                                }}>
                                <XCircle className="size-[18px] shrink-0" /> Татгалзсанаа илгээх
                            </button>
                        </div>
                    </form>
                )}
            </div>
        );
    }

    /* ═══════════════════ КОМПЬЮТЕР — HR талын цонхтой ижил ═══════════════════ */
    const s = statusOf(doc.status);

    return (
        <div className="fixed inset-0 z-[70] flex animate-in items-start justify-center bg-black/60 p-4 backdrop-blur-sm fade-in duration-200"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="flex max-h-full w-full min-w-0 max-w-4xl animate-in flex-col overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-black/5 zoom-in-95 fade-in duration-200 dark:ring-white/10">

                {/* ── Толгой ── */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-inset ring-white/30">
                            <FileSignature className="size-4" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate font-semibold text-foreground">{doc.title}</h2>
                            <p className="truncate text-xs text-muted-foreground">
                                {doc.type_label}{doc.doc_number ? ` · ${doc.doc_number}` : ''}
                                {doc.effective_date ? ` · Хүчинтэй: ${doc.effective_date}` : ''}
                            </p>
                        </div>
                    </div>

                    {canSign && step !== 'decline' && (
                        <StepBadge step={step === 'sign' ? 'sign' : 'read'} labels={['Уншиж танилцах', 'Гарын үсэг']} />
                    )}

                    <div className="flex shrink-0 items-center gap-2">
                        <span className={`hidden max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ring-1 ring-inset sm:inline-flex ${s.pill}`}>
                            <span className={`size-1.5 shrink-0 rounded-full ${s.dot}`} />
                            <span className="truncate">{doc.status_label}</span>
                        </span>
                        {isCompleted && (
                            <a href={`/my/contracts/${doc.id}/pdf`}
                                className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
                                <Download className="size-3.5" /> PDF
                            </a>
                        )}
                        <button type="button" onClick={onClose}><X className="size-5 text-muted-foreground" /></button>
                    </div>
                </div>

                {/* ── 1-р алхам: гэрээг унших ── */}
                {step === 'read' && (
                    <>
                        {employerNote && (
                            <div className="mx-5 mt-3 flex shrink-0 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-950/25 dark:text-emerald-300">
                                <ShieldCheck className="size-4 shrink-0" />
                                <span>{employerNote}</span>
                            </div>
                        )}

                        {viewer}

                        {canSign && (
                            <div className="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-3">
                                <p className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
                                    {scrolledToEnd
                                        ? <><CheckCircle2 className="size-3.5 text-emerald-500" /> Та гэрээг бүтэн үзсэн. Гарын үсэг зурах алхам руу шилжинэ үү.</>
                                        : <><AlertCircle className="size-3.5" /> Гэрээг эцэс хүртэл уншсаны дараа гарын үсэг зурах товч идэвхжинэ.</>}
                                </p>
                                <div className="ml-auto flex gap-2">
                                    <button type="button" onClick={() => { setStep('decline'); setError(''); }}
                                        className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30">
                                        <XCircle className="size-4" /> Татгалзах
                                    </button>
                                    <button type="button" disabled={!scrolledToEnd} onClick={() => { setStep('sign'); setError(''); }}
                                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40">
                                        <PenLine className="size-4" /> Гарын үсэг зурах
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ── 2-р алхам: гарын үсэг ── */}
                {step === 'sign' && (
                    <form onSubmit={sign} className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
                            <button type="button" onClick={() => setStep('read')}
                                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">
                                <ArrowLeft className="size-3.5" /> Гэрээг дахин харах
                            </button>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium">
                                    Гарын үсэг <span className="text-red-500">*</span>
                                </label>
                                <SignatureInput
                                    ref={sigRef}
                                    height={200}
                                    onChange={value => { setSignature(value); if (value) setError(''); }}
                                />
                            </div>

                            <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/40 p-3 transition-colors hover:bg-muted/60">
                                <input type="checkbox" checked={agreed}
                                    onChange={e => { setAgreed(e.target.checked); setError(''); }}
                                    className="mt-0.5 size-4 shrink-0 rounded accent-emerald-600" />
                                <span className="text-sm text-foreground">
                                    Гэрээний нөхцөлийг зөвшөөрч байна
                                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                        Би энэхүү баримтын агуулгатай бүрэн танилцаж, нөхцөлийг хүлээн зөвшөөрлөө.
                                    </span>
                                </span>
                            </label>

                            {error && (
                                <p className="flex items-center gap-1.5 text-xs text-red-500">
                                    <AlertCircle className="size-3.5 shrink-0" /> {error}
                                </p>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-3">
                            <p className="hidden text-[11px] text-muted-foreground sm:block">
                                Гарын үсэг зурмагц гэрээ баталгаажиж, PDF нь и-мэйлээр очно.
                            </p>
                            <div className="ml-auto flex gap-2">
                                <button type="button" onClick={() => setStep('read')}
                                    className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">Буцах</button>
                                <button type="submit" disabled={processing || !signature || !agreed}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
                                    <PenLine className="size-4" /> {processing ? 'Илгээж байна…' : 'Зурж баталгаажуулах'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* ── Татгалзах ── */}
                {step === 'decline' && (
                    <form onSubmit={decline} className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
                            <button type="button" onClick={() => { setStep('read'); setError(''); }}
                                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">
                                <ArrowLeft className="size-3.5" /> Гэрээг дахин харах
                            </button>

                            <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-950/25 dark:text-amber-300">
                                <AlertCircle className="mt-px size-3.5 shrink-0" />
                                <span>Татгалзсан шалтгаан хүний нөөцөд шууд очно. Аль заалт дээр тохиролцоогүйгээ тодорхой бичнэ үү.</span>
                            </div>

                            <label className="block text-sm font-medium text-foreground">
                                Татгалзах шалтгаан <span className="text-red-500">*</span>
                            </label>
                            <textarea value={reason} onChange={e => { setReason(e.target.value); setError(''); }} rows={7}
                                placeholder="Ямар зүйл дээр тохиролцоогүй байгаагаа бичнэ үү."
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            {error && <p className="text-xs text-red-500">{error}</p>}
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-3">
                            <p className="hidden text-[11px] text-muted-foreground sm:block">
                                Татгалзсан тохиолдолд гэрээ хүчингүй болж, хүний нөөц тантай холбогдоно.
                            </p>
                            <div className="ml-auto flex gap-2">
                                <button type="button" onClick={() => { setStep('read'); setError(''); }}
                                    className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">Буцах</button>
                                <button type="submit" disabled={processing || !reason.trim()}
                                    className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50">
                                    <XCircle className="size-4" /> Татгалзсанаа илгээх
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
