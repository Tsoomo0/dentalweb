import {
    AvatarRing, Bar, Empty, GLASS, GLASS_CTA, HeroShell, HeroStat, HeroStatGrid,
    LabCommentItem, ReachBar,
} from '@/components/lab-admin-ui';
import LabRetentionChart, { type RetentionData } from '@/components/lab-retention-chart';
import LabVideoPreview from '@/components/lab-video-preview';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft, CalendarClock, CheckCircle2, Clock, Eye, Flame, LineChart, MessageSquare,
    Play, Search, UserCheck, UserX, Users, Video,
} from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';

/**
 * Админ тал — нэг видео хичээлийн үзэлтийн дэлгэрэнгүй.
 *
 * ДҮРСЛЭЛИЙН БОДОЛ: хуудасны гол асуулт бол "хэн үзсэн, хэн үзээгүй вэ".
 * Тиймээс дээд талд нь хамрах хүрээг гурав хуваасан нэг зурвас тавьсан —
 * тоо уншихаас өмнө өнгөөр нь ойлгоно. Доор нь ажилтан бүрийн мөр, шүүлтээр
 * нь шууд "үзээгүй" хүмүүс рүү шилжинэ.
 */

interface Viewer {
    user_id: number;
    user_name: string;
    views_count: number;
    watched_seconds: number;
    progress: number;
    completed: boolean;
    last_viewed_at: string | null;
}

interface CommentRow {
    id: number;
    body: string;
    user_name: string;
    is_reply: boolean;
    is_pinned: boolean;
    is_hidden: boolean;
    reactions_count: number;
    created_at: string | null;
}

interface Props {
    lesson: {
        id: number;
        title: string;
        course_title: string | null;
        duration_label: string;
        duration_seconds: number;
        video_provider: 'local' | 'youtube' | 'r2';
        video_ref: string | null;
        has_video: boolean;
        poster_url: string | null;
        is_published: boolean;
        is_required: boolean;
        due_at: string | null;
        is_overdue: boolean;
    };
    audience: number;
    viewers: Viewer[];
    comments: CommentRow[];
    reactions: Record<string, number>;
    retention: RetentionData;
}

const EMOJI: Record<string, string> = { like: '👍', love: '❤️', wow: '😮', clap: '👏' };

/** Үзсэн секундыг "12:34" болгоно. */
function mmss(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${String(s).padStart(2, '0')}`;
}

type Filter = 'all' | 'done' | 'watching' | 'none';

/**
 * Үзэгчдийн хүснэгтийн багана. Толгой ба мөр хоёр ижил grid ашиглана —
 * тиймээс бүх тоо доошоо нэг шулуун дээр эгнэнэ.
 */
const ROW = cn(
    'grid items-center gap-x-3 px-3 sm:px-4',
    'grid-cols-[minmax(0,1fr)_128px]',
    'sm:grid-cols-[minmax(0,1fr)_128px_72px]',
    'lg:grid-cols-[minmax(0,1fr)_128px_72px_64px_128px]',
);

export default function LabLessonReport({
    lesson, audience, viewers, comments, reactions, retention,
}: Props) {
    const [playing, setPlaying] = useState(false);
    const [filter, setFilter]   = useState<Filter>('all');
    const [query, setQuery]     = useState('');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Админ', href: '/admin/dashboard' },
        { title: 'Тайлан', href: '/admin/lab-training/report' },
        { title: lesson.title, href: `/admin/lab-training/report/lessons/${lesson.id}` },
    ];

    const started   = viewers.filter((v) => v.views_count > 0).length;
    const completed = viewers.filter((v) => v.completed).length;
    const watching  = started - completed;
    const notSeen   = Math.max(0, audience - started);
    const opens     = viewers.reduce((n, v) => n + v.views_count, 0);
    const hours     = viewers.reduce((n, v) => n + v.watched_seconds, 0);
    const avg       = started > 0
        ? Math.round(viewers.filter((v) => v.views_count > 0).reduce((n, v) => n + v.progress, 0) / started)
        : 0;

    const totalReactions = Object.values(reactions).reduce((n, c) => n + c, 0);
    const share = (part: number) => (audience > 0 ? Math.round((part / audience) * 100) : 0);

    // Явц ихтэйг нь дээр нь тавина — хэн хоцорч байгаа доод талд цуглана
    const rows = useMemo(() => {
        const term = query.trim().toLowerCase();

        return [...viewers]
            .filter((v) => {
                if (term && !v.user_name.toLowerCase().includes(term)) return false;
                if (filter === 'done') return v.completed;
                if (filter === 'watching') return v.views_count > 0 && !v.completed;
                if (filter === 'none') return v.views_count === 0;

                return true;
            })
            .sort((a, b) => b.progress - a.progress || a.user_name.localeCompare(b.user_name));
    }, [viewers, filter, query]);

    const videoSrc = lesson.video_provider === 'youtube'
        ? lesson.video_ref ?? ''
        : `/admin/lab-training/lessons/${lesson.id}/stream`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${lesson.title} — үзэлт`} />

            {/* ── Кино маягийн толгой ────────────────────────────────────── */}
            <HeroShell backdrop={lesson.poster_url}>
                <div className="px-4 pb-4 pt-6 sm:px-6 sm:pt-7">
                    <div className="flex flex-wrap items-start gap-5">
                        {/* Постер — дарахад бичлэг тоглоно */}
                        <button
                            type="button"
                            onClick={() => lesson.has_video && setPlaying(true)}
                            disabled={!lesson.has_video}
                            title={lesson.has_video ? 'Бичлэгийг үзэх' : 'Видео байхгүй'}
                            className={cn(
                                'group relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl bg-black',
                                'shadow-2xl shadow-black/60 ring-1 ring-white/15 sm:w-64',
                                'disabled:cursor-not-allowed',
                            )}
                        >
                            {lesson.poster_url ? (
                                <img
                                    src={lesson.poster_url}
                                    alt=""
                                    className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                                />
                            ) : (
                                <span className="grid size-full place-items-center bg-gradient-to-br from-neutral-800 to-black">
                                    <Video className="size-8 text-white/15" />
                                </span>
                            )}

                            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                            {lesson.has_video && (
                                <span className="absolute inset-0 grid place-items-center">
                                    <span className="grid size-12 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md transition-all duration-300 group-hover:bg-white group-hover:text-neutral-950">
                                        <Play className="size-5 translate-x-[1px] fill-current" />
                                    </span>
                                </span>
                            )}

                            {lesson.duration_seconds > 0 && (
                                <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 text-[10px] font-bold leading-[18px] tabular-nums text-white backdrop-blur-sm">
                                    {lesson.duration_label}
                                </span>
                            )}
                        </button>

                        {/* Гарчиг, шошго, хамрах хүрээний зурвас */}
                        <div className="min-w-0 flex-1">
                            {lesson.course_title && (
                                <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300/90">
                                    {lesson.course_title}
                                </p>
                            )}

                            <h1 className="mt-1.5 text-2xl font-black leading-tight tracking-tight sm:text-[28px]">
                                {lesson.title}
                            </h1>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {lesson.duration_seconds > 0 && (
                                    <HeroChip icon={Clock}>{lesson.duration_label}</HeroChip>
                                )}
                                <HeroChip icon={Eye}>{opens} нээлт</HeroChip>
                                <HeroChip icon={Clock}>{(hours / 3600).toFixed(1)} цаг үзсэн</HeroChip>
                                {!lesson.is_published && <HeroChip warn>Ноорог</HeroChip>}
                                {lesson.is_required && (
                                    <HeroChip icon={CalendarClock} warn={lesson.is_overdue}>
                                        {lesson.is_overdue ? 'Хугацаа хэтэрсэн' : 'Заавал үзэх'}
                                        {lesson.due_at && ` · ${lesson.due_at}`}
                                    </HeroChip>
                                )}
                            </div>

                            {/* Хамрах хүрээ — нэг зурвас дээр гурван бүлэг */}
                            <ReachBar
                                total={audience}
                                segments={[
                                    { bar: 'bg-emerald-400', label: 'Дуусгасан', value: completed },
                                    { bar: 'bg-violet-400', label: 'Үзэж байгаа', value: watching },
                                    { bar: 'bg-white/25', label: 'Огт үзээгүй', value: notSeen, track: true },
                                ]}
                            />
                        </div>

                        {/* Үйлдэл */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {lesson.has_video && (
                                <button onClick={() => setPlaying(true)} className={GLASS_CTA}>
                                    <Play className="size-3.5" />
                                    Бичлэгийг үзэх
                                </button>
                            )}
                            <Link href="/admin/lab-training/report" className={GLASS}>
                                <ArrowLeft className="size-3.5" />
                                Буцах
                            </Link>
                        </div>
                    </div>

                    <HeroStatGrid className="mt-5 xl:grid-cols-6">
                        <HeroStat
                            tone="violet" icon={Users} label="Үзэж эхэлсэн"
                            value={`${started}/${audience}`} hint={`${share(started)}%`}
                            percent={share(started)}
                        />
                        <HeroStat
                            tone="emerald" icon={UserCheck} label="Үзэж дуусгасан"
                            value={completed} hint={`${share(completed)}%`}
                            percent={share(completed)}
                        />
                        <HeroStat
                            tone={notSeen > 0 ? 'rose' : 'slate'} icon={UserX} label="Огт үзээгүй"
                            value={notSeen} hint={`${share(notSeen)}%`}
                            percent={share(notSeen)}
                        />
                        <HeroStat
                            tone="sky" icon={Play} label="Дундаж явц"
                            value={`${avg}%`} hint="үзэж эхэлсэн дунджаар"
                            percent={avg}
                        />
                        <HeroStat
                            tone="indigo" icon={Eye} label="Нээсэн тоо"
                            value={opens} hint={`${started} ажилтан`}
                        />
                        <HeroStat
                            tone="amber" icon={MessageSquare} label="Сэтгэгдэл"
                            value={comments.length} hint={`${totalReactions} reaction`}
                        />
                    </HeroStatGrid>
                </div>
            </HeroShell>

            <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
                {/* ── Барих чадварын муруй ───────────────────────────────── */}
                <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-4">
                        <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight">
                            <LineChart className="size-4 text-muted-foreground" />
                            {retention.unit === 'page'
                                ? 'Аль хуудас хүртэл уншиж байна'
                                : 'Бичлэгийн аль хэсэг барьж байна'}
                        </h2>
                        <span className="text-[11px] text-muted-foreground">
                            {retention.unit === 'page'
                                ? 'Үзэж эхэлсэн ажилтнуудын хэдэн хувь нь тэр хуудсанд хүрсэн бэ'
                                : 'Үзэж эхэлсэн ажилтнуудын хэдэн хувь нь тухайн агшинд байсан бэ'}
                        </span>
                    </div>

                    <LabRetentionChart data={retention} />
                </section>

                {/* ── Reaction ───────────────────────────────────────────── */}
                {totalReactions > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 pr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Flame className="size-3.5 text-orange-500" />
                            Reaction
                        </span>
                        {Object.entries(reactions).map(([type, count]) => (
                            <span
                                key={type}
                                className="inline-flex h-9 items-center gap-2 rounded-xl border bg-card px-3 shadow-sm"
                            >
                                <span className="text-base leading-none">{EMOJI[type] ?? type}</span>
                                <span className="text-sm font-bold tabular-nums">{count}</span>
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Ажилтан бүрийн үзэлт ───────────────────────────────── */}
                <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-4">
                        <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight">
                            <Users className="size-4 text-muted-foreground" />
                            Ажилтан бүрийн үзэлт
                        </h2>

                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            <div className="relative w-full sm:w-48">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Ажилтан хайх"
                                    className="h-8 w-full rounded-lg border bg-background pl-8 pr-3 text-xs outline-none transition placeholder:text-muted-foreground/60 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
                                />
                            </div>

                            <div className="inline-flex h-8 rounded-lg border bg-muted/40 p-0.5">
                                {([
                                    ['all', 'Бүгд', audience],
                                    ['done', 'Дуусгасан', completed],
                                    ['watching', 'Үзэж байгаа', watching],
                                    ['none', 'Үзээгүй', notSeen],
                                ] as const).map(([key, label, count]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setFilter(key)}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-medium transition',
                                            filter === key
                                                ? 'bg-card text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {label}
                                        <span className="tabular-nums opacity-50">{count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={cn(
                        ROW,
                        'h-9 border-b bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
                    )}>
                        <span>Ажилтан</span>
                        <span>Явц</span>
                        <span className="hidden text-right sm:block">Үзсэн</span>
                        <span className="hidden text-right lg:block">Нээсэн</span>
                        <span className="hidden text-right lg:block">Сүүлд</span>
                    </div>

                    {rows.length === 0 ? (
                        <Empty
                            title={query || filter !== 'all' ? 'Илэрц олдсонгүй' : 'Хамрах хүрээнд ажилтан алга'}
                            text={
                                query || filter !== 'all'
                                    ? 'Хайлт эсвэл шүүлтээ өөрчилж үзнэ үү.'
                                    : 'Лаб порталд харьяалагдах ажилтан бүртгэгдээгүй байна.'
                            }
                        />
                    ) : (
                        rows.map((v) => <ViewerRow key={v.user_id} viewer={v} />)
                    )}
                </section>

                {/* ── Сэтгэгдэл ──────────────────────────────────────────── */}
                <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="flex items-center gap-2 border-b px-3 py-2.5 sm:px-4">
                        <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight">
                            <MessageSquare className="size-4 text-muted-foreground" />
                            Сэтгэгдэл
                        </h2>
                        <span className="rounded-full bg-muted px-2 text-[11px] font-semibold leading-5 tabular-nums text-muted-foreground">
                            {comments.length}
                        </span>
                    </div>

                    {comments.length === 0 ? (
                        <Empty
                            title="Сэтгэгдэл байхгүй байна"
                            text="Ажилтнууд хичээл үзэж эхэлмэгц энд гарч ирнэ."
                        />
                    ) : (
                        comments.map((c, i) => <LabCommentItem key={c.id} comment={c} first={i === 0} />)
                    )}
                </section>
            </div>

            {playing && (
                <LabVideoPreview
                    title={lesson.title}
                    provider={lesson.video_provider}
                    poster={lesson.poster_url}
                    src={videoSrc}
                    onClose={() => setPlaying(false)}
                />
            )}
        </AppLayout>
    );
}

/* ── Толгойн жижиг шошго ───────────────────────────────────────────────── */
function HeroChip({ icon: Icon, warn, children }: {
    icon?: typeof Clock; warn?: boolean; children: ReactNode;
}) {
    return (
        <span className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold backdrop-blur-sm',
            warn
                ? 'border-amber-400/30 bg-amber-400/15 text-amber-200'
                : 'border-white/15 bg-white/10 text-white/75',
        )}>
            {Icon && <Icon className="size-3 shrink-0" />}
            {children}
        </span>
    );
}

/* ── Ажилтны мөр ───────────────────────────────────────────────────────── */
/**
 * Нэрний өмнөх дугуй нь өөрөө явцын цагираг — мөр бүрийг уншихгүйгээр хэн
 * хаана явааг харна. Огт үзээгүй хүн саарал, бүдэг үлдэнэ.
 */
function ViewerRow({ viewer: v }: { viewer: Viewer }) {
    const idle = v.views_count === 0;

    return (
        <div className={cn(
            ROW,
            'h-14 border-t transition-colors hover:bg-muted/40',
            idle && 'bg-rose-500/[0.03] dark:bg-rose-500/[0.04]',
        )}>
            <span className="flex min-w-0 items-center gap-2.5">
                <AvatarRing name={v.user_name} percent={v.progress} idle={idle} />

                <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                        <span className={cn('truncate text-[13px] font-medium', idle && 'text-muted-foreground')}>
                            {v.user_name}
                        </span>
                        {v.completed && (
                            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        )}
                    </span>

                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {idle ? 'Огт нээгээгүй' : v.last_viewed_at ?? '—'}
                    </span>
                </span>
            </span>

            <Bar percent={v.progress} />

            <span className={cn(
                'hidden text-right text-xs tabular-nums sm:block',
                idle ? 'text-muted-foreground/40' : 'text-muted-foreground',
            )}>
                {idle ? '—' : mmss(v.watched_seconds)}
            </span>
            <span className={cn(
                'hidden text-right text-xs tabular-nums lg:block',
                idle && 'text-muted-foreground/40',
            )}>
                {v.views_count}
            </span>
            <span className={cn(
                'hidden truncate text-right text-[11px] tabular-nums lg:block',
                idle ? 'text-muted-foreground/40' : 'text-muted-foreground',
            )}>
                {v.last_viewed_at ?? '—'}
            </span>
        </div>
    );
}
