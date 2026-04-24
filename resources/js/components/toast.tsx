import { usePage } from '@inertiajs/react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
    exiting: boolean;
}

/* ─── Config ─────────────────────────────────────────────────────────────── */
const DURATION  = 4500; // ms
const EXIT_TIME = 350;  // exit animation ms

const STYLES: Record<ToastType, {
    wrapper: string;
    icon: string;
    bar: string;
    Icon: React.ElementType;
    title: string;
}> = {
    success: {
        wrapper: 'border-green-500/30 bg-green-500/10 text-green-800 dark:text-green-200',
        icon:    'text-green-500',
        bar:     'bg-green-500',
        Icon:    CheckCircle2,
        title:   'Амжилттай',
    },
    error: {
        wrapper: 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200',
        icon:    'text-red-500',
        bar:     'bg-red-500',
        Icon:    AlertCircle,
        title:   'Алдаа',
    },
    warning: {
        wrapper: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200',
        icon:    'text-yellow-500',
        bar:     'bg-yellow-500',
        Icon:    AlertTriangle,
        title:   'Анхааруулга',
    },
    info: {
        wrapper: 'border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-200',
        icon:    'text-blue-500',
        bar:     'bg-blue-500',
        Icon:    Info,
        title:   'Мэдэгдэл',
    },
};

/* ─── Single toast card ──────────────────────────────────────────────────── */
function ToastCard({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
    const s = STYLES[item.type];
    const [progress, setProgress] = useState(100);
    const startRef = useRef<number>(Date.now());
    const rafRef   = useRef<number | null>(null);

    useEffect(() => {
        function tick() {
            const elapsed  = Date.now() - startRef.current;
            const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
            setProgress(remaining);
            if (remaining > 0) {
                rafRef.current = requestAnimationFrame(tick);
            }
        }
        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, []);

    return (
        <div
            className={`relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg backdrop-blur-sm transition-all duration-[350ms] ${s.wrapper} ${
                item.exiting
                    ? 'translate-x-[110%] opacity-0'
                    : 'translate-x-0 opacity-100'
            }`}
        >
            {/* Icon */}
            <s.Icon className={`mt-0.5 size-5 shrink-0 ${s.icon}`} />

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide opacity-70">{s.title}</p>
                <p className="mt-0.5 text-sm font-medium leading-snug break-words">{item.message}</p>
            </div>

            {/* Close */}
            <button
                onClick={() => onRemove(item.id)}
                className="shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100 transition-opacity"
            >
                <X className="size-4" />
            </button>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 h-[3px] w-full bg-black/10">
                <div
                    className={`h-full ${s.bar} transition-none`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

/* ─── Toast container (reads flash from Inertia shared data) ─────────────── */
export function ToastContainer() {
    const { props } = usePage<any>();
    const flash: Record<string, string | null> = (props.flash as any) ?? {};

    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const shownRef = useRef<Set<string>>(new Set());

    // ── Remove with exit animation ─────────────────────────────────────────
    const remove = useCallback((id: string) => {
        setToasts(t => t.map(item => item.id === id ? { ...item, exiting: true } : item));
        setTimeout(() => setToasts(t => t.filter(item => item.id !== id)), EXIT_TIME);
    }, []);

    // ── Add a new toast ────────────────────────────────────────────────────
    const add = useCallback((type: ToastType, message: string) => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts(t => [...t, { id, type, message, exiting: false }]);
        setTimeout(() => remove(id), DURATION);
    }, [remove]);

    // ── Watch flash changes ────────────────────────────────────────────────
    useEffect(() => {
        const types: [ToastType, string | null][] = [
            ['success', flash.success ?? null],
            ['error',   flash.error   ?? null],
            ['warning', flash.warning ?? null],
            ['info',    flash.info    ?? null],
        ];

        types.forEach(([type, msg]) => {
            if (!msg) return;
            // key = type + message — ижил мессеж дахин гарахаас сэргийлэх
            const key = `${type}:${msg}`;
            if (shownRef.current.has(key)) return;
            shownRef.current.add(key);
            add(type, msg);
            // 500ms дараа set-ийг цэвэрлэх (дараагийн flash-д бэлэн байхын тулд)
            setTimeout(() => shownRef.current.delete(key), 600);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash.success, flash.error, flash.warning, flash.info]);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col items-end gap-2.5 pointer-events-none">
            {toasts.map(item => (
                <div key={item.id} className="pointer-events-auto w-full">
                    <ToastCard item={item} onRemove={remove} />
                </div>
            ))}
        </div>
    );
}
