import { useEffect, useRef, useState } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { fileToTransparentPng, validateImageFile } from '@/lib/image-to-png';
import { AlertCircle, CheckCircle2, Stamp, Trash2, Upload, X } from 'lucide-react';

interface Props {
    onClose: () => void;
    /** Тамга солигдоход эцэг бүрэлдэхүүнд мэдэгдэнэ. */
    onChange?: (image: string | null) => void;
}

/**
 * Байгууллагын тамга — нэг л удаа оруулаад бүх гэрээнд дарагдана.
 * Хувь хүний гарын үсгээс ялгаатай нь байгууллагын хэмжээнд нэг байна.
 */
export default function CompanyStampManager({ onClose, onChange }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);

    const [image, setImage] = useState<string | null>(null);
    const [pending, setPending] = useState<string>('');
    const [removeBackground, setRemoveBackground] = useState(true);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);

    useEffect(() => {
        fetch('/hr/company-stamp', { headers: csrfHeaders() })
            .then(r => (r.ok ? r.json() : { image: null }))
            .then((d: { image: string | null }) => setImage(d.image))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(null), 4000);

        return () => clearTimeout(t);
    }, [notice]);

    async function handleFile(file?: File | null) {
        if (!file) return;

        const problem = validateImageFile(file);
        if (problem) {
            setNotice({ text: problem, kind: 'err' });

            return;
        }

        try {
            // Тамга дугуй хэлбэртэй, гарын үсгийн дээр дарагддаг тул жижигхэн
            // хэмжээ хангалттай — 600px-ээс хэтрүүлэхгүй.
            setPending(await fileToTransparentPng(file, removeBackground, 600));
        } catch (e) {
            setNotice({ text: (e as Error).message, kind: 'err' });
        }
    }

    async function save() {
        if (!pending) return;
        setBusy(true);
        try {
            const res = await fetch('/hr/company-stamp', {
                method: 'POST',
                headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: pending }),
            });
            const data = await res.json();
            if (!res.ok) {
                setNotice({ text: data.message ?? 'Хадгалж чадсангүй.', kind: 'err' });

                return;
            }
            setImage(data.image);
            setPending('');
            onChange?.(data.image);
            setNotice({ text: 'Тамга хадгалагдлаа. Шинээр зурах гэрээнд дарагдана.', kind: 'ok' });
        } catch {
            setNotice({ text: 'Сүлжээний алдаа. Дахин оролдоно уу.', kind: 'err' });
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        if (!confirm('Тамгыг устгах уу?\n\nӨмнө нь баталгаажсан гэрээн дэх тамга хэвээр үлдэнэ.')) return;
        setBusy(true);
        await fetch('/hr/company-stamp', { method: 'DELETE', headers: csrfHeaders() }).catch(() => {});
        setImage(null);
        onChange?.(null);
        setBusy(false);
    }

    const preview = pending || image;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-lg rounded-2xl bg-background shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 fade-in duration-200 dark:ring-white/10" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b px-5 py-3.5">
                    <h2 className="flex items-center gap-2 font-semibold text-foreground">
                        <Stamp className="size-4.5 text-indigo-500" /> Байгууллагын тамга
                    </h2>
                    <button type="button" onClick={onClose}><X className="size-4.5 text-muted-foreground" /></button>
                </div>

                <div className="space-y-3 px-5 py-4">
                    <p className="text-xs text-muted-foreground">
                        Тамгыг нэг удаа оруулахад захирал гарын үсэг зурах бүрд гэрээнд автоматаар дарагдана.
                        Дэвсгэргүй (тунгалаг) PNG хамгийн сайн харагдана — цаасан дээрх тамгыг зураг авсан ч болно.
                    </p>

                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />

                    {preview ? (
                        <div className="flex flex-col items-center rounded-2xl border-2 border-emerald-500 bg-white p-4 dark:bg-zinc-900">
                            <img src={preview} alt="Тамга" className="max-h-40 object-contain" />
                            {pending && (
                                <span className="mt-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                    Хадгалаагүй байна
                                </span>
                            )}
                        </div>
                    ) : (
                        <div
                            onClick={() => fileRef.current?.click()}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
                            className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-4 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20">
                            <Upload className="size-7 text-muted-foreground/40" />
                            <p className="mt-2 text-sm font-medium text-foreground">Тамганы зургаа энд чирж оруулна уу</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">эсвэл дарж файлаа сонгоно уу · PNG, JPG · 8MB хүртэл</p>
                        </div>
                    )}

                    <label className="flex items-center gap-2 text-xs text-foreground">
                        <input type="checkbox" checked={removeBackground} className="size-3.5 rounded"
                            onChange={e => setRemoveBackground(e.target.checked)} />
                        Цагаан дэвсгэрийг тунгалаг болгох
                    </label>

                    {notice && (
                        <p className={`flex items-center gap-1.5 text-xs ${notice.kind === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {notice.kind === 'ok' ? <CheckCircle2 className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
                            {notice.text}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2 border-t px-5 py-3">
                    {image && (
                        <button type="button" onClick={remove} disabled={busy}
                            className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:hover:bg-red-950/30">
                            <Trash2 className="size-4" /> Устгах
                        </button>
                    )}
                    <button type="button" onClick={() => fileRef.current?.click()}
                        className="rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
                        {image || pending ? 'Өөр зураг' : 'Зураг сонгох'}
                    </button>
                    <div className="ml-auto flex gap-2">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">Хаах</button>
                        <button type="button" onClick={save} disabled={busy || !pending}
                            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50">
                            Хадгалах
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
