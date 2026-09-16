import { csrfHeaders } from '@/lib/csrf';
import { cn } from '@/lib/utils';
import {
    AlertTriangle, Check, Download, FileText, Loader2, Maximize, Minimize,
    ZoomIn, ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Баримт хичээлийн уншигч (PDF).
 *
 * ЯАГААД БРАУЗЕРЫН ӨӨРИЙН PDF ХАРАГЧИЙГ АШИГЛААГҮЙ ВЭ: <iframe> дотор
 * гарсан PDF нь хаалттай хайрцаг — ажилтан хэддүгээр хуудсан дээр байгааг
 * гаднаас нь МЭДЭХ БОЛОМЖГҮЙ. Харин "сүүлийн хуудсыг үзсэний дараа л дуусгах"
 * гэсэн шаардлагыг биелүүлэхийн тулд яг тэрийг мэдэх ёстой. Тиймээс PDF-ийг
 * pdf.js-ээр өөрсдөө зурж, хуудас бүрийг ажигладаг болов.
 *
 * ЯВЦЫГ ХЭМЖИХ ЗАРЧИМ: хуудас дэлгэц дээр гарсан төдийд биш, ХАНГАЛТТАЙ
 * УДААН харагдсан үед л "үзсэн" гэж тооцно. Эс тэгвээс төгсгөл рүү нэг
 * шудрахад бүх хуудас уншигдсан болж, шалгуур утгагүй болно.
 */

const PING_EVERY = 12;    // секунд тутам уншсан хуудсаа сервер рүү мэдэгдэнэ
const DWELL_MS   = 1200;  // хуудсыг "үзсэн" гэж тооцоход шаардах хугацаа
const VISIBLE    = 0.4;   // хуудасны хэдэн хувь харагдвал тоолж эхлэх вэ
const MIN_SCALE  = 0.5;
const MAX_SCALE  = 3;

export interface DocumentInfo {
    status: string | null;
    error: string | null;
    page_count: number;
    url: string | null;
    source_name: string | null;
    source_url: string | null;
}

interface Props {
    lessonId: number;
    document: DocumentInfo;
    /** Өмнө нь уншсан хуудсууд (0-оос эхэлсэн дугаар). */
    seenPages: number[];
    onProgress?: (state: { percent: number; completed: boolean; canFinish: boolean }) => void;
}

/** pdf.js-ийг нэг л удаа ачаалж, worker-ыг нь тохируулна. */
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

function loadPdfJs() {
    pdfjsPromise ??= (async () => {
        const pdfjs = await import('pdfjs-dist');
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');

        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

        return pdfjs;
    })();

    return pdfjsPromise;
}

export default function LabDocumentViewer({ lessonId, document: doc, seenPages, onProgress }: Props) {
    const [pdf, setPdf]         = useState<any>(null);
    const [pages, setPages]     = useState(doc.page_count);
    const [scale, setScale]     = useState(1);
    const [current, setCurrent] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);
    const [full, setFull]       = useState(false);
    const [seen, setSeen]       = useState<Set<number>>(() => new Set(seenPages));

    const shellRef   = useRef<HTMLDivElement>(null);
    const scrollRef  = useRef<HTMLDivElement>(null);
    // Сервер рүү хараахан илгээгээгүй шинэ хуудсууд
    const pendingRef = useRef<Set<number>>(new Set());
    const openedRef  = useRef(true);
    const lastRef    = useRef(0);

    /* ── PDF-ийг ачаална ───────────────────────────────────────────────── */
    useEffect(() => {
        if (!doc.url) return;

        let cancelled = false;

        (async () => {
            try {
                const pdfjs = await loadPdfJs();
                const task  = pdfjs.getDocument({ url: doc.url!, withCredentials: true });
                const file  = await task.promise;

                if (cancelled) return;

                setPdf(file);
                setPages(file.numPages);
                setLoading(false);
            } catch (e) {
                if (!cancelled) {
                    setError('Баримтыг нээж чадсангүй. Хуудсыг дахин ачаална уу.');
                    setLoading(false);
                }
            }
        })();

        return () => { cancelled = true; };
    }, [doc.url]);

    /* ── Уншсан хуудсуудыг сервер рүү илгээх ───────────────────────────── */
    const flush = useCallback((useBeacon = false) => {
        if (pendingRef.current.size === 0 && !openedRef.current) return;

        const payload = {
            pages: [...pendingRef.current],
            opened: openedRef.current,
            last: lastRef.current,
        };

        pendingRef.current = new Set();
        openedRef.current  = false;

        const url = `/my/training/lessons/${lessonId}/pages`;

        if (useBeacon && navigator.sendBeacon) {
            // sendBeacon нь толгой нэмэх боломжгүй тул FormData-аар CSRF-ээ явуулна
            const fd = new FormData();
            fd.append('opened', payload.opened ? '1' : '0');
            fd.append('last', String(payload.last));
            payload.pages.forEach((p) => fd.append('pages[]', String(p)));
            fd.append('_token', csrfHeaders()['X-CSRF-TOKEN']);
            navigator.sendBeacon(url, fd);

            return;
        }

        fetch(url, {
            method: 'POST',
            headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include',
            keepalive: true,
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => j && onProgress?.({
                percent: j.percent,
                completed: j.completed,
                canFinish: j.can_finish,
            }))
            .catch(() => undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lessonId]);

    useEffect(() => {
        const timer  = setInterval(() => flush(), PING_EVERY * 1000);
        const onHide = () => flush(true);
        const onVis  = () => window.document.visibilityState === 'hidden' && flush(true);

        window.addEventListener('pagehide', onHide);
        window.document.addEventListener('visibilitychange', onVis);

        return () => {
            clearInterval(timer);
            window.removeEventListener('pagehide', onHide);
            window.document.removeEventListener('visibilitychange', onVis);
            flush(true);
        };
    }, [flush]);

    /** Хуудсыг уншсан гэж тэмдэглэнэ (0-оос эхэлсэн дугаараар серверт очно). */
    const markSeen = useCallback((page: number) => {
        setSeen((prev) => {
            if (prev.has(page - 1)) return prev;

            const next = new Set(prev);
            next.add(page - 1);
            pendingRef.current.add(page - 1);

            return next;
        });
    }, []);

    const zoom = (delta: number) =>
        setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((s + delta) * 10) / 10)));

    /* ── Бүтэн дэлгэц ──────────────────────────────────────────────────── */
    const toggleFull = () => {
        if (window.document.fullscreenElement) {
            window.document.exitFullscreen();
        } else {
            shellRef.current?.requestFullscreen?.();
        }
    };

    useEffect(() => {
        const onFs = () => setFull(window.document.fullscreenElement === shellRef.current);
        window.document.addEventListener('fullscreenchange', onFs);

        return () => window.document.removeEventListener('fullscreenchange', onFs);
    }, []);

    /* ── Хөрвүүлэлт дуусаагүй / бүтэлгүйтсэн төлөв ─────────────────────── */
    if (doc.status !== 'ready' || !doc.url) {
        return <NotReady document={doc} />;
    }

    const readPercent = pages > 0 ? Math.round((seen.size / pages) * 100) : 0;

    return (
        <div
            ref={shellRef}
            className={cn(
                'overflow-hidden rounded-2xl border bg-card shadow-sm',
                full && 'flex h-screen flex-col rounded-none border-0',
            )}
        >
            {/* ── Хэрэгслийн мөр ─────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <FileText className="size-3.5 text-violet-600 dark:text-violet-400" />
                    <span className="tabular-nums">{current}</span>
                    <span className="text-muted-foreground/60">/ {pages}</span>
                </span>

                {/* Уншсан хуудасны эзлэх хувь — хичээлийн жинхэнэ явц */}
                <span className="flex min-w-[120px] flex-1 items-center gap-2 sm:max-w-[220px]">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                            className={cn(
                                'block h-full rounded-full transition-[width] duration-500',
                                readPercent >= 100 ? 'bg-emerald-500' : 'bg-violet-500',
                            )}
                            style={{ width: `${readPercent}%` }}
                        />
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                        {readPercent}%
                    </span>
                </span>

                <span className="ml-auto flex items-center gap-1">
                    <ToolBtn icon={ZoomOut} label="Багасгах" onClick={() => zoom(-0.2)} disabled={scale <= MIN_SCALE} />
                    <span className="w-10 text-center text-[11px] tabular-nums text-muted-foreground">
                        {Math.round(scale * 100)}%
                    </span>
                    <ToolBtn icon={ZoomIn} label="Томсгох" onClick={() => zoom(0.2)} disabled={scale >= MAX_SCALE} />

                    {doc.source_url && (
                        <a
                            href={doc.source_url}
                            className="grid size-7 place-items-center rounded-lg border transition hover:bg-muted"
                            title={`Эх файлыг татах${doc.source_name ? ` (${doc.source_name})` : ''}`}
                        >
                            <Download className="size-3.5" />
                        </a>
                    )}

                    <ToolBtn
                        icon={full ? Minimize : Maximize}
                        label={full ? 'Бүтэн дэлгэцээс гарах' : 'Бүтэн дэлгэц'}
                        onClick={toggleFull}
                    />
                </span>
            </div>

            {/* ── Хуудсууд ───────────────────────────────────────────────── */}
            <div
                ref={scrollRef}
                className={cn(
                    'overflow-y-auto overscroll-contain bg-neutral-100 dark:bg-neutral-900',
                    full ? 'flex-1' : 'h-[70vh] min-h-[420px]',
                )}
            >
                {loading && (
                    <div className="flex h-full items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Баримтыг ачаалж байна…
                    </div>
                )}

                {error && (
                    <div className="flex h-full items-center justify-center gap-2 py-20 text-sm text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="size-4" />
                        {error}
                    </div>
                )}

                {pdf && (
                    <div className="flex flex-col items-center gap-3 p-3 sm:p-4">
                        {Array.from({ length: pages }, (_, i) => (
                            <PdfPage
                                key={i + 1}
                                pdf={pdf}
                                pageNumber={i + 1}
                                scale={scale}
                                root={scrollRef}
                                seen={seen.has(i)}
                                onSeen={markSeen}
                                onActive={(n) => { setCurrent(n); lastRef.current = n; }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Нэг хуудас ────────────────────────────────────────────────────────── */
/**
 * Хуудсыг зөвхөн дэлгэцэнд ойртох үед нь зурна.
 *
 * 60 хуудастай баримтыг нэг дор зурвал браузер хэдэн зуун мегабайт зурагт
 * зарцуулж, сул компьютер дээр таб унана. Тиймээс эхлээд зөв хэмжээтэй
 * хоосон хайрцаг тавьж, ойртох үед нь л зураг болгоно — гүйлгэх мэдрэмж
 * хэвээр, санах ой эрүүл.
 */
function PdfPage({ pdf, pageNumber, scale, root, seen, onSeen, onActive }: {
    pdf: any;
    pageNumber: number;
    scale: number;
    root: React.RefObject<HTMLDivElement | null>;
    seen: boolean;
    onSeen: (page: number) => void;
    onActive: (page: number) => void;
}) {
    const boxRef    = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const taskRef   = useRef<any>(null);
    const dwellRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [size, setSize]   = useState<{ w: number; h: number } | null>(null);
    const [near, setNear]   = useState(false);
    const [drawn, setDrawn] = useState(false);

    // Хэмжээг нь эхлээд авч, хоосон хайрцгийг зөв өндөртэй болгоно
    useEffect(() => {
        let cancelled = false;

        pdf.getPage(pageNumber).then((page: any) => {
            if (cancelled) return;

            const vp = page.getViewport({ scale });
            setSize({ w: vp.width, h: vp.height });
            setDrawn(false);
        });

        return () => { cancelled = true; };
    }, [pdf, pageNumber, scale]);

    // Дэлгэцэнд ойртсон эсэх, хангалттай удаан харагдсан эсэх
    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;

        // Ойртох мэдрэгч — нэг дэлгэцийн зайд орвол зурж эхэлнэ
        const preload = new IntersectionObserver(
            ([e]) => e.isIntersecting && setNear(true),
            { root: root.current, rootMargin: '600px 0px' },
        );

        // Уншсан гэж тооцох мэдрэгч — хангалттай харагдаж, хангалттай удвал
        const dwell = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    onActive(pageNumber);

                    if (!seen && !dwellRef.current) {
                        dwellRef.current = setTimeout(() => {
                            onSeen(pageNumber);
                            dwellRef.current = null;
                        }, DWELL_MS);
                    }
                } else if (dwellRef.current) {
                    // Хангалттай удаагүй байхад гүйлгээд өнгөрвөл тоологдохгүй
                    clearTimeout(dwellRef.current);
                    dwellRef.current = null;
                }
            },
            { root: root.current, threshold: VISIBLE },
        );

        preload.observe(el);
        dwell.observe(el);

        return () => {
            preload.disconnect();
            dwell.disconnect();

            if (dwellRef.current) {
                clearTimeout(dwellRef.current);
                dwellRef.current = null;
            }
        };
    }, [root, pageNumber, seen, onSeen, onActive]);

    // Зурах
    useEffect(() => {
        if (!near || !size || drawn) return;

        let cancelled = false;

        (async () => {
            const page   = await pdf.getPage(pageNumber);
            const canvas = canvasRef.current;

            if (cancelled || !canvas) return;

            // Retina дэлгэц дээр бүдэг харагдахаас сэргийлж нягтралаар үржүүлнэ
            const dpr      = Math.min(window.devicePixelRatio || 1, 2);
            const viewport = page.getViewport({ scale: scale * dpr });
            const ctx      = canvas.getContext('2d');

            if (!ctx) return;

            canvas.width  = viewport.width;
            canvas.height = viewport.height;

            taskRef.current?.cancel?.();
            taskRef.current = page.render({ canvasContext: ctx, viewport, canvas });

            try {
                await taskRef.current.promise;
                if (!cancelled) setDrawn(true);
            } catch {
                // Зурж дуусахаас өмнө хэмжээ солигдвол цуцлагдана — хэвийн
            }
        })();

        return () => {
            cancelled = true;
            taskRef.current?.cancel?.();
        };
    }, [near, size, drawn, pdf, pageNumber, scale]);

    return (
        <div
            ref={boxRef}
            data-page={pageNumber}
            className="relative shadow-md ring-1 ring-black/10 dark:ring-white/10"
            style={{ width: size?.w ?? 640, height: size?.h ?? 880 }}
        >
            <canvas ref={canvasRef} className="block size-full bg-white" />

            {!drawn && (
                <span className="absolute inset-0 grid place-items-center bg-white text-xs text-neutral-400">
                    {pageNumber}
                </span>
            )}

            {/* Уншсан хуудсыг булангаар нь тэмдэглэнэ */}
            {seen && (
                <span
                    className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-emerald-500 text-white shadow"
                    title="Энэ хуудсыг үзсэн"
                >
                    <Check className="size-3" />
                </span>
            )}
        </div>
    );
}

/* ── Хөрвүүлэлт дуусаагүй эсвэл бүтэлгүйтсэн ───────────────────────────── */
function NotReady({ document: doc }: { document: DocumentInfo }) {
    const failed = doc.status === 'failed';

    return (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <span className={cn(
                    'grid size-12 place-items-center rounded-2xl',
                    failed
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                        : 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
                )}>
                    {failed ? <AlertTriangle className="size-6" /> : <Loader2 className="size-6 animate-spin" />}
                </span>

                <p className="text-sm font-semibold">
                    {failed ? 'Баримтыг үзэх боломжгүй байна' : 'Баримтыг бэлтгэж байна'}
                </p>

                <p className="max-w-sm text-xs text-muted-foreground">
                    {failed
                        ? 'Файлыг PDF болгож хөрвүүлэх үед алдаа гарсан байна. Админд мэдэгдэнэ үү — эх файлыг доороос татаж авч болно.'
                        : 'Илтгэлийг PDF болгож хөрвүүлж байна. Хэдхэн хормын дараа хуудсыг сэргээгээрэй.'}
                </p>

                {doc.source_url && (
                    <a
                        href={doc.source_url}
                        className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition hover:bg-muted"
                    >
                        <Download className="size-3.5" />
                        Эх файлыг татах
                        {doc.source_name && <span className="text-muted-foreground">({doc.source_name})</span>}
                    </a>
                )}
            </div>
        </div>
    );
}

/* ── Хэрэгслийн товч ───────────────────────────────────────────────────── */
function ToolBtn({ icon: Icon, label, onClick, disabled }: {
    icon: typeof ZoomIn; label: string; onClick: () => void; disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            className="grid size-7 place-items-center rounded-lg border transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
        >
            <Icon className="size-3.5" />
        </button>
    );
}
