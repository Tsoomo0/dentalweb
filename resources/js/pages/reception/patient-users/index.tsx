import ReceptionLayout from '@/layouts/reception-layout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { CheckCircle2, Lock, Mail, Search, ShieldOff, Users, X } from 'lucide-react';
import { useState } from 'react';

interface User {
    id: number;
    email: string;
}

interface Patient {
    id: number;
    patient_number: string;
    last_name: string;
    first_name: string;
    phone: string;
    user_id: number | null;
    user?: User;
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
    { title: 'Хэрэглэгч удирдах', href: '/reception/patient-users' },
];

const AVATAR_COLORS = ['from-red-400 to-rose-500', 'from-blue-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500', 'from-violet-400 to-purple-500'];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

function GrantModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: patient.user?.email ?? '',
        password: '',
    });
    const { props } = usePage<{ flash?: { success?: string } }>();

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(`/reception/patient-users/${patient.id}/grant-access`, {
            onSuccess: () => { reset(); onClose(); },
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-foreground">Нэвтрэх эрх олгох</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {patient.last_name} {patient.first_name} — {patient.patient_number}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                        <X className="size-4" />
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Имэйл хаяг</label>
                        <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5">
                            <Mail className="size-4 shrink-0 text-muted-foreground" />
                            <input type="email" value={data.email} onChange={e => setData('email', e.target.value)}
                                placeholder="example@mail.com" required
                                className="flex-1 bg-transparent text-sm focus:outline-none" />
                        </div>
                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Нууц үг</label>
                        <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5">
                            <Lock className="size-4 shrink-0 text-muted-foreground" />
                            <input type="password" value={data.password} onChange={e => setData('password', e.target.value)}
                                placeholder="Хамгийн багадаа 8 тэмдэгт" required
                                className="flex-1 bg-transparent text-sm focus:outline-none" />
                        </div>
                        {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button type="submit" disabled={processing}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                            {processing
                                ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                : <CheckCircle2 className="size-4" />}
                            Олгох
                        </button>
                        <button type="button" onClick={onClose}
                            className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
                            Цуцлах
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function PatientUsersIndex({ patients, search }: Props) {
    const [q, setQ] = useState(search ?? '');
    const [grantPatient, setGrantPatient] = useState<Patient | null>(null);
    const { props } = usePage<{ flash?: { success?: string } }>();

    function doSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/reception/patient-users', { search: q }, { preserveScroll: true });
    }

    function revokeAccess(patient: Patient) {
        if (!confirm(`${patient.last_name} ${patient.first_name}-ийн нэвтрэх эрхийг цуцлах уу?`)) return;
        router.delete(`/reception/patient-users/${patient.id}/revoke-access`, { preserveScroll: true });
    }

    const hasAccess = patients.data.filter(p => p.user_id).length;
    const noAccess  = patients.data.filter(p => !p.user_id).length;

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Хэрэглэгч удирдах" />
            <div className="flex flex-1 flex-col gap-6 p-6">

                {/* Header */}
                <div>
                    <p className="text-sm text-muted-foreground">Ресепшн портал</p>
                    <h1 className="text-2xl font-bold tracking-tight">Хэрэглэгч удирдах</h1>
                </div>

                {props.flash?.success && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        {props.flash.success}
                    </div>
                )}

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                    {[
                        { label: 'Нийт өвчтөн',      value: patients.total, icon: Users,         from: 'from-blue-500',    to: 'to-indigo-600' },
                        { label: 'Нэвтрэх эрхтэй',   value: hasAccess,      icon: CheckCircle2,  from: 'from-emerald-500', to: 'to-teal-600' },
                        { label: 'Эрхгүй өвчтөн',    value: noAccess,       icon: ShieldOff,     from: 'from-amber-500',   to: 'to-orange-600' },
                    ].map(s => (
                        <div key={s.label} className="rounded-2xl border bg-card p-5 flex items-center gap-4 shadow-sm">
                            <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.from} ${s.to} text-white shadow-sm`}>
                                <s.icon className="size-5" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold tabular-nums">{s.value}</p>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <form onSubmit={doSearch}>
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                        <input type="text" value={q} onChange={e => setQ(e.target.value)}
                            placeholder="Нэр, утас, дугаараар хайх…"
                            className="w-full rounded-xl border bg-card pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                        {q && (
                            <button type="button" onClick={() => { setQ(''); router.get('/reception/patient-users'); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>
                </form>

                {/* Table */}
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    {patients.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                                <Users className="size-7 text-muted-foreground" />
                            </div>
                            <p className="font-medium text-foreground">Өвчтөн олдсонгүй</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Өвчтөн</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Имэйл</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Нэвтрэх эрх</th>
                                    <th className="px-4 py-3.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {patients.data.map(p => {
                                    const initials = (p.last_name[0] ?? '') + (p.first_name[0] ?? '');
                                    return (
                                        <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(p.last_name)} text-white text-xs font-bold`}>
                                                        {initials.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-foreground">{p.last_name} {p.first_name}</p>
                                                        <p className="text-xs font-mono text-muted-foreground">{p.patient_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 hidden sm:table-cell">
                                                <span className="text-sm text-muted-foreground">
                                                    {p.user?.email ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {p.user_id ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-0.5 text-[10px] font-semibold">
                                                        <CheckCircle2 className="size-3" /> Эрхтэй
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground ring-1 ring-border px-2.5 py-0.5 text-[10px] font-semibold">
                                                        <ShieldOff className="size-3" /> Эрхгүй
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {p.user_id ? (
                                                        <button onClick={() => revokeAccess(p)}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 shadow-sm transition-colors dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                                                            <ShieldOff className="size-3" /> Цуцлах
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setGrantPatient(p)}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted shadow-sm transition-colors">
                                                            <CheckCircle2 className="size-3" /> Эрх олгох
                                                        </button>
                                                    )}
                                                    <Link href={`/reception/patients/${p.id}`}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted shadow-sm transition-colors">
                                                        Карт
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {patients.last_page > 1 && (
                    <div className="flex justify-center gap-1">
                        {patients.links.map((link, i) =>
                            link.url ? (
                                <Link key={i} href={link.url}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${link.active ? 'bg-red-600 text-white shadow-sm' : 'border bg-card text-muted-foreground hover:bg-muted'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span key={i} className="rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground opacity-50" dangerouslySetInnerHTML={{ __html: link.label }} />
                            )
                        )}
                    </div>
                )}
            </div>

            {grantPatient && (
                <GrantModal patient={grantPatient} onClose={() => setGrantPatient(null)} />
            )}
        </ReceptionLayout>
    );
}
