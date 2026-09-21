import { Link } from '@inertiajs/react';
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   MOTION — нийтийн хуудасны хөдөлгөөний нэгдсэн систем
   Бүх анимэйшн CSS дээр, JS нь зөвхөн "харагдлаа" гэдгийг мэдэгдэнэ.
   Загварын CSS: resources/css/app.css доторх ".cw" блок.
   ═══════════════════════════════════════════════════════════════════════════ */

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Хуудасны хөдөлгөөний үндэс:
 *  1. [data-reveal] элемент дэлгэцэнд орж ирэхэд .is-in нэмнэ (ганц IntersectionObserver).
 *  2. [data-parallax] элементийг гүйлтийн дагуу зөөлөн хөдөлгөнө (--py).
 *  3. Дээд талын гүйлтийн явцын зураасыг (--cw-progress) шинэчилнэ.
 *  4. --alh-vw (scrollbar-гүй бодит өргөн) тавина — full-bleed блокуудад.
 */
export function useMotionRoot() {
    const io = useRef<IntersectionObserver | null>(null);

    /* --alh-vw — 100vw нь scrollbar-ыг оролцуулдаг тул бодит өргөнийг хэмжинэ */
    useEffect(() => {
        const set = () => document.documentElement.style.setProperty('--alh-vw', `${document.documentElement.clientWidth}px`);
        set();
        window.addEventListener('resize', set, { passive: true });
        return () => window.removeEventListener('resize', set);
    }, []);

    /* reveal */
    useEffect(() => {
        if (reduced()) {
            document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
            return;
        }
        if (!io.current) {
            io.current = new IntersectionObserver(
                (entries) => {
                    for (const e of entries) {
                        if (!e.isIntersecting) continue;
                        e.target.classList.add('is-in');
                        io.current?.unobserve(e.target);
                    }
                },
                { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
            );
        }
        /* dep-гүй effect — render бүрт шинэ элементүүдийг л нэмж хянана */
        document.querySelectorAll('[data-reveal]:not([data-rv])').forEach((el) => {
            el.setAttribute('data-rv', '');
            io.current!.observe(el);
        });
    });

    useEffect(() => () => io.current?.disconnect(), []);

    /* parallax + гүйлтийн явц — нэг rAF циклд */
    useEffect(() => {
        if (reduced()) return;
        let raf: number | null = null;

        const frame = () => {
            raf = null;
            const doc = document.documentElement;
            const y = window.scrollY || 0;

            /* явцын зураас 0→1 */
            const max = (doc.scrollHeight - window.innerHeight) || 1;
            doc.style.setProperty('--cw-progress', String(Math.min(1, Math.max(0, y / max))));

            /* parallax — элемент дэлгэцийн төвөөс хэр хол байгаагаар */
            const vh = window.innerHeight;
            document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
                const r = el.getBoundingClientRect();
                if (r.bottom < -200 || r.top > vh + 200) return;
                const amount = parseFloat(el.dataset.parallax || '14');
                const p = (r.top + r.height / 2 - vh / 2) / vh;   // ойролцоогоор -1..1
                el.style.setProperty('--py', `${(-p * amount).toFixed(1)}px`);
            });
        };

        const onScroll = () => { if (raf === null) raf = requestAnimationFrame(frame); };
        frame();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (raf !== null) cancelAnimationFrame(raf);
        };
    }, []);
}

/** Гарчгийг үг тус бүрээр доороос нь дараалуулан гаргана */
export function SplitText({ text, accent = false, from = 0 }: { text: string; accent?: boolean; from?: number }) {
    const words = text.split(/\s+/).filter(Boolean);
    return (
        <>
            {words.map((w, i) => (
                <Fragment key={`${w}-${i}`}>
                    {i > 0 && ' '}
                    <span>
                        <b style={{ '--i': i + from } as CSSProperties}>
                            {w}
                            {accent && i === words.length - 1 && <em>.</em>}
                        </b>
                    </span>
                </Fragment>
            ))}
        </>
    );
}

/** Дэлгэцэнд орж ирэхэд 0-ээс тоолж гарах тоо */
export function Counter({ to, suffix = '', duration = 1600 }: { to: number; suffix?: string; duration?: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const [n, setN] = useState(0);
    const done = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (reduced()) { setN(to); return; }

        const io = new IntersectionObserver((entries) => {
            if (!entries[0].isIntersecting || done.current) return;
            done.current = true;
            io.disconnect();
            const t0 = performance.now();
            const tick = (t: number) => {
                const p = Math.min(1, (t - t0) / duration);
                const eased = 1 - Math.pow(1 - p, 4);   // easeOutQuart
                setN(Math.round(to * eased));
                if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }, { threshold: 0.4 });

        io.observe(el);
        return () => io.disconnect();
    }, [to, duration]);

    return <span ref={ref}>{n}{suffix}</span>;
}

/** Секцийн толгой — улаан зураас, шошго, гарчиг, (сонголтоор) холбоос */
export function SectionHead({
    eyebrow, title, lead, href, linkLabel = 'Бүгдийг үзэх', center = false, dark = false,
}: {
    eyebrow: string; title: string; lead?: string;
    href?: string; linkLabel?: string; center?: boolean; dark?: boolean;
}) {
    return (
        <div className={`cw-head${center ? ' cw-head-c' : ''}${dark ? ' cw-head-d' : ''}`}>
            <div>
                <p className="cw-eyebrow" data-reveal="fade"><i />{eyebrow}</p>
                <h2 className="cw-title" data-reveal="words"><SplitText text={title} accent /></h2>
                {lead && <p className="cw-lead" data-reveal="up" style={{ '--d': '160ms' } as CSSProperties}>{lead}</p>}
            </div>
            {href && (
                <Link href={href} className="cw-more" data-reveal="fade" style={{ '--d': '220ms' } as CSSProperties}>
                    {linkLabel}<span>→</span>
                </Link>
            )}
        </div>
    );
}

/** Хэсгийн зураас — дэлгэцэнд орж ирэхэд зүүнээс баруун тийш татагдана */
export function Rule({ className = '' }: { className?: string }) {
    return <div className={`cw-rule ${className}`} data-reveal="rule" />;
}

/**
 * Дотоод хуудсын нээлтийн блок — hero-гийн хэлээр (шошго, гарчиг, тайлбар).
 * Navbar доогуур эхэлдэг тул дээрээс зай авна.
 */
export function PageHero({ eyebrow, title, lead, aside }: {
    eyebrow: string; title: string; lead?: string; aside?: ReactNode;
}) {
    return (
        <header className="cw-phero">
            <div>
                <p className="cw-eyebrow" data-reveal="fade"><i />{eyebrow}</p>
                <h1 className="cw-phero-t" data-reveal="words"><SplitText text={title} accent /></h1>
                {lead && <p className="cw-phero-l" data-reveal="up" style={{ '--d': '220ms' } as CSSProperties}>{lead}</p>}
            </div>
            {aside && <div className="cw-phero-a" data-reveal="up" style={{ '--d': '300ms' } as CSSProperties}>{aside}</div>}
        </header>
    );
}

/**
 * Дэлгэц дүүрэн (full-bleed) блок — 1240px container-аас гарна.
 * --alh-vw-г useMotionRoot тавьдаг.
 */
export function Bleed({ children, className = '', tone = 'light', parallax }: {
    children: ReactNode; className?: string; tone?: 'light' | 'ink' | 'red'; parallax?: number;
}) {
    return (
        <section
            className={`cw-bleed cw-bleed-${tone} ${className}`}
            data-parallax={parallax != null ? String(parallax) : undefined}
        >
            {children}
        </section>
    );
}
