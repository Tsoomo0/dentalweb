import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    AlertCircle, ArrowDownToLine, ArrowUpRight, Building2, Calendar, CheckCircle2,
    FileSpreadsheet, Inbox, Landmark, Loader2, RotateCcw, ShieldCheck,
    Sparkles, Upload, Wand2, X, Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const MONTHS = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар','7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];

interface Branch { id: number; name: string }
interface Props  { branches: Branch[] }

interface BankItem {
    idx: number; datetime: string | null; time: string | null;
    amount: number; description: string; partner: string | null;
}
interface SystemItem {
    id: number; daily_sheet_id: number;
    patient_name: string | null; mobile_amount: number; created_at: string | null;
}
interface MatchedRow {
    entry: SystemItem; bank: BankItem;
    confidence: number;
    status: 'matched' | 'matched_low' | 'amount_only';
}
interface ReconcileResult {
    matched: MatchedRow[];
    system_only: { entry: SystemItem }[];
    bank_only:   { bank: BankItem }[];
    totals: {
        system_count: number; system_total: number;
        bank_count: number; bank_total: number;
        matched_count: number; matched_total: number;
        system_only_count: number; system_only_total: number;
        bank_only_count: number; bank_only_total: number;
    };
}
interface StatementInfo {
    account_number: string | null; account_holder: string | null;
    period_from: string | null; period_to: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ',           href: '/admin/dashboard' },
    { title: 'Банкны тулгалт',  href: '/admin/bank-reconciliation' },
];

function fmt(n: number): string { return n.toLocaleString(); }
function fmtCompact(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
    return String(n);
}
function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

export default function BankReconciliationIndex({ branches }: Props) {
    const now = new Date();
    const [branchId, setBranchId] = useState<number | ''>(branches[0]?.id ?? '');
    const [year, setYear]         = useState<number>(now.getFullYear());
    const [month, setMonth]       = useState<number>(now.getMonth() + 1);
    const [day, setDay]           = useState<number>(now.getDate());
    const [file, setFile]         = useState<File | null>(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [result, setResult]     = useState<ReconcileResult | null>(null);
    const [statement, setStatement] = useState<StatementInfo | null>(null);
    const [activeTab, setActiveTab] = useState<'issues' | 'matched'>('issues');

    const maxDay = daysInMonth(year, month);
    if (day > maxDay) setDay(maxDay);

    async function submit() {
        if (!branchId || !file) {
            setError('Салбар болон файл бөглөнө үү');
            return;
        }
        setError(null);
        setLoading(true);
        setResult(null);
        setStatement(null);

        try {
            const fd = new FormData();
            fd.append('branch_id', String(branchId));
            fd.append('year', String(year));
            fd.append('month', String(month));
            fd.append('day', String(day));
            fd.append('file', file);

            const xsrf = decodeURIComponent(
                document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
            );
            const csrfMeta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

            const res = await fetch('/admin/bank-reconciliation/check', {
                method: 'POST',
                headers: {
                    'X-XSRF-TOKEN': xsrf,
                    'X-CSRF-TOKEN': csrfMeta,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: fd,
                credentials: 'include',
            });

            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                if (j.errors && typeof j.errors === 'object') {
                    const msgs = Object.values(j.errors).flat();
                    throw new Error(msgs.join(' · ') || j.message || `HTTP ${res.status}`);
                }
                throw new Error(j.error || j.message || `HTTP ${res.status}`);
            }
            const j = await res.json();
            setResult(j.result);
            setStatement(j.statement);
            // Issue байгаа бол issues tab-аас эхэлнэ, үгүй бол matched
            const issues = (j.result.totals.system_only_count + j.result.totals.bank_only_count) > 0;
            setActiveTab(issues ? 'issues' : 'matched');
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Алдаа гарлаа');
        } finally {
            setLoading(false);
        }
    }

    function clearAll() {
        setResult(null);
        setStatement(null);
        setFile(null);
        setError(null);
    }

    const t = result?.totals;
    const issueCount = t ? t.system_only_count + t.bank_only_count : 0;
    const allOk = !!(result && issueCount === 0);
    const matchRate = t && t.system_count > 0 ? Math.round((t.matched_count / t.system_count) * 100) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Банкны тулгалт" />

            <div className="w-full flex flex-col gap-3 p-3 md:p-4 lg:p-5">

                {/* ════════ Premium toolbar ════════ */}
                <header className="relative rounded-2xl border bg-card overflow-hidden shadow-sm shadow-foreground/[0.02]">
                    {/* Top accent bar */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

                    {/* Header strip */}
                    <div className="relative flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-muted/30 via-transparent to-transparent border-b">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-xl bg-emerald-500/20 blur-md" />
                            <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-foreground to-foreground/80 text-background shadow-sm">
                                <Landmark className="size-4" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
                                Банкны мобайл тулгалт
                                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                    <Zap className="size-2.5" /> AI Match
                                </span>
                            </h1>
                            <p className="text-[11px] text-muted-foreground hidden md:block mt-0.5">
                                Хаан банкны хуулгаар өдрийн мобайл орлогуудыг автомат шалгана
                            </p>
                        </div>
                        {result && (
                            <button onClick={clearAll}
                                className="inline-flex items-center gap-1.5 rounded-lg border bg-card hover:bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                                <RotateCcw className="size-3" /> Цэвэрлэх
                            </button>
                        )}
                    </div>

                    {/* Filters strip */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto_1.5fr_auto] gap-2.5 p-3 bg-gradient-to-b from-muted/10 to-transparent">
                        <PremiumSelect icon={<Building2 className="size-3" />} label="Салбар" value={String(branchId)}
                            onChange={v => setBranchId(v ? Number(v) : '')}
                            options={[{ value: '', label: '— Сонгох —' }, ...branches.map(b => ({ value: String(b.id), label: b.name }))]} />

                        <PremiumSelect icon={<Calendar className="size-3" />} label="Он" value={String(year)} onChange={v => setYear(Number(v))} width="w-[92px]"
                            options={Array.from({ length: 6 }, (_, i) => now.getFullYear() - i).map(y => ({ value: String(y), label: String(y) }))} />

                        <PremiumSelect label="Сар" value={String(month)} onChange={v => setMonth(Number(v))} width="w-[112px]"
                            options={MONTHS.map((label, i) => ({ value: String(i + 1), label }))} />

                        <PremiumSelect label="Өдөр" value={String(day)} onChange={v => setDay(Number(v))} width="w-[76px]"
                            options={Array.from({ length: maxDay }, (_, i) => i + 1).map(d => ({ value: String(d), label: String(d) }))} />

                        <FilePicker file={file} onChange={setFile} />

                        <button onClick={submit} disabled={loading || !file || !branchId}
                            className="group relative inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-foreground to-foreground/85 hover:from-foreground hover:to-foreground/95 disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:cursor-not-allowed px-5 text-sm font-semibold text-background transition-all shadow-sm shadow-foreground/10 hover:shadow-md hover:shadow-foreground/20 active:scale-[0.98] h-[40px] mt-[20px] overflow-hidden">
                            {/* Shimmer effect */}
                            {!loading && file && branchId && (
                                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-background/20 to-transparent" />
                            )}
                            <span className="relative inline-flex items-center gap-1.5">
                                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5 transition-transform group-hover:rotate-12" />}
                                {loading ? 'Шалгаж байна' : 'Шалгах'}
                            </span>
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 px-3.5 py-2.5 flex items-start gap-2.5">
                        <AlertCircle className="size-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="flex-1 text-sm text-red-700 dark:text-red-300">{error}</p>
                        <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:opacity-70 rounded">
                            <X className="size-3.5" />
                        </button>
                    </div>
                )}

                {/* ════════ EMPTY STATE — Premium, compact ════════ */}
                {!result && !loading && (
                    <section className="relative rounded-2xl border bg-card overflow-hidden flex-1">
                        {/* Layered backgrounds */}
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/20 via-transparent to-blue-50/20 dark:from-emerald-950/10 dark:via-transparent dark:to-blue-950/10" />
                        <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
                            style={{
                                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }} />
                        <div className="absolute -top-32 -left-20 size-64 rounded-full bg-emerald-200/15 dark:bg-emerald-900/15 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-32 -right-20 size-64 rounded-full bg-blue-200/15 dark:bg-blue-900/15 blur-3xl pointer-events-none" />

                        <div className="relative grid lg:grid-cols-[1fr_1px_300px] h-full">
                            {/* Left: hero */}
                            <div className="flex flex-col items-center justify-center text-center px-6 py-8">
                                <div className="relative mb-4">
                                    <div className="absolute inset-0 rounded-2xl bg-emerald-300/30 dark:bg-emerald-700/30 blur-xl animate-pulse" />
                                    <div className="relative">
                                        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-card dark:from-emerald-950/60 dark:to-card border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10">
                                            <Landmark className="size-7" />
                                        </div>
                                        <div className="absolute -bottom-1.5 -right-1.5 flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-foreground to-foreground/80 text-background shadow-md">
                                            <Sparkles className="size-3" />
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold text-foreground tracking-tight">Шалгалт хийхэд бэлэн</h3>
                                <p className="text-xs text-muted-foreground mt-1.5 max-w-md leading-relaxed">
                                    Дээрх хэсгээс <strong className="text-foreground font-semibold">салбар</strong>, <strong className="text-foreground font-semibold">огноо</strong> сонгож <strong className="text-foreground font-semibold">хуулгаа</strong> оруулна уу. Smart алгоритм автоматаар нэр, дүн тулгана.
                                </p>

                                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                                    <FeaturePill icon={<Zap className="size-3" />}>Латин ↔ Кирилл</FeaturePill>
                                    <FeaturePill icon={<ShieldCheck className="size-3" />}>Алдагдалгүй</FeaturePill>
                                    <FeaturePill icon={<FileSpreadsheet className="size-3" />}>Excel · PDF</FeaturePill>
                                </div>
                            </div>

                            <div className="hidden lg:block bg-border/60" />

                            <div className="hidden lg:flex flex-col justify-center gap-1.5 px-5 py-6 bg-muted/10">
                                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Алхам</p>
                                <StepItem n={1} title="Хуулгаа татна" desc="Хаан банкны иБанкнаас .xlsx файл" />
                                <StepItem n={2} title="Огноо тогтоох" desc="Шалгах өдрөө сонгох" />
                                <StepItem n={3} title="Шалгах товч" desc="Систем автоматаар тулгана" />
                            </div>
                        </div>
                    </section>
                )}

                {/* ════════ RESULT VIEW ════════ */}
                {result && t && (
                    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">

                        {/* ─── Left: Hero Status Card ─── */}
                        <aside className={`relative rounded-2xl border overflow-hidden ${
                            allOk
                                ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/40'
                                : 'bg-red-50/30 dark:bg-red-950/10 border-red-200/60 dark:border-red-900/40'
                        }`}>
                            <div className={`absolute -top-20 -right-20 size-48 rounded-full blur-3xl pointer-events-none ${
                                allOk ? 'bg-emerald-300/15' : 'bg-red-300/15'
                            }`} />

                            <div className="relative p-5">
                                {/* Ring */}
                                <div className="flex items-center gap-4 mb-4">
                                    <ProgressRing percent={matchRate} color={allOk ? 'emerald' : 'red'} />
                                    <div className="min-w-0">
                                        <p className={`text-[10px] uppercase tracking-wider font-bold ${
                                            allOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                                        }`}>
                                            {allOk ? 'Зөрчилгүй' : `${issueCount} зөрчил`}
                                        </p>
                                        <p className="text-base font-semibold text-foreground tracking-tight mt-0.5">
                                            {allOk ? 'Бүх төлбөр зөв' : 'Анхааруулга'}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                                            {t.matched_count} / {t.system_count} тулгасан
                                        </p>
                                    </div>
                                </div>

                                {/* Stat grid 2x2 */}
                                <div className="grid grid-cols-2 gap-2">
                                    <MiniStat label="Системд" main={t.system_count} sub={`${fmtCompact(t.system_total)}₮`} />
                                    <MiniStat label="Банкинд"  main={t.bank_count}   sub={`${fmtCompact(t.bank_total)}₮`} />
                                    <MiniStat label="Тулгасан" main={t.matched_count} sub={`${fmtCompact(t.matched_total)}₮`} accent="emerald" />
                                    <MiniStat label="Зөрчилтэй" main={issueCount}
                                        sub={issueCount === 0 ? '✓' : `${fmtCompact(t.system_only_total + t.bank_only_total)}₮`}
                                        accent={issueCount === 0 ? 'emerald' : 'red'} />
                                </div>

                                {/* Statement info */}
                                {statement && (
                                    <div className="mt-4 pt-4 border-t border-border/60">
                                        <div className="space-y-1.5 text-[11px]">
                                            {statement.account_holder && (
                                                <div className="flex justify-between gap-2">
                                                    <span className="text-muted-foreground">Эзэмшигч</span>
                                                    <span className="font-semibold text-foreground truncate">{statement.account_holder}</span>
                                                </div>
                                            )}
                                            {statement.account_number && (
                                                <div className="flex justify-between gap-2">
                                                    <span className="text-muted-foreground">Данс</span>
                                                    <span className="font-mono font-semibold text-foreground">{statement.account_number}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between gap-2">
                                                <span className="text-muted-foreground">Огноо</span>
                                                <span className="font-mono font-semibold text-foreground tabular-nums">
                                                    {year}-{String(month).padStart(2, '0')}-{String(day).padStart(2, '0')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </aside>

                        {/* ─── Right: Tabbed details ─── */}
                        <section className="rounded-2xl border bg-card overflow-hidden flex flex-col min-h-[400px]">
                            {/* Tabs */}
                            <div className="flex items-center gap-1 border-b px-3 py-2 bg-muted/20">
                                <TabButton
                                    active={activeTab === 'issues'}
                                    onClick={() => setActiveTab('issues')}
                                    icon={<AlertCircle className="size-3.5" />}
                                    label="Зөрчил"
                                    count={issueCount}
                                    countColor={issueCount > 0 ? 'red' : 'neutral'}
                                />
                                <TabButton
                                    active={activeTab === 'matched'}
                                    onClick={() => setActiveTab('matched')}
                                    icon={<CheckCircle2 className="size-3.5" />}
                                    label="Тулгасан"
                                    count={result.matched.length}
                                    countColor="emerald"
                                />
                            </div>

                            {/* Tab content */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                {activeTab === 'issues' ? (
                                    <IssuesPanel result={result} totals={t} />
                                ) : (
                                    <MatchedPanel matches={result.matched} />
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

/* ─────────────────────────────────────────────────────
   Components
───────────────────────────────────────────────────── */

function PremiumSelect({ icon, label, value, onChange, options, width }: {
    icon?: React.ReactNode;
    label: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[]; width?: string;
}) {
    const hasValue = value !== '';
    return (
        <label className="block group">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground inline-flex items-center gap-1 mb-1">
                {icon && <span className="text-foreground/60 group-focus-within:text-emerald-600 transition-colors">{icon}</span>}
                {label}
            </span>
            <div className={`relative rounded-lg border transition-all shadow-sm shadow-foreground/[0.02] ${
                hasValue
                    ? 'border-foreground/15 bg-card hover:border-foreground/30 group-focus-within:border-foreground group-focus-within:ring-2 group-focus-within:ring-foreground/5'
                    : 'border-border bg-background hover:border-foreground/20 group-focus-within:border-foreground group-focus-within:ring-2 group-focus-within:ring-foreground/5'
            }`}>
                {/* Subtle inner highlight on selected */}
                {hasValue && (
                    <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent rounded-t-lg pointer-events-none" />
                )}

                <select value={value} onChange={e => onChange(e.target.value)}
                    className={`${width ?? 'w-full'} appearance-none bg-transparent px-3 py-2 pr-8 text-xs font-semibold text-foreground outline-none h-[40px] cursor-pointer`}>
                    {options.map(o => <option key={o.value} value={o.value} className="bg-card text-foreground py-2">{o.label}</option>)}
                </select>

                {/* Custom chevron with background plate */}
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none flex size-6 items-center justify-center rounded-md bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground transition-colors">
                    <svg className="size-2.5" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </span>
            </div>
        </label>
    );
}

function FeaturePill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm shadow-foreground/[0.02]">
            <span className="text-emerald-600 dark:text-emerald-400">{icon}</span>
            {children}
        </span>
    );
}

function StepItem({ n, title, desc }: { n: number; title: string; desc: string }) {
    return (
        <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-card/80 transition-colors">
            <div className="flex size-7 items-center justify-center rounded-lg bg-card border border-border text-[11px] font-bold text-foreground tabular-nums shadow-sm shadow-foreground/[0.02] flex-shrink-0">
                {n}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
            </div>
        </div>
    );
}

function FilePicker({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
    return (
        <label className="group">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground inline-flex items-center gap-1 mb-1">
                <Upload className="size-3 text-foreground/60 group-focus-within:text-emerald-600 transition-colors" />
                Хуулгын файл
            </span>
            <div className={`flex items-center gap-2 cursor-pointer rounded-lg border border-dashed h-[40px] px-3 transition-all ${
                file
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/15'
                    : 'border-border hover:border-foreground/40 hover:bg-muted/40'
            }`}>
                <input type="file" accept=".pdf,.xls,.xlsx,.csv" className="hidden"
                    onChange={e => onChange(e.target.files?.[0] ?? null)} />
                {file ? (
                    <>
                        <div className="flex size-6 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm flex-shrink-0">
                            <FileSpreadsheet className="size-3" />
                        </div>
                        <span className="flex-1 text-xs font-semibold text-foreground truncate">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums font-mono">{(file.size / 1024).toFixed(0)}KB</span>
                        <button type="button" onClick={(e) => { e.preventDefault(); onChange(null); }}
                            className="text-muted-foreground hover:text-foreground hover:bg-card rounded p-0.5 transition-colors">
                            <X className="size-3" />
                        </button>
                    </>
                ) : (
                    <>
                        <Upload className="size-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 text-xs text-muted-foreground">Excel <span className="text-foreground/60 font-semibold">(.xlsx санал болгож байна)</span> · PDF · CSV</span>
                    </>
                )}
            </div>
        </label>
    );
}

function ProgressRing({ percent, color }: { percent: number; color: 'emerald' | 'red' }) {
    const [animatedPercent, setAnimatedPercent] = useState(0);
    useEffect(() => {
        const id = setTimeout(() => setAnimatedPercent(percent), 50);
        return () => clearTimeout(id);
    }, [percent]);

    const radius = 32;
    const circ = 2 * Math.PI * radius;
    const offset = circ * (1 - animatedPercent / 100);

    const stroke = color === 'emerald' ? 'stroke-emerald-500' : 'stroke-red-500';
    const text   = color === 'emerald' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300';

    return (
        <div className="relative flex items-center justify-center size-20 flex-shrink-0">
            <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r={radius}
                    className="stroke-muted/60 fill-none"
                    strokeWidth="6" />
                <circle cx="40" cy="40" r={radius}
                    className={`${stroke} fill-none transition-all duration-1000 ease-out`}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset} />
            </svg>
            <span className={`absolute text-lg font-bold tabular-nums tracking-tight ${text}`}>{percent}%</span>
        </div>
    );
}

function MiniStat({ label, main, sub, accent }: {
    label: string; main: number; sub: string; accent?: 'emerald' | 'red';
}) {
    const color = accent === 'emerald'
        ? 'text-emerald-700 dark:text-emerald-300'
        : accent === 'red'
            ? 'text-red-700 dark:text-red-300'
            : 'text-foreground';
    return (
        <div className="rounded-lg bg-card/70 border border-border/50 px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
            <p className={`text-lg font-bold tabular-nums leading-none mt-0.5 tracking-tight ${color}`}>{main}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums truncate">{sub}</p>
        </div>
    );
}

function TabButton({ active, onClick, icon, label, count, countColor }: {
    active: boolean; onClick: () => void;
    icon: React.ReactNode; label: string; count: number;
    countColor: 'red' | 'emerald' | 'neutral';
}) {
    const countCls = countColor === 'red'
        ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
        : countColor === 'emerald'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-muted text-muted-foreground';
    return (
        <button onClick={onClick}
            className={`relative inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                active
                    ? 'bg-card shadow-sm text-foreground border'
                    : 'text-muted-foreground hover:text-foreground'
            }`}>
            {icon}
            {label}
            <span className={`inline-flex items-center justify-center rounded-full px-1.5 min-w-[18px] h-[18px] text-[10px] font-bold tabular-nums ${countCls}`}>
                {count}
            </span>
        </button>
    );
}

/* ─── Issues panel — system_only + bank_only ─── */
function IssuesPanel({ result, totals: t }: {
    result: ReconcileResult; totals: NonNullable<ReconcileResult['totals']>;
}) {
    if (t.system_only_count === 0 && t.bank_only_count === 0) {
        return (
            <div className="flex-1 flex items-center justify-center py-12 px-6 text-center">
                <div>
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-3">
                        <CheckCircle2 className="size-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Зөрчил байхгүй</h3>
                    <p className="text-xs text-muted-foreground mt-1">Бүх төлбөр банкны хуулгад зөв тулгасан.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {/* System only */}
            {result.system_only.length > 0 && (
                <div>
                    <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b px-4 py-2.5 flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-md bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400">
                            <ArrowDownToLine className="size-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-foreground">Банкинд орж ирээгүй</h4>
                            <p className="text-[10px] text-muted-foreground">Систем дээр бичигдсэн ч банкинд харагдаагүй</p>
                        </div>
                        <span className="text-[10px] font-semibold text-red-700 dark:text-red-400 tabular-nums">
                            {fmt(t.system_only_total)}₮
                        </span>
                    </div>
                    <table className="w-full text-sm">
                        <tbody className="divide-y">
                            {result.system_only.map(s => (
                                <tr key={s.entry.id} className="hover:bg-muted/30">
                                    <td className="px-4 py-2.5">
                                        <p className="font-medium text-foreground truncate">{s.entry.patient_name || '—'}</p>
                                        <p className="text-[10px] text-muted-foreground tabular-nums">#{s.entry.id} · {s.entry.created_at ?? '—'}</p>
                                    </td>
                                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                        <span className="text-sm font-bold tabular-nums text-red-700 dark:text-red-400">
                                            {fmt(s.entry.mobile_amount)}₮
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Bank only */}
            {result.bank_only.length > 0 && (
                <div>
                    <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-t px-4 py-2.5 flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                            <ArrowUpRight className="size-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-foreground">Зөвхөн банкинд</h4>
                            <p className="text-[10px] text-muted-foreground">Банкинд орсон ч системд бүртгэгдээгүй</p>
                        </div>
                        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                            {fmt(t.bank_only_total)}₮
                        </span>
                    </div>
                    <table className="w-full text-sm">
                        <tbody className="divide-y">
                            {result.bank_only.map((b, i) => (
                                <tr key={i} className="hover:bg-muted/30">
                                    <td className="px-4 py-2.5">
                                        <p className="font-medium text-foreground truncate">{b.bank.description || '—'}</p>
                                        <p className="text-[10px] text-muted-foreground tabular-nums font-mono">
                                            {b.bank.time ?? ''} {b.bank.partner ? `· ${b.bank.partner}` : ''}
                                        </p>
                                    </td>
                                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                        <span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
                                            {fmt(b.bank.amount)}₮
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/* ─── Matched panel ─── */
function MatchedPanel({ matches }: { matches: MatchedRow[] }) {
    if (matches.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center py-12 px-6 text-center text-muted-foreground text-sm">
                Тулгасан төлбөр алга.
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
                    <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-2.5 text-left font-semibold">Системд</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Банкинд</th>
                        <th className="px-4 py-2.5 text-right font-semibold w-24">Дүн</th>
                        <th className="px-4 py-2.5 text-center font-semibold w-20">Итгэл</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {matches.map((m, i) => (
                        <tr key={i} className="hover:bg-muted/30 group">
                            <td className="px-4 py-2.5">
                                <p className="font-medium text-foreground truncate">{m.entry.patient_name || '—'}</p>
                                <p className="text-[10px] text-muted-foreground tabular-nums">#{m.entry.id} · {m.entry.created_at ?? ''}</p>
                            </td>
                            <td className="px-4 py-2.5 max-w-[260px]">
                                <p className="text-foreground truncate text-xs">{m.bank.description || '—'}</p>
                                <p className="text-[10px] text-muted-foreground tabular-nums font-mono">{m.bank.time ?? ''}</p>
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap">{fmt(m.bank.amount)}₮</td>
                            <td className="px-4 py-2.5 text-center">
                                <Confidence confidence={m.confidence} status={m.status} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Confidence({ confidence, status }: { confidence: number; status: 'matched' | 'matched_low' | 'amount_only' }) {
    if (status === 'amount_only') {
        return (
            <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                Дүн л
            </span>
        );
    }
    if (status === 'matched_low') {
        return (
            <span className="inline-flex items-center text-[10px] font-semibold text-yellow-700 dark:text-yellow-300 tabular-nums">
                {confidence}%
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
            <span className="size-1 rounded-full bg-emerald-500" />
            {confidence}%
        </span>
    );
}
