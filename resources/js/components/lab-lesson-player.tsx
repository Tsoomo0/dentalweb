import { csrfHeaders } from '@/lib/csrf';
import {
    Check, Gauge, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw,
    SkipForward, Volume2, VolumeX,
} from 'lucide-react';
import {
    forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState,
} from 'react';

/**
 * Хичээлийн видео тоглуулагч.
 *
 * Локал файлыг өөрийн удирдлагаар (хурд, гарын товчлуур, бүтэн дэлгэц,
 * дараагийн хичээл рүү автомат шилжих) тоглуулна. YouTube-ийг IFrame API-аар
 * тоглуулж зөвхөн явцыг бүртгэнэ — тэнд удирдлага нь YouTube-ийнх байна.
 *
 * Явцыг бүртгэх зарчим: зөвхөн БОДИТООР тоглосон хэсгийг 5 секундын нүд
 * болгон тэмдэглэнэ. Тиймээс seek хийсэн хэсэг тоологдохгүй, дахин үзэхэд
 * давхардахгүй, бүтэн үзвэл яг 100% болно.
 */

const PING_EVERY = 15;   // секунд тутам сервер рүү мэдэгдэнэ
const BUCKET     = 5;    // видеог хэдэн секундын нүд болгон бүртгэх (сервертэй тааруулна)
const SPEEDS     = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const NEXT_AFTER = 8;    // дуусаад хэдэн секундын дараа дараагийн хичээл рүү

export interface PlayerHandle {
    /** Тухайн агшны секунд — тэмдэглэл нэмэхэд ашиглана. */
    currentTime: () => number;
    /** Тухайн секунд рүү үсэрч тоглуулна. */
    seekTo: (seconds: number) => void;
}

interface Props {
    lessonId: number;
    playback: { provider: 'file' | 'youtube'; src: string };
    poster: string | null;
    startAt: number;
    /** Бүтэн дэлгэц дээр дээд талд харагдах хичээлийн нэр. */
    title?: string;
    onProgress?: (state: { percent: number; completed: boolean }) => void;
    /** Дараагийн хичээл — дуусахад автоматаар санал болгоно. */
    next?: { id: number; title: string } | null;
    onNext?: () => void;
}

declare global {
    interface Window {
        YT?: any;
        onYouTubeIframeAPIReady?: () => void;
    }
}

export function clock(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;
}

/** YouTube IFrame API-г нэг л удаа ачаална. */
function loadYouTubeApi(): Promise<any> {
    if (window.YT?.Player) return Promise.resolve(window.YT);

    return new Promise((resolve) => {
        const existing = document.getElementById('youtube-iframe-api');
        const prev = window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady = () => {
            prev?.();
            resolve(window.YT);
        };

        if (!existing) {
            const tag = document.createElement('script');
            tag.id  = 'youtube-iframe-api';
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
        }
    });
}

const LabLessonPlayer = forwardRef<PlayerHandle, Props>(function LabLessonPlayer(
    { lessonId, playback, poster, startAt, title, onProgress, next, onNext },
    ref,
) {
    const videoRef    = useRef<HTMLVideoElement>(null);
    const shellRef    = useRef<HTMLDivElement>(null);
    const ytHostRef   = useRef<HTMLDivElement>(null);
    const deltaRef    = useRef(0);                      // сүүлийн ping-ээс хойш бодитоор үзсэн секунд
    const bucketsRef  = useRef<Set<number>>(new Set()); // үзсэн 5 секундын нүднүүд
    const durationRef = useRef(0);
    const lastTimeRef = useRef<number | null>(null);
    const positionRef = useRef(startAt);
    const openedRef   = useRef(true);                   // эхний ping дээр "нээсэн" гэж тоолуулна
    const hideTimer   = useRef<ReturnType<typeof setTimeout>>(undefined);

    const [resumed, setResumed]     = useState(false);
    const [playing, setPlaying]     = useState(false);
    const [time, setTime]           = useState(startAt);
    const [duration, setDuration]   = useState(0);
    const [buffered, setBuffered]   = useState(0);
    const [volume, setVolume]       = useState(1);
    const [muted, setMuted]         = useState(false);
    const [speed, setSpeed]         = useState(1);
    const [speedOpen, setSpeedOpen] = useState(false);
    const [full, setFull]           = useState(false);
    const [showUi, setShowUi]       = useState(true);
    const [ended, setEnded]         = useState(false);
    const [countdown, setCountdown] = useState(NEXT_AFTER);
    const [waiting, setWaiting]     = useState(false);   // сүлжээ хүлээж байгаа эсэх
    const [hover, setHover]         = useState<{ ratio: number } | null>(null);

    useImperativeHandle(ref, () => ({
        currentTime: () => positionRef.current,
        seekTo: (seconds: number) => {
            if (videoRef.current) {
                videoRef.current.currentTime = seconds;
                void videoRef.current.play().catch(() => undefined);
            }
        },
    }));

    /** Явцыг сервер рүү илгээх. Хуудас хаагдах үед sendBeacon ашиглана. */
    const flush = useCallback((useBeacon = false) => {
        const delta   = Math.round(deltaRef.current);
        const buckets = [...bucketsRef.current];

        if (delta <= 0 && buckets.length === 0 && !openedRef.current) return;

        const payload = {
            position: Math.round(positionRef.current),
            delta,
            buckets,
            duration: Math.round(durationRef.current),
            opened: openedRef.current,
        };

        deltaRef.current = 0;
        bucketsRef.current = new Set();
        openedRef.current = false;

        const url = `/my/training/lessons/${lessonId}/progress`;

        if (useBeacon && navigator.sendBeacon) {
            // sendBeacon нь толгой нэмэх боломжгүй тул FormData-аар CSRF-ээ явуулна
            const fd = new FormData();
            fd.append('position', String(payload.position));
            fd.append('delta', String(payload.delta));
            fd.append('duration', String(payload.duration));
            fd.append('opened', payload.opened ? '1' : '0');
            payload.buckets.forEach((b) => fd.append('buckets[]', String(b)));
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
            .then((j) => j && onProgress?.({ percent: j.percent, completed: j.completed }))
            .catch(() => undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lessonId]);

    /**
     * Хоёр хэмжилтийн зөрүүг шалгаж, бодит тоглолт бол үзсэн хэсэгт тэмдэглэнэ.
     * 0 < diff <= 2 секунд бол хэвийн тоглолт; үүнээс их бол seek хийсэн гэж
     * үзэж алгасна — тэгснээр төгсгөл рүү чирэх нь үзэлт болж тоологдохгүй.
     */
    const accumulate = (now: number) => {
        const prev = lastTimeRef.current;
        lastTimeRef.current = now;
        positionRef.current = now;

        if (prev === null) return;

        const diff = now - prev;
        if (diff <= 0 || diff > 2) return;

        deltaRef.current += diff;

        for (let t = prev; t < now; t += 1) {
            bucketsRef.current.add(Math.floor(t / BUCKET));
        }
        bucketsRef.current.add(Math.floor(now / BUCKET));
    };

    // Тогтмол давтамжтай ping + хуудас хаагдахад сүүлийн явцыг хадгалах
    useEffect(() => {
        const timer  = setInterval(() => flush(), PING_EVERY * 1000);
        const onHide = () => flush(true);
        const onVis  = () => document.visibilityState === 'hidden' && flush(true);

        window.addEventListener('pagehide', onHide);
        document.addEventListener('visibilitychange', onVis);

        return () => {
            clearInterval(timer);
            window.removeEventListener('pagehide', onHide);
            document.removeEventListener('visibilitychange', onVis);
            flush(true);
        };
    }, [flush]);

    // Бүтэн дэлгэцийн төлөвийг браузераас дагана (Esc дарахад ч зөв байх)
    useEffect(() => {
        const onFs = () => setFull(document.fullscreenElement === shellRef.current);
        document.addEventListener('fullscreenchange', onFs);

        return () => document.removeEventListener('fullscreenchange', onFs);
    }, []);

    // Хурдны цэсийг гадуур дарахад хаана
    useEffect(() => {
        if (!speedOpen) return;

        const close = (e: PointerEvent) => {
            if (!(e.target as HTMLElement | null)?.closest('[data-speed-menu]')) setSpeedOpen(false);
        };

        document.addEventListener('pointerdown', close);

        return () => document.removeEventListener('pointerdown', close);
    }, [speedOpen]);

    /* ── Удирдлагын үйлдлүүд ────────────────────────────────────────────── */

    const togglePlay = useCallback(() => {
        const v = videoRef.current;
        if (!v) return;

        if (v.paused) void v.play().catch(() => undefined);
        else v.pause();
    }, []);

    const seekBy = useCallback((amount: number) => {
        const v = videoRef.current;
        if (!v) return;

        v.currentTime = Math.min(Math.max(0, v.currentTime + amount), v.duration || 0);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void shellRef.current?.requestFullscreen().catch(() => undefined);
    }, []);

    const applySpeed = (rate: number) => {
        setSpeed(rate);
        setSpeedOpen(false);
        if (videoRef.current) videoRef.current.playbackRate = rate;
    };

    /** Хулгана хөдлөхөд удирдлагыг харуулж, 2.5 секундын дараа нуух. */
    const wakeUi = useCallback(() => {
        setShowUi(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setShowUi(false), 2500);
    }, []);

    // Гарын товчлуур — талбарт бичиж байх үед идэвхгүй
    useEffect(() => {
        if (playback.provider !== 'file') return;

        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement | null;
            if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
            if (el?.isContentEditable) return;

            const v = videoRef.current;
            if (!v) return;

            const keys: Record<string, () => void> = {
                ' ': togglePlay,
                k: togglePlay,
                ArrowLeft: () => seekBy(-5),
                ArrowRight: () => seekBy(5),
                j: () => seekBy(-10),
                l: () => seekBy(10),
                f: toggleFullscreen,
                m: () => { v.muted = !v.muted; setMuted(v.muted); },
            };

            const action = keys[e.key];
            if (action) {
                e.preventDefault();
                action();
                wakeUi();
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [playback.provider, togglePlay, seekBy, toggleFullscreen, wakeUi]);

    // Дуусаад дараагийн хичээл рүү тоолох
    useEffect(() => {
        if (!ended || !next) return;

        setCountdown(NEXT_AFTER);
        const timer = setInterval(() => {
            setCountdown((n) => {
                if (n <= 1) {
                    clearInterval(timer);
                    onNext?.();

                    return 0;
                }

                return n - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ended, next?.id]);

    // ── YouTube тоглуулагч ──────────────────────────────────────────────
    useEffect(() => {
        if (playback.provider !== 'youtube' || !ytHostRef.current) return;

        let player: any;
        let poll: ReturnType<typeof setInterval> | undefined;
        let cancelled = false;

        void loadYouTubeApi().then((YT) => {
            if (cancelled || !ytHostRef.current) return;

            player = new YT.Player(ytHostRef.current, {
                videoId: playback.src,
                playerVars: { rel: 0, modestbranding: 1, start: Math.floor(startAt) },
                events: {
                    // YouTube хичээлийн уртыг админ оруулдаггүй тул эндээс уншиж
                    // сервер рүү дамжуулна — эс тэгвээс явцыг бодох суурь байхгүй
                    onReady: () => {
                        durationRef.current = player.getDuration?.() ?? 0;
                    },
                    onStateChange: (e: any) => {
                        if (e.data === 1) {            // 1 = тоглож байна
                            poll ??= setInterval(() => accumulate(player.getCurrentTime() ?? 0), 1000);
                        } else {
                            if (poll) clearInterval(poll);
                            poll = undefined;
                            lastTimeRef.current = null;
                            flush();
                        }
                        if (e.data === 0) setEnded(true);   // 0 = дууссан
                    },
                },
            });
        });

        return () => {
            cancelled = true;
            if (poll) clearInterval(poll);
            player?.destroy?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playback.provider, playback.src]);

    /* ── Хайлтын мөр (seek bar) ─────────────────────────────────────────── */
    const barRef = useRef<HTMLDivElement>(null);

    /** Хулганы байрлалыг мөрийн 0..1 харьцаа болгоно. */
    const ratioFromPointer = (clientX: number): number | null => {
        const box = barRef.current?.getBoundingClientRect();
        if (!box || box.width === 0) return null;

        return Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    };

    const seekFromPointer = (clientX: number) => {
        const v     = videoRef.current;
        const ratio = ratioFromPointer(clientX);
        if (!v || ratio === null || !v.duration) return;

        v.currentTime = ratio * v.duration;
        setTime(v.currentTime);
    };

    const startScrub = (e: React.PointerEvent) => {
        e.preventDefault();
        seekFromPointer(e.clientX);

        const move = (ev: PointerEvent) => {
            const ratio = ratioFromPointer(ev.clientX);
            if (ratio === null) return;

            setHover({ ratio });
            seekFromPointer(ev.clientX);
        };
        const up = () => {
            setHover(null);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    if (playback.provider === 'youtube') {
        return (
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-lg ring-1 ring-black/10 dark:ring-white/10">
                <div ref={ytHostRef} className="size-full" />
            </div>
        );
    }

    const playedPct   = duration > 0 ? (time / duration) * 100 : 0;
    const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
    const uiVisible   = showUi || !playing || ended;

    const iconBtn =
        'grid size-9 shrink-0 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white active:scale-95';

    return (
        <div
            ref={shellRef}
            onMouseMove={wakeUi}
            onMouseLeave={() => playing && setShowUi(false)}
            className={`relative overflow-hidden bg-black shadow-lg ring-1 ring-black/10 dark:ring-white/10 ${
                full ? 'flex h-full items-center rounded-none' : 'aspect-video rounded-2xl'
            } ${uiVisible ? '' : 'cursor-none'}`}
        >
            <video
                ref={videoRef}
                src={playback.src}
                poster={poster ?? undefined}
                playsInline
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                preload="metadata"
                className="size-full object-contain"
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
                onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    durationRef.current = v.duration || 0;
                    setDuration(v.duration || 0);
                    v.playbackRate = speed;

                    // Өмнө нь зогсоосон газраас нь үргэлжлүүлнэ
                    if (!resumed && startAt > 0) {
                        v.currentTime = startAt;
                        setResumed(true);
                    }
                }}
                onTimeUpdate={(e) => {
                    accumulate(e.currentTarget.currentTime);
                    setTime(e.currentTarget.currentTime);
                }}
                onProgress={(e) => {
                    const b = e.currentTarget.buffered;
                    if (b.length > 0) setBuffered(b.end(b.length - 1));
                }}
                onPlay={() => { setPlaying(true); setEnded(false); wakeUi(); }}
                onWaiting={() => setWaiting(true)}
                onPlaying={() => setWaiting(false)}
                onCanPlay={() => setWaiting(false)}
                onSeeking={() => { lastTimeRef.current = null; }}
                onSeeked={() => setWaiting(false)}
                onVolumeChange={(e) => {
                    setVolume(e.currentTarget.volume);
                    setMuted(e.currentTarget.muted);
                }}
                onPause={() => {
                    setPlaying(false);
                    lastTimeRef.current = null;
                    setShowUi(true);
                    flush();
                }}
                onEnded={() => { setPlaying(false); setEnded(true); flush(); }}
            />

            {/* Бүтэн дэлгэц дээрх дээд мөр */}
            {full && title && (
                <div
                    className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-5 pb-10 pt-4 transition-opacity duration-200 ${
                        uiVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    <p className="line-clamp-1 text-sm font-semibold text-white/90">{title}</p>
                </div>
            )}

            {/* Голын том тоглуулах товч */}
            {!playing && !ended && !waiting && (
                <button
                    onClick={togglePlay}
                    aria-label="Тоглуулах"
                    className="group/play absolute inset-0 grid place-items-center bg-black/20 transition hover:bg-black/30"
                >
                    <span className="grid size-[4.5rem] place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-md transition group-hover/play:scale-105 group-hover/play:bg-white/25">
                        <Play className="ml-1 size-8 fill-white text-white" />
                    </span>
                </button>
            )}

            {/* Ачаалж байгаа тэмдэг */}
            {waiting && !ended && (
                <span className="pointer-events-none absolute inset-0 grid place-items-center">
                    <span className="size-11 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
                </span>
            )}

            {/* Дууссаны дараах дэлгэц */}
            {ended && (
                <div className="absolute inset-0 grid place-items-center bg-black/80 backdrop-blur-sm">
                    <div className="px-6 text-center">
                        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/40">
                            <Check className="size-7 text-emerald-400" />
                        </div>
                        <p className="text-lg font-semibold text-white">Хичээл дууслаа</p>

                        {next ? (
                            <>
                                <p className="mt-1 text-sm text-white/60">
                                    Дараагийн хичээл {countdown} секундын дараа эхэлнэ
                                </p>
                                <p className="mt-3 line-clamp-1 font-medium text-white/90">{next.title}</p>

                                <div className="mt-5 flex items-center justify-center gap-2">
                                    <button
                                        onClick={onNext}
                                        className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
                                    >
                                        <SkipForward className="size-4" />
                                        Одоо үзэх
                                    </button>
                                    <button
                                        onClick={() => { setEnded(false); setCountdown(NEXT_AFTER); }}
                                        className="rounded-full px-5 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                                    >
                                        Болих
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button
                                onClick={() => { setEnded(false); if (videoRef.current) videoRef.current.currentTime = 0; togglePlay(); }}
                                className="mt-5 flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/25"
                            >
                                <RotateCcw className="size-4" />
                                Эхнээс нь дахин үзэх
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Удирдлагын мөр */}
            <div
                className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-2 pt-10 transition-opacity duration-200 ${
                    uiVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
            >
                {/* Хайлтын мөр */}
                <div
                    ref={barRef}
                    onPointerDown={startScrub}
                    onPointerMove={(e) => {
                        const ratio = ratioFromPointer(e.clientX);
                        if (ratio !== null) setHover({ ratio });
                    }}
                    onPointerLeave={() => setHover(null)}
                    role="slider"
                    aria-label="Видеоны явц"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(duration)}
                    aria-valuenow={Math.round(time)}
                    aria-valuetext={`${clock(time)} / ${clock(duration)}`}
                    tabIndex={0}
                    className="group/bar relative mb-1 flex h-5 cursor-pointer items-center"
                >
                    {/* Хулгана дээрх агшны цаг */}
                    {hover && duration > 0 && (
                        <span
                            className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md bg-neutral-900/95 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white shadow-lg ring-1 ring-white/10"
                            style={{ left: `${hover.ratio * 100}%` }}
                        >
                            {clock(hover.ratio * duration)}
                        </span>
                    )}

                    <div className="relative h-1 w-full rounded-full bg-white/25 transition-all duration-150 group-hover/bar:h-1.5">
                        <div
                            className="absolute inset-y-0 left-0 rounded-full bg-white/35"
                            style={{ width: `${bufferedPct}%` }}
                        />
                        <div
                            className="absolute inset-y-0 left-0 rounded-full bg-violet-500"
                            style={{ width: `${playedPct}%` }}
                        />
                        <span
                            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md ring-2 ring-violet-500 transition-opacity group-hover/bar:opacity-100"
                            style={{ left: `${playedPct}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={togglePlay} className={iconBtn} aria-label={playing ? 'Түр зогсоох' : 'Тоглуулах'}>
                        {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
                    </button>

                    <button onClick={() => seekBy(-10)} className={iconBtn} title="10 сек ухраах (J)">
                        <RotateCcw className="size-4.5" />
                    </button>
                    <button onClick={() => seekBy(10)} className={iconBtn} title="10 сек түрүүлэх (L)">
                        <RotateCw className="size-4.5" />
                    </button>

                    {/* Дуу */}
                    <div className="group/vol flex items-center">
                        <button
                            onClick={() => {
                                const v = videoRef.current;
                                if (v) { v.muted = !v.muted; setMuted(v.muted); }
                            }}
                            className={iconBtn}
                            title="Дуугүй болгох (M)"
                        >
                            {muted || volume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                        </button>
                        <input
                            type="range" min={0} max={1} step={0.05}
                            value={muted ? 0 : volume}
                            onChange={(e) => {
                                const v = videoRef.current;
                                if (!v) return;
                                v.volume = Number(e.target.value);
                                v.muted  = Number(e.target.value) === 0;
                            }}
                            className="h-1 w-0 cursor-pointer accent-violet-500 opacity-0 transition-all group-hover/vol:w-20 group-hover/vol:opacity-100"
                            aria-label="Дууны түвшин"
                        />
                    </div>

                    <span className="ml-1.5 select-none font-mono text-xs tabular-nums text-white/80">
                        {clock(time)} <span className="text-white/40">/ {clock(duration)}</span>
                    </span>

                    <div className="flex-1" />

                    {/* Тоглуулах хурд */}
                    <div className="relative" data-speed-menu>
                        <button
                            onClick={() => setSpeedOpen((v) => !v)}
                            aria-expanded={speedOpen}
                            aria-label="Тоглуулах хурд"
                            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white/90 transition hover:bg-white/15"
                        >
                            <Gauge className="size-4" />
                            {speed}x
                        </button>

                        {speedOpen && (
                            <div className="absolute bottom-11 right-0 w-28 overflow-hidden rounded-xl bg-neutral-900/95 py-1 shadow-xl ring-1 ring-white/10 backdrop-blur">
                                {SPEEDS.map((rate) => (
                                    <button
                                        key={rate}
                                        onClick={() => applySpeed(rate)}
                                        className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition hover:bg-white/10 ${
                                            rate === speed ? 'font-semibold text-violet-400' : 'text-white/80'
                                        }`}
                                    >
                                        {rate === 1 ? 'Хэвийн' : `${rate}x`}
                                        {rate === speed && <Check className="size-3.5" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button onClick={toggleFullscreen} className={iconBtn} title="Бүтэн дэлгэц (F)">
                        {full ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
});

export default LabLessonPlayer;
