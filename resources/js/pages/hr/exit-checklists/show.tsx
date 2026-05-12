import AppLayout from '@/layouts/app-layout';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft, BadgeCheck, Briefcase, CheckCircle2, CheckSquare,
    ChevronDown, ChevronUp, DollarSign, FileText, Key,
    Laptop, LogOut, RefreshCw, Save, Square, UserX,
} from 'lucide-react';
import { useState } from 'react';

interface Checklist {
    id: number;
    employee_id: number;
    employee_name: string;
    employee_number: string;
    position: string | null;
    branch: string | null;
    hired_date: string | null;
    exit_date: string;
    exit_type: string;
    reason: string | null;
    notice_date: string | null;
    replacement_plan: string | null;
    item_equipment_returned: boolean;
    item_badge_returned: boolean;
    item_keys_returned: boolean;
    item_books_returned: boolean;
    item_uniform_returned: boolean;
    notes_property: string | null;
    item_system_access_revoked: boolean;
    item_email_deactivated: boolean;
    item_files_transferred: boolean;
    notes_it: string | null;
    item_final_salary_processed: boolean;
    item_advances_settled: boolean;
    item_insurance_notified: boolean;
    item_tax_notified: boolean;
    notes_finance: string | null;
    item_handover_completed: boolean;
    item_exit_interview_done: boolean;
    item_certificate_issued: boolean;
    eligible_for_rehire: boolean;
    exit_interview_notes: string | null;
    notes_general: string | null;
    status: string;
    progress: number;
    completed_count: number;
    total_items: number;
    completed_by: string | null;
    completed_at: string | null;
    created_at: string;
}
interface PageProps { checklist: Checklist; [key: string]: unknown }

const EXIT_TYPES = [
    { value: 'resignation',  label: 'Өөрийн хүсэлтээр',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',         border: 'border-blue-400' },
    { value: 'termination',  label: 'Халагдсан',           color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',             border: 'border-red-400' },
    { value: 'contract_end', label: 'Гэрээ дуусгавар',    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', border: 'border-orange-400' },
    { value: 'retirement',   label: 'Тэтгэвэр',           color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', border: 'border-emerald-400' },
    { value: 'death',        label: 'Нас барсан',         color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',            border: 'border-gray-400' },
    { value: 'other',        label: 'Бусад',              color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', border: 'border-violet-400' },
];

const EXIT_TYPE_MAP: Record<string, { label: string; color: string }> = Object.fromEntries(
    EXIT_TYPES.map(t => [t.value, { label: t.label, color: t.color }])
);

function ProgressRing({ value }: { value: number }) {
    const r = 32, c = 2 * Math.PI * r;
    const dash = (value / 100) * c;
    const color = value === 100 ? '#10b981' : value > 50 ? '#3b82f6' : '#f59e0b';
    return (
        <svg width="80" height="80" className="-rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor"
                className="text-gray-100 dark:text-gray-800" strokeWidth="7" />
            <circle cx="40" cy="40" r={r} fill="none" stroke={color}
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${dash} ${c}`} />
        </svg>
    );
}

function CheckItem({ checked, label, onChange, disabled }: {
    checked: boolean; label: string; onChange: (v: boolean) => void; disabled: boolean;
}) {
    return (
        <button type="button" onClick={() => !disabled && onChange(!checked)}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all border
                ${checked
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                    : 'bg-background border-border hover:border-gray-400'}
                ${disabled ? 'cursor-default' : 'cursor-pointer'}`}>
            {checked
                ? <CheckSquare className="size-4 text-emerald-500 shrink-0" />
                : <Square className="size-4 text-muted-foreground shrink-0" />}
            <span className={`text-sm ${checked
                ? 'text-emerald-800 dark:text-emerald-300 line-through decoration-emerald-400'
                : 'text-gray-700 dark:text-gray-300'}`}>
                {label}
            </span>
        </button>
    );
}

function Section({ title, icon: Icon, color, items, notesKey, data, disabled, onItem, onNotes }: {
    title: string; icon: React.ElementType; color: string;
    items: { key: string; label: string }[];
    notesKey: string;
    data: Record<string, boolean | string | null | number>;
    disabled: boolean;
    onItem: (key: string, val: boolean) => void;
    onNotes: (key: string, val: string) => void;
}) {
    const [open, setOpen] = useState(true);
    const done = items.filter(i => data[i.key]).length;
    return (
        <div className="rounded-2xl border bg-card overflow-hidden">
            <button type="button" onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                <div className={`size-8 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                    <Icon className="size-4" />
                </div>
                <span className="text-sm font-bold flex-1 text-left">{title}</span>
                <span className={`text-xs font-semibold tabular-nums mr-1 px-2 py-0.5 rounded-full
                    ${done === items.length
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'}`}>
                    {done}/{items.length}
                </span>
                {open ? <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-2 border-t border-border/40 pt-3">
                    {items.map(item => (
                        <CheckItem key={item.key}
                            checked={!!data[item.key]} label={item.label}
                            onChange={v => onItem(item.key, v)} disabled={disabled} />
                    ))}
                    <textarea value={(data[notesKey] as string) ?? ''}
                        onChange={e => onNotes(notesKey, e.target.value)}
                        disabled={disabled} rows={2} placeholder="Тэмдэглэл..."
                        className="w-full rounded-xl border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 text-muted-foreground disabled:opacity-50 mt-1" />
                </div>
            )}
        </div>
    );
}

export default function ExitChecklistShow() {
    const { checklist: c } = usePage<PageProps>().props;
    const isCompleted = c.status === 'completed';
    const exitCfg = EXIT_TYPE_MAP[c.exit_type] ?? EXIT_TYPE_MAP.other;

    const { data, setData, put, processing } = useForm<Record<string, boolean | string | null>>({
        exit_date: c.exit_date, exit_type: c.exit_type,
        reason: c.reason ?? '', notice_date: c.notice_date ?? '',
        replacement_plan: c.replacement_plan ?? '',
        item_equipment_returned: c.item_equipment_returned,
        item_badge_returned: c.item_badge_returned,
        item_keys_returned: c.item_keys_returned,
        item_books_returned: c.item_books_returned,
        item_uniform_returned: c.item_uniform_returned,
        notes_property: c.notes_property ?? '',
        item_system_access_revoked: c.item_system_access_revoked,
        item_email_deactivated: c.item_email_deactivated,
        item_files_transferred: c.item_files_transferred,
        notes_it: c.notes_it ?? '',
        item_final_salary_processed: c.item_final_salary_processed,
        item_advances_settled: c.item_advances_settled,
        item_insurance_notified: c.item_insurance_notified,
        item_tax_notified: c.item_tax_notified,
        notes_finance: c.notes_finance ?? '',
        item_handover_completed: c.item_handover_completed,
        item_exit_interview_done: c.item_exit_interview_done,
        item_certificate_issued: c.item_certificate_issued,
        eligible_for_rehire: c.eligible_for_rehire,
        exit_interview_notes: c.exit_interview_notes ?? '',
        notes_general: c.notes_general ?? '',
    });

    function save() { put(`/hr/exit-checklists/${c.id}`, { preserveScroll: true }); }

    function handleComplete() {
        if (!confirm('Бүртгэлийг дуусгах уу? Ажилтны статус "Идэвхгүй" болно.')) return;
        router.post(`/hr/exit-checklists/${c.id}/complete`);
    }
    function handleReopen() {
        if (!confirm('Бүртгэлийг дахин нээх үү?')) return;
        router.post(`/hr/exit-checklists/${c.id}/reopen`);
    }

    const SECTIONS = [
        {
            title: 'Эд хөрөнгө буцаах', icon: Key, notesKey: 'notes_property',
            color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
            items: [
                { key: 'item_equipment_returned', label: 'Тоног төхөөрөмж буцаагдсан' },
                { key: 'item_badge_returned',     label: 'Нэрийн хуудас / Карт буцаагдсан' },
                { key: 'item_keys_returned',      label: 'Түлхүүр / Нэвтрэх карт буцаагдсан' },
                { key: 'item_books_returned',     label: 'Номын сангийн ном буцаагдсан' },
                { key: 'item_uniform_returned',   label: 'Хувцас / Дүрэмт хувцас буцаагдсан' },
            ],
        },
        {
            title: 'Мэдээллийн технологи', icon: Laptop, notesKey: 'notes_it',
            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
            items: [
                { key: 'item_system_access_revoked', label: 'Системийн эрх хаагдсан' },
                { key: 'item_email_deactivated',     label: 'Имэйл хаяг идэвхгүй болсон' },
                { key: 'item_files_transferred',     label: 'Файл / Мэдээлэл шилжүүлсэн' },
            ],
        },
        {
            title: 'Санхүүгийн тооцоо', icon: DollarSign, notesKey: 'notes_finance',
            color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
            items: [
                { key: 'item_final_salary_processed', label: 'Эцсийн цалин тооцоолсон' },
                { key: 'item_advances_settled',       label: 'Зээл / Урьдчилгаа тооцоо хийгдсэн' },
                { key: 'item_insurance_notified',     label: 'НДШ байгууллагад мэдэгдсэн' },
                { key: 'item_tax_notified',           label: 'Татварын байгууллагад мэдэгдсэн' },
            ],
        },
        {
            title: 'Удирдлага & Баримт', icon: Briefcase, notesKey: 'notes_general',
            color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
            items: [
                { key: 'item_handover_completed',  label: 'Ажлын хүлээлгэн өгөлт хийгдсэн' },
                { key: 'item_exit_interview_done', label: 'Гарах ярилцлага хийгдсэн' },
                { key: 'item_certificate_issued',  label: 'Ажилласны тодорхойлолт олгосон' },
            ],
        },
    ];

    const progressColor = c.progress === 100 ? '#10b981' : c.progress > 50 ? '#3b82f6' : '#f59e0b';

    return (
        <AppLayout breadcrumbs={[
            { title: 'HR', href: '/hr/employees' },
            { title: 'Гарах бүртгэл', href: '/hr/exit-checklists' },
            { title: c.employee_name, href: `/hr/exit-checklists/${c.id}` },
        ]}>
            <div className="flex flex-col h-full">

                {/* ── Top bar ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-card shrink-0">
                    <div className="flex items-center gap-3">
                        <Link href="/hr/exit-checklists"
                            className="rounded-xl border p-2 text-muted-foreground hover:bg-muted transition-colors">
                            <ArrowLeft className="size-4" />
                        </Link>
                        <div>
                            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <LogOut className="size-4 text-red-500" /> Гарах бүртгэл
                                {isCompleted && (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center gap-1">
                                        <BadgeCheck className="size-3" /> Дуусгасан
                                    </span>
                                )}
                            </h1>
                            <p className="text-xs text-muted-foreground">#{c.id} · {c.created_at}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isCompleted ? (
                            <button onClick={handleReopen}
                                className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
                                <RefreshCw className="size-3.5" /> Дахин нээх
                            </button>
                        ) : (
                            <>
                                <button onClick={save} disabled={processing}
                                    className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                                    {processing
                                        ? <span className="size-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
                                        : <Save className="size-3.5" />}
                                    Хадгалах
                                </button>
                                <button onClick={handleComplete}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm">
                                    <CheckCircle2 className="size-4" />
                                    Бүртгэл дуусгах
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Employee summary strip ───────────────────────────────── */}
                <div className="flex items-center gap-6 px-6 py-4 border-b bg-muted/20 shrink-0">
                    {/* Progress ring */}
                    <div className="relative shrink-0">
                        <ProgressRing value={c.progress} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-black tabular-nums" style={{ color: progressColor }}>
                                {c.progress}%
                            </span>
                        </div>
                    </div>
                    {/* Employee info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{c.employee_name}</span>
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${exitCfg.color}`}>
                                {exitCfg.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 mt-0.5 flex-wrap text-xs text-muted-foreground">
                            {c.employee_number && <span className="font-mono">{c.employee_number}</span>}
                            {c.position && <span>{c.position}</span>}
                            {c.branch && <span>· {c.branch}</span>}
                        </div>
                    </div>
                    {/* Key dates */}
                    <div className="hidden md:flex items-center gap-6 shrink-0 text-sm">
                        {c.hired_date && (
                            <div className="text-center">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ажилд орсон</p>
                                <p className="font-semibold">{c.hired_date}</p>
                            </div>
                        )}
                        <div className="text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Гарах өдөр</p>
                            <p className="font-bold text-red-600">{c.exit_date}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Даалгавар</p>
                            <p className="font-semibold tabular-nums">{c.completed_count}/{c.total_items}</p>
                        </div>
                        {isCompleted && c.completed_by && (
                            <div className="text-center">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Дуусгасан</p>
                                <p className="font-semibold">{c.completed_by}</p>
                                <p className="text-[10px] text-muted-foreground">{c.completed_at}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Completed banner ─────────────────────────────────────── */}
                {isCompleted && (
                    <div className="flex items-center gap-3 px-6 py-3 border-b bg-emerald-50 dark:bg-emerald-950/20 shrink-0">
                        <UserX className="size-5 text-emerald-600 shrink-0" />
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                            Гарах бүртгэл дуусгагдсан — ажилтны статус автоматаар <strong>"Идэвхгүй"</strong> болсон.
                        </p>
                    </div>
                )}

                {/* ── Two-column body ──────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">

                        {/* LEFT — Basic info + Exit interview */}
                        <div className="space-y-5">

                            {/* Exit info card */}
                            <div className="rounded-2xl border bg-card p-5 space-y-4">
                                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <FileText className="size-4 text-muted-foreground" /> Гарах мэдээлэл
                                </h2>

                                {/* Exit type */}
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Гарах шалтгаан</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {EXIT_TYPES.map(t => (
                                            <button key={t.value} type="button"
                                                disabled={isCompleted}
                                                onClick={() => setData('exit_type', t.value)}
                                                className={`rounded-xl border-2 px-3 py-2 text-xs font-semibold text-left transition-all disabled:cursor-default
                                                    ${data.exit_type === t.value ? `${t.color} ${t.border}` : 'border-border text-muted-foreground hover:border-gray-400'}`}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Сүүлийн ажлын өдөр *</label>
                                        <input type="date" value={data.exit_date as string}
                                            onChange={e => setData('exit_date', e.target.value)}
                                            disabled={isCompleted}
                                            className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-60" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Мэдэгдсэн огноо</label>
                                        <input type="date" value={data.notice_date as string}
                                            onChange={e => setData('notice_date', e.target.value)}
                                            disabled={isCompleted}
                                            className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-60" />
                                    </div>
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Дэлгэрэнгүй шалтгаан</label>
                                    <textarea value={data.reason as string}
                                        onChange={e => setData('reason', e.target.value)}
                                        disabled={isCompleted} rows={3}
                                        placeholder="Ажилтан яагаад гарсан талаар..."
                                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-60" />
                                </div>

                                {/* Replacement */}
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Орлох ажилтны төлөвлөгөө</label>
                                    <input value={data.replacement_plan as string}
                                        onChange={e => setData('replacement_plan', e.target.value)}
                                        disabled={isCompleted}
                                        placeholder="Хэн орлох, хэзээ авах эсэх..."
                                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-60" />
                                </div>
                            </div>

                            {/* Exit interview + rehire */}
                            <div className="rounded-2xl border bg-card p-5 space-y-4">
                                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Гарах ярилцлага</h2>

                                {/* Rehire toggle */}
                                <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3 bg-muted/30">
                                    <div>
                                        <p className="text-sm font-medium">Дахин ажилд авах боломжтой</p>
                                        <p className="text-xs text-muted-foreground">Ирээдүйд дахин авч болох уу?</p>
                                    </div>
                                    <button type="button" disabled={isCompleted}
                                        onClick={() => setData('eligible_for_rehire', !data.eligible_for_rehire)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors disabled:cursor-default
                                            ${data.eligible_for_rehire
                                                ? 'bg-emerald-500 border-emerald-500'
                                                : 'bg-gray-200 border-gray-200 dark:bg-gray-700 dark:border-gray-700'}`}>
                                        <span className={`inline-block size-4 mt-0.5 rounded-full bg-white shadow transition-transform
                                            ${data.eligible_for_rehire ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>

                                {/* Interview notes */}
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Ярилцлагын тэмдэглэл</label>
                                    <textarea value={data.exit_interview_notes as string}
                                        onChange={e => setData('exit_interview_notes', e.target.value)}
                                        disabled={isCompleted} rows={5}
                                        placeholder="Ярилцлагын үеэр гарсан санал, хүсэлт..."
                                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60" />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT — Checklist sections */}
                        <div className="space-y-4">
                            {SECTIONS.map(sec => (
                                <Section key={sec.notesKey}
                                    title={sec.title} icon={sec.icon}
                                    color={sec.color} items={sec.items}
                                    notesKey={sec.notesKey}
                                    data={data as Record<string, boolean | string | null | number>}
                                    disabled={isCompleted}
                                    onItem={(key, val) => setData(key as keyof typeof data, val)}
                                    onNotes={(key, val) => setData(key as keyof typeof data, val)} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
