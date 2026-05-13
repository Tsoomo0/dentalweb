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

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Already installed (standalone) — don't show
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as { standalone?: boolean }).standalone === true;
        if (isStandalone) return;

        // Recently dismissed?
        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
        if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;

        const ua = window.navigator.userAgent;

        // iOS detection (Safari has no beforeinstallprompt)
        const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
        if (iOS) {
            setIsIOS(true);
            const timer = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(timer);
        }

        // Mobile Android detection
        const mobileAndroid = /Android/i.test(ua) && /Mobile/i.test(ua);
        setIsMobile(mobileAndroid);

        // Listen for beforeinstallprompt (Desktop Chrome/Edge & Android)
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
            setVisible(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    function install() {
        if (!deferred) {
            alert('Browser-н цэснээс (⋮) "Аппликейшн суулгах" сонголтыг ашиглана уу.');
            return;
        }
        deferred.prompt().then(() => {
            return deferred.userChoice;
        }).then((choice) => {
            if (choice.outcome === 'accepted') {
                localStorage.setItem(DISMISS_KEY, String(Date.now()));
            }
            setDeferred(null);
            setVisible(false);
        }).catch(() => {
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

    /* Compact corner card — Desktop bottom-right, Mobile bottom full-width */
    return (
        <div className={`fixed z-[100] pointer-events-none ${
            isMobile ? 'bottom-4 left-4 right-4' : 'bottom-6 right-6 max-w-sm w-[380px]'
        }`}>
            <div className="pointer-events-auto rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden animate-slide-up border border-gray-200 dark:border-zinc-700">
                <div className="p-4 flex items-start gap-3">
                    <div className="size-12 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0 shadow-md shadow-red-500/30">
                        <Download className="size-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">Кутикул Дентал суулгах</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                            Аппликейшн шиг хурдан ашиглах
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                            <button onClick={install}
                                type="button"
                                className="flex-1 rounded-lg bg-red-600 active:bg-red-700 hover:bg-red-700 px-3 py-2 text-xs font-bold text-white transition-colors shadow-sm shadow-red-500/30">
                                Суулгах
                            </button>
                            <button onClick={dismiss}
                                type="button"
                                className="rounded-lg border border-border bg-muted/30 active:bg-muted hover:bg-muted px-3 py-2 text-xs font-medium text-muted-foreground transition-colors">
                                Дараа
                            </button>
                        </div>
                    </div>
                    <button onClick={dismiss}
                        type="button"
                        className="rounded-full p-1 hover:bg-muted transition-colors flex-shrink-0">
                        <X className="size-4 text-muted-foreground" />
                    </button>
                </div>
            </div>
        </div>
    );
}
