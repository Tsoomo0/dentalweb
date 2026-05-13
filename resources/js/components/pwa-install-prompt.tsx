import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_DAYS = 7;

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
            setVisible(true);
            return;
        }

        // Android / Chrome / Edge
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
            setVisible(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    function install() {
        if (!deferred) return;
        deferred.prompt();
        deferred.userChoice.then(() => {
            setDeferred(null);
            setVisible(false);
        });
    }

    function dismiss() {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setVisible(false);
    }

    if (!visible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[60] md:left-auto md:right-4 md:max-w-sm">
            <div className="rounded-2xl border bg-white shadow-2xl dark:bg-zinc-900 dark:border-zinc-700 overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
                        <Download className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">Аппликейшн суулгах</p>
                        {isIOS ? (
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                Доорхи <span className="inline-block px-1 font-semibold">⎘</span> "Share" товчийг дараад,
                                <strong> "Add to Home Screen"</strong> сонгоно уу.
                            </p>
                        ) : (
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                Энэ системийг утсан дээр аппликейшн шиг ашиглах боломжтой — хурдан нээгдэнэ, бүтэн дэлгэцээр харагдана.
                            </p>
                        )}
                        {!isIOS && (
                            <div className="mt-3 flex items-center gap-2">
                                <button onClick={install}
                                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors">
                                    Суулгах
                                </button>
                                <button onClick={dismiss}
                                    className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                                    Дараа
                                </button>
                            </div>
                        )}
                    </div>
                    <button onClick={dismiss}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors">
                        <X className="size-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
