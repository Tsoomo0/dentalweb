import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileStack, ScrollText } from 'lucide-react';

/** Гэрээ/АБТ-ийн агуулгыг харуулах ерөнхий загварын CSS — PDF-тэй ойролцоо байлгана. */
export const DOC_STYLES = `
    .hr-doc-view h1 { font-size: 1.2rem;  font-weight: 700; margin: 1rem 0 .45rem; }
    .hr-doc-view h2 { font-size: 1.05rem; font-weight: 700; margin: 1rem 0 .45rem; }
    .hr-doc-view h3 { font-size: .95rem;  font-weight: 700; margin: .9rem 0 .4rem; }
    .hr-doc-view p  { margin: 0 0 .5rem; text-align: justify; }
    .hr-doc-view ul { list-style: disc;    margin: 0 0 .6rem 1.35rem; }
    .hr-doc-view ol { list-style: decimal; margin: 0 0 .6rem 1.35rem; }
    .hr-doc-view li { margin-bottom: .25rem; text-align: justify; }
    .hr-doc-view table { width: 100%; border-collapse: collapse; margin-bottom: .7rem; font-size: .82rem; }
    .hr-doc-view td, .hr-doc-view th { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
    .hr-doc-view th { background: #f1f5f9; font-weight: 600; }
    .hr-doc-view hr { border: none; border-top: 1px solid #cbd5e1; margin: .8rem 0; }
    .hr-doc-view img { max-width: 100%; }
    /* Албан бичгийн байрлал — PDF-тэй ижил */
    .hr-doc-view p.cl { margin-left: 2.6em; text-indent: -2.6em; }
    .hr-doc-view p.ctr { text-align: center; }
    .hr-doc-view table.plain { margin-bottom: .5rem; }
    .hr-doc-view table.plain td, .hr-doc-view table.plain th {
        border: none; padding: 0 10px 4px 0; font-size: inherit; }
    .dark .hr-doc-view td, .dark .hr-doc-view th { border-color: #3f3f46; }
    .dark .hr-doc-view th { background: #27272a; }

    /* ── Гар утас: уншихад тохируулсан хэлбэр ── */
    @media (max-width: 640px) {
        /* Хоёр талдаа тэгшилсэн текст нарийн дэлгэц дээр үг хооронд том зай үүсгэдэг */
        .hr-doc-view p, .hr-doc-view li { text-align: left; overflow-wrap: break-word; }
        .hr-doc-view h1 { font-size: 1.1rem; }
        .hr-doc-view h2 { font-size: 1rem; }
        .hr-doc-view h3 { font-size: .94rem; }
        .hr-doc-view p.cl { margin-left: 1.6em; text-indent: -1.6em; }
        /* Хүрээгүй хүснэгтийг мөрөөр нь давхарлаж, шошго/утгыг тусад нь харуулна */
        .hr-doc-view table.plain,
        .hr-doc-view table.plain tbody,
        .hr-doc-view table.plain tr,
        .hr-doc-view table.plain td,
        .hr-doc-view table.plain th { display: block; width: 100% !important; }
        .hr-doc-view table.plain td, .hr-doc-view table.plain th { padding: 0 0 3px !important; }
        .hr-doc-view table.plain tr { margin-bottom: 6px; }
        /* Хүрээтэй хүснэгт багтахгүй бол хажуу тийш нь гүйлгэнэ */
        .hr-doc-view table:not(.plain) { display: block; width: 100%; overflow-x: auto; }
    }
`;

interface Props {
    /** Баримтын үндсэн HTML. */
    html: string;
    /** Төгсгөлд залгах HTML — ихэвчлэн гарын үсгийн блок. */
    footerHtml?: string;
    /** Хамгийн сүүлийн хуудсанд хүрэхэд нэг удаа дуудагдана. */
    onReachEnd?: () => void;
    /** Уншсан хувь (0–1) өөрчлөгдөх бүрд дуудагдана. */
    onProgress?: (ratio: number) => void;
    /** Хуудасны хамгийн их өргөн (px). */
    maxPageWidth?: number;
}

/** A4 хуудасны өндөр/өргөний харьцаа. */
const A4_RATIO = 297 / 210;
/** Үүнээс нарийн дэлгэц дээр хуудаслахгүй, тасралтгүй гүйлгэнэ. */
const PAGED_MIN_WIDTH = 560;

type Mode = 'paged' | 'flow';

interface Chunk { html: string; h: number }

function outerHeight(el: HTMLElement): number {
    const cs = window.getComputedStyle(el);

    return el.offsetHeight + parseFloat(cs.marginTop || '0') + parseFloat(cs.marginBottom || '0');
}

/**
 * Нэг хуудсанд багтахгүй том элементийг (урт жагсаалт, хүснэгт) мөр мөрөөр нь
 * хувааж хэд хэдэн хэсэг болгоно. Бусад төрлийн элементийг хуваахгүй.
 */
function splitOversized(node: HTMLElement, firstAvailable: number, full: number): Chunk[] {
    const tag = node.tagName.toLowerCase();
    const whole: Chunk[] = [{ html: node.outerHTML, h: outerHeight(node) }];

    if (node.classList.contains('doc-nobreak')) {
        return whole;
    }

    let items: HTMLElement[] = [];
    let head: HTMLElement | null = null;

    if (tag === 'ul' || tag === 'ol') {
        items = Array.from(node.children) as HTMLElement[];
    } else if (tag === 'table') {
        items = Array.from(node.querySelectorAll(':scope > tbody > tr, :scope > tr')) as HTMLElement[];
        head = node.querySelector(':scope > thead');
    } else {
        return whole;
    }

    if (items.length < 2) {
        return whole;
    }

    const itemsHeight = items.reduce((sum, i) => sum + i.offsetHeight, 0);
    // Жагсаалт/хүснэгтийн өөрийн зай (margin, border) — хэсэг бүрт дахин нэмэгдэнэ
    const overhead = Math.max(0, outerHeight(node) - itemsHeight);
    const headHeight = head ? head.offsetHeight : 0;
    const startAttr = parseInt(node.getAttribute('start') || '1', 10) || 1;

    const buildChunk = (bucket: HTMLElement[], startIndex: number): string => {
        const clone = node.cloneNode(false) as HTMLElement;
        if (tag === 'ol') {
            clone.setAttribute('start', String(startIndex));
        }
        if (tag === 'table') {
            if (head) clone.appendChild(head.cloneNode(true));
            const body = document.createElement('tbody');
            bucket.forEach(row => body.appendChild(row.cloneNode(true)));
            clone.appendChild(body);
        } else {
            bucket.forEach(item => clone.appendChild(item.cloneNode(true)));
        }

        return clone.outerHTML;
    };

    const chunks: Chunk[] = [];
    // Эхний хэсэг нь өмнөх хуудасны үлдсэн зайд багтвал тэндээ орно
    let available = firstAvailable > full * 0.25 ? firstAvailable : full;
    let bucket: HTMLElement[] = [];
    let height = overhead + headHeight;
    let consumed = 0;

    for (const item of items) {
        const itemHeight = item.offsetHeight;
        if (bucket.length > 0 && height + itemHeight > available) {
            chunks.push({ html: buildChunk(bucket, startAttr + consumed), h: height });
            consumed += bucket.length;
            bucket = [];
            height = overhead + headHeight;
            available = full;
        }
        bucket.push(item);
        height += itemHeight;
    }

    if (bucket.length > 0) {
        chunks.push({ html: buildChunk(bucket, startAttr + consumed), h: height });
    }

    return chunks.length > 0 ? chunks : whole;
}

/**
 * Гэрээ, ажлын байрны тодорхойлолт зэрэг урт баримтыг PDF шиг хуудас хуудсаар нь
 * харуулна. Нарийн дэлгэц дээр эсвэл хэрэглэгч сонговол тасралтгүй гүйлгэнэ.
 */
export default function DocumentViewer({ html, footerHtml = '', onReachEnd, onProgress, maxPageWidth = 780 }: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
    const reachedEnd = useRef(false);

    const [width, setWidth] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [pages, setPages] = useState<string[]>([]);
    const [current, setCurrent] = useState(0);
    const [mode, setMode] = useState<Mode>('paged');
    const [userPickedMode, setUserPickedMode] = useState(false);
    const [progress, setProgress] = useState(0);

    const fullHtml = html + footerHtml;

    /* ── Хүрээний өргөн, харагдах өндрийг хэмжинэ ── */
    useLayoutEffect(() => {
        const wrap = wrapRef.current;
        const scroller = scrollRef.current;
        if (!wrap) return;

        const ro = new ResizeObserver(() => {
            const w = Math.round(wrap.clientWidth);
            if (w > 0) setWidth(w);
            const h = Math.round(scroller?.clientHeight ?? 0);
            if (h > 0) setViewportHeight(h);
        });
        ro.observe(wrap);
        if (scroller) ro.observe(scroller);

        return () => ro.disconnect();
    }, []);

    // Уншихад тохиромжтой байхын тулд боломжит өргөнийг бүрэн ашиглана
    const pageWidth = Math.max(240, Math.min(width || maxPageWidth, maxPageWidth) - 24);
    const padding = Math.round(pageWidth * 0.062);
    // Хуудсыг харагдах хэсэгт бүтнээр нь багтаана — ингэснээр нэг хуудас = нэг
    // дэлгэц болж, хуудас дотор нэмж гүйлгэх шаардлагагүй. Дэлгэц хэт өндөр
    // байвал A4-ийн харьцаанаас хэтрүүлэхгүй.
    const a4Height = Math.round(pageWidth * A4_RATIO);
    const pageHeight = viewportHeight > 200
        ? Math.min(a4Height, viewportHeight - 32)
        : a4Height;
    const contentWidth = pageWidth - padding * 2;
    // Доод талд хуудасны дугаар багтаах зай үлдээнэ
    const contentHeight = pageHeight - padding * 2 - 18;

    /* ── Нарийн дэлгэц дээр автоматаар тасралтгүй горим ── */
    useEffect(() => {
        if (userPickedMode || width === 0) return;
        setMode(width < PAGED_MIN_WIDTH ? 'flow' : 'paged');
    }, [width, userPickedMode]);

    /* ── Агуулгыг хэмжиж хуудсанд хуваана ── */
    useLayoutEffect(() => {
        const el = measureRef.current;
        if (!el || contentWidth <= 0) return;

        el.innerHTML = fullHtml;

        if (mode === 'flow') {
            pageRefs.current = [];
            setPages([fullHtml]);
            setCurrent(0);

            return;
        }

        const nodes = Array.from(el.children) as HTMLElement[];
        const result: string[] = [];
        let buffer = '';
        let height = 0;

        const flush = () => {
            if (buffer) result.push(buffer);
            buffer = '';
            height = 0;
        };

        for (const node of nodes) {
            const h = outerHeight(node);
            const remaining = contentHeight - height;

            // 1. Одоогийн хуудсанд бүтнээрээ багтаж байна
            if (h <= remaining) {
                buffer += node.outerHTML;
                height += h;
                continue;
            }

            // 2. Багтахгүй бол жагсаалт/хүснэгтийг мөрөөр нь хувааж үлдсэн зайг дүүргэнэ
            const chunks = splitOversized(node, remaining, contentHeight);
            if (chunks.length > 1) {
                chunks.forEach((chunk, i) => {
                    if (i === 0 && chunk.h <= contentHeight - height) {
                        buffer += chunk.html;
                        height += chunk.h;
                    } else {
                        flush();
                        buffer = chunk.html;
                        height = chunk.h;
                    }
                });
                continue;
            }

            // 3. Хуваагдахгүй бүтэн блок — дараагийн хуудас руу шилжинэ
            flush();
            buffer = node.outerHTML;
            height = h;
        }

        flush();

        pageRefs.current = [];
        setPages(result.length > 0 ? result : ['']);
        setCurrent(prev => Math.min(prev, Math.max(0, result.length - 1)));
    }, [fullHtml, contentWidth, contentHeight, mode]);

    /* ── Төгсгөлд хүрсэн эсэх ── */
    const markEnd = useCallback(() => {
        if (reachedEnd.current) return;
        reachedEnd.current = true;
        onReachEnd?.();
    }, [onReachEnd]);

    useEffect(() => {
        if (mode === 'paged' && pages.length > 0 && current >= pages.length - 1) {
            markEnd();
        }
    }, [mode, current, pages.length, markEnd]);

    useEffect(() => {
        if (mode !== 'flow') return;
        const el = scrollRef.current;
        if (!el) return;
        // Гүйлгэх зай байхгүй бол шууд уншсанд тооцно
        if (el.scrollHeight <= el.clientHeight + 40) { setProgress(1); onProgress?.(1); markEnd(); }
    }, [mode, pages, markEnd, onProgress]);

    function handleScroll(e: React.UIEvent<HTMLDivElement>) {
        const el = e.currentTarget;

        if (mode === 'flow') {
            const span = el.scrollHeight - el.clientHeight;
            const ratio = span <= 0 ? 1 : Math.min(1, Math.max(0, el.scrollTop / span));
            setProgress(ratio);
            onProgress?.(ratio);
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) markEnd();

            return;
        }

        // Хуудаслалттай горимд одоо харагдаж буй хуудсыг тодорхойлно
        const middle = el.scrollTop + el.clientHeight / 2;
        let index = 0;
        pageRefs.current.slice(0, pages.length).forEach((page, i) => {
            if (page && page.offsetTop <= middle) index = i;
        });
        setCurrent(index);
        const ratio = pages.length > 0 ? (index + 1) / pages.length : 1;
        setProgress(ratio);
        onProgress?.(ratio);
    }

    function goTo(index: number) {
        const target = Math.max(0, Math.min(index, pages.length - 1));
        setCurrent(target);
        const page = pageRefs.current[target];
        const scroller = scrollRef.current;
        if (page && scroller) {
            scroller.scrollTo({ top: Math.max(0, page.offsetTop - 16), behavior: 'smooth' });
        }
    }

    const paged = mode === 'paged';
    // Гар утасны өргөнд цаасан хуудсыг дуурайлгахаа больж, апп шиг цэвэр
    // уншлагын горимд шилжинэ.
    const reader = !paged && width > 0 && width < PAGED_MIN_WIDTH;

    return (
        <div ref={wrapRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {/* Хэмжилтийн далд хуулбар — хуудасны заагийг тооцоход ашиглана */}
            <div
                ref={measureRef}
                className="hr-doc-view"
                aria-hidden
                style={{
                    position: 'absolute', visibility: 'hidden', pointerEvents: 'none',
                    left: -99999, top: 0, width: contentWidth > 0 ? contentWidth : undefined,
                    fontSize: 13.5, lineHeight: 1.65,
                }}
            />

            {/* Уншлагын самбар — гар утсанд явцын зураас, горимын сонголт */}
            {reader ? (
                <div className="shrink-0 border-b bg-card">
                    <div className="flex items-center gap-2 px-3 py-2">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                            {progress >= 0.99 ? 'Уншиж дууссан' : `Уншсан ${Math.round(progress * 100)}%`}
                        </span>
                        <div className="ml-auto flex items-center rounded-full bg-muted p-0.5">
                            <span className="flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
                                <ScrollText className="size-3.5" /> Гүйлгэх
                            </span>
                            <button type="button"
                                onClick={() => { setUserPickedMode(true); setMode('paged'); }}
                                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                <FileStack className="size-3.5" /> Хуудсаар
                            </button>
                        </div>
                    </div>
                    <div className="h-[3px] w-full bg-muted">
                        <div className="h-full rounded-r-full bg-emerald-500 transition-[width] duration-200"
                            style={{ width: `${Math.max(2, progress * 100)}%` }} />
                    </div>
                </div>
            ) : (
            <div className="flex shrink-0 items-center gap-2 border-b bg-muted/40 px-3 py-1.5">
                {paged && pages.length > 1 ? (
                    <>
                        <button type="button" onClick={() => goTo(current - 1)} disabled={current === 0}
                            className="flex size-7 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40">
                            <ChevronLeft className="size-4" />
                        </button>
                        <span className="min-w-[92px] text-center text-xs font-semibold text-foreground">
                            Хуудас {current + 1} / {pages.length}
                        </span>
                        <button type="button" onClick={() => goTo(current + 1)} disabled={current >= pages.length - 1}
                            className="flex size-7 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40">
                            <ChevronRight className="size-4" />
                        </button>
                    </>
                ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                        {paged ? 'Нэг хуудас' : 'Тасралтгүй горим'}
                    </span>
                )}

                <button
                    type="button"
                    onClick={() => { setUserPickedMode(true); setMode(paged ? 'flow' : 'paged'); }}
                    className="ml-auto flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted">
                    {paged ? <><ScrollText className="size-3.5" /> Тасралтгүй</> : <><FileStack className="size-3.5" /> Хуудсаар</>}
                </button>
            </div>
            )}

            {/* Хуудсууд */}
            <div ref={scrollRef} onScroll={handleScroll}
                className={`min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden ${
                    reader ? 'bg-card' : 'bg-slate-200/60 px-3 py-4 dark:bg-zinc-950/40'}`}
                style={reader ? { WebkitOverflowScrolling: 'touch' } as React.CSSProperties : undefined}>
                <div className={`mx-auto flex max-w-full flex-col items-center ${reader ? '' : 'gap-4'}`}
                    style={{ width: reader ? '100%' : pageWidth || undefined }}>
                    {pages.map((pageHtml, i) => (
                        <div
                            key={i}
                            ref={el => { pageRefs.current[i] = el; }}
                            className={`relative w-full ${reader
                                ? 'bg-card text-foreground'
                                : 'bg-white text-zinc-900 shadow-md dark:bg-zinc-900 dark:text-zinc-100'}`}
                            style={{
                                minHeight: paged ? pageHeight : undefined,
                                padding: reader ? '18px 18px 26px' : padding || 32,
                                fontSize: reader ? 15 : 13.5,
                                lineHeight: reader ? 1.72 : 1.65,
                                letterSpacing: reader ? 0.1 : undefined,
                            }}>
                            <div className="hr-doc-view" dangerouslySetInnerHTML={{ __html: pageHtml }} />
                            {paged && (
                                <span className="pointer-events-none absolute bottom-2.5 left-0 right-0 text-center text-[10px] text-zinc-400">
                                    {i + 1} / {pages.length}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <style>{DOC_STYLES}</style>
        </div>
    );
}

/** Гарын үсгийн блокыг хуудасны урсгалд оруулах HTML болгоно. */
export function signatureBlockHtml(doc: {
    employer_position: string | null; employer_name: string | null;
    employer_signature: string | null; employer_signed_at: string | null;
    employer_stamp?: string | null;
    employee_position: string | null; employee_name: string | null;
    employee_signature: string | null; employee_signed_at: string | null;
}, employeeFallbackName = ''): string {
    const cell = (role: string, sub: string | null, sig: string | null, name: string | null, at: string | null, placeholder: string, stamp?: string | null) => `
        <td style="width:50%;border:none;padding:0 14px 0 0;vertical-align:top">
            <p style="margin:0 0 2px;font-weight:700;font-size:.82rem">${role}</p>
            <p style="margin:0 0 6px;font-size:.78rem;color:#64748b">${sub || '—'}</p>
            <div style="height:64px;display:flex;align-items:flex-end">
                ${sig
                    ? `<img src="${sig}" alt="" style="max-height:58px;background:#fff" />`
                    : `<span style="font-size:.75rem;font-style:italic;color:#94a3b8">${placeholder}</span>`}
                ${stamp ? `<img src="${stamp}" alt="" style="width:86px;margin-left:-20px;opacity:.9" />` : ''}
            </div>
            <div style="border-bottom:1px solid #475569;margin-bottom:4px"></div>
            <p style="margin:0;font-weight:700;font-size:.85rem">${name || '—'}</p>
            ${at ? `<p style="margin:2px 0 0;font-size:.7rem;color:#94a3b8">${at}</p>` : ''}
        </td>`;

    return `
        <div class="doc-nobreak" style="margin-top:26px;border-top:1px solid #cbd5e1;padding-top:16px">
            <p style="margin:0 0 12px;font-weight:700;font-size:.88rem">ГЭРЭЭ БАЙГУУЛСАН:</p>
            <table class="plain" style="width:100%;border-collapse:collapse;margin:0"><tbody><tr>
                ${cell('Ажил олгогчийг төлөөлж:', doc.employer_position, doc.employer_signature, doc.employer_name, doc.employer_signed_at, 'Гарын үсэг хүлээгдэж байна…', doc.employer_stamp)}
                ${cell('Ажилтан:', doc.employee_position, doc.employee_signature, doc.employee_name || employeeFallbackName, doc.employee_signed_at, 'Гарын үсэг хүлээгдэж байна…')}
            </tr></tbody></table>
        </div>`;
}
