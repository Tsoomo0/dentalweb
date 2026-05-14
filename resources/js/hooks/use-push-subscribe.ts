import axios from 'axios';
import { useEffect, useRef } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const out = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
    return out;
}

const csrfToken = (): string =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

/**
 * Registers the service worker and subscribes the current browser to Web Push.
 * No-op if push is unsupported or the user has denied permission.
 */
export function usePushSubscribe(enabled: boolean) {
    const tried = useRef(false);

    useEffect(() => {
        if (!enabled || tried.current) return;
        tried.current = true;

        const run = async () => {
            try {
                if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
                if (typeof Notification === 'undefined') return;

                // Ensure the SW is registered (the app may register elsewhere too).
                let reg = await navigator.serviceWorker.getRegistration();
                if (!reg) reg = await navigator.serviceWorker.register('/sw.js');
                await navigator.serviceWorker.ready;

                let perm = Notification.permission;
                if (perm === 'default') perm = await Notification.requestPermission();
                if (perm !== 'granted') return;

                // Fetch the public VAPID key from the server.
                const { data: vapid } = await axios.get('/push/vapid-key');
                if (!vapid?.public_key) return;

                const applicationServerKey = urlBase64ToUint8Array(vapid.public_key);

                let sub = await reg.pushManager.getSubscription();
                if (!sub) {
                    sub = await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey,
                    });
                }

                const json = sub.toJSON();
                await axios.post(
                    '/push/subscribe',
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: json.keys?.p256dh ?? '',
                            auth: json.keys?.auth ?? '',
                        },
                        user_agent: navigator.userAgent,
                    },
                    { headers: { 'X-CSRF-TOKEN': csrfToken() } }
                );
            } catch {
                /* silent — push is best-effort */
            }
        };

        run();
    }, [enabled]);
}
