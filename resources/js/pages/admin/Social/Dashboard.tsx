import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Bot, Facebook, Instagram, MessageCircle, Send, TrendingUp, UserPlus, Users, Zap } from 'lucide-react';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Stats {
    total_contacts: number; new_7: number; new_30: number; returning: number; reachable: number;
    active_conversations: number; total_messages: number; in_messages: number; out_messages: number;
    bot_messages: number; agent_messages: number;
}
interface Props {
    stats: Stats;
    gender: { male: number; female: number; unknown: number };
    channels: { messenger: number; instagram: number };
    statuses: { bot: number; open: number; closed: number };
    growth: { date: string; count: number }[];
    topTags: { tag: string; count: number }[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Social хяналтын самбар', href: '/admin/social/dashboard' },
];

/* ─── KPI карт ───────────────────────────────────────────────────────── */
function Kpi({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: number | string; sub?: string; accent?: string }) {
    return (
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ?? 'bg-blue-500/10 text-[#1664db]'}`}>{icon}</span>
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{typeof value === 'number' ? value.toLocaleString('mn-MN') : value}</div>
            {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
        </div>
    );
}

/* ─── Donut chart карт ───────────────────────────────────────────────── */
function DonutCard({ title, data }: { title: string; data: { name: string; value: number; color: string }[] }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    return (
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="mb-2 text-sm font-semibold">{title}</div>
            {total === 0 ? (
                <div className="flex h-44 items-center justify-center text-xs text-muted-foreground">Өгөгдөл алга</div>
            ) : (
                <div className="flex items-center gap-3">
                    <div className="h-36 w-36 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2} strokeWidth={0}>
                                    {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-1.5">
                        {data.map((d, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 text-xs">
                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name}</span>
                                <span className="font-semibold tabular-nums">{d.value} <span className="text-muted-foreground">({total ? Math.round((d.value / total) * 100) : 0}%)</span></span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Dashboard({ stats, gender, channels, statuses, growth, topTags }: Props) {
    const maxTag = Math.max(1, ...topTags.map(t => t.count));
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Social хяналтын самбар" />
            <div className="font-warm space-y-4 p-4">
                {/* KPI мөр */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                    <Kpi icon={<Users className="h-4 w-4" />} label="Нийт контакт" value={stats.total_contacts} />
                    <Kpi icon={<UserPlus className="h-4 w-4" />} label="Шинэ (7 хоног)" value={stats.new_7} sub={`30 хоногт: ${stats.new_30}`} accent="bg-emerald-500/10 text-emerald-600" />
                    <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Буцаж ирсэн" value={stats.returning} sub="7 хоногоос өмнө" accent="bg-violet-500/10 text-violet-600" />
                    <Kpi icon={<Zap className="h-4 w-4" />} label="Хүрэх боломжтой" value={stats.reachable} sub="24ц цонх нээлттэй" accent="bg-amber-500/10 text-amber-600" />
                    <Kpi icon={<MessageCircle className="h-4 w-4" />} label="Идэвхтэй чат" value={stats.active_conversations} accent="bg-blue-500/10 text-[#1664db]" />
                    <Kpi icon={<Send className="h-4 w-4" />} label="Нийт мессеж" value={stats.total_messages} sub={`↓${stats.in_messages} ↑${stats.out_messages}`} accent="bg-sky-500/10 text-sky-600" />
                </div>

                {/* Donut-ууд */}
                <div className="grid gap-3 lg:grid-cols-3">
                    <DonutCard title="Хүйс" data={[
                        { name: '♂ Эрэгтэй', value: gender.male, color: '#3b8bf7' },
                        { name: '♀ Эмэгтэй', value: gender.female, color: '#ec4899' },
                        { name: 'Тодорхойгүй', value: gender.unknown, color: '#cbd5e1' },
                    ]} />
                    <DonutCard title="Суваг" data={[
                        { name: 'Facebook', value: channels.messenger, color: '#1877F2' },
                        { name: 'Instagram', value: channels.instagram, color: '#ec4899' },
                    ]} />
                    <DonutCard title="Харилцааны төлөв" data={[
                        { name: 'Бот', value: statuses.bot, color: '#10b981' },
                        { name: 'Оператор', value: statuses.open, color: '#3b8bf7' },
                        { name: 'Хаагдсан', value: statuses.closed, color: '#94a3b8' },
                    ]} />
                </div>

                {/* Өсөлт + хариу + tags */}
                <div className="grid gap-3 lg:grid-cols-3">
                    {/* Өсөлт */}
                    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm lg:col-span-2">
                        <div className="mb-2 text-sm font-semibold">Шинэ контакт (сүүлийн 14 хоног)</div>
                        <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={growth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b8bf7" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#3b8bf7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="count" stroke="#1664db" strokeWidth={2} fill="url(#g1)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Бот vs оператор + tags */}
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                            <div className="mb-2 text-sm font-semibold">Хариултын эх үүсвэр</div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5 text-emerald-600"><Bot className="h-4 w-4" /> Бот</span>
                                <span className="font-bold tabular-nums">{stats.bot_messages.toLocaleString('mn-MN')}</span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5 text-[#1664db]"><Send className="h-4 w-4" /> Оператор</span>
                                <span className="font-bold tabular-nums">{stats.agent_messages.toLocaleString('mn-MN')}</span>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                            <div className="mb-2 text-sm font-semibold">🏷️ Түгээмэл тэмдэг</div>
                            {topTags.length === 0 ? (
                                <div className="text-xs text-muted-foreground">Тэмдэг алга</div>
                            ) : (
                                <div className="space-y-1.5">
                                    {topTags.map(t => (
                                        <div key={t.tag} className="flex items-center gap-2">
                                            <span className="w-20 shrink-0 truncate text-xs">{t.tag}</span>
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                                <div className="h-full rounded-full bg-gradient-to-r from-[#3b8bf7] to-[#1664db]" style={{ width: `${(t.count / maxTag) * 100}%` }} />
                                            </div>
                                            <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums">{t.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
