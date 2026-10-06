import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { HR_PANEL_FX } from '@/components/hr/document-status';
import { HrButton, HrEmpty, HrGhostButton, HrListCard, HrPanel, HrTabs } from '@/components/hr/page-panel';
import {
    AlertTriangle, ArrowLeft, Check, Copy, Fingerprint, KeyRound, MapPin, Pencil, Plus,
    Radio, Server, Sparkles, Trash2, Upload, Usb, Users, X,
} from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';

type ConnectionType = 'pull' | 'push';

interface Device {
    id: number; name: string; branch_id: number | null; branch_name: string | null;
    connection_type: ConnectionType; serial_number: string | null; model: string | null; firmware: string | null;
    ip_address: string | null; port: number; comm_key: number; is_active: boolean; has_token: boolean;
    online: boolean; last_seen_at: string | null; last_ip: string | null; last_punch_at: string | null;
    clock_drift_seconds: number | null; unmapped_count: number; today_count: number; notes: string | null;
    records_count: number | null; records_capacity: number | null; storage_percent: number | null;
}

/** Санах ой энэ хувиас дээш дүүрвэл анхааруулна (AttendanceDevice::STORAGE_WARN_PERCENT). */
const STORAGE_WARN_PERCENT = 80;

function storageLabel(d: Device) {
    if (d.records_count === null) return null;
    const count = d.records_count.toLocaleString('en-US');
    return d.records_capacity
        ? `${count} / ${d.records_capacity.toLocaleString('en-US')} (${d.storage_percent}%)`
        : `${count} бүртгэл`;
}
interface DeviceUser {
    id: number; device_id: number; device_name: string | null; device_branch_id: number | null;
    pin: string; name: string | null;
    employee_id: number | null; employee_name: string | null; punches_count: number;
    /** Төхөөрөмж дээрх нэрээр гаргасан санал — HR баталгаажуулна */
    suggestion: { employee_id: number; employee_name: string | null } | null;
}
interface Option { id: number; name: string; }
interface PageProps {
    devices: Device[]; deviceUsers: DeviceUser[];
    /** branch_ids — үндсэн салбар + эмчийн «Мөн ажилладаг салбарууд» */
    employees: (Option & { branch_ids: number[] })[]; branches: Option[];
    server: { ingest_url: string; push_host: string; push_port: number };
    newToken: { device_id: number; token: string } | null;
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/dashboard' },
    { title: 'Ирцийн бүртгэл', href: '/hr/attendance' },
    { title: 'Төхөөрөмжүүд', href: '/hr/attendance/devices' },
];

const TYPE_LABEL: Record<ConnectionType, string> = { pull: '4370 · агент', push: 'Push · ADMS' };

const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40';

function CopyButton({ text }: { text: string }) {
    const [done, setDone] = useState(false);
    return (
        <button type="button" title="Хуулах"
            onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/70 bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            {done ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            {done ? 'Хуулсан' : 'Хуулах'}
        </button>
    );
}

function Field({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string }) {
    return (
        <div className="space-y-1">
            <label className="block text-xs font-semibold text-muted-foreground">{label}</label>
            {children}
            {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
            {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>
    );
}

function StatusDot({ device }: { device: Device }) {
    if (!device.is_active) {
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">Идэвхгүй</span>;
    }
    return device.online
        ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />Холбогдсон</span>
        : <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground"><span className="size-1.5 rounded-full bg-muted-foreground/50" />Холбогдоогүй</span>;
}

export default function AttendanceDevices() {
    const { devices, deviceUsers, employees, branches, server, newToken } = usePage<PageProps>().props;

    const [editing, setEditing] = useState<Device | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Device | null>(null);
    const [userTab, setUserTab] = useState<'unmapped' | 'all'>(deviceUsers.some(u => !u.employee_id) ? 'unmapped' : 'all');
    const [importFor, setImportFor] = useState<Device | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        name: '', branch_id: '' as number | '', connection_type: 'pull' as ConnectionType,
        serial_number: '', model: '', ip_address: '', port: '4370', comm_key: '0', is_active: true as boolean, notes: '',
    });

    function openForm(device: Device | 'new') {
        form.clearErrors();
        if (device === 'new') {
            form.setData({ name: '', branch_id: '', connection_type: 'pull', serial_number: '', model: '', ip_address: '', port: '4370', comm_key: '0', is_active: true, notes: '' });
        } else {
            form.setData({
                name: device.name, branch_id: device.branch_id ?? '', connection_type: device.connection_type,
                serial_number: device.serial_number ?? '', model: device.model ?? '', ip_address: device.ip_address ?? '',
                port: String(device.port), comm_key: String(device.comm_key),
                // Шинээр холбогдсон push төхөөрөмжийг засахад шууд идэвхжүүлэхээр санал болгоно
                is_active: device.is_active || (device.connection_type === 'push' && !device.branch_id),
                notes: device.notes ?? '',
            });
        }
        setEditing(device);
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => setEditing(null) };
        if (editing === 'new') form.post('/hr/attendance/devices', opts);
        else if (editing) form.put(`/hr/attendance/devices/${editing.id}`, opts);
    }

    function regenerate(device: Device) {
        if (device.has_token && !confirm('Шинэ токен үүсгэвэл хуучин токентой агент ажиллахаа болино. Үргэлжлүүлэх үү?')) return;
        router.post(`/hr/attendance/devices/${device.id}/token`, {}, { preserveScroll: true });
    }

    function pickUsb(device: Device) {
        setImportFor(device);
        fileRef.current?.click();
    }

    function uploadUsb(file: File | undefined) {
        if (!file || !importFor) return;
        router.post(`/hr/attendance/devices/${importFor.id}/import`, { file }, {
            forceFormData: true, preserveScroll: true,
            onFinish: () => { setImportFor(null); if (fileRef.current) fileRef.current.value = ''; },
        });
    }

    function mapUser(user: DeviceUser, employeeId: string | number) {
        router.patch(`/hr/attendance/device-users/${user.id}`, { employee_id: employeeId ? Number(employeeId) : null }, { preserveScroll: true });
    }

    function confirmAllSuggestions() {
        const mappings = suggested.map(u => ({ id: u.id, employee_id: u.suggestion!.employee_id }));
        if (!confirm(`Нэрээр санал болгосон ${mappings.length} тааруулалтыг батлах уу? Жагсаалтыг нэг харчихаад батлаарай.`)) return;
        router.post('/hr/attendance/device-users/bulk-map', { mappings }, { preserveScroll: true });
    }

    const tokenDevice = newToken ? devices.find(d => d.id === newToken.device_id) : undefined;
    const agentConfig = newToken && tokenDevice ? JSON.stringify({
        server_url: server.ingest_url,
        api_token: newToken.token,
        device: { ip: tokenDevice.ip_address, port: tokenDevice.port, comm_key: tokenDevice.comm_key },
    }, null, 2) : '';

    const unmapped = deviceUsers.filter(u => !u.employee_id);
    const suggested = unmapped.filter(u => u.suggestion);
    const shownUsers = userTab === 'unmapped' ? unmapped : deviceUsers;
    const onlineCount = devices.filter(d => d.is_active && d.online).length;
    const todayTotal = devices.reduce((s, d) => s + d.today_count, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ирцийн төхөөрөмж" />
            <div className="space-y-3 p-4 md:p-5">
                <HrPanel tone="sky" icon={Fingerprint} title="Ирцийн төхөөрөмж"
                    subtitle={`${devices.length} төхөөрөмж · ${onlineCount} холбогдсон · өнөөдөр ${todayTotal} бүртгэл`}
                    actions={<>
                        <HrGhostButton icon={ArrowLeft} href="/hr/attendance" title="Ирцийн бүртгэл рүү буцах">Ирц</HrGhostButton>
                        <HrButton tone="sky" icon={Plus} onClick={() => openForm('new')}>Төхөөрөмж нэмэх</HrButton>
                    </>}>
                    <div className="grid gap-2 px-4 pb-3.5 sm:grid-cols-3">
                        <MethodCard icon={MapPin} title="Байршлаар (утас)"
                            text="Ажилтан утаснаасаа салбарын радиус дотор бүртгүүлнэ. Админ → Салбарууд хэсэгт салбар бүрээр асааж/унтраана." />
                        <MethodCard icon={Radio} title="4370 · агент"
                            text="ADMS-гүй төхөөрөмж (JDF200). Ресепшний компьютер дээрх агент 5 минут тутам уншиж илгээнэ." />
                        <MethodCard icon={Server} title="Push · ADMS"
                            text={`Төхөөрөмж өөрөө илгээнэ (TX628). Cloud Server Setting → Server: ${server.push_host}, Port: ${server.push_port}.`} />
                    </div>
                </HrPanel>

                {newToken && tokenDevice && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                        <div className="mb-2 flex items-center gap-2">
                            <KeyRound className="size-4 text-amber-600" />
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">«{tokenDevice.name}» — агентын тохиргоо</p>
                        </div>
                        <p className="mb-3 text-xs text-amber-800 dark:text-amber-300">
                            Токен зөвхөн одоо харагдана. Доорх агуулгыг ресепшний компьютер дээрх агентын <code className="font-mono">config.json</code> файлд хуулна уу.
                        </p>
                        <div className="relative">
                            <pre className="overflow-x-auto rounded-xl bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground">{agentConfig}</pre>
                            <div className="absolute right-2 top-2"><CopyButton text={agentConfig} /></div>
                        </div>
                    </div>
                )}

                {devices.length === 0 ? (
                    <HrEmpty tone="sky" icon={Fingerprint} title="Төхөөрөмж бүртгэгдээгүй байна"
                        hint="4370 төхөөрөмжийг гараар нэмнэ. Push төхөөрөмж серверт анх холбогдоход энд автоматаар гарч ирнэ." />
                ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                        {devices.map(d => (
                            <HrListCard key={d.id} className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-bold text-foreground">{d.name}</p>
                                            <StatusDot device={d} />
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {TYPE_LABEL[d.connection_type]} · {d.branch_name ?? <span className="text-amber-600">салбар сонгоогүй</span>}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <IconBtn title="Засах" onClick={() => openForm(d)}><Pencil className="size-3.5" /></IconBtn>
                                        {d.connection_type === 'pull' && <IconBtn title="Агентын токен үүсгэх" onClick={() => regenerate(d)}><KeyRound className="size-3.5" /></IconBtn>}
                                        <IconBtn title="USB-ээр татсан .dat файл оруулах" onClick={() => pickUsb(d)}><Usb className="size-3.5" /></IconBtn>
                                        <IconBtn title="Устгах" onClick={() => setDeleting(d)}><Trash2 className="size-3.5" /></IconBtn>
                                    </div>
                                </div>

                                {!d.is_active && d.connection_type === 'push' && !d.branch_id && (
                                    <button onClick={() => openForm(d)}
                                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2 text-xs font-bold text-white hover:bg-amber-600">
                                        Шинэ төхөөрөмж холбогдлоо — салбар сонгоод идэвхжүүлэх
                                    </button>
                                )}

                                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                    <Info label="Serial" value={d.serial_number} mono />
                                    <Info label="Загвар" value={[d.model, d.firmware].filter(Boolean).join(' · ') || null} />
                                    {d.connection_type === 'pull'
                                        ? <Info label="Хаяг" value={d.ip_address ? `${d.ip_address}:${d.port}` : null} mono />
                                        : <Info label="Сүүлийн IP" value={d.last_ip} mono />}
                                    <Info label="Сүүлд холбогдсон" value={d.last_seen_at} />
                                    <Info label="Сүүлийн бүртгэл" value={d.last_punch_at} />
                                    <Info label="Өнөөдөр" value={`${d.today_count} бүртгэл`} />
                                    <Info label="Санах ой" value={storageLabel(d)} />
                                </dl>

                                {d.storage_percent !== null && d.storage_percent >= STORAGE_WARN_PERCENT && (
                                    <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                                        <AlertTriangle className="mt-px size-3.5 shrink-0" />
                                        Төхөөрөмжийн санах ой {d.storage_percent}% дүүрсэн — дүүрмэгц шинэ бүртгэл авахаа болино.
                                        Бүх бүртгэл системд орсныг шалгаад төхөөрөмжийн цэснээс (数据管理 → 删除考勤记录) хуучин бүртгэлийг устгана.
                                    </p>
                                )}

                                {d.connection_type === 'pull' && !d.has_token && (
                                    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                                        <AlertTriangle className="size-3.5" /> Агентын токен үүсгээгүй — <KeyRound className="size-3" /> товчийг дарна уу.
                                    </p>
                                )}
                                {d.clock_drift_seconds !== null && Math.abs(d.clock_drift_seconds) > 120 && (
                                    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                                        <AlertTriangle className="size-3.5" /> Төхөөрөмжийн цаг {Math.round(d.clock_drift_seconds / 60)} минут зөрүүтэй. Агент өдөрт нэг удаа тохируулна.
                                    </p>
                                )}
                                {d.unmapped_count > 0 && (
                                    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
                                        <Users className="size-3.5" /> {d.unmapped_count} PIN ажилтантай тааруулагдаагүй
                                    </p>
                                )}
                            </HrListCard>
                        ))}
                    </div>
                )}

                <HrListCard className="overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                        <div>
                            <p className="text-sm font-bold text-foreground">Төхөөрөмж дээрх хэрэглэгчид</p>
                            <p className="text-[11px] text-muted-foreground">
                                Төхөөрөмж дээрх ID системийн дугаартай таарах албагүй — төхөөрөмж бүр дээр нэг удаа тааруулахад
                                өмнөх болон дараагийн бүх бүртгэл тухайн ажилтанд орно. Нэр нь таарвал санал гарна.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                            {suggested.length > 0 && (
                                <button type="button" onClick={confirmAllSuggestions}
                                    className="mr-1 flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700">
                                    <Sparkles className="size-3.5" /> Санал болгосон {suggested.length}-ийг батлах
                                </button>
                            )}
                            <HrTabs tone="sky" active={userTab} onChange={k => setUserTab(k as 'unmapped' | 'all')}
                                items={[
                                    { key: 'unmapped', label: 'Тааруулаагүй', value: unmapped.length },
                                    { key: 'all', label: 'Бүгд', value: deviceUsers.length },
                                ]} />
                        </div>
                    </div>
                    {shownUsers.length === 0 ? (
                        <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                            {userTab === 'unmapped' ? 'Бүх PIN тааруулагдсан байна.' : 'Төхөөрөмжөөс хэрэглэгч ирээгүй байна.'}
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/60 bg-muted/40 text-left text-xs font-bold text-muted-foreground">
                                        <th className="px-4 py-2.5">Төхөөрөмж</th>
                                        <th className="px-4 py-2.5">PIN</th>
                                        <th className="px-4 py-2.5">Төхөөрөмж дээрх нэр</th>
                                        <th className="px-4 py-2.5 text-right">Бүртгэл</th>
                                        <th className="px-4 py-2.5">Ажилтан</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {shownUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-2 text-xs text-muted-foreground">{u.device_name}</td>
                                            <td className="px-4 py-2 font-mono text-xs font-bold">{u.pin}</td>
                                            <td className="px-4 py-2 text-xs">{u.name ?? '—'}</td>
                                            <td className="px-4 py-2 text-right text-xs tabular-nums">{u.punches_count}</td>
                                            <td className="px-4 py-2">
                                                <select value={u.employee_id ?? ''} onChange={e => mapUser(u, e.target.value)}
                                                    className={`h-8 w-full min-w-[200px] rounded-lg border px-2 text-xs ${u.employee_id ? 'border-border/70 bg-background' : 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30'}`}>
                                                    <option value="">— Тааруулаагүй —</option>
                                                    <EmployeeOptions employees={employees} branchId={u.device_branch_id} />
                                                </select>
                                                {!u.employee_id && u.suggestion && (
                                                    <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                                                        <Sparkles className="size-3 shrink-0 text-emerald-600" />
                                                        <span className="truncate text-muted-foreground">Санал: <b className="text-foreground">{u.suggestion.employee_name}</b></span>
                                                        <button type="button" onClick={() => mapUser(u, u.suggestion!.employee_id)}
                                                            className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                            Батлах
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </HrListCard>
            </div>

            <input ref={fileRef} type="file" accept=".dat,.txt,.csv" className="hidden" onChange={e => uploadUsb(e.target.files?.[0])} />

            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h3 className="font-bold text-foreground">{editing === 'new' ? 'Төхөөрөмж нэмэх' : 'Төхөөрөмж засах'}</h3>
                            <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
                        </div>
                        <form onSubmit={submit} className="space-y-4 p-6">
                            <Field label="Холболтын төрөл">
                                <div className="grid grid-cols-2 gap-2">
                                    {(['pull', 'push'] as ConnectionType[]).map(t => (
                                        <button key={t} type="button" onClick={() => form.setData('connection_type', t)}
                                            className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${form.data.connection_type === t ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-500/30 dark:bg-sky-950/30' : 'border-border hover:bg-muted'}`}>
                                            <span className="block font-bold text-foreground">{TYPE_LABEL[t]}</span>
                                            <span className="text-muted-foreground">{t === 'pull' ? 'Агент 4370 портоор уншина' : 'Төхөөрөмж өөрөө серверт илгээнэ'}</span>
                                        </button>
                                    ))}
                                </div>
                            </Field>
                            <Field label="Нэр *" error={form.errors.name}>
                                <input className={inputCls} value={form.data.name} onChange={e => form.setData('name', e.target.value)} placeholder="Жишээ: Сансар — үүдний төхөөрөмж" />
                            </Field>
                            <Field label="Салбар" error={form.errors.branch_id}>
                                <select className={inputCls} value={form.data.branch_id} onChange={e => form.setData('branch_id', e.target.value ? Number(e.target.value) : '')}>
                                    <option value="">— Сонгоогүй —</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label={form.data.connection_type === 'push' ? 'Serial дугаар *' : 'Serial дугаар'} error={form.errors.serial_number}
                                    hint={form.data.connection_type === 'pull' ? 'Хоосон бол агент анх холбогдоход бөглөнө' : 'System Info цэснээс'}>
                                    <input className={`${inputCls} font-mono`} value={form.data.serial_number} onChange={e => form.setData('serial_number', e.target.value)} />
                                </Field>
                                <Field label="Загвар" error={form.errors.model}>
                                    <input className={inputCls} value={form.data.model} onChange={e => form.setData('model', e.target.value)} placeholder="JDF200, TX628…" />
                                </Field>
                            </div>
                            {form.data.connection_type === 'pull' && (
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-3 sm:col-span-1">
                                        <Field label="IP хаяг *" error={form.errors.ip_address}>
                                            <input className={`${inputCls} font-mono`} value={form.data.ip_address} onChange={e => form.setData('ip_address', e.target.value)} placeholder="192.168.1.201" />
                                        </Field>
                                    </div>
                                    <Field label="Порт" error={form.errors.port}>
                                        <input className={`${inputCls} font-mono`} value={form.data.port} onChange={e => form.setData('port', e.target.value)} />
                                    </Field>
                                    <Field label="Comm key" error={form.errors.comm_key}>
                                        <input className={`${inputCls} font-mono`} value={form.data.comm_key} onChange={e => form.setData('comm_key', e.target.value)} />
                                    </Field>
                                </div>
                            )}
                            {form.data.connection_type === 'push' && (
                                <div className="rounded-xl border border-dashed border-sky-300 bg-sky-50/60 p-3 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/20 dark:text-sky-200">
                                    Төхөөрөмж дээр: <b>Comm. → Cloud Server Setting</b> → Server mode: <b>ADMS</b>,
                                    Server Address: <code className="font-mono font-bold">{server.push_host}</code>, Server Port: <code className="font-mono font-bold">{server.push_port}</code>.
                                    HTTPS биш, HTTP-ээр холбогдоно.
                                </div>
                            )}
                            <Field label="Тэмдэглэл" error={form.errors.notes}>
                                <textarea className={inputCls} rows={2} value={form.data.notes} onChange={e => form.setData('notes', e.target.value)} />
                            </Field>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input type="checkbox" checked={form.data.is_active} onChange={e => form.setData('is_active', e.target.checked)} className="size-4 accent-sky-600" />
                                Идэвхтэй — бүртгэлийг хүлээн авна
                            </label>
                            <div className="flex gap-2 pt-1">
                                <button type="submit" disabled={form.processing}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60">
                                    <Check className="size-4" /> Хадгалах
                                </button>
                                <button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">Болих</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl">
                        <h3 className="mb-2 font-bold text-foreground">«{deleting.name}» устгах</h3>
                        <p className="mb-5 text-sm text-muted-foreground">
                            Бүртгэл ирж байсан төхөөрөмжийг устгах боломжгүй — ирцийн түүх хадгалагдах ёстой. Тийм бол засах цонхноос идэвхгүй болгоно уу.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => router.delete(`/hr/attendance/devices/${deleting.id}`, { preserveScroll: true, onFinish: () => setDeleting(null) })}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700">
                                <Trash2 className="size-4" /> Устгах
                            </button>
                            <button onClick={() => setDeleting(null)} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">Болих</button>
                        </div>
                    </div>
                </div>
            )}

            {importFor && (
                <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-4 py-2 text-xs font-medium text-background shadow-lg">
                    <Upload className="mr-1.5 inline size-3.5" /> «{importFor.name}»-д файл оруулж байна…
                </div>
            )}

            <style>{HR_PANEL_FX}</style>
            <ToastContainer />
        </AppLayout>
    );
}

/** Төхөөрөмжийн салбарын ажилтнуудыг эхэнд — 4 салбарын бүх ажилтнаас хайхгүй. */
function EmployeeOptions({ employees, branchId }: { employees: (Option & { branch_ids: number[] })[]; branchId: number | null }) {
    if (!branchId) return <>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</>;
    // Тухайн салбарт үндсэн эсвэл нэмэлтээр ажилладаг хүмүүс эхэнд
    const own = employees.filter(e => e.branch_ids.includes(branchId));
    const others = employees.filter(e => !e.branch_ids.includes(branchId));
    return (
        <>
            <optgroup label="Энэ салбарын">{own.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>
            <optgroup label="Бусад салбар">{others.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>
        </>
    );
}

function MethodCard({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
    return (
        <div className="rounded-xl border border-border/70 bg-background/70 p-3 shadow-sm backdrop-blur">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-foreground"><Icon className="size-3.5 text-sky-600" />{title}</p>
            <p className="text-[11px] leading-snug text-muted-foreground">{text}</p>
        </div>
    );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" title={title} onClick={onClick}
            className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            {children}
        </button>
    );
}

function Info({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
    return (
        <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className={`truncate font-medium text-foreground ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</dd>
        </div>
    );
}
