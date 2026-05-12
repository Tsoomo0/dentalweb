import ReceptionLayout from '@/layouts/reception-layout';
import { Head, Link, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import {
    CalendarDays, ChevronLeft, ChevronRight, Phone, Plus,
    Search, User, Users, X,
} from 'lucide-react';
import { useState } from 'react';

interface Patient {
    id: number;
    patient_number: string;
    last_name: string;
    first_name: string;
    phone: string;
    gender: string | null;
    date_of_birth: string | null;
    created_at: string;
}

interface Paginated {
    data: Patient[];
    total: number;
    last_page: number;
    current_page: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    patients: Paginated;
    search: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/reception/dashboard' },
    { title: 'Өвчтний карт',    href: '/reception/patients' },
];

const GENDER: Record<string, string> = { male: 'Эрэгтэй', female: 'Эмэгтэй', other: 'Бусад' };
const GENDER_COLORS: Record<string, { chip: string; dot: string }> = {
    male:   { chip: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-800', dot: 'bg-blue-400' },
    female: { chip: 'bg-pink-50 text-pink-700 ring-1 ring-pink-200 dark:bg-pink-950/40 dark:text-pink-400 dark:ring-pink-800', dot: 'bg-pink-400' },
    other:  { chip: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400', dot: 'bg-gray-400' },
};

const AVATAR_GRADIENTS = [
    'from-red-400 to-rose-600',
    'from-blue-400 to-indigo-600',
    'from-emerald-400 to-teal-600',
    'from-amber-400 to-orange-600',
    'from-violet-400 to-purple-600',
    'from-cyan-400 to-sky-600',
];
function avatarGradient(name: string) {
    return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

function calcAge(dob: string | null): string | null {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) + ' нас';
}

export default function PatientsIndex({ patients, search }: Props) {
    const [q, setQ] = useState(search ?? '');

    function doSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/reception/patients', { search: q }, { preserveScroll: true });
    }

    function clearSearch() {
        setQ('');
        router.get('/reception/patients', {}, { preserveScroll: true });
    }

    const prevLink = patients.links.find(l => l.label.includes('&laquo;'));
    const nextLink = patients.links.find(l => l.label.includes('&raquo;'));
    const pageLinks = patients.links.filter(l => !l.label.includes('&laquo;') && !l.label.includes('&raquo;'));

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Өвчтний карт" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">

                {/* ── Header ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Ресепшн</p>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Өвчтний карт</h1>
                    </div>
                    <Link
                        href="/reception/patients/create"
                        className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm"
                    >
                        <Plus className="size-4" />
                        Шинэ өвчтөн
                    </Link>
                </div>

                {/* ── Stats row ── */}
                <div className="grid gap-3 grid-cols-3">
                    {[
                        { label: 'Нийт өвчтөн', value: patients.total,       icon: Users,        from: 'from-red-500',     to: 'to-rose-600' },
                        { label: 'Энэ хуудаст',  value: patients.data.length, icon: User,         from: 'from-blue-500',    to: 'to-indigo-600' },
                        { label: 'Нийт хуудас',  value: patients.last_page,   icon: CalendarDays, from: 'from-emerald-500', to: 'to-teal-600' },
                    ].map(s => (
                        <div key={s.label} className="rounded-2xl border bg-card p-4 flex items-center gap-3 shadow-sm">
                            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.from} ${s.to} text-white shadow-sm`}>
                                <s.icon className="size-4.5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold tabular-nums leading-tight">{s.value}</p>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Search bar ── */}
                <form onSubmit={doSearch}>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Нэр, утас, бүртгэлийн дугаараар хайх…"
                            className="w-full rounded-2xl border bg-card pl-11 pr-11 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow"
                        />
                        {q ? (
                            <button type="button" onClick={clearSearch}
                                className="absolute right-4 top-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors">
                                <X className="size-3" />
                            </button>
                        ) : (
                            <button type="submit"
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors">
                                Хайх
                            </button>
                        )}
                    </div>
                    {search && (
                        <p className="mt-2 text-xs text-muted-foreground px-1">
                            &quot;{search}&quot; хайлтын үр дүн: {patients.total} өвчтөн
                        </p>
                    )}
                </form>

                {/* ── Patient cards / list ── */}
                {patients.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center gap-4 shadow-sm">
                        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                            <Users className="size-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">Өвчтөн олдсонгүй</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {q ? `"${q}" хайлтад тохирох үр дүн байхгүй` : 'Шинэ өвчтөн бүртгэнэ үү'}
                            </p>
                        </div>
                        <Link href="/reception/patients/create"
                            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm">
                            <Plus className="size-4" /> Шинэ өвчтөн
                        </Link>
                    </div>
                ) : (
                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_160px_130px_120px] border-b bg-muted/40 px-5 py-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Өвчтөн</span>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:block">Утас</span>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:block">Нас / Хүйс</span>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:block text-right">Дугаар</span>
                        </div>

                        <div className="divide-y divide-border">
                            {patients.data.map((p, idx) => {
                                const fullName = `${p.last_name} ${p.first_name}`;
                                const initials = (p.last_name[0] ?? '') + (p.first_name[0] ?? '');
                                const age = calcAge(p.date_of_birth);
                                const genderColors = p.gender ? GENDER_COLORS[p.gender] : null;
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => router.visit(`/reception/patients/${p.id}`)}
                                        className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_160px_130px_120px] items-center px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer group"
                                    >
                                        {/* Name + avatar */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`relative flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(p.last_name)} text-white text-xs font-bold shadow-sm ring-2 ring-background`}>
                                                {initials.toUpperCase()}
                                                {genderColors && (
                                                    <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ${genderColors.dot} ring-2 ring-background`} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-foreground text-sm group-hover:text-red-600 transition-colors truncate">{fullName}</p>
                                                <p className="text-xs text-muted-foreground sm:hidden flex items-center gap-1">
                                                    <Phone className="size-3" />{p.phone}
                                                </p>
                                                <p className="text-xs text-muted-foreground hidden sm:block">
                                                    {p.date_of_birth
                                                        ? `${new Date(p.date_of_birth).toLocaleDateString('mn-MN')} · ${age}`
                                                        : 'Төрсөн огноо байхгүй'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Phone */}
                                        <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
                                            <Phone className="size-3.5 shrink-0 text-muted-foreground/60" />
                                            <span className="truncate">{p.phone}</span>
                                        </div>

                                        {/* Age / Gender */}
                                        <div className="hidden md:flex items-center gap-2">
                                            {age && <span className="text-sm font-medium text-foreground">{age}</span>}
                                            {p.gender && genderColors && (
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${genderColors.chip}`}>
                                                    {GENDER[p.gender]}
                                                </span>
                                            )}
                                        </div>

                                        {/* Patient number */}
                                        <div className="hidden lg:flex justify-end">
                                            <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-mono text-muted-foreground group-hover:bg-red-50 group-hover:text-red-700 dark:group-hover:bg-red-950/30 dark:group-hover:text-red-400 transition-colors">
                                                {p.patient_number}
                                            </span>
                                        </div>

                                        {/* Mobile: just an arrow cue */}
                                        <div className="sm:hidden flex items-center">
                                            <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-red-500 transition-colors" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Pagination ── */}
                {patients.last_page > 1 && (
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{patients.current_page}</span>
                            {' / '}{patients.last_page} хуудас
                        </p>
                        <div className="flex items-center gap-1">
                            {/* Prev */}
                            {prevLink?.url ? (
                                <Link href={prevLink.url}
                                    className="flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm">
                                    <ChevronLeft className="size-3.5" /> Өмнөх
                                </Link>
                            ) : (
                                <span className="flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-xs font-medium text-muted-foreground opacity-40">
                                    <ChevronLeft className="size-3.5" /> Өмнөх
                                </span>
                            )}

                            {/* Page numbers */}
                            <div className="flex gap-1">
                                {pageLinks.map((link, i) =>
                                    link.url ? (
                                        <Link key={i} href={link.url}
                                            className={`flex size-8 items-center justify-center rounded-xl text-xs font-semibold transition-colors ${
                                                link.active
                                                    ? 'bg-red-600 text-white shadow-sm'
                                                    : 'border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span key={i}
                                            className="flex size-8 items-center justify-center rounded-xl border bg-card text-xs text-muted-foreground opacity-40"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    )
                                )}
                            </div>

                            {/* Next */}
                            {nextLink?.url ? (
                                <Link href={nextLink.url}
                                    className="flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm">
                                    Дараах <ChevronRight className="size-3.5" />
                                </Link>
                            ) : (
                                <span className="flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-xs font-medium text-muted-foreground opacity-40">
                                    Дараах <ChevronRight className="size-3.5" />
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </ReceptionLayout>
    );
}
