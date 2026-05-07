import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BriefcaseBusiness, CalendarClock, CheckCheck, CheckCircle2, DollarSign } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import axios from 'axios';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface NotifData {
    branch_name?: string;
    date?: string;
    receptionist_name?: string;
    sheet_id?: number;
    entry_count?: number;
    total_amount?: number;
    patient_name?: string;
    amount?: number;
    // NewAppointment
    appointment_number?: string;
    patient_phone?: string;
    appointment_type?: string;
    appointment_date?: string;
    appointment_time?: string;
    doctor_name?: string;
    // NewJobApplication
    applicant_name?: string;
    phone?: string;
    email?: string;
    position?: string;
    submitted_at?: string;
}

interface NotifItem {
    id: string;
    notif_type: string;
    data: NotifData;
    read_at: string | null;
    created_at: string;
}

interface NotificationsShared {
    unread_count: number;
    items: NotifItem[];
}

type Tab = 'all' | 'apt' | 'billing' | 'job';

const TAB_LABELS: Record<Tab, string> = {
    all:     'Бүгд',
    apt:     'Цаг',
    billing: 'Тооцоо',
    job:     'Анкет',
};

const isApt     = (n: NotifItem) => n.notif_type === 'NewAppointment';
const isBilling = (n: NotifItem) => n.notif_type === 'DailySheetConfirmed' || n.notif_type === 'OutstandingPaid';
const isJob     = (n: NotifItem) => n.notif_type === 'NewJobApplication';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export function NotificationBell() {
    const page = usePage<{
        notifications?: NotificationsShared;
        auth: { user: { id: number } | null };
    }>();

    const initial = page.props.notifications;
    const userId  = page.props.auth?.user?.id;

    const [items, setItems]             = useState<NotifItem[]>(initial?.items ?? []);
    const [unreadCount, setUnreadCount] = useState(initial?.unread_count ?? 0);
    const [open, setOpen]               = useState(false);
    const [tab, setTab]                 = useState<Tab>('all');
    const ref = useRef<HTMLDivElement>(null);

    /* ---- Polling (mount + 10s) ---- */
    const poll = useCallback(async () => {
        try {
            const res = await axios.get<NotificationsShared>('/notifications');
            setItems(res.data.items);
            setUnreadCount(res.data.unread_count);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        if (!userId) return;
        poll();
        const timer = setInterval(poll, 10_000);
        return () => clearInterval(timer);
    }, [userId, poll]);

    /* ---- Click outside to close ---- */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ---- Tab filtering ---- */
    const filteredItems = useMemo(() => {
        switch (tab) {
            case 'apt':     return items.filter(isApt);
            case 'billing': return items.filter(isBilling);
            case 'job':     return items.filter(isJob);
            default:        return items;
        }
    }, [items, tab]);

    /* Unread counts per tab */
    const unreadAll     = items.filter(n => !n.read_at).length;
    const unreadApt     = items.filter(n => isApt(n)     && !n.read_at).length;
    const unreadBilling = items.filter(n => isBilling(n) && !n.read_at).length;
    const unreadJob     = items.filter(n => isJob(n)     && !n.read_at).length;
    const tabUnread: Record<Tab, number> = { all: unreadAll, apt: unreadApt, billing: unreadBilling, job: unreadJob };

    /* ---- Actions ---- */
    const markRead = async (id: string) => {
        try {
            await axios.patch(`/notifications/${id}/read`);
            setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { /* silent */ }
    };

    const markAllRead = async () => {
        try {
            await axios.post('/notifications/read-all');
            setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
            setUnreadCount(0);
        } catch { /* silent */ }
    };

    if (!initial) return null;

    /* ---- Render ---- */
    return (
        <div ref={ref} className="relative">
            {/* Bell button */}
            <button
                onClick={() => setOpen(o => !o)}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Мэдэгдэл">
                <Bell className="size-5 text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-50 overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            Мэдэгдэл
                            {unreadCount > 0 && (
                                <span className="ml-1.5 text-xs font-normal text-gray-400">({unreadCount} уншаагүй)</span>
                            )}
                        </span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                <CheckCheck className="size-3" />
                                Бүгдийг уншсан
                            </button>
                        )}
                    </div>

                    {/* Tab bar */}
                    <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-2 text-[11px] font-medium transition-colors relative ${
                                    tab === t
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}>
                                {TAB_LABELS[t]}
                                {tabUnread[t] > 0 && (
                                    <span className="ml-1 inline-flex items-center justify-center min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5">
                                        {tabUnread[t]}
                                    </span>
                                )}
                                {tab === t && (
                                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-blue-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                        {filteredItems.length === 0 ? (
                            <div className="py-10 text-center">
                                <Bell className="size-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Мэдэгдэл байхгүй</p>
                            </div>
                        ) : (
                            filteredItems.map(n => (
                                <button
                                    key={n.id}
                                    onClick={() => { if (!n.read_at) markRead(n.id); }}
                                    className={`w-full text-left px-4 py-3 flex gap-3 items-start transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                        !n.read_at ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                                    }`}>

                                    {/* Icon */}
                                    <div className={`mt-0.5 shrink-0 rounded-full p-1.5 ${
                                        n.notif_type === 'DailySheetConfirmed' ? 'bg-green-100 dark:bg-green-900/40'
                                        : n.notif_type === 'OutstandingPaid'   ? 'bg-yellow-100 dark:bg-yellow-900/40'
                                        : n.notif_type === 'NewJobApplication' ? 'bg-purple-100 dark:bg-purple-900/40'
                                        : 'bg-blue-100 dark:bg-blue-900/40'
                                    }`}>
                                        {n.notif_type === 'DailySheetConfirmed'
                                            ? <CheckCircle2      className="size-3.5 text-green-600 dark:text-green-400" />
                                            : n.notif_type === 'OutstandingPaid'
                                            ? <DollarSign        className="size-3.5 text-yellow-600 dark:text-yellow-400" />
                                            : n.notif_type === 'NewJobApplication'
                                            ? <BriefcaseBusiness className="size-3.5 text-purple-600 dark:text-purple-400" />
                                            : <CalendarClock     className="size-3.5 text-blue-600 dark:text-blue-400" />
                                        }
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {n.notif_type === 'DailySheetConfirmed' ? (
                                            <>
                                                <p className="text-xs font-medium text-gray-800 dark:text-gray-100 leading-snug">
                                                    {n.data.branch_name} — өдрийн тооцоо баталгаажлаа
                                                </p>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    {n.data.receptionist_name} · {n.data.entry_count} бүртгэл · {n.data.total_amount?.toLocaleString()}₮
                                                </p>
                                            </>
                                        ) : n.notif_type === 'OutstandingPaid' ? (
                                            <>
                                                <p className="text-xs font-medium text-gray-800 dark:text-gray-100 leading-snug">
                                                    Дутуу тооцоо төлөгдлөө — {n.data.patient_name}
                                                </p>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    {n.data.receptionist_name} · {n.data.branch_name} · {n.data.amount?.toLocaleString()}₮
                                                </p>
                                            </>
                                        ) : n.notif_type === 'NewJobApplication' ? (
                                            <>
                                                <p className="text-xs font-medium text-gray-800 dark:text-gray-100 leading-snug">
                                                    Шинэ ажлын анкет — {n.data.applicant_name}
                                                </p>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    {n.data.phone}
                                                    {n.data.position ? ` · ${n.data.position}` : ''}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-xs font-medium text-gray-800 dark:text-gray-100 leading-snug">
                                                    Шинэ цаг захиалга — {n.data.patient_name}
                                                    {n.data.appointment_type === 'online' ? ' (онлайн)' : ' (биечлэн)'}
                                                </p>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    {n.data.appointment_number}
                                                    {n.data.doctor_name  ? ` · ${n.data.doctor_name}`  : ''}
                                                    {n.data.branch_name  ? ` · ${n.data.branch_name}`  : ''}
                                                    {n.data.appointment_date ? ` · ${n.data.appointment_date}` : ''}
                                                    {n.data.appointment_time ? ` ${n.data.appointment_time}` : ''}
                                                </p>
                                            </>
                                        )}
                                        <p className="text-[10px] text-gray-400 mt-0.5">{n.created_at}</p>
                                    </div>

                                    {/* Unread dot */}
                                    {!n.read_at && (
                                        <div className="mt-1.5 size-2 rounded-full bg-blue-500 shrink-0" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
