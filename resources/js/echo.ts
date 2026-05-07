import Echo from 'laravel-echo';
import axios from 'axios';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Echo: any;
    }
}

window.Pusher = Pusher;

if (!import.meta.env.VITE_REVERB_APP_KEY) {
    window.Echo = null;
} else {
window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY as string,
    wsHost: (import.meta.env.VITE_REVERB_HOST as string) ?? 'localhost',
    wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
    wssPort: Number(import.meta.env.VITE_REVERB_WS_PORT) || 443,
    forceTLS: ((import.meta.env.VITE_REVERB_SCHEME as string) ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authorizer: (channel: any) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        authorize: (socketId: string, callback: any) => {
            axios.post('/broadcasting/auth', {
                socket_id: socketId,
                channel_name: channel.name,
            })
                .then(response => callback(null, response.data))
                .catch(error => callback(error, null));
        },
    }),
});
}
