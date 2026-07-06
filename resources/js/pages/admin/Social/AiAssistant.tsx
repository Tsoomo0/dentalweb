import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, BookOpen, Bot, Check, ChevronDown, Cpu, Database, FileText, Layers, MessageSquarePlus, Plus, RotateCcw, ScrollText, Send, Sparkles, Trash2, Upload, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface FaqRow {
    id: number;
    question: string;
    answer: string;
    is_active: boolean;
}
interface Props {
    setting: { enabled: boolean; provider: string; mode: string; system_rules: string; extra_knowledge: string; model: string };
    defaults: { rules: string; gemini_model: string; groq_model: string };
    status: { gemini: boolean; groq: boolean };
    faqs: FaqRow[];
    knowledge_preview: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'AI туслах', href: '/admin/social/ai' },
];

type ChatLine = { role: 'user' | 'ai'; text: string; handoff?: boolean; error?: boolean };
type FaqItem = { id: number | null; question: string; answer: string; is_active: boolean; saving?: boolean; saved?: boolean };

// Зөвхөн FAQ (retrieval) горим харуулна. Gemini авах үед false болгоход "AI зохиох" бүх хэсэг сэргэнэ.
const RETRIEVAL_ONLY = true;

function Label({ icon: Icon, color, children }: { icon: React.ElementType; color: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2">
            <Icon className={`h-3.5 w-3.5 ${color}`} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</span>
        </div>
    );
}

export default function AiAssistant({ setting, defaults, status, faqs, knowledge_preview }: Props) {
    const form = useForm({
        enabled: setting.enabled,
        provider: RETRIEVAL_ONLY ? 'groq' : setting.provider || 'gemini',
        mode: RETRIEVAL_ONLY ? 'retrieval' : setting.mode || 'generative',
        system_rules: setting.system_rules,
        extra_knowledge: setting.extra_knowledge,
        model: setting.model,
    });

    const isGroq = form.data.provider === 'groq';
    const isRetrieval = form.data.mode === 'retrieval';
    const activeKey = isGroq ? status.groq : status.gemini;
    const modelPlaceholder = isGroq ? defaults.groq_model : defaults.gemini_model;

    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [showKnowledge, setShowKnowledge] = useState(false);

    const [testInput, setTestInput] = useState('');
    const [testing, setTesting] = useState(false);
    const [chat, setChat] = useState<ChatLine[]>([]);
    const chatEnd = useRef<HTMLDivElement>(null);

    const [faqList, setFaqList] = useState<FaqItem[]>(faqs.map((f) => ({ ...f })));
    const [saveError, setSaveError] = useState<string | null>(null);
    const faqFileRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat, testing]);

    function save() {
        setSaveError(null);
        form.put('/admin/social/ai', {
            preserveScroll: true,
            onError: (errors) => setSaveError((Object.values(errors)[0] as string) || 'Хадгалахад алдаа гарлаа.'),
        });
    }

    /* ── FAQ ─────────────────────────────────────────────── */
    function addFaq() {
        setFaqList((l) => [...l, { id: null, question: '', answer: '', is_active: true }]);
    }
    function setFaqField(i: number, field: 'question' | 'answer', value: string) {
        setFaqList((l) => l.map((f, idx) => (idx === i ? { ...f, [field]: value, saved: false } : f)));
    }
    async function saveFaq(i: number) {
        const f = faqList[i];
        if (!f.question.trim() || !f.answer.trim()) return;
        setFaqList((l) => l.map((x, idx) => (idx === i ? { ...x, saving: true } : x)));
        try {
            if (f.id == null) {
                const { data } = await axios.post('/admin/social/ai/faqs', { question: f.question, answer: f.answer });
                setFaqList((l) => l.map((x, idx) => (idx === i ? { ...x, id: data.faq.id, saving: false, saved: true } : x)));
            } else {
                await axios.put(`/admin/social/ai/faqs/${f.id}`, { question: f.question, answer: f.answer, is_active: f.is_active });
                setFaqList((l) => l.map((x, idx) => (idx === i ? { ...x, saving: false, saved: true } : x)));
            }
        } catch {
            setFaqList((l) => l.map((x, idx) => (idx === i ? { ...x, saving: false } : x)));
        }
    }
    async function deleteFaq(i: number) {
        const f = faqList[i];
        if (f.id != null) {
            try {
                await axios.delete(`/admin/social/ai/faqs/${f.id}`);
            } catch {
                /* үл ойшоох */
            }
        }
        setFaqList((l) => l.filter((_, idx) => idx !== i));
    }
    async function onImportFaqs(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        setSaveError(null);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const { data } = await axios.post('/admin/social/ai/faqs/import', fd);
            if (data.ok) setFaqList((l) => [...l, ...data.faqs.map((f: FaqRow) => ({ ...f }))]);
            else setSaveError(data.error);
        } catch {
            setSaveError('Файл импортлоход алдаа гарлаа.');
        } finally {
            setImporting(false);
            if (faqFileRef.current) faqFileRef.current.value = '';
        }
    }

    async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadMsg(null);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const { data } = await axios.post('/admin/social/ai/document', fd);
            if (data.ok) {
                const prev = form.data.extra_knowledge?.trim();
                form.setData('extra_knowledge', (prev ? prev + '\n\n' : '') + `# ${data.name}\n${data.text}`);
                setUploadMsg({ ok: true, text: `${data.name} — ${data.text.length.toLocaleString('mn-MN')} тэмдэгт нэмэгдлээ` });
            } else {
                setUploadMsg({ ok: false, text: data.error });
            }
        } catch {
            setUploadMsg({ ok: false, text: 'Файл боловсруулж чадсангүй.' });
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    }

    async function runTest() {
        const msg = testInput.trim();
        if (!msg || testing) return;
        const history = chat.filter((m) => !m.error).map((m) => ({ role: m.role, text: m.text }));
        setChat((c) => [...c, { role: 'user', text: msg }]);
        setTestInput('');
        setTesting(true);
        try {
            const { data } = await axios.post('/admin/social/ai/test', { message: msg, history });
            if (data.ok) setChat((c) => [...c, { role: 'ai', text: data.answer, handoff: data.handoff }]);
            else setChat((c) => [...c, { role: 'ai', text: data.error, error: true }]);
        } catch {
            setChat((c) => [...c, { role: 'ai', text: 'Сүлжээний алдаа гарлаа.', error: true }]);
        } finally {
            setTesting(false);
        }
    }

    const input = 'w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';
    const card = 'rounded-2xl border border-border/60 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors duration-300 hover:border-indigo-300/60 dark:hover:border-indigo-800/60';
    const enter = 'animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="AI туслах" />

            <div className="flex min-h-full flex-col bg-gradient-to-b from-indigo-50/40 via-transparent to-transparent font-warm dark:from-indigo-950/10">
                {/* ── Sticky header ───────────────────────────────────────── */}
                <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-background/70 px-6 py-4 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-3.5">
                        <span className="relative">
                            <span className="absolute -inset-1 animate-pulse rounded-2xl bg-indigo-500/40 blur-lg" />
                            <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                                <Sparkles className="h-5 w-5" />
                            </span>
                        </span>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">AI туслах</h1>
                            <p className="text-[13px] text-muted-foreground">{RETRIEVAL_ONLY ? 'Урсгал + FAQ агуулгаас хүн шиг хариулна' : 'Мэдээллээ өг · дүрмээ тавь · AI хариулна'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => form.setData('enabled', !form.data.enabled)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-300 ${form.data.enabled ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-border bg-muted text-muted-foreground'}`}
                        >
                            <span className={`h-1.5 w-1.5 rounded-full transition-colors ${form.data.enabled ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                            {form.data.enabled ? 'Идэвхтэй' : 'Унтраалттай'}
                        </button>
                        <button
                            type="button"
                            onClick={save}
                            disabled={form.processing}
                            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-95 disabled:opacity-60"
                        >
                            {form.recentlySuccessful && <Check className="h-4 w-4 animate-in zoom-in duration-300" />}
                            {form.processing ? 'Хадгалж байна…' : form.recentlySuccessful ? 'Хадгалагдлаа' : 'Хадгалах'}
                        </button>
                    </div>
                </header>

                {/* ── Key анхааруулга ─────────────────────────────────────── */}
                {!activeKey && (
                    <div className="mx-6 mt-6 flex items-start gap-2.5 rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-800 animate-in fade-in slide-in-from-top-1 duration-500 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                            <b>{isGroq ? 'GROQ_API_KEY' : 'GEMINI_API_KEY'} алга.</b>{' '}
                            <a href={isGroq ? 'https://console.groq.com' : 'https://aistudio.google.com'} target="_blank" rel="noopener" className="underline underline-offset-2">
                                {isGroq ? 'console.groq.com' : 'aistudio.google.com'}
                            </a>
                            -оос үнэгүй авч <code>.env</code>-д <code>{isGroq ? 'GROQ_API_KEY' : 'GEMINI_API_KEY'}</code> нэмээд <code>php artisan config:clear</code> хийнэ үү.
                        </span>
                    </div>
                )}

                {saveError && (
                    <div className="mx-6 mt-6 flex items-start gap-2.5 rounded-2xl border border-red-300/50 bg-red-50 p-4 text-sm text-red-700 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span><b>Хадгалах алдаа:</b> {saveError}</span>
                    </div>
                )}

                {/* ── Бүтэн дэлгэц: 2 багана ───────────────────────────────── */}
                <div className="grid flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
                    {/* ═══ Зүүн: тохиргоо ═══ */}
                    <div className="space-y-6">
                        {!RETRIEVAL_ONLY && (
                        <>
                        {/* Провайдер */}
                        <section className={`${card} ${enter}`} style={{ animationDelay: '20ms' }}>
                            <div className="mb-3">
                                <Label icon={Bot} color="text-indigo-500">AI провайдер</Label>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'gemini', name: 'Gemini', hint: 'Чанар сайн · хязгаар бага', hasKey: status.gemini },
                                    { id: 'groq', name: 'Groq', hint: 'Үнэгүй · өгөөмөр', hasKey: status.groq },
                                ].map((p) => {
                                    const active = form.data.provider === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => form.setData('provider', p.id)}
                                            className={`rounded-xl border p-3 text-left transition-all duration-300 ${active ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20 dark:bg-indigo-950/30' : 'border-border/60 hover:border-indigo-300 hover:bg-muted/40'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold">{p.name}</span>
                                                {active && <Check className="h-4 w-4 text-indigo-500 animate-in zoom-in duration-300" />}
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-muted-foreground">{p.hint}</div>
                                            <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${p.hasKey ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                                                <span className={`h-1 w-1 rounded-full ${p.hasKey ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                                                {p.hasKey ? 'Түлхүүртэй' : 'Түлхүүр алга'}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Горим */}
                        <section className={`${card} ${enter}`} style={{ animationDelay: '50ms' }}>
                            <div className="mb-3">
                                <Label icon={Layers} color="text-violet-500">Хариултын горим</Label>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'retrieval', name: 'FAQ (санал болгож буй)', hint: 'Хүн бичсэн тогтмол хариу · төгс монгол' },
                                    { id: 'generative', name: 'AI зохиох', hint: 'AI өөрөө найруулна · чанар моделоос' },
                                ].map((m) => {
                                    const active = form.data.mode === m.id;
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => form.setData('mode', m.id)}
                                            className={`rounded-xl border p-3 text-left transition-all duration-300 ${active ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/20 dark:bg-violet-950/30' : 'border-border/60 hover:border-violet-300 hover:bg-muted/40'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold">{m.name}</span>
                                                {active && <Check className="h-4 w-4 text-violet-500 animate-in zoom-in duration-300" />}
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-muted-foreground">{m.hint}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                        </>
                        )}

                        {/* ── Retrieval: FAQ засварлагч ── */}
                        {isRetrieval && (
                            <section className={`${card} ${enter}`} style={{ animationDelay: '90ms' }}>
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <Label icon={MessageSquarePlus} color="text-emerald-500">FAQ хариултууд</Label>
                                    <div className="flex items-center gap-2">
                                        <label className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs font-medium transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/30 ${importing ? 'pointer-events-none opacity-60' : ''}`}>
                                            <Upload className={`h-3.5 w-3.5 ${importing ? 'animate-bounce' : ''}`} /> {importing ? 'Импортлож…' : 'Word/PDF импорт'}
                                            <input ref={faqFileRef} type="file" accept=".pdf,.docx" onChange={onImportFaqs} className="hidden" />
                                        </label>
                                        <button type="button" onClick={addFaq} className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs font-medium transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30">
                                            <Plus className="h-3.5 w-3.5" /> Нэмэх
                                        </button>
                                    </div>
                                </div>
                                <p className="mb-4 text-[11px] text-muted-foreground">
                                    <b>Word/PDF импорт</b> — файлаа оруулбал автоматаар FAQ болгож хуваана (асуулт-хариултыг хоосон мөрөөр тусгаарлаж бичсэн байвал сайн). Эсвэл гараар <b>Нэмэх</b>. <code>{'{{'}phone{'}}'}</code>, <code>{'{{'}working_hours{'}}'}</code> автоматаар орно.
                                </p>

                                <div className="space-y-3">
                                    {faqList.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-border/70 py-8 text-center text-sm text-muted-foreground">
                                            Хараахан FAQ алга. <b>"Нэмэх"</b> дарж эхлүүлээрэй.
                                        </div>
                                    )}
                                    {faqList.map((f, i) => (
                                        <div key={f.id ?? `new-${i}`} className="rounded-xl border border-border/60 bg-background/60 p-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                                                <input
                                                    value={f.question}
                                                    onChange={(e) => setFaqField(i, 'question', e.target.value)}
                                                    placeholder="Сэдэв / асуулт (ж: Шүд цайруулга үнэ)"
                                                    className="flex-1 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-[13px] font-medium outline-none focus:border-indigo-500"
                                                />
                                                <button type="button" onClick={() => deleteFaq(i)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <textarea
                                                value={f.answer}
                                                onChange={(e) => setFaqField(i, 'answer', e.target.value)}
                                                rows={2}
                                                placeholder="Монгол хариулт…"
                                                className="w-full resize-y rounded-lg border border-border/60 bg-background px-2.5 py-2 text-[13px] leading-relaxed outline-none focus:border-indigo-500"
                                            />
                                            <div className="mt-2 flex items-center justify-end gap-2">
                                                {f.saved && <span className="text-[11px] text-emerald-600">✓ Хадгалагдлаа</span>}
                                                <button
                                                    type="button"
                                                    onClick={() => saveFaq(i)}
                                                    disabled={f.saving || !f.question.trim() || !f.answer.trim()}
                                                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 active:scale-95 disabled:opacity-40"
                                                >
                                                    {f.saving ? 'Хадгалж…' : f.id == null ? 'Хадгалах' : 'Шинэчлэх'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* ── Generative: Дүрэм + Нэмэлт мэдлэг ── */}
                        {!isRetrieval && (
                            <>
                                <section className={`${card} ${enter}`} style={{ animationDelay: '90ms' }}>
                                    <div className="mb-3 flex items-center justify-between">
                                        <Label icon={ScrollText} color="text-indigo-500">Дүрэм</Label>
                                        <button type="button" onClick={() => form.setData('system_rules', defaults.rules)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground">
                                            <RotateCcw className="h-3 w-3" /> Анхны
                                        </button>
                                    </div>
                                    <textarea
                                        value={form.data.system_rules}
                                        onChange={(e) => form.setData('system_rules', e.target.value)}
                                        rows={9}
                                        className={`${input} resize-y font-mono text-[13px] leading-relaxed`}
                                    />
                                </section>

                                <section className={`${card} ${enter}`} style={{ animationDelay: '140ms' }}>
                                    <div className="mb-3 flex items-center justify-between">
                                        <Label icon={BookOpen} color="text-violet-500">Нэмэлт мэдлэг</Label>
                                        <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs font-medium transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/30 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                                            <Upload className={`h-3.5 w-3.5 ${uploading ? 'animate-bounce' : ''}`} /> {uploading ? 'Уншиж байна…' : 'Word / PDF'}
                                            <input ref={fileRef} type="file" accept=".pdf,.docx" onChange={onUpload} className="hidden" />
                                        </label>
                                    </div>
                                    {uploadMsg && (
                                        <div className={`mb-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs animate-in fade-in slide-in-from-top-1 duration-300 ${uploadMsg.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300'}`}>
                                            <FileText className="h-3.5 w-3.5 shrink-0" /> {uploadMsg.text}
                                        </div>
                                    )}
                                    <textarea
                                        value={form.data.extra_knowledge}
                                        onChange={(e) => form.setData('extra_knowledge', e.target.value)}
                                        rows={7}
                                        placeholder="Урамшуулал, тусгай зөвлөмж, DB-д байхгүй мэдээлэл…"
                                        className={`${input} resize-y text-[13px] leading-relaxed`}
                                    />
                                </section>
                            </>
                        )}

                        {/* Загвар */}
                        {!RETRIEVAL_ONLY && (
                        <section className={`${card} ${enter}`} style={{ animationDelay: '180ms' }}>
                            <div className="mb-3">
                                <Label icon={Cpu} color="text-sky-500">Загвар</Label>
                            </div>
                            <input
                                value={form.data.model}
                                onChange={(e) => form.setData('model', e.target.value)}
                                placeholder={modelPlaceholder}
                                className={input}
                            />
                            <p className="mt-1.5 text-[11px] text-muted-foreground">Хоосон бол өгөгдмөл ({modelPlaceholder})</p>
                        </section>
                        )}
                    </div>

                    {/* ═══ Баруун: тест + мэдлэг (sticky) ═══ */}
                    <div className="space-y-6 xl:sticky xl:top-[92px] xl:self-start">
                        {/* Тест чат */}
                        <section className={`flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${enter}`} style={{ animationDelay: '120ms' }}>
                            <div className="flex items-center gap-2 border-b border-border/60 bg-gradient-to-r from-indigo-500/5 to-transparent px-5 py-3.5">
                                <Bot className="h-4 w-4 text-indigo-500" />
                                <span className="text-sm font-semibold tracking-tight">Тест</span>
                                <span className="ml-auto text-[11px] text-muted-foreground">Facebook руу явахгүй</span>
                            </div>

                            <div className="h-[420px] space-y-3 overflow-y-auto bg-gradient-to-b from-muted/20 to-transparent px-4 py-4">
                                {chat.length === 0 && (
                                    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center animate-in fade-in duration-700">
                                        <span className="relative flex h-14 w-14 items-center justify-center">
                                            <span className="absolute inset-0 animate-ping rounded-2xl bg-indigo-500/20" />
                                            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                                                <Sparkles className="h-6 w-6" />
                                            </span>
                                        </span>
                                        <p className="mt-1 text-sm text-muted-foreground">Үйлчлүүлэгч шиг асууж туршина уу</p>
                                        <p className="text-[12px] text-muted-foreground/70">"Шүд цайруулга хэд вэ?" · "Хэдэн цагаас ажилладаг вэ?"</p>
                                    </div>
                                )}
                                {chat.map((m, i) => (
                                    <div key={i} className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex max-w-[85%] items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${m.role === 'user' ? 'bg-slate-600' : m.error ? 'bg-red-500' : 'bg-gradient-to-br from-indigo-500 to-violet-600'}`}>
                                                {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                                            </span>
                                            <div className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm shadow-sm ${m.role === 'user' ? 'rounded-br-md bg-slate-700 text-white' : m.error ? 'rounded-bl-md border border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40' : 'rounded-bl-md border border-border/60 bg-background'}`}>
                                                {m.text}
                                                {m.handoff && (
                                                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                                        → Операторт шилжүүлнэ
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {testing && (
                                    <div className="flex animate-in fade-in duration-300">
                                        <div className="flex items-center gap-2 pl-8">
                                            <span className="flex gap-1 rounded-2xl border border-border/60 bg-background px-3 py-2.5">
                                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]" />
                                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]" />
                                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEnd} />
                            </div>

                            <div className="flex items-center gap-2 border-t border-border/60 p-3">
                                <input
                                    value={testInput}
                                    onChange={(e) => setTestInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            runTest();
                                        }
                                    }}
                                    placeholder="Асуултаа бичнэ үү…"
                                    className={input}
                                />
                                <button
                                    type="button"
                                    onClick={runTest}
                                    disabled={testing || !testInput.trim()}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-90 disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </section>

                        {/* AI мэдлэг preview (generative) */}
                        {!isRetrieval && (
                            <section className={`${card} ${enter}`} style={{ animationDelay: '200ms' }}>
                                <button type="button" onClick={() => setShowKnowledge((v) => !v)} className="flex w-full items-center gap-2 text-left">
                                    <Database className="h-4 w-4 text-teal-500" />
                                    <span className="text-sm font-semibold tracking-tight">AI-гийн мэдлэг</span>
                                    <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300 ${showKnowledge ? 'rotate-180' : ''}`} />
                                </button>
                                {showKnowledge && (
                                    <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-3.5 text-[12px] leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-300">
                                        {knowledge_preview || '(Мэдээлэл алга)'}
                                    </pre>
                                )}
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
