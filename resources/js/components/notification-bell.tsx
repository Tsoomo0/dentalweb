import { useEffect, useRef, useState } from 'react';
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
    const ref = useRef<HTMLDivElement>(null);

    /* ---- Real-time Echo listener ---- */
    useEffect(() => {
        if (!userId || typeof window === 'undefined' || !window.Echo) return;

        const channel = window.Echo.private(`App.Models.User.${userId}`);

        channel.notification((payload: Record<string, unknown>) => {
            const notif_type = String(payload.type ?? '').split('\\').pop() ?? '';
            const fresh: NotifItem = {
                id:         String(payload.id ?? ''),
                notif_type,
                data: {
                    branch_name:       payload.branch_name as string,
                    date:              payload.date as string,
                    receptionist_name: payload.receptionist_name as string,
                    sheet_id:          payload.sheet_id as number,
                    entry_count:       payload.entry_count as number,
                    total_amount:      payload.total_amount as number,
                    patient_name:      payload.patient_name as string,
                    amount:            payload.amount as number,
                    applicant_name:    payload.applicant_name as string,
                    phone:             payload.phone as string,
                    email:             payload.email as string,
                    position:          payload.position as string,
                    submitted_at:      payload.submitted_at as string,
                },
                read_at:    null,
                created_at: 'дөнгөж сая',
            };
            setItems(prev => [fresh, ...prev].slice(0, 15));
            setUnreadCount(prev => prev + 1);
        });

        return () => {
            window.Echo.leave(`App.Models.User.${userId}`);
        };
    }, [userId]);

    /* ---- Polling fallback (30s) ---- */
    useEffect(() => {
        if (!userId) return;

        const poll = async () => {
            try {
                const res = await axios.get<NotificationsShared>('/notifications');
                setItems(res.data.items);
                setUnreadCount(res.data.unread_count);
            } catch { /* silent */ }
        };

        const timer = setInterval(poll, 10_000);
        return () => clearInterval(timer);
    }, [userId]);

    /* ---- Click outside to close ---- */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ---- Actions ---- */
    const markRead = async (id: string) => {
        try {
            await axios.patch(`/notifications/${id}/read`);
            setItems(prev =>
                prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
            );
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

                    {/* List */}
                    <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                        {items.length === 0 ? (
                            <div className="py-12 text-center">
                                <Bell className="size-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Мэдэгдэл байхгүй байна</p>
                            </div>
                        ) : (
                            items.map(n => (
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
