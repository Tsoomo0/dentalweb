import { X } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Админы урьдчилсан харалт — байршуулсан бичлэгээ өөрөө шалгах цонх.
 *
 * Лаб талын тоглуулагчаас ялгаатай нь явц бүртгэхгүй, сэтгэгдэл, тэмдэглэлгүй
 * — зөвхөн "зөв файл орсон уу, дуу дүрс нь хэвийн үү" гэдгийг харах зорилготой.
 */
interface Props {
    title: string;
    /** 'youtube' бол src нь видеоны ID, бусад тохиолдолд stream-ийн хаяг. */
    provider: 'local' | 'youtube' | 'r2';
    src: string;
    poster?: string | null;
    onClose: () => void;
}

export default function LabVideoPreview({ title, provider, src, poster, onClose }: Props) {
    /**
     * Esc товчоор хаах.
     *
     * Барих (capture) үе шатанд сонсоод дамжуулалтыг зогсооно — энэ цонх
     * хичээлийн модал ДЭЭР нээгддэг тул эс тэгвээс нэг дарахад хоёулаа хаагдана.
     */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;

            e.stopPropagation();
            onClose();
        };

        window.addEventListener('keydown', onKey, true);

        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Дотор дарахад хаагдахгүй байх ёстой */}
            <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-2 flex items-center justify-between gap-4">
                    <p className="truncate text-sm font-semibold tracking-tight text-white">{title}</p>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Хаах (Esc)"
                        className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/60 ring-1 ring-white/10">
                    {provider === 'youtube' ? (
                        <iframe
                            src={`https://www.youtube.com/embed/${src}?rel=0`}
                            title={title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                            allowFullScreen
                            className="aspect-video w-full"
                        />
                    ) : (
                        <video
                            src={src}
                            poster={poster ?? undefined}
                            controls
                            autoPlay
                            controlsList="nodownload"
                            className="aspect-video w-full bg-black"
                        />
                    )}
                </div>

                <p className="mt-2 text-center text-xs text-white/50">
                    Админы урьдчилсан харалт — үзэлтийн статистикт бүртгэгдэхгүй.
                </p>
            </div>
        </div>
    );
}
