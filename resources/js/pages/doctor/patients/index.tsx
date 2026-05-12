import DoctorLayout from '@/layouts/doctor-layout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Head, Link, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { CalendarDays, ChevronRight, Phone, Search, Users, X } from 'lucide-react';
import { useState } from 'react';

interface Patient {
    id: number; patient_number: string; last_name: string; first_name: string;
    phone: string; gender: string | null; date_of_birth: string | null;
}
interface Paginated {
    data: Patient[]; total: number; last_page: number; current_page: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props { patients: Paginated; search: string | null; appointment_id: number | null }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/doctor/dashboard' },
    { title: 'Өвчтний карт',    href: '/doctor/patients' },
];

const GENDER: Record<string, string> = { male: 'Эрэгтэй', female: 'Эмэгтэй', other: 'Бусад' };
const GENDER_CHIP: Record<string, string> = {
    male:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
    female: 'bg-pink-50 text-pink-700 ring-1 ring-pink-200 dark:bg-pink-950/40 dark:text-pink-400',
    other:  'bg-muted text-muted-foreground ring-1 ring-border',
};
const AVATAR_COLORS = ['from-red-400 to-rose-500','from-blue-400 to-indigo-500','from-emerald-400 to-teal-500','from-amber-400 to-orange-500','from-violet-400 to-purple-500'];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function calcAge(dob: string | null) {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) + ' нас';
}

const AVATAR_PAL = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#f97316'];
function avatarPalColor(name: string) { return AVATAR_PAL[name.charCodeAt(0) % AVATAR_PAL.length]; }

/* ══════════════════════════════════════════════════
   MOBILE
══════════════════════════════════════════════════ */
function MobilePatientIndex({ patients, search, appointment_id: appointmentId }: Props) {
    const [q, setQ] = useState(search ?? '');
    function doSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/doctor/patients', { search: q }, { preserveScroll: true });
    }

    return (
        <div style={{ background:'var(--background)', minHeight:'100%', paddingBottom:'calc(90px + env(safe-area-inset-bottom,0px))' }}>

            {/* ── HERO ── */}
            <div style={{
                background:'linear-gradient(155deg,#0f172a 0%,#450a0a 55%,#0f172a 100%)',
                position:'relative', overflow:'hidden', padding:'20px 16px 22px',
            }}>
                <div style={{ position:'absolute', width:220, height:220, borderRadius:'50%', background:'rgba(239,68,68,0.12)', top:-70, right:-70, pointerEvents:'none' }} />
                <div style={{ position:'absolute', width:140, height:140, borderRadius:'50%', background:'rgba(99,102,241,0.08)', bottom:-50, left:-30, pointerEvents:'none' }} />
                <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize:'22px 22px', pointerEvents:'none' }} />
                <div style={{ position:'relative' }}>
                    <p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:700, letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>Эмчийн портал</p>
                    <h1 style={{ margin:0, fontSize:28, fontWeight:900, color:'white', lineHeight:1.1, letterSpacing:-0.5 }}>Өвчтний карт</h1>
                    <div style={{ display:'flex', gap:10, marginTop:18 }}>
                        {[
                            { value: patients.total,     label:'НИЙТ ӨВЧТӨН', color:'#fca5a5', bg:'rgba(239,68,68,0.12)', border:'rgba(239,68,68,0.25)', Icon: Users },
                            { value: patients.last_page, label:'НИЙТ ХУУДАС',  color:'#c4b5fd', bg:'rgba(139,92,246,0.12)', border:'rgba(139,92,246,0.25)', Icon: CalendarDays },
                        ].map(s => (
                            <div key={s.label} style={{ display:'flex', alignItems:'center', gap:10, background:s.bg, borderRadius:16, padding:'10px 16px', border:`1px solid ${s.border}` }}>
                                <s.Icon style={{ width:18, height:18, color:s.color }} />
                                <div>
                                    <p style={{ margin:0, fontSize:22, fontWeight:900, color:'white', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{s.value}</p>
                                    <p style={{ margin:'2px 0 0', fontSize:8, color:'rgba(255,255,255,0.45)', fontWeight:700, letterSpacing:0.5 }}>{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── SEARCH ── */}
            <div style={{ padding:'12px 14px', background:'var(--card)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
                <form onSubmit={doSearch}>
                    <div style={{ position:'relative' }}>
                        <Search style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', width:15, height:15, color:'var(--muted-foreground)', pointerEvents:'none' }} />
                        <input
                            type="text" value={q} onChange={e => setQ(e.target.value)}
                            placeholder="Нэр, утас, дугаараар хайх…"
                            style={{ width:'100%', boxSizing:'border-box', borderRadius:14, border:'1.5px solid var(--border)', background:'var(--background)', padding:'11px 40px 11px 40px', fontSize:14, color:'var(--foreground)', outline:'none' }}
                        />
                        {q && (
                            <button type="button" onClick={() => { setQ(''); router.get('/doctor/patients'); }}
                                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', display:'flex', padding:2 }}>
                                <X style={{ width:14, height:14, color:'var(--muted-foreground)' }} />
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* ── LIST ── */}
            <div style={{ padding:'10px 14px' }}>
                {patients.data.length === 0 ? (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:60, gap:14 }}>
                        <div style={{ width:76, height:76, borderRadius:24, background:'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(99,102,241,0.06))', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Users style={{ width:34, height:34, color:'var(--muted-foreground)', opacity:0.35 }} />
                        </div>
                        <div style={{ textAlign:'center' }}>
                            <p style={{ margin:0, fontSize:16, fontWeight:800, color:'var(--foreground)' }}>
                                {q ? 'Өвчтөн олдсонгүй' : 'Өвчтөн бүртгэгдээгүй'}
                            </p>
                            {q && <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--muted-foreground)' }}>"{q}" хайлтад тохирохгүй байна</p>}
                        </div>
                    </div>
                ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {patients.data.map(p => {
                            const inits = ((p.last_name[0]??'')+(p.first_name[0]??'')).toUpperCase();
                            const age   = calcAge(p.date_of_birth);
                            const color = avatarPalColor(p.last_name);
                            const href  = appointmentId ? `/doctor/patients/${p.id}?appointment_id=${appointmentId}` : `/doctor/patients/${p.id}`;
                            return (
                                <button key={p.id} onClick={() => router.visit(href)}
                                    style={{
                                        width:'100%', textAlign:'left', border:'1px solid var(--border)',
                                        background:'var(--card)', borderRadius:20, padding:0,
                                        cursor:'pointer', display:'flex', alignItems:'stretch',
                                        boxShadow:'0 1px 6px rgba(0,0,0,0.05)', overflow:'hidden',
                                    }}>
                                    {/* Left color bar */}
                                    <div style={{ width:4, flexShrink:0, background:color, borderRadius:'20px 0 0 20px' }} />
                                    <div style={{ flex:1, display:'flex', alignItems:'center', gap:13, padding:'13px 14px' }}>
                                        {/* Avatar */}
                                        <div style={{
                                            width:48, height:48, borderRadius:16, flexShrink:0,
                                            background:`${color}15`, border:`1.5px solid ${color}30`,
                                            display:'flex', alignItems:'center', justifyContent:'center',
                                            fontSize:17, fontWeight:900, color,
                                        }}>{inits}</div>
                                        {/* Info */}
                                        <div style={{ flex:1, minWidth:0 }}>
                                            <p style={{ margin:0, fontSize:15, fontWeight:700, color:'var(--foreground)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                                {p.last_name} {p.first_name}
                                            </p>
                                            <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:5, marginTop:4 }}>
                                                <span style={{ fontSize:12, color:'var(--muted-foreground)', display:'flex', alignItems:'center', gap:3 }}>
                                                    <Phone style={{ width:11, height:11 }} />{p.phone}
                                                </span>
                                                {age && <><span style={{ width:3, height:3, borderRadius:'50%', background:'var(--border)', display:'inline-block', flexShrink:0 }} /><span style={{ fontSize:12, color:'var(--muted-foreground)' }}>{age}</span></>}
                                                {p.gender && (
                                                    <span style={{
                                                        fontSize:9, fontWeight:700, borderRadius:99, padding:'2px 7px',
                                                        background: p.gender==='male' ? 'rgba(59,130,246,0.1)' : p.gender==='female' ? 'rgba(236,72,153,0.1)' : 'var(--muted)',
                                                        color: p.gender==='male' ? '#2563eb' : p.gender==='female' ? '#db2777' : 'var(--muted-foreground)',
                                                    }}>{GENDER[p.gender]}</span>
                                                )}
                                            </div>
                                            <p style={{ margin:'4px 0 0', fontSize:10, fontWeight:600, color:'var(--muted-foreground)', fontFamily:'monospace', opacity:0.7 }}>{p.patient_number}</p>
                                        </div>
                                        <ChevronRight style={{ width:16, height:16, color:'var(--muted-foreground)', opacity:0.35, flexShrink:0 }} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {patients.last_page > 1 && (
                    <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:18, flexWrap:'wrap' }}>
                        {patients.links.map((link, i) =>
                            link.url ? (
                                <Link key={i} href={link.url}
                                    style={{ borderRadius:12, padding:'7px 14px', fontSize:12, fontWeight:700, background: link.active ? '#ef4444' : 'var(--card)', color: link.active ? 'white' : 'var(--muted-foreground)', border: link.active ? 'none' : '1px solid var(--border)', textDecoration:'none', boxShadow: link.active ? '0 3px 10px rgba(239,68,68,0.3)' : 'none' }}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span key={i} style={{ borderRadius:12, padding:'7px 14px', fontSize:12, fontWeight:700, background:'var(--card)', color:'var(--muted-foreground)', border:'1px solid var(--border)', opacity:0.4 }} dangerouslySetInnerHTML={{ __html: link.label }} />
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════ */
export default function DoctorPatientsIndex({ patients, search, appointment_id: appointmentId }: Props) {
    const isMobile = useIsMobile();
    const [q, setQ]  = useState(search ?? '');

    function doSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/doctor/patients', { search: q }, { preserveScroll: true });
    }

    return (
        <DoctorLayout breadcrumbs={breadcrumbs}>
            <Head title="Өвчтний карт" />

            {isMobile ? (
                <MobilePatientIndex patients={patients} search={search} appointment_id={appointmentId} />
            ) : (
                <div className="flex flex-1 flex-col gap-6 p-6">
                    {/* ── Header ── */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Эмчийн портал</p>
                            <h1 className="text-2xl font-bold tracking-tight">Өвчтний карт</h1>
                        </div>
                    </div>

                    {/* ── Stats ── */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        {[
                            { label: 'Нийт өвчтөн', value: patients.total,     icon: Users,        from: 'from-blue-500',    to: 'to-indigo-600' },
                            { label: 'Нийт хуудас',  value: patients.last_page, icon: CalendarDays, from: 'from-emerald-500', to: 'to-teal-600' },
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

                    {/* ── Search ── */}
                    <form onSubmit={doSearch}>
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                            <input
                                type="text" value={q} onChange={e => setQ(e.target.value)}
                                placeholder="Нэр, утас, бүртгэлийн дугаараар хайх…"
                                className="w-full rounded-xl border bg-card pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                            />
                            {q && (
                                <button type="button" onClick={() => { setQ(''); router.get('/doctor/patients'); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </form>

                    {/* ── Table ── */}
                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        {patients.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                                    <Users className="size-7 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Өвчтөн олдсонгүй</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {q ? `"${q}" хайлтад тохирох үр дүн байхгүй` : 'Өвчтөн бүртгэгдээгүй байна'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Өвчтөн</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Утас</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Нас / Хүйс</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Дугаар</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {patients.data.map(p => {
                                        const inits = (p.last_name[0] ?? '') + (p.first_name[0] ?? '');
                                        const age   = calcAge(p.date_of_birth);
                                        return (
                                            <tr key={p.id}
                                                onClick={() => router.visit(appointmentId ? `/doctor/patients/${p.id}?appointment_id=${appointmentId}` : `/doctor/patients/${p.id}`)}
                                                className="hover:bg-muted/40 transition-colors cursor-pointer">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(p.last_name)} text-white text-xs font-bold`}>
                                                            {inits.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-foreground">{p.last_name} {p.first_name}</p>
                                                            <p className="text-xs text-muted-foreground sm:hidden">{p.phone}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 hidden sm:table-cell">
                                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Phone className="size-3.5" />{p.phone}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 hidden md:table-cell">
                                                    <div className="flex items-center gap-2">
                                                        {age && <span>{age}</span>}
                                                        {p.gender && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${GENDER_CHIP[p.gender]}`}>{GENDER[p.gender]}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 hidden lg:table-cell">
                                                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-mono text-muted-foreground">{p.patient_number}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* ── Pagination ── */}
                    {patients.last_page > 1 && (
                        <div className="flex justify-center gap-1">
                            {patients.links.map((link, i) =>
                                link.url ? (
                                    <Link key={i} href={link.url}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${link.active ? 'bg-blue-600 text-white shadow-sm' : 'border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span key={i} className="rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground opacity-50" dangerouslySetInnerHTML={{ __html: link.label }} />
                                )
                            )}
                        </div>
                    )}
                </div>
            )}
        </DoctorLayout>
    );
}
