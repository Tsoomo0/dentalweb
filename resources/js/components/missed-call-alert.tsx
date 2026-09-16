import { Link } from '@inertiajs/react';
import axios from 'axios';
import { Clock, PhoneMissed, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Алдсан дуудлагын шууд сануулга — ресепшний БҮХ хуудсан дээр ажиллана.
 *
 * Хонх дээр дарж хардаггүй тул шинэ алдсан дуудлага гармагц дэлгэц дээр
 * цонх гаргаж, дуут дохио өгнө.
 *
 * Хоёр зарчим:
 *   1. Хуудас нээх үед байсан дуудлагад цонх гаргахгүй. Эс бөгөөс хуудас
 *      сэргээх бүрт хуучин дуудлагын цонх дахин гарч ажил тасалдана.
 *   2. Нэг дуудлагад НЭГ л удаа. Хаасан дуудлагыг тэмдэглэж хадгална.
 */

interface Alert {
    id: number;
    number: string | null;
    queue_name: string | null;
    started_at: string | null;
    waited_minutes: number;
}

const POLL_MS = 20_000;
const SEEN_KEY = 'missed-call-seen';

function loadSeen(): number[] {
    try {
        const raw = localStorage.getItem(SEEN_KEY);

        return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
        // Хувийн горим эсвэл хадгалалт хаалттай — санахгүй ч ажиллана
        return [];
    }
}

function saveSeen(ids: number[]) {
    try {
        // Хэт томроход сүүлийн 100-г л үлдээнэ
        localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-100)));
    } catch { /* хадгалж чадсангүй — зүгээр */ }
}

/** Богино дохио. Аудио файл шаардахгүй — Web Audio-гоор үүсгэнэ. */
function chime() {
    try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        setTimeout(() => ctx.close(), 800);
    } catch { /* хөтөч зөвшөөрөөгүй — чимээгүй ажиллана */ }
}

export function MissedCallAlert() {
    const [queue, setQueue] = useState<Alert[]>([]);
    const seen = useRef<Set<number>>(new Set(loadSeen()));
    const primed = useRef(false);

    const dismiss = useCallback((id: number) => {
        seen.current.add(id);
        saveSeen([...seen.current]);
        setQueue((q) => q.filter((a) => a.id !== id));
    }, []);

    useEffect(() => {
        let alive = true;

        const check = async () => {
            try {
                const { data } = await axios.get<{ alerts: Alert[] }>('/reception/calls/poll');
                if (!alive) return;

                const fresh = (data.alerts ?? []).filter((a) => !seen.current.has(a.id));

                // Эхний шалгалт: одоо байгааг «үзсэн» гэж тэмдэглээд цонх
                // гаргахгүй. Зөвхөн ҮҮНЭЭС ХОЙШ ирэх дуудлагад сануулна.
                if (!primed.current) {
                    primed.current = true;
                    fresh.forEach((a) => seen.current.add(a.id));
                    saveSeen([...seen.current]);

                    return;
                }

                if (fresh.length > 0) {
                    setQueue((q) => {
                        const ids = new Set(q.map((a) => a.id));

                        return [...q, ...fresh.filter((a) => !ids.has(a.id))];
                    });
                    chime();
                }
            } catch { /* сүлжээ тасарсан — дараагийн оролдлогод засарна */ }
        };

        check();
        const timer = setInterval(check, POLL_MS);

        return () => { alive = false; clearInterval(timer); };
    }, []);

    const current = queue[0];

    if (!current) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-red-300/70 bg-white shadow-2xl dark:border-red-500/30 dark:bg-zinc-900">
                <div className="flex items-start gap-3 bg-gradient-to-br from-red-500 to-rose-600 px-5 py-4 text-white">
                    <span className="grid size-10 shrink-0 animate-pulse place-items-center rounded-xl bg-white/20">
                        <PhoneMissed className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-80">Алдсан дуудлага</p>
                        <p className="truncate text-lg font-bold">{current.number ?? 'Дугаар тодорхойгүй'}</p>
                    </div>
                    <button
                        onClick={() => dismiss(current.id)}
                        className="rounded-lg p-1 transition hover:bg-white/20"
                        aria-label="Хаах"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <div className="space-y-1 px-5 py-4 text-sm">
                    <p className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="size-3.5" />
                        {current.started_at} · {current.waited_minutes} минут болсон
                    </p>
                    {current.queue_name && (
                        <p className="font-mono text-xs text-muted-foreground">{current.queue_name}</p>
                    )}
                    <p className="pt-1 font-medium">Энэ дугаар руу эргэж холбогдоно уу.</p>
                    {queue.length > 1 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            Дараа нь бас {queue.length - 1} дуудлага хүлээгдэж байна
                        </p>
                    )}
                </div>

                <div className="flex gap-2 border-t border-gray-200 px-5 py-3 dark:border-white/10">
                    <button
                        onClick={() => dismiss(current.id)}
                        className="h-9 flex-1 rounded-lg border border-gray-200 text-sm font-medium transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.05]"
                    >
                        Дараа
                    </button>
                    <Link
                        href="/reception/calls"
                        onClick={() => dismiss(current.id)}
                        className="grid h-9 flex-1 place-items-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-sm font-semibold text-white shadow-sm transition hover:from-red-600 hover:to-rose-700"
                    >
                        Жагсаалт руу
                    </Link>
                </div>
            </div>
        </div>
    );
}
