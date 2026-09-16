import {
    AREA, BTN, CTA, Check, FIELD, FILE_INPUT, FieldError, FormActions,
    INPUT, IconBtn, LABEL, LabModal, Tag,
} from '@/components/lab-admin-ui';
import { CATEGORY_ICONS, TONE, categoryIcon, type Tone } from '@/components/lab-training-ui';
import { cn } from '@/lib/utils';
import { router, useForm } from '@inertiajs/react';
import { Edit, Eye, Layers, Plus, Trash2 } from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';

/**
 * Видео ба файл сургалтын админ хуудсуудын НИЙТЛЭГ хэсэг.
 *
 * Хоёр хуудас өөр өөр дүрслэлтэй — нэг нь постертой кино сан, нөгөө нь
 * баримтын шүүгээ. Гэхдээ сургалт өөрөө, ангилал, бүлэг гурав нь яг адилхан
 * ажиллана. Тэдгээрийг хоёр тийш хувилвал нэг талд нь зассан засвар нөгөөд нь
 * мартагдаж, хоёр хуудас аажмаар зөрнө — иймд энд нэг л удаа бичив.
 */

/** Сургалтын төрөл — аль хуудсанд харагдахыг заана. */
export type CourseKind = 'video' | 'document';


export interface Category {
    id: number;
    name: string;
    description: string | null;
    color: Tone;
    icon: string;
    is_active: boolean;
    courses_count: number;
}

export interface Section { id: number; title: string; order: number }

export interface Lesson {
    id: number;
    section_id: number | null;
    title: string;
    description: string | null;
    order: number;
    kind: 'video' | 'document';
    doc_status: string | null;
    doc_error: string | null;
    page_count: number;
    doc_source_name: string | null;
    has_document: boolean;
    video_provider: 'local' | 'youtube' | 'r2';
    video_ref: string | null;
    has_video: boolean;
    poster_url: string | null;
    duration_label: string;
    duration_seconds: number;
    file_size: number;
    attachments: { name: string; path: string; size: number }[];
    is_published: boolean;
    is_required: boolean;
    due_at: string | null;
    is_overdue: boolean;
    viewers_count: number;
    completed_count: number;
    comments_count: number;
    reactions_count: number;
    avg_progress: number;
}

export interface Course {
    id: number;
    category_id: number | null;
    category_name: string | null;
    category_color: Tone | null;
    category_icon: string | null;
    sections: Section[];
    title: string;
    slug: string;
    description: string | null;
    cover_url: string | null;
    order: number;
    is_published: boolean;
    lessons_count: number;
    lessons: Lesson[];
    /** Хоосон бол сургалт бүх ажилтанд нээлттэй. */
    position_ids: number[];
    position_names: string[];
    /** Энэ сургалтыг үзэх эрхтэй ажилтны тоо. */
    audience: number;
}

export interface Position {
    id: number;
    name: string;
    department: string | null;
}

export interface Props {
    categories: Category[];
    colors: Tone[];
    icons: string[];
    courses: Course[];
    positions: Position[];
    audience: number;
    maxChunkKb: number;
    /** Энэ хуудас аль төрлийн сургалтыг харуулж байгаа вэ. */
    kind: CourseKind;
}

/* ── Шүүлтийн бөмбөлөг ─────────────────────────────────────────────────── */
export function Pill({ dot, active, onClick, children }: {
    dot?: string; active: boolean; onClick: () => void; children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-medium transition',
                active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'border text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
        >
            {dot && <span className={cn('size-1.5 shrink-0 rounded-full', dot)} />}
            {children}
        </button>
    );
}

/** Толгойн мөрөнд зайгаа хэмнэсэн жижиг тоо. */
export function MiniStat({ icon: Icon, value, label, tone }: {
    icon: typeof Eye; value: number; label: string; tone?: Tone;
}) {
    return (
        <span className="flex items-center gap-1.5" title={label}>
            <Icon className={cn(
                'size-3.5 shrink-0',
                value > 0 && tone ? TONE[tone].text : 'text-muted-foreground/60',
            )} />
            <span className={cn(
                'text-xs font-semibold tabular-nums',
                value === 0 && 'text-muted-foreground/50',
            )}>
                {value}
            </span>
        </span>
    );
}



/**
 * Хайлтын үгийг гарчиг дотор тодруулна — олон хичээлтэй сургалтад аль нь
 * таарсныг нүдээр шууд олох боломж өгнө.
 */
export function highlight(text: string, query: string): ReactNode {
    const term = query.trim();

    if (!term) return text;

    const at = text.toLowerCase().indexOf(term.toLowerCase());

    if (at < 0) return text;

    return (
        <>
            {text.slice(0, at)}
            <mark className="rounded bg-violet-200/70 px-0.5 text-inherit dark:bg-violet-500/30">
                {text.slice(at, at + term.length)}
            </mark>
            {text.slice(at + term.length)}
        </>
    );
}


/* ── Сургалт нэмэх / засах ─────────────────────────────────────────────── */
export function CourseModal({ course, kind, categories, positions, onClose }: {
    course: Course | null;
    /** Шинэ сургалт үүсгэхэд энэ хуудасны төрлөөр тогтооно. */
    kind: CourseKind;
    categories: Category[];
    positions: Position[];
    onClose: () => void;
}) {
    const isDoc = kind === 'document';

    const { data, setData, post, processing, errors } = useForm({
        lab_category_id: course?.category_id ?? '',
        kind,
        title: course?.title ?? '',
        description: course?.description ?? '',
        cover: null as File | null,
        is_published: course?.is_published ?? false,
        position_ids: course?.position_ids ?? ([] as number[]),
    });

    /** Албан тушаалуудыг хэлтсээр нь бүлэглэнэ — олон байхад сонгоход хялбар. */
    const grouped = positions.reduce<Record<string, Position[]>>((acc, p) => {
        const key = p.department || 'Бусад';
        (acc[key] ??= []).push(p);
        return acc;
    }, {});

    function togglePosition(id: number) {
        setData('position_ids', data.position_ids.includes(id)
            ? data.position_ids.filter((x) => x !== id)
            : [...data.position_ids, id]);
    }

    function submit(e: FormEvent) {
        e.preventDefault();

        post(course ? `/admin/lab-training/courses/${course.id}` : '/admin/lab-training/courses', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: onClose,
        });
    }

    return (
        <LabModal
            title={course ? 'Сургалт засах' : isDoc ? 'Шинэ файл сургалт' : 'Шинэ видео сургалт'}
            description={isDoc
                ? 'Файл сургалт бол баримт хичээлүүдийг нэгтгэсэн багц. Төрлийг нь дараа солих боломжгүй.'
                : 'Видео сургалт бол бичлэг хичээлүүдийг нэгтгэсэн багц. Төрлийг нь дараа солих боломжгүй.'}
            onClose={onClose}
        >
            <form onSubmit={submit} className="space-y-3.5">
                <div>
                    <label className={LABEL}>Гарчиг</label>
                    <input
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        className={FIELD}
                        placeholder={isDoc ? 'Жишээ: Ажлын байрны аюулгүй ажиллагаа' : 'Жишээ: Керамик нугалалтын үндэс'}
                        autoFocus
                    />
                    <FieldError message={errors.title} />
                </div>

                <div>
                    <label className={LABEL}>Ангилал</label>
                    <select
                        value={data.lab_category_id}
                        onChange={(e) => setData('lab_category_id', e.target.value)}
                        className={FIELD}
                    >
                        <option value="">— Ангилалгүй —</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={LABEL}>Тайлбар</label>
                    <textarea
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        rows={3}
                        className={AREA}
                        placeholder="Энэ сургалт юуны тухай вэ?"
                    />
                </div>

                <div>
                    <label className={LABEL}>Нүүр зураг</label>
                    <div className="flex items-center gap-3">
                        {course?.cover_url && !data.cover && (
                            <img src={course.cover_url} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setData('cover', e.target.files?.[0] ?? null)}
                            className={FILE_INPUT}
                        />
                    </div>
                </div>

                <div>
                    <label className={LABEL}>Хэн үзэх вэ? (албан тушаал)</label>
                    <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
                        {data.position_ids.length === 0
                            ? 'Нэг ч сонгоогүй тул сургалт БҮХ ажилтанд харагдана.'
                            : 'Зөвхөн сонгосон ' + data.position_ids.length + ' албан тушаалтай ажилтан үзнэ.'}
                    </p>
                    <div className="max-h-52 space-y-3 overflow-y-auto rounded-xl border p-3">
                        {Object.entries(grouped).map(([dept, list]) => (
                            <div key={dept}>
                                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {dept}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {list.map((p) => {
                                        const on = data.position_ids.includes(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => togglePosition(p.id)}
                                                className={cn(
                                                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                                                    on
                                                        ? 'border-violet-500 bg-violet-500 text-white'
                                                        : 'text-muted-foreground hover:bg-muted',
                                                )}
                                            >
                                                {p.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {positions.length === 0 && (
                            <p className="text-xs text-muted-foreground">Албан тушаал бүртгэгдээгүй байна.</p>
                        )}
                    </div>
                    {data.position_ids.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setData('position_ids', [])}
                            className="mt-2 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
                        >
                            Сонголтыг цэвэрлэх (бүх ажилтанд нээх)
                        </button>
                    )}
                </div>

                <Check
                    checked={data.is_published}
                    onChange={(v) => setData('is_published', v)}
                    label="Ажилтнуудад нээх"
                    hint="Хаалттай үед зөвхөн админ харна."
                />

                <FormActions submitLabel={course ? 'Хадгалах' : 'Үүсгэх'} disabled={processing || !data.title} onCancel={onClose} />
            </form>
        </LabModal>
    );
}


/* ── Ангилал удирдах ───────────────────────────────────────────────────── */
export function CategoryModal({ categories, colors, icons, onClose }: {
    categories: Category[]; colors: Tone[]; icons: string[]; onClose: () => void;
}) {
    const [editing, setEditing] = useState<Category | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm<{
        name: string;
        description: string;
        color: Tone;
        icon: string;
        is_active: boolean;
    }>({
        name: '',
        description: '',
        color: 'violet',
        icon: 'folder',
        is_active: true,
    });

    function edit(cat: Category) {
        setEditing(cat);
        setData({
            name: cat.name,
            description: cat.description ?? '',
            color: cat.color,
            icon: cat.icon,
            is_active: cat.is_active,
        });
    }

    function submit(e: FormEvent) {
        e.preventDefault();

        post(editing
            ? `/admin/lab-training/categories/${editing.id}`
            : '/admin/lab-training/categories', {
            preserveScroll: true,
            onSuccess: () => { reset(); setEditing(null); },
        });
    }

    return (
        <LabModal
            title="Сургалтын ангилал"
            description="Ангилал нь лаб талд сургалтуудыг сэдвээр бүлэглэнэ."
            onClose={onClose}
        >
            {categories.length > 0 && (
                <ul className="mb-4 space-y-1">
                    {categories.map((cat) => {
                        const Icon = categoryIcon(cat.icon);

                        return (
                            <li
                                key={cat.id}
                                className={cn(
                                    'flex h-11 items-center gap-2.5 rounded-lg border px-2.5',
                                    !cat.is_active && 'opacity-50',
                                )}
                            >
                                <span className={cn('grid size-7 shrink-0 place-items-center rounded-md', TONE[cat.color].tile)}>
                                    <Icon className="size-3.5" />
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-xs font-medium">{cat.name}</span>
                                    <span className="block text-[11px] text-muted-foreground">
                                        {cat.courses_count} сургалт (энэ хуудсанд){!cat.is_active && ' · идэвхгүй'}
                                    </span>
                                </span>

                                <IconBtn icon={Edit} label="Засах" onClick={() => edit(cat)} />
                                <IconBtn
                                    icon={Trash2}
                                    label="Устгах"
                                    danger
                                    onClick={() => {
                                        if (confirm(`"${cat.name}" ангиллыг устгах уу? Доторх сургалтууд устахгүй, ангилалгүй болно.`)) {
                                            router.delete(`/admin/lab-training/categories/${cat.id}`, { preserveScroll: true });
                                        }
                                    }}
                                />
                            </li>
                        );
                    })}
                </ul>
            )}

            <form onSubmit={submit} className="space-y-3.5 border-t pt-4">
                <p className="text-xs font-semibold">
                    {editing ? `"${editing.name}" засах` : 'Шинэ ангилал'}
                </p>

                <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                        <label className={LABEL}>Нэр</label>
                        <input
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className={FIELD}
                            placeholder="Жишээ: Керамик"
                        />
                        <FieldError message={errors.name} />
                    </div>

                    <div>
                        <label className={LABEL}>Тайлбар</label>
                        <input
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            className={FIELD}
                            placeholder="Заавал биш"
                        />
                    </div>
                </div>

                <div>
                    <label className={LABEL}>Өнгө</label>
                    <div className="flex flex-wrap gap-1.5">
                        {colors.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setData('color', c)}
                                title={c}
                                className={cn(
                                    'size-7 rounded-md transition',
                                    TONE[c].tile,
                                    data.color === c && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
                                )}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label className={LABEL}>Дүрс</label>
                    <div className="flex flex-wrap gap-1.5">
                        {icons.map((key) => {
                            const Icon = CATEGORY_ICONS[key] ?? Layers;

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setData('icon', key)}
                                    className={cn(
                                        'grid size-7 place-items-center rounded-md border transition',
                                        data.icon === key
                                            ? 'border-violet-500 bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300'
                                            : 'text-muted-foreground hover:bg-muted',
                                    )}
                                >
                                    <Icon className="size-3.5" />
                                </button>
                            );
                        })}
                    </div>
                </div>

                <Check
                    checked={data.is_active}
                    onChange={(v) => setData('is_active', v)}
                    label="Идэвхтэй"
                    hint="Лаб талд харагдана."
                />

                <div className="flex justify-end gap-2 border-t pt-4">
                    {editing && (
                        <button type="button" onClick={() => { reset(); setEditing(null); }} className={BTN}>
                            Болих
                        </button>
                    )}
                    <button type="submit" disabled={processing || !data.name} className={CTA}>
                        {editing ? 'Хадгалах' : 'Нэмэх'}
                    </button>
                </div>
            </form>
        </LabModal>
    );
}


/* ── Сургалт доторх бүлгүүд ────────────────────────────────────────────── */
export function SectionManager({ course }: { course: Course }) {
    const [adding, setAdding] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    const { data, setData, post, processing, reset } = useForm({ title: '' });

    function submit(e: FormEvent) {
        e.preventDefault();

        post(editId
            ? `/admin/lab-training/sections/${editId}`
            : `/admin/lab-training/courses/${course.id}/sections`, {
            preserveScroll: true,
            onSuccess: () => { reset(); setAdding(false); setEditId(null); },
        });
    }

    const unassigned = course.lessons.filter((l) => !l.section_id).length;

    return (
        <div className="flex min-h-10 flex-wrap items-center gap-1.5 border-t bg-muted/20 px-3 py-1.5 sm:px-4">
            <span className="flex items-center gap-1.5 pr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Layers className="size-3" />
                Бүлэг
            </span>

            {course.sections.map((sec) => (
                <span
                    key={sec.id}
                    className="group flex h-7 items-center gap-1 rounded-lg border bg-card pl-2.5 pr-1 text-[11px]"
                >
                    {sec.title}

                    <span className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                            type="button"
                            onClick={() => { setEditId(sec.id); setData('title', sec.title); setAdding(true); }}
                            className="grid size-5 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            title="Нэрийг засах"
                        >
                            <Edit className="size-3" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm(`"${sec.title}" бүлгийг устгах уу? Доторх хичээл устахгүй, бүлэггүй болно.`)) {
                                    router.delete(`/admin/lab-training/sections/${sec.id}`, { preserveScroll: true });
                                }
                            }}
                            className="grid size-5 place-items-center rounded text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                            title="Устгах"
                        >
                            <Trash2 className="size-3" />
                        </button>
                    </span>
                </span>
            ))}

            {unassigned > 0 && course.sections.length > 0 && (
                <Tag tone="amber">{unassigned} хичээл бүлэггүй</Tag>
            )}

            {adding ? (
                <form onSubmit={submit} className="flex items-center gap-1">
                    <input
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        placeholder="Бүлгийн нэр"
                        autoFocus
                        className={cn(INPUT, 'h-7 w-40')}
                    />
                    <button
                        type="submit"
                        disabled={processing || !data.title.trim()}
                        className={cn(CTA, 'h-7 px-2.5')}
                    >
                        {editId ? 'Хадгалах' : 'Нэмэх'}
                    </button>
                    <button
                        type="button"
                        onClick={() => { reset(); setAdding(false); setEditId(null); }}
                        className="h-7 rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        Болих
                    </button>
                </form>
            ) : (
                <button
                    type="button"
                    onClick={() => { setEditId(null); reset(); setAdding(true); }}
                    className="flex h-7 items-center gap-1 rounded-lg border border-dashed px-2.5 text-[11px] text-muted-foreground transition hover:border-solid hover:bg-muted hover:text-foreground"
                >
                    <Plus className="size-3" />
                    Бүлэг нэмэх
                </button>
            )}
        </div>
    );
}
