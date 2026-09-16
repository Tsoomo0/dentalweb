/**
 * Дугуй явцын хэмжүүр — сургалтын каталог болон хичээлийн жагсаалтад ашиглана.
 * SVG-ээр зурсан тул ямар ч хэмжээнд тод харагдана.
 */
interface Props {
    percent: number;
    size?: number;
    stroke?: number;
    /** Голд харуулах бичвэр. Заагаагүй бол хувь нь харагдана. */
    label?: string;
    className?: string;
}

export default function ProgressRing({ percent, size = 44, stroke = 4, label, className }: Props) {
    const clamped = Math.min(100, Math.max(0, percent));
    const radius  = (size - stroke) / 2;
    const circ    = 2 * Math.PI * radius;
    const done    = clamped >= 100;

    return (
        <div className={`relative shrink-0 ${className ?? ''}`} style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" strokeWidth={stroke}
                    className="stroke-black/10 dark:stroke-white/10"
                />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={circ - (clamped / 100) * circ}
                    className={`transition-[stroke-dashoffset] duration-700 ${
                        done ? 'stroke-emerald-500' : 'stroke-violet-500'
                    }`}
                />
            </svg>

            <span
                className="absolute inset-0 grid place-items-center font-semibold tabular-nums"
                style={{ fontSize: size * 0.28 }}
            >
                {label ?? `${Math.round(clamped)}%`}
            </span>
        </div>
    );
}
