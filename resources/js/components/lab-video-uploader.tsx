import { AlertCircle, CheckCircle2, FileVideo, Loader2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

/**
 * Том видеог хэсэгчлэн (chunk) байршуулах хэсэг.
 *
 * Сервер дээрх PHP-ийн upload_max_filesize / post_max_size (40MB) нь нэг
 * хүсэлтээр илгээх хэмжээг хязгаарладаг тул файлыг 4MB-аар зүсэж дараалан
 * илгээнэ. Ингэснээр php.ini-г огт өөрчлөхгүйгээр 2GB видео байршина.
 *
 * Видеоны урт болон эхний кадрыг (poster) энд, browser дээр <video> + canvas
 * ашиглан гаргаж авдаг — сервер дээр ffmpeg суулгах шаардлагагүй.
 */

const CHUNK_SIZE = 4 * 1024 * 1024;   // 4 MB — 40MB лимитэд өгөөмөр багтана

export interface UploadedVideo {
    path: string;
    size: number;
    checksum: string;
    duration: number;
    poster: Blob | null;
}

interface Props {
    onDone: (video: UploadedVideo) => void;
    onClear: () => void;
    disabled?: boolean;
}

function csrfHeaders(): Record<string, string> {
    const xsrf = decodeURIComponent(
        document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '',
    );
    const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

    return {
        'X-XSRF-TOKEN': xsrf,
        'X-CSRF-TOKEN': meta,
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };
}

export function humanSize(bytes: number): string {
    if (bytes <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));

    return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function humanDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Видеоны урт болон poster кадрыг browser дээр гаргаж авна.
 * Алдаа гарвал урт 0, poster null-ээр буцаана — байршуулалт зогсохгүй.
 */
function probeVideo(file: File): Promise<{ duration: number; poster: Blob | null }> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        let settled = false;

        const finish = (duration: number, poster: Blob | null) => {
            if (settled) return;
            settled = true;
            URL.revokeObjectURL(url);
            resolve({ duration, poster });
        };

        // Зарим кодек browser дээр задрахгүй байж болно — 15 секундэд таслана
        const timer = setTimeout(() => finish(Math.round(video.duration || 0), null), 15000);

        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = () => {
            // Эхний кадр ихэвчлэн хар байдаг тул 10%-ийн байрлалаас авна
            const at = Math.min((video.duration || 0) * 0.1, 5);
            video.currentTime = Number.isFinite(at) ? at : 0;
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            const w = Math.min(video.videoWidth || 640, 1280);
            const h = Math.round(w * ((video.videoHeight || 360) / (video.videoWidth || 640)));

            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d')?.drawImage(video, 0, 0, w, h);

            canvas.toBlob(
                (blob) => {
                    clearTimeout(timer);
                    finish(Math.round(video.duration || 0), blob);
                },
                'image/jpeg',
                0.8,
            );
        };

        video.onerror = () => {
            clearTimeout(timer);
            finish(0, null);
        };

        video.src = url;
    });
}

export default function LabVideoUploader({ onDone, onClear, disabled }: Props) {
    const [file, setFile]         = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [busy, setBusy]         = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [done, setDone]         = useState(false);
    const uploadIdRef             = useRef<string | null>(null);
    const inputRef                = useRef<HTMLInputElement>(null);

    async function handleFile(picked: File) {
        setFile(picked);
        setError(null);
        setDone(false);
        setProgress(0);
        setBusy(true);

        const uploadId = crypto.randomUUID().replace(/-/g, '');
        uploadIdRef.current = uploadId;

        try {
            // 1) Урт + poster-ыг browser дээр гаргаж авна
            const { duration, poster } = await probeVideo(picked);

            // 2) Файлыг зүсэж дараалан илгээнэ
            const total = Math.ceil(picked.size / CHUNK_SIZE);

            for (let i = 0; i < total; i++) {
                const blob = picked.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                const fd   = new FormData();

                fd.append('upload_id', uploadId);
                fd.append('index', String(i));
                fd.append('chunk', blob);

                const res = await fetch('/admin/lab-training/upload/chunk', {
                    method: 'POST',
                    headers: csrfHeaders(),
                    body: fd,
                    credentials: 'include',
                });

                if (!res.ok) {
                    throw new Error(`${i + 1}-р хэсгийг илгээхэд алдаа гарлаа (${res.status}).`);
                }

                setProgress(Math.round(((i + 1) / total) * 100));
            }

            // 3) Сервер дээр нэгтгүүлнэ
            const fd = new FormData();
            fd.append('upload_id', uploadId);
            fd.append('total', String(total));
            fd.append('filename', picked.name);

            const res = await fetch('/admin/lab-training/upload/finish', {
                method: 'POST',
                headers: csrfHeaders(),
                body: fd,
                credentials: 'include',
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(json.message ?? 'Видеог нэгтгэхэд алдаа гарлаа.');
            }

            setDone(true);
            onDone({ path: json.path, size: json.size, checksum: json.checksum, duration, poster });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Тодорхойгүй алдаа.');
            await cancelUpload(uploadId);
        } finally {
            setBusy(false);
        }
    }

    async function cancelUpload(uploadId: string) {
        const fd = new FormData();
        fd.append('upload_id', uploadId);

        await fetch('/admin/lab-training/upload/cancel', {
            method: 'POST',
            headers: csrfHeaders(),
            body: fd,
            credentials: 'include',
        }).catch(() => undefined);
    }

    function reset() {
        if (uploadIdRef.current && !done) void cancelUpload(uploadIdRef.current);
        uploadIdRef.current = null;
        setFile(null);
        setProgress(0);
        setDone(false);
        setError(null);
        if (inputRef.current) inputRef.current.value = '';
        onClear();
    }

    return (
        <div className="rounded-lg border border-dashed p-3">
            {!file && (
                <label className="flex cursor-pointer flex-col items-center gap-1.5 py-4 text-center">
                    <Upload className="size-5 text-muted-foreground" />
                    <span className="text-xs font-medium">Видео сонгох</span>
                    <span className="text-[11px] text-muted-foreground">
                        MP4 / WebM / MOV — 2GB хүртэл, хэсэгчлэн илгээнэ
                    </span>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        disabled={disabled}
                        onChange={(e) => {
                            const picked = e.target.files?.[0];
                            if (picked) void handleFile(picked);
                        }}
                    />
                </label>
            )}

            {file && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                        <FileVideo className="size-4 shrink-0 text-violet-600" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">{file.name}</p>
                            <p className="text-[11px] tabular-nums text-muted-foreground">{humanSize(file.size)}</p>
                        </div>
                        <button
                            type="button"
                            onClick={reset}
                            className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            title="Цуцлах"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>

                    {busy && (
                        <div className="space-y-1.5">
                            <div className="h-1 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-violet-600 transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Loader2 className="size-3 animate-spin" />
                                Байршуулж байна… {progress}%
                            </p>
                        </div>
                    )}

                    {done && (
                        <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                            <CheckCircle2 className="size-3.5" />
                            Байршуулж дууслаа. Одоо хадгалах товчийг дарна уу.
                        </p>
                    )}

                    {error && (
                        <p className="flex items-start gap-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                            <AlertCircle className="mt-px size-3.5 shrink-0" />
                            {error}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
