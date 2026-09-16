import { Link } from '@inertiajs/react';
import { ChatIcon } from '@/components/chat-icon';
import { NotificationBell } from '@/components/notification-bell';
import { usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { type ReactNode } from 'react';

/**
 * HR хэсгийн ГАР УТАСНЫ нийтлэг хэсгүүд.
 *
 * Баримт бичиг, Номын сан, Тоног төхөөрөмж зэрэг хуудсууд бүгд нэг л дүрстэй:
 * улаан градиент толгой, дээр нь хар шилэн самбар, доор нь цагаан картан дахь
 * мөрүүд. Тэр дүрийг энд нэг удаа тодорхойлж, хуудас бүр зөвхөн агуулгаа өгнө —
 * эс тэгвээс хуудас нэмэгдэх тусам ижил код хуулагдаж, аажмаар зөрнө.
 */

export const RED  = '#dc2626';
export const RED2 = '#b91c1c';
export const RED3 = '#7f1d1d';

/** Хуудсууд дээр давтагддаг өнгөт тэмдэглэгээ. */
export const SURFACE = {
    card:    'var(--my-card-bg)',
    text:    'var(--my-text)',
    strong:  'var(--my-input-text)',
    muted:   'var(--my-muted)',
    faint:   'var(--my-faint)',
    divider: 'var(--my-divider)',
    pill:    'var(--my-pill-bg)',
    shadow:  'var(--my-shadow)',
} as const;

interface EmployeeProps {
    auth: { employee?: { full_name: string; position: string | null; photo_url: string | null } | null };
    [key: string]: unknown;
}

/** Нэр товчлол — auth дундаас initials ирдэггүй тул энд гаргана. */
function initialsOf(name: string | undefined): string {
    if (!name) return '?';

    return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

/**
 * Гар утасны гүйлгэх талбар.
 *
 * MyLayout нь утсан дээр `<main>`-ыг `overflow: hidden` болгодог тул хуудас
 * бүр өөрөө гүйлгэх талбараа зарлах ёстой. Доод талын хөвөгч цэсэнд агуулга
 * дарагдахгүйн тулд зай ч энд үлдэнэ.
 */
export function MobileShell({ children }: { children: ReactNode }) {
    return (
        <div
            className="md:hidden"
            style={{
                flex: 1,
                background: 'var(--my-page-bg)',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))',
            } as React.CSSProperties}
        >
            {children}
        </div>
    );
}

/**
 * Улаан толгой.
 *
 * `back` өгвөл зүүн дээд буланд буцах гарц болж, эс тэгвээс хэсгийн нэр л
 * үлдэнэ. `backdrop` нь бүдэгрүүлж дэвсгэр болгох зураг — сургалтын нүүр
 * зураг зэрэг хуудсыг өөрийг нь таниулах зүйл байвал.
 */
export function MobileHero({
    eyebrow, back, backdrop, titleBold, titleLight, title, subtitle, children, showAvatar = true,
}: {
    eyebrow: string;
    back?: string;
    backdrop?: string | null;
    /** Хоёр хэсэгт хуваасан гарчиг — эхнийх нь бүдүүн, хоёр дахь нь налуу. */
    titleBold?: string;
    titleLight?: string;
    /** Эсвэл задлахгүй нэг мөр гарчиг (динамик нэр гэх мэт). */
    title?: ReactNode;
    subtitle?: ReactNode;
    /** Хар шилэн самбарын агуулга. Хоосон бол самбар огт гарахгүй. */
    children?: ReactNode;
    showAvatar?: boolean;
}) {
    const { auth } = usePage<EmployeeProps>().props;
    const employee = auth?.employee ?? null;

    return (
        <div style={{ background: `linear-gradient(160deg, #ef4444 0%, ${RED} 30%, ${RED2} 65%, ${RED3} 100%)`, position: 'relative', overflow: 'hidden' }}>
            {backdrop && (
                <img src={backdrop} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18 }} />
            )}
            <div style={{ position: 'absolute', width: 210, height: 210, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -65, right: -65, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 125, height: 125, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: 40, right: 40, pointerEvents: 'none' }} />

            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 0', gap: 10, position: 'relative' }}>
                {back ? (
                    <Link href={back} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                        <ArrowLeft size={15} color="rgba(255,255,255,0.75)" />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {eyebrow}
                        </span>
                    </Link>
                ) : (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, flex: 1, letterSpacing: 0.3 }}>
                        {eyebrow}
                    </span>
                )}

                <ChatIcon variant="ghost" />
                <NotificationBell variant="ghost" />

                {showAvatar && (
                    <Link href="/my/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {employee?.photo_url
                                ? <img src={employee.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                                : <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{initialsOf(employee?.full_name)}</span>}
                        </div>
                    </Link>
                )}
            </div>

            {/* Title */}
            <div style={{ padding: '14px 18px 14px', position: 'relative' }}>
                {title !== undefined ? (
                    <h1 style={{ margin: '0 0 5px', lineHeight: 1.15, letterSpacing: -0.5, fontSize: 27, fontWeight: 900, color: 'white' }}>
                        {title}
                    </h1>
                ) : (
                    <h1 style={{ margin: '0 0 5px', lineHeight: 1.1, letterSpacing: -0.8 }}>
                        <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>{titleBold}</span>
                        <span style={{ fontSize: 28, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontFamily: 'Georgia, "Times New Roman", serif' }}>{titleLight}</span>
                    </h1>
                )}

                {subtitle && (
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 14px', fontWeight: 500, lineHeight: 1.5 }}>
                        {subtitle}
                    </p>
                )}

                {children && (
                    <div style={{ borderRadius: 20, background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(12px)', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.12)', marginTop: subtitle ? 0 : 14 }}>
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}

/** Толгойн доторх үзүүлэлтийн эгнээ — үргэлж гурав, үргэлж ижил өндөртэй. */
export function MobileStatRow({ items }: {
    items: { val: string | number; label: string; dot: string }[];
}) {
    return (
        <div style={{ display: 'flex', gap: 8 }}>
            {items.map(({ val, label, dot }, i) => (
                <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 13, padding: '10px 8px', textAlign: 'center' }}>
                    <p style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{val}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 5 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 600 }}>{label}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Агуулгын хэсэг — толгойн доорх бүх зүйл үүн дотор сууна. */
export function MobileBody({ children }: { children: ReactNode }) {
    return <div style={{ padding: '12px 14px 32px' }}>{children}</div>;
}

/** Цагаан карт — мөрүүдийг багцлах үндсэн гадаргуу. */
export function MobileCard({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{ background: SURFACE.card, borderRadius: 20, overflow: 'hidden', boxShadow: SURFACE.shadow, ...style }}>
            {children}
        </div>
    );
}

/** Хайлтын мөр. */
export function MobileSearch({ value, onChange, placeholder }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: SURFACE.card, borderRadius: 16, padding: '0 14px', marginBottom: 10, boxShadow: SURFACE.shadow }}>
            <SearchGlyph />
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, padding: '13px 0', color: SURFACE.strong }}
            />
            {value && (
                <button type="button" onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                    <XGlyph />
                </button>
            )}
        </div>
    );
}

/** Хэвтээ гүйдэг бөмбөлөг эгнээ — шүүлтүүрт хэрэглэнэ. */
export function MobilePills({ children }: { children: ReactNode }) {
    return (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' } as React.CSSProperties}>
            {children}
        </div>
    );
}

export function MobilePill({ active, color, onClick, children }: {
    active: boolean;
    color: string;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                flexShrink: 0, borderRadius: 99, padding: '7px 15px', fontSize: 12, fontWeight: 800,
                border: 'none', cursor: 'pointer',
                background: active ? color : SURFACE.card,
                color: active ? 'white' : '#888',
                boxShadow: active ? `0 4px 12px ${color}44` : SURFACE.shadow,
            }}
        >
            {children}
        </button>
    );
}

/** Хоосон төлөв. */
export function MobileEmpty({ icon, tint, title, text }: {
    icon: ReactNode;
    tint: string;
    title: string;
    text?: string;
}) {
    return (
        <div style={{ background: SURFACE.card, borderRadius: 22, padding: '52px 20px', textAlign: 'center', boxShadow: SURFACE.shadow }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                {icon}
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: SURFACE.muted, margin: '0 0 4px' }}>{title}</p>
            {text && <p style={{ fontSize: 12, color: SURFACE.faint, margin: 0 }}>{text}</p>}
        </div>
    );
}

/* Дүрсийг lucide-аас дуудахын оронд энд жижиг svg — импортын гинжийг богиносгоно */
function SearchGlyph() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
        </svg>
    );
}

function XGlyph() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
        </svg>
    );
}
