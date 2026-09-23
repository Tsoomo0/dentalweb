import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import SignaturePad, { type SignaturePadRef } from '@/components/signature-pad';
import { csrfHeaders } from '@/lib/csrf';
import { fileToTransparentPng, validateImageFile } from '@/lib/image-to-png';
import {
    AlertCircle, Check, CheckCircle2, Eraser, ImageUp, PenLine, Save, Star, Trash2, Upload,
} from 'lucide-react';

export interface SignatureInputRef {
    /** Одоо сонгогдсон гарын үсгийг data URL хэлбэрээр буцаана ('' = хоосон). */
    getValue: () => string;
    clear: () => void;
}

export interface SavedSignature {
    id: number;
    label: string | null;
    image: string;
    source: string;
    is_default: boolean;
    created_at: string | null;
}

interface Props {
    /** Зурах талбарын өндөр. */
    height?: number;
    /** Утга өөрчлөгдөх бүрд дуудагдана — товч идэвхжүүлэхэд ашиглана. */
    onChange?: (value: string) => void;
    /**
     * Гарын үсгийн сангийн API суурь зам. HR талын гэрээний дэлгэцээс
     * `/hr/signatures` дамжуулснаар нэмэх/устгах үйлдэл түгжээтэй болно;
     * ажилтны хувийн хэсэгт анхны утга (`/signatures`) хэвээр үлдэнэ.
     */
    apiBase?: string;
    /** Сервер түгжээтэй гэж хариулбал (423) дуудагдана. */
    onLocked?: () => void;
}

type Tab = 'saved' | 'draw' | 'upload';

/**
 * Гарын үсэг оруулах нэгдсэн хэсэг — зурах, зургаар оруулах, өмнө нь
 * хадгалсанаас сонгох гурван арга.
 */
const SignatureInput = forwardRef<SignatureInputRef, Props>(function SignatureInput(
    { height = 190, onChange, apiBase = '/signatures', onLocked },
    ref
) {
    const sigRef = useRef<SignaturePadRef>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const [tab, setTab] = useState<Tab>('draw');
    const [saved, setSaved] = useState<SavedSignature[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [uploaded, setUploaded] = useState<string>('');
    const [hasDrawn, setHasDrawn] = useState(false);
    const [removeBackground, setRemoveBackground] = useState(true);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);
    const [label, setLabel] = useState('');

    const emit = useCallback((value: string) => onChange?.(value), [onChange]);

    /* ── Хадгалсан гарын үсгүүдээ татна ── */
    useEffect(() => {
        let alive = true;
        fetch(apiBase, { headers: csrfHeaders() })
            .then(r => (r.ok ? r.json() : { signatures: [] }))
            .then((data: { signatures: SavedSignature[] }) => {
                if (!alive) return;
                const list = data.signatures ?? [];
                setSaved(list);
                const def = list.find(s => s.is_default) ?? list[0];
                if (def) {
                    // Үндсэн гарын үсэгтэй бол шууд сонгож, дарж зурах шаардлагагүй болгоно
                    setTab('saved');
                    setSelectedId(def.id);
                    emit(def.image);
                }
            })
            .catch(() => {});

        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(null), 4000);

        return () => clearTimeout(t);
    }, [notice]);

    /** Одоогийн табын утга. */
    const currentValue = useCallback((): string => {
        if (tab === 'draw') {
            return sigRef.current?.isEmpty() === false ? (sigRef.current?.toDataURL() ?? '') : '';
        }
        if (tab === 'upload') {
            return uploaded;
        }

        return saved.find(s => s.id === selectedId)?.image ?? '';
    }, [tab, uploaded, saved, selectedId]);

    useImperativeHandle(ref, () => ({
        getValue: () => {
            const value = currentValue();
            // Хадгалсан гарын үсэг ашиглавал сүүлд хэрэглэсэн огноог тэмдэглэнэ
            if (tab === 'saved' && selectedId) {
                fetch(`${apiBase}/${selectedId}/touch`, { method: 'POST', headers: csrfHeaders() }).catch(() => {});
            }

            return value;
        },
        clear: () => {
            sigRef.current?.clear();
            setHasDrawn(false);
            setUploaded('');
            emit('');
        },
    }), [currentValue, tab, selectedId, emit, apiBase]);

    function switchTab(next: Tab) {
        setTab(next);
        setNotice(null);
        // Таб солиход товчны идэвхжилт зөв байхаар утгыг шинэчилнэ
        if (next === 'draw') emit(sigRef.current?.isEmpty() === false ? (sigRef.current?.toDataURL() ?? '') : '');
        if (next === 'upload') emit(uploaded);
        if (next === 'saved') emit(saved.find(s => s.id === selectedId)?.image ?? '');
    }

    async function handleFile(file?: File | null) {
        if (!file) return;

        const problem = validateImageFile(file);
        if (problem) {
            setNotice({ text: problem, kind: 'err' });

            return;
        }

        try {
            const dataUrl = await fileToTransparentPng(file, removeBackground);
            setUploaded(dataUrl);
            setTab('upload');
            emit(dataUrl);
        } catch (e) {
            setNotice({ text: (e as Error).message, kind: 'err' });
        }
    }

    /** Одоогийн гарын үсгийг санд хадгална. */
    async function persist() {
        const value = currentValue();
        if (!value) {
            setNotice({ text: 'Эхлээд гарын үсгээ зурах эсвэл зургаа оруулна уу.', kind: 'err' });

            return;
        }

        setBusy(true);
        try {
            const res = await fetch(apiBase, {
                method: 'POST',
                headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: value, label: label.trim() || null, source: tab === 'upload' ? 'upload' : 'draw' }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 423) {
                setNotice({ text: data.message ?? 'Түгжээ хаагдсан байна.', kind: 'err' });
                onLocked?.();

                return;
            }
            if (!res.ok) {
                setNotice({ text: data.message ?? 'Хадгалж чадсангүй.', kind: 'err' });

                return;
            }
            const created: SavedSignature = data.signature;
            setSaved(prev => (created.is_default ? prev.map(s => ({ ...s, is_default: false })) : prev).concat(created));
            setSelectedId(created.id);
            setLabel('');
            setNotice({ text: 'Гарын үсэг хадгалагдлаа. Дараагийн баримтад дахин ашиглана.', kind: 'ok' });
        } catch {
            setNotice({ text: 'Сүлжээний алдаа. Дахин оролдоно уу.', kind: 'err' });
        } finally {
            setBusy(false);
        }
    }

    async function makeDefault(id: number) {
        const res = await fetch(`${apiBase}/${id}/default`, { method: 'PATCH', headers: csrfHeaders() }).catch(() => null);

        if (res?.status === 423) {
            setNotice({ text: 'Түгжээ хаагдсан байна.', kind: 'err' });
            onLocked?.();

            return;
        }

        setSaved(prev => prev.map(s => ({ ...s, is_default: s.id === id })));
    }

    async function remove(id: number) {
        if (!confirm('Энэ гарын үсгийг устгах уу?')) return;
        const res = await fetch(`${apiBase}/${id}`, { method: 'DELETE', headers: csrfHeaders() }).catch(() => null);

        if (res?.status === 423) {
            setNotice({ text: 'Түгжээ хаагдсан байна.', kind: 'err' });
            onLocked?.();

            return;
        }

        setSaved(prev => prev.filter(s => s.id !== id));
        if (selectedId === id) {
            setSelectedId(null);
            emit('');
        }
    }

    const TAB_BTN = (active: boolean) =>
        `flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
            active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        }`;

    return (
        <div className="space-y-3">
            {/* Табууд */}
            <div className="flex gap-1 rounded-xl bg-muted p-1">
                <button type="button" className={TAB_BTN(tab === 'draw')} onClick={() => switchTab('draw')}>
                    <PenLine className="size-3.5" /> Зурах
                </button>
                <button type="button" className={TAB_BTN(tab === 'upload')} onClick={() => switchTab('upload')}>
                    <ImageUp className="size-3.5" /> Зураг оруулах
                </button>
                <button type="button" className={TAB_BTN(tab === 'saved')} onClick={() => switchTab('saved')}>
                    <Save className="size-3.5" /> Хадгалсан{saved.length > 0 ? ` (${saved.length})` : ''}
                </button>
            </div>

            {/* ── Зурах ── */}
            {tab === 'draw' && (
                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Хулгана эсвэл хуруугаараа зурна уу</span>
                        <button type="button" onClick={() => { sigRef.current?.clear(); setHasDrawn(false); emit(''); }}
                            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-red-500">
                            <Eraser className="size-3.5" /> Арилгах
                        </button>
                    </div>
                    <div className={`overflow-hidden rounded-2xl border-2 bg-white transition-all dark:bg-zinc-900 ${
                        hasDrawn ? 'border-emerald-500 shadow-md shadow-emerald-500/10' : 'border-dashed border-muted-foreground/25'
                    }`}>
                        <SignaturePad
                            ref={sigRef}
                            height={height}
                            onBegin={() => { setHasDrawn(true); setNotice(null); }}
                            onEnd={() => emit(sigRef.current?.toDataURL() ?? '')}
                        />
                    </div>
                </div>
            )}

            {/* ── Зураг оруулах ── */}
            {tab === 'upload' && (
                <div>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />

                    {uploaded ? (
                        <div className="rounded-2xl border-2 border-emerald-500 bg-white p-3 dark:bg-zinc-900"
                            style={{ minHeight: height }}>
                            <img src={uploaded} alt="Гарын үсэг" className="mx-auto max-h-[170px] object-contain" />
                        </div>
                    ) : (
                        <div
                            onClick={() => fileRef.current?.click()}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
                            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-4 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20"
                            style={{ minHeight: height }}>
                            <Upload className="size-7 text-muted-foreground/40" />
                            <p className="mt-2 text-sm font-medium text-foreground">Гарын үсгийн зургаа энд чирж оруулна уу</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">эсвэл дарж файлаа сонгоно уу · PNG, JPG · 8MB хүртэл</p>
                        </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-xs text-foreground">
                            <input type="checkbox" checked={removeBackground} className="size-3.5 rounded"
                                onChange={e => setRemoveBackground(e.target.checked)} />
                            Цагаан дэвсгэрийг тунгалаг болгох
                        </label>
                        {uploaded && (
                            <button type="button" onClick={() => { setUploaded(''); emit(''); }}
                                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-red-500">
                                <Eraser className="size-3.5" /> Устгах
                            </button>
                        )}
                        <button type="button" onClick={() => fileRef.current?.click()}
                            className="ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
                            <ImageUp className="size-3.5" /> Өөр зураг сонгох
                        </button>
                    </div>
                </div>
            )}

            {/* ── Хадгалсан ── */}
            {tab === 'saved' && (
                saved.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/25 px-4 text-center"
                        style={{ minHeight: height }}>
                        <Save className="size-7 text-muted-foreground/30" />
                        <p className="mt-2 text-sm text-muted-foreground">Хадгалсан гарын үсэг байхгүй байна.</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Зурах эсвэл зураг оруулаад «Хадгалах» дарна уу.</p>
                    </div>
                ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {saved.map(s => {
                            const active = s.id === selectedId;

                            return (
                                <div key={s.id}
                                    onClick={() => { setSelectedId(s.id); emit(s.image); }}
                                    className={`group relative cursor-pointer rounded-xl border-2 bg-white p-2 transition-all dark:bg-zinc-900 ${
                                        active ? 'border-emerald-500 shadow-md shadow-emerald-500/10' : 'border-muted-foreground/20 hover:border-emerald-300'
                                    }`}>
                                    <img src={s.image} alt="" className="mx-auto h-16 object-contain" />

                                    <div className="mt-1.5 flex items-center gap-1.5 border-t pt-1.5">
                                        <span className="truncate text-[11px] text-muted-foreground">
                                            {s.label || (s.source === 'upload' ? 'Оруулсан зураг' : 'Зурсан')}
                                        </span>
                                        {s.is_default && (
                                            <span className="flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                                <Star className="size-2.5" /> Үндсэн
                                            </span>
                                        )}
                                        <div className="ml-auto flex items-center gap-0.5">
                                            {!s.is_default && (
                                                <button type="button" title="Үндсэн болгох"
                                                    onClick={e => { e.stopPropagation(); makeDefault(s.id); }}
                                                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-amber-500">
                                                    <Star className="size-3" />
                                                </button>
                                            )}
                                            <button type="button" title="Устгах"
                                                onClick={e => { e.stopPropagation(); remove(s.id); }}
                                                className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30">
                                                <Trash2 className="size-3" />
                                            </button>
                                        </div>
                                    </div>

                                    {active && (
                                        <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                                            <Check className="size-3" />
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* Хадгалах */}
            {tab !== 'saved' && (
                <div className="flex flex-wrap items-center gap-2">
                    <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Нэр (заавал биш) — жишээ: Үндсэн гарын үсэг"
                        className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    <button type="button" onClick={persist} disabled={busy}
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <Save className="size-3.5" /> Хадгалах
                    </button>
                </div>
            )}

            {notice && (
                <p className={`flex items-center gap-1.5 text-xs ${notice.kind === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {notice.kind === 'ok' ? <CheckCircle2 className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
                    {notice.text}
                </p>
            )}
        </div>
    );
});

export default SignatureInput;
