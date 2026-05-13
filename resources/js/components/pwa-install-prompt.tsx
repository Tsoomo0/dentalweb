import { Download, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_DAYS = 3;

export function PwaInstallPrompt() {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible,  setVisible]  = useState(false);
    const [isIOS,    setIsIOS]    = useState(false);

    useEffect(() => {
        // Already installed (standalone) — don't show
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as { standalone?: boolean }).standalone === true;
        if (isStandalone) return;

        // Recently dismissed?
        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
        if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;

        // iOS detection (Safari has no beforeinstallprompt)
        const ua = window.navigator.userAgent;
        const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
        if (iOS) {
            setIsIOS(true);
            // Show iOS prompt with a 1.5s delay so user sees the page first
            const timer = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(timer);
        }

        // Android / Chrome / Edge — listen for beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
            // Show immediately when browser indicates the site can be installed
            setVisible(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    function install() {
        if (!deferred) return;
        deferred.prompt();
        deferred.userChoice.then((choice) => {
            if (choice.outcome === 'accepted') {
                localStorage.setItem(DISMISS_KEY, String(Date.now()));
            }
            setDeferred(null);
            setVisible(false);
        });
    }

    function dismiss() {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setVisible(false);
    }

    if (!visible) return null;

    /* iOS prompt — simplified single arrow pointing to Share button */
    if (isIOS) {
        return (
            <>
                {/* Animated arrow pointing to Safari's Share button at bottom */}
                <div className="fixed inset-0 z-[100] pointer-events-none">
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 animate-bounce-down pointer-events-none">
                        <svg width="48" height="60" viewBox="0 0 48 60" fill="none" className="drop-shadow-2xl">
                            <path d="M24 0 V50 M24 50 L10 36 M24 50 L38 36" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M24 0 V50 M24 50 L10 36 M24 50 L38 36" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                </div>

                {/* Bottom card with single instruction */}
                <div className="fixed bottom-4 left-4 right-4 z-[100] pointer-events-auto">
                    <div className="rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden animate-slide-up border border-red-100 dark:border-red-900">
                        <div className="relative p-4 flex items-center gap-3">
                            <div className="size-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
                                <Share2 className="size-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground">Аппликейшн суулгах</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                                    Доорх <Share2 className="inline size-3 mx-0.5 text-blue-500" /> Share товчийг дарж →
                                    <span className="font-semibold"> "Add to Home Screen"</span>
                                </p>
                            </div>
                            <button onClick={dismiss}
                                className="rounded-full p-2 hover:bg-muted transition-colors flex-shrink-0">
                                <X className="size-4 text-muted-foreground" />
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    /* Android/Chrome prompt — bottom sheet with single-tap install */
    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 sm:items-center"
             onClick={dismiss}>
            <div onClick={e => e.stopPropagation()}
                 className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden animate-slide-up">
                <div className="relative bg-gradient-to-br from-red-500 to-red-700 p-6 text-white">
                    <button onClick={dismiss}
                        className="absolute top-3 right-3 rounded-full p-1.5 bg-white/20 hover:bg-white/30 transition-colors">
                        <X className="size-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="size-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <Download className="size-7" />
                        </div>
                        <div>
                            <p className="text-lg font-bold">Аппликейшн суулга</p>
                            <p className="text-xs opacity-90 mt-0.5">Кутикул Дентал</p>
                        </div>
                    </div>
                </div>
                <div className="p-5 space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Энэ системийг утсан дээрээ <strong>аппликейшн шиг</strong> ашиглах боломжтой —
                        илүү хурдан нээгдэнэ, бүтэн дэлгэцээр харагдана, offline ч ажиллана.
                    </p>
                    <div className="flex items-center gap-2">
                        <button onClick={install}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30">
                            <Download className="size-4" />
                            Суулгах
                        </button>
                        <button onClick={dismiss}
                            className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                            Дараа
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
