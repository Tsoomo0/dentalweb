import {
    MobileBody, MobileCard, MobileEmpty, MobileHero, MobilePill, MobilePills,
    MobileSearch, MobileShell, MobileStatRow, RED, SURFACE,
} from '@/components/my-mobile-ui';
import { Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle, BookOpen, CheckCircle2, ChevronRight, Clock, FileStack, FileText,
    GraduationCap, Play, PlayCircle, Video,
} from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * Ажилтны сургалтын каталог — ГАР УТАСНЫ хувилбар.
 *
 * HR хэсгийн бусад хуудастай (Баримт бичиг, Номын сан, Тоног төхөөрөмж) яг нэг
 * загвараар явна: улаан hero + шилэн үзүүлэлт, дараа нь цагаан картан доторх
 * мөрүүд. Гар утсанд хажуугийн цэс байхгүй тул видео/файл хооронд шилжих
 * сегмент товчийг агуулгын дээр тавина.
 *
 * Видео ба файл каталог ижил өгөгдөлтэй, зөвхөн нэр томьёо (хичээл/баримт,
 * үзсэн/уншсан) болон өнгө нь өөр — тиймээс энд НЭГ л удаа бичээд `kind`-ээр
 * ялгав. Хоёр тийш хувилбал нэг талд нь хийсэн засвар нөгөөд нь мартагдана.
 */

/** Ангилалын өнгийг inline style-д тавихаар hex болгоно. */
const TONE_HEX: Record<string, string> = {
    violet: '#7c3aed', emerald: '#059669', amber: '#d97706', rose: '#e11d48',
    sky: '#0284c7', indigo: '#4f46e5', orange: '#ea580c', slate: '#64748b',
};

const toneHex = (t: string | null | undefined) => TONE_HEX[t ?? 'slate'] ?? TONE_HEX.slate;

export interface MobileLesson {
    id: number;
    title: string;
    description: string | null;
    poster_url: string | null;
    duration_label: string;
    page_count: number;
    progress: number;
    is_completed: boolean;
    is_required: boolean;
    due_at: string | null;
    is_overdue: boolean;
}

export interface MobileSection {
    id: number;
    title: string | null;
    order: number;
    lessons: MobileLesson[];
}

export interface MobileCourse {
    id: number;
    title: string;
    description: string | null;
    poster_url: string | null;
    duration_min: number;
    page_total: number;
    required: number;
    overdue: number;
    lessons: MobileLesson[];
    sections: MobileSection[];
    done: number;
    total: number;
}

export interface MobileCategory {
    id: number;
    name: string;
    description: string | null;
    color: string;
    courses: MobileCourse[];
}

export interface MobileResume {
    lesson_id: number;
    title: string;
    course_title: string | null;
    poster_url: string | null;
    progress: number;
    left_label: string;
}

export interface MobileStats {
    total: number;
    done: number;
    required: number;
    overdue: number;
    watch_min: number;
}

interface Props {
    kind: 'video' | 'document';
    categories: MobileCategory[];
    resume: MobileResume | null;
    stats: MobileStats;
    examStats: { total: number; open: number; todo: number };
}

interface PageProps {
    auth: { employee?: { full_name: string; position: string | null; photo_url: string | null } | null };
    [key: string]: unknown;
}

type Filter = 'all' | 'active' | 'unseen' | 'done' | 'required';

export default function MyTrainingMobile({ kind, categories, resume, stats, examStats }: Props) {
    const { auth } = usePage<PageProps>().props;
    const employee = auth?.employee ?? null;

    const [query, setQuery]     = useState('');
    const [filter, setFilter]   = useState<Filter>('all');
    const [openCat, setOpenCat] = useState<number | null>(null);

    const isDoc  = kind === 'document';
    const accent = isDoc ? '#0284c7' : '#7c3aed';

    // Нэр томьёо — баримтыг "үзэх" биш "унших" гэдэг нь ажилтанд илүү ойлгомжтой
    const word = isDoc
        ? { unit: 'баримт', doneWord: 'Уншсан', must: 'заавал унших' }
        : { unit: 'хичээл', doneWord: 'Үзсэн', must: 'заавал үзэх' };

    const FILTERS: { key: Filter; label: string; match: (l: MobileLesson) => boolean }[] = [
        { key: 'all',      label: 'Бүгд',                          match: () => true },
        { key: 'active',   label: isDoc ? 'Уншиж байгаа' : 'Үзэж байгаа', match: (l) => l.progress > 0 && !l.is_completed },
        { key: 'unseen',   label: isDoc ? 'Уншаагүй' : 'Үзээгүй',  match: (l) => l.progress === 0 },
        { key: 'done',     label: 'Дуусгасан',                     match: (l) => l.is_completed },
        { key: 'required', label: 'Заавал',                        match: (l) => l.is_required && !l.is_completed },
    ];

    const allLessons = useMemo(
        () => categories.flatMap((c) => c.courses.flatMap((x) => x.lessons)),
        [categories],
    );

    const percent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    const overdue = allLessons.filter((l) => l.is_overdue);

    const narrowed = query.trim() !== '' || filter !== 'all';

    /** Хайлт + шүүлтийг хичээл бүр дээр тавьж, хоосон сургалт/ангиллыг хаяна. */
    const visible = useMemo(() => {
        const q     = query.trim().toLowerCase();
        const match = FILTERS.find((f) => f.key === filter)!.match;

        const keep = (l: MobileLesson) =>
            match(l) && (q === '' || l.title.toLowerCase().includes(q)
                || (l.description ?? '').toLowerCase().includes(q));

        return categories
            .filter((cat) => openCat === null || cat.id === openCat)
            .map((cat) => ({
                ...cat,
                courses: cat.courses
                    .map((course) => ({ ...course, matched: course.lessons.filter(keep) }))
                    .filter((course) => course.matched.length > 0),
            }))
            .filter((cat) => cat.courses.length > 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, query, filter, openCat]);

    const shown = visible.reduce((n, cat) => n + cat.courses.reduce((m, c) => m + c.matched.length, 0), 0);

    return (
        <MobileShell>
            <MobileHero
                eyebrow={`HR · ${isDoc ? 'ФАЙЛ СУРГАЛТ' : 'ВИДЕО СУРГАЛТ'}`}
                titleBold={isDoc ? 'Файл ' : 'Видео '}
                titleLight="сургалт"
                subtitle={`${employee?.full_name ?? '—'}${employee?.position ? ` · ${employee.position}` : ''}`}
            >
                {resume && (
                    <Link href={`/my/training/lessons/${resume.lesson_id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 9 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: 0.6 }}>ҮРГЭЛЖЛҮҮЛЭХ</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <div style={{ width: 46, height: 46, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {resume.poster_url
                                    ? <img src={resume.poster_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : (isDoc ? <FileText size={19} color="rgba(255,255,255,0.75)" /> : <Video size={19} color="rgba(255,255,255,0.75)" />)}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13.5, fontWeight: 800, color: 'white', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {resume.title}
                                </p>
                                <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${resume.progress}%`, borderRadius: 99, background: 'linear-gradient(90deg,#fca5a5,#ffffff)' }} />
                                </div>
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: '4px 0 0', fontWeight: 600 }}>
                                    {resume.progress}% · {resume.left_label}
                                </p>
                            </div>

                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {isDoc ? <FileText size={16} color={RED} /> : <Play size={16} color={RED} fill={RED} />}
                            </div>
                        </div>
                    </Link>
                )}

                <MobileStatRow
                    items={[
                        { val: `${stats.done}/${stats.total}`, label: `${word.unit} дуусгасан`, dot: 'rgba(255,255,255,0.45)' },
                        { val: `${percent}%`,                  label: 'гүйцэтгэл',             dot: '#4ade80' },
                        {
                            val: stats.overdue > 0 ? stats.overdue : stats.required,
                            label: stats.overdue > 0 ? 'хугацаа хэтэрсэн' : word.must,
                            dot: stats.overdue > 0 ? '#fca5a5' : '#fbbf24',
                        },
                    ]}
                />
            </MobileHero>

            <MobileBody>

                {/* Видео ↔ Файл. Гар утсанд хажуугийн цэс байхгүй тул энд л сольно */}
                <div style={{ display: 'flex', gap: 6, background: SURFACE.pill, borderRadius: 99, padding: 4, marginBottom: 10 }}>
                    {([
                        ['/my/training', 'Видео', Video, !isDoc],
                        ['/my/training/documents', 'Файл', FileStack, isDoc],
                    ] as const).map(([href, label, Icon, active]) => (
                        <Link key={href} href={href} style={{ flex: 1, textDecoration: 'none' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                borderRadius: 99, padding: '9px 0',
                                background: active ? SURFACE.card : 'transparent',
                                boxShadow: active ? SURFACE.shadow : 'none',
                            }}>
                                <Icon size={14} color={active ? accent : SURFACE.muted} />
                                <span style={{ fontSize: 13, fontWeight: 800, color: active ? SURFACE.text : SURFACE.muted }}>{label}</span>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Хайлт */}
                <MobileSearch
                    value={query}
                    onChange={setQuery}
                    placeholder={`${isDoc ? 'Баримт' : 'Хичээл'} хайх...`}
                />

                {/* Төлөвийн шүүлт */}
                <MobilePills>
                    {FILTERS.map((f) => (
                        <MobilePill key={f.key} active={filter === f.key} color={accent} onClick={() => setFilter(f.key)}>
                            {f.label} <span style={{ opacity: 0.7 }}>({allLessons.filter(f.match).length})</span>
                        </MobilePill>
                    ))}
                </MobilePills>

                {/* Ангилал */}
                {categories.length > 1 && (
                    <MobilePills>
                        <MobilePill active={openCat === null} color="#111827" onClick={() => setOpenCat(null)}>
                            Бүх ангилал
                        </MobilePill>

                        {categories.map((cat) => (
                            <MobilePill
                                key={cat.id}
                                active={openCat === cat.id}
                                color={toneHex(cat.color)}
                                onClick={() => setOpenCat(openCat === cat.id ? null : cat.id)}
                            >
                                {cat.name} <span style={{ opacity: 0.7 }}>({cat.courses.reduce((n, c) => n + c.total, 0)})</span>
                            </MobilePill>
                        ))}
                    </MobilePills>
                )}

                {/* Хугацаа хэтэрсэн — заавал үзэх ёстой атлаа хоцорсон */}
                {overdue.length > 0 && (
                    <div style={{ background: SURFACE.card, borderRadius: 20, padding: 14, marginBottom: 12, boxShadow: SURFACE.shadow, borderLeft: `4px solid ${RED}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <AlertTriangle size={15} color={RED} />
                            <p style={{ fontSize: 13, fontWeight: 800, color: RED, margin: 0 }}>
                                Хугацаа хэтэрсэн {overdue.length} {word.unit}
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                            {overdue.map((l) => (
                                <Link key={l.id} href={`/my/training/lessons/${l.id}`} style={{ textDecoration: 'none' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: SURFACE.pill, borderRadius: 99, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, color: SURFACE.text }}>
                                        <Clock size={11} color={RED} />
                                        {l.title}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Шалгалт — тусдаа хуудастай */}
                {examStats.total > 0 && (
                    <Link href="/my/training/exams" style={{ textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: SURFACE.card, borderRadius: 20, padding: '13px 14px', marginBottom: 12, boxShadow: SURFACE.shadow }}>
                            <div style={{ width: 42, height: 42, borderRadius: 14, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <GraduationCap size={19} color="#4f46e5" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 800, color: SURFACE.text, margin: '0 0 2px' }}>Шалгалт</p>
                                <p style={{ fontSize: 11.5, color: SURFACE.faint, margin: 0 }}>
                                    {examStats.open > 0 ? `${examStats.open} нээлттэй` : 'Нээлттэй шалгалт алга'} · Нийт {examStats.total}
                                </p>
                            </div>
                            {examStats.todo > 0 && (
                                <span style={{ background: '#4f46e5', color: 'white', borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                                    {examStats.todo} өгөх
                                </span>
                            )}
                            <ChevronRight size={16} color={SURFACE.faint} />
                        </div>
                    </Link>
                )}

                {/* Сургалтууд */}
                {visible.length === 0 ? (
                    <MobileEmpty
                        icon={isDoc ? <FileStack size={28} color="#7dd3fc" /> : <BookOpen size={28} color="#c4b5fd" />}
                        tint={isDoc ? '#f0f9ff' : '#faf5ff'}
                        title={narrowed ? 'Илэрц олдсонгүй' : `${isDoc ? 'Файл' : 'Видео'} сургалт байхгүй`}
                        text={narrowed
                            ? 'Хайлт эсвэл шүүлтээ өөрчилж үзнэ үү'
                            : `Шинэ ${word.unit} нэмэгдэхэд танд мэдэгдэл ирнэ`}
                    />
                ) : (
                    <>
                        {narrowed && (
                            <p style={{ fontSize: 11.5, color: SURFACE.faint, margin: '0 0 10px', paddingLeft: 2, fontWeight: 600 }}>
                                <b style={{ color: SURFACE.text }}>{shown}</b> {word.unit} олдлоо
                            </p>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {visible.map((cat) => {
                                const cc = toneHex(cat.color);

                                return (
                                    <div key={cat.id}>
                                        {openCat === null && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, paddingLeft: 2 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cc, flexShrink: 0 }} />
                                                <p style={{ fontSize: 11, fontWeight: 800, color: cc, letterSpacing: 0.5, margin: 0 }}>
                                                    {cat.name} · {cat.courses.length} сургалт
                                                </p>
                                            </div>
                                        )}

                                        <MobileCard>
                                            {cat.courses.map((course, idx) => (
                                                <CourseRow
                                                    key={course.id}
                                                    course={course}
                                                    matched={course.matched}
                                                    showLessons={narrowed}
                                                    last={idx === cat.courses.length - 1}
                                                    accent={accent}
                                                    isDoc={isDoc}
                                                    word={word}
                                                />
                                            ))}
                                        </MobileCard>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </MobileBody>
        </MobileShell>
    );
}

/* ── Нэг сургалтын мөр ─────────────────────────────────────────────────── */
/**
 * Тайван байхад сургалтын мөр л харагдана — доторх хичээлийг сургалтын
 * хуудсанд орж үзнэ. Харин хайлт/шүүлт идэвхтэй үед ТААРСАН хичээлүүд шууд
 * доор нь гарч ирнэ: хэрэглэгч хайж байгаа зүйлээ дахин нэг дарж хайхгүй.
 */
function CourseRow({ course, matched, showLessons, last, accent, isDoc, word }: {
    course: MobileCourse;
    matched: MobileLesson[];
    showLessons: boolean;
    last: boolean;
    accent: string;
    isDoc: boolean;
    word: { unit: string; doneWord: string; must: string };
}) {
    const pct  = course.total > 0 ? Math.round((course.done / course.total) * 100) : 0;
    const done = course.done === course.total && course.total > 0;

    return (
        <div style={{ borderBottom: last ? 'none' : '1px solid var(--my-divider)' }}>
            <Link href={`/my/training/courses/${course.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px' }}>
                    {/* Нүүр зураг — байхгүй бол төрлийн дүрс */}
                    <div style={{ width: 52, height: 52, borderRadius: 15, overflow: 'hidden', flexShrink: 0, background: isDoc ? '#f0f9ff' : '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {course.poster_url
                            ? <img src={course.poster_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (isDoc ? <FileStack size={21} color={accent} /> : <Video size={21} color={accent} />)}

                        {done && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,150,105,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle2 size={22} color="white" />
                            </div>
                        )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: SURFACE.strong, margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {course.title}
                            </p>
                            {course.overdue > 0 ? (
                                <span style={{ flexShrink: 0, background: '#fee2e2', color: '#b91c1c', borderRadius: 99, padding: '2px 7px', fontSize: 9.5, fontWeight: 800 }}>
                                    {course.overdue} хоцорсон
                                </span>
                            ) : course.required > 0 ? (
                                <span style={{ flexShrink: 0, background: '#fef3c7', color: '#b45309', borderRadius: 99, padding: '2px 7px', fontSize: 9.5, fontWeight: 800 }}>
                                    Заавал
                                </span>
                            ) : null}
                        </div>

                        <p style={{ fontSize: 11, color: SURFACE.faint, margin: '3px 0 6px' }}>
                            {course.done}/{course.total} {word.unit}
                            {isDoc
                                ? (course.page_total > 0 ? ` · ${course.page_total} хуудас` : '')
                                : (course.duration_min > 0 ? ` · ${course.duration_min} мин` : '')}
                        </p>

                        <div style={{ height: 4, borderRadius: 99, background: SURFACE.pill, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: done ? '#059669' : accent, transition: 'width .4s ease' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: done ? '#059669' : SURFACE.muted, fontVariantNumeric: 'tabular-nums' }}>
                            {pct}%
                        </span>
                        <ChevronRight size={15} color={SURFACE.faint} />
                    </div>
                </div>
            </Link>

            {/* Хайлтад таарсан хичээлүүд */}
            {showLessons && (
                <div style={{ padding: '0 14px 10px 66px' }}>
                    {matched.map((lesson) => (
                        <Link key={lesson.id} href={`/my/training/lessons/${lesson.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', background: SURFACE.pill, borderRadius: 12, marginBottom: 6 }}>
                                {lesson.is_completed
                                    ? <CheckCircle2 size={14} color="#059669" style={{ flexShrink: 0 }} />
                                    : lesson.progress > 0
                                        ? <PlayCircle size={14} color={accent} style={{ flexShrink: 0 }} />
                                        : (isDoc ? <FileText size={14} color={SURFACE.faint} style={{ flexShrink: 0 }} /> : <Video size={14} color={SURFACE.faint} style={{ flexShrink: 0 }} />)}

                                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: SURFACE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {lesson.title}
                                </span>

                                <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: lesson.is_overdue ? '#dc2626' : SURFACE.faint, fontVariantNumeric: 'tabular-nums' }}>
                                    {lesson.is_completed ? word.doneWord : lesson.progress > 0 ? `${lesson.progress}%` : lesson.duration_label}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
