import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { AlertCircle, Lock, LockOpen, ShieldCheck } from 'lucide-react';

/**
 * Тамга / захирлын гарын үсгийн түгжээ.
 *
 * HR портал нь хүн нөөцийн бүх ажилтанд нээлттэй тул байгууллагын тамга солих,
 * гэрээнд захирлын нэрээр гарын үсэг зурах үйлдлийг нэмэлт PIN кодоор түгжинэ.
 * Код зөв оруулсан тохиолдолд сесс дотор 15 минут нээлттэй байх тул дараалсан
 * үйлдэл бүрт кодыг дахин асуухгүй.
 */

interface SealStatus {
    unlocked: boolean;
    /** Түгжээ дахин хаагдах хүртэлх секунд. */
    expires_in: number;
}

export async function fetchSealStatus(): Promise<SealStatus> {
    try {
        const res = await fetch('/hr/seal', { headers: csrfHeaders() });

        return res.ok ? await res.json() : { unlocked: false, expires_in: 0 };
    } catch {
        return { unlocked: false, expires_in: 0 };
    }
}

export async function relockSeal(): Promise<void> {
    await fetch('/hr/seal/lock', { method: 'POST', headers: csrfHeaders() }).catch(() => {});
}

/** Сервер 423 буцаасан эсэх — түгжээ хаагдсаныг илтгэнэ. */
export function isSealLocked(res: Response): boolean {
    return res.status === 423;
}

/**
 * Түгжээний төлвийг хөтөлнө. `unlocked === null` үед төлөв нь тодорхойгүй
 * (сервер рүү хүсэлт хараахан буцаж ирээгүй) гэсэн үг.
 */
export function useSealLock() {
    const [unlocked, setUnlocked] = useState<boolean | null>(null);
    const [remaining, setRemaining] = useState(0);

    const refresh = useCallback(async () => {
        const status = await fetchSealStatus();
        setUnlocked(status.unlocked);
        setRemaining(status.expires_in);

        return status.unlocked;
    }, []);

    useEffect(() => { void refresh(); }, [refresh]);

    // Үлдсэн хугацааг тоолж, дууссан үед төлвийг өөрөө түгжээтэй болгоно
    useEffect(() => {
        if (!unlocked || remaining <= 0) return;
        const t = setInterval(() => {
            setRemaining(prev => {
                if (prev <= 1) {
                    setUnlocked(false);

                    return 0;
                }

                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(t);
    }, [unlocked, remaining]);

    const onUnlocked = useCallback((expiresIn: number) => {
        setUnlocked(true);
        setRemaining(expiresIn);
    }, []);

    /** Сервер 423 буцаахад дуудна — дэлгэц дээрх төлвийг тэр дор нь тааруулна. */
    const markLocked = useCallback(() => {
        setUnlocked(false);
        setRemaining(0);
    }, []);

    const relock = useCallback(async () => {
        await relockSeal();
        markLocked();
    }, [markLocked]);

    return { unlocked, remaining, refresh, onUnlocked, markLocked, relock };
}

/** «12:34» хэлбэрээр үлдсэн хугацааг харуулна. */
export function formatRemaining(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${String(s).padStart(2, '0')}`;
}

interface PanelProps {
    /** Юунд хандахыг оролдсоныг тайлбарлана. */
    description?: string;
    /** Код зөв болоход дуудагдана — нээлттэй байх секундыг дамжуулна. */
    onUnlocked: (expiresIn: number) => void;
    /** Байхгүй бол «Болих» товч харагдахгүй. */
    onCancel?: () => void;
    /** Модалын доторх бүтэн дэлгэц биш, жижиг хэлбэрээр харуулах. */
    compact?: boolean;
}

/**
 * PIN код асуух хэсэг. Модал дотор шууд байрлуулж болно.
 */
export function SealUnlockPanel({ description, onUnlocked, onCancel, compact }: PanelProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => { inputRef.current?.focus(); }, []);

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (!code.trim() || busy) return;

        setBusy(true);
        setError('');
        try {
            const res = await fetch('/hr/seal/unlock', {
                method: 'POST',
                headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.message ?? 'Код буруу байна.');
                setCode('');
                inputRef.current?.focus();

                return;
            }

            onUnlocked(data.expires_in ?? 0);
        } catch {
            setError('Сүлжээний алдаа. Дахин оролдоно уу.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} className={compact ? 'space-y-3' : 'space-y-4 px-5 py-8'}>
            <div className="flex flex-col items-center text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    <Lock className="size-6" />
                </span>
                <p className="mt-3 text-sm font-semibold text-foreground">Түгжээтэй хэсэг</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    {description ?? 'Үргэлжлүүлэхийн тулд хамгаалалтын кодоо оруулна уу.'}
                </p>
            </div>

            <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={code}
                onChange={e => { setCode(e.target.value); if (error) setError(''); }}
                placeholder="• • • •"
                className="mx-auto block w-44 rounded-xl border bg-background px-3 py-2.5 text-center text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            {error && (
                <p className="flex items-center justify-center gap-1.5 text-xs text-red-500">
                    <AlertCircle className="size-3.5 shrink-0" /> {error}
                </p>
            )}

            <div className="flex justify-center gap-2">
                {onCancel && (
                    <button type="button" onClick={onCancel}
                        className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
                        Болих
                    </button>
                )}
                <button type="submit" disabled={busy || !code.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50">
                    <LockOpen className="size-4" /> Түгжээг нээх
                </button>
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
                Кодыг админ «Тохиргоо → Систем» хэсгээс солино.
            </p>
        </form>
    );
}

/** Түгжээ нээлттэй үед үлдсэн хугацааг харуулах жижиг тэмдэг. */
export function SealUnlockedBadge({ remaining, onRelock }: { remaining: number; onRelock: () => void }) {
    return (
        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <ShieldCheck className="size-3.5 shrink-0" />
            Түгжээ нээлттэй · {formatRemaining(remaining)}
            <button type="button" onClick={onRelock} title="Одоо дахин түгжих"
                className="ml-0.5 rounded p-0.5 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/40">
                <Lock className="size-3" />
            </button>
        </span>
    );
}
