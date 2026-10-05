import { Head, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import {
    DOW_SHORT, MONTHS, dowIndex, fmtHours, inkOn, parseDS,
    type Board, type BoardShift, type Branch, type DoctorOption, type Template,
} from '@/components/schedule/types';

/** Ханан дээр наах A4 хэвтээ хуваарь. Нийтлээгүй ноорог "*" тэмдэгтэй хэвлэгдэнэ. */
interface Props {
    board: Board; view: 'week' | 'month'; branch_name: string;
    templates: Template[]; branches: Branch[]; doctors: DoctorOption[];
    [key: string]: unknown;
}

export default function SchedulePrint() {
    const { board, view, branch_name, templates, branches, doctors } = usePage<Props>().props;
    const tpl = new Map(templates.map(t => [t.id, t]));
    const branchAbbr = new Map(branches.map(b => [b.id, b.abbr]));
    const doctorName = new Map(doctors.map(d => [d.id, d.name]));
    const month = view === 'month';
    const days = board.period.days;
    const a = parseDS(board.period.start), b = parseDS(board.period.end);

    const byCell = new Map<string, BoardShift[]>();
    for (const s of board.shifts) {
        if (s.state === 'removed') continue;
        const k = `${s.employee_id}|${s.date}`;
        byCell.set(k, [...(byCell.get(k) ?? []), s]);
    }
    const leave = new Map(board.leaves.filter(l => l.status === 'approved').map(l => [`${l.employee_id}|${l.date}`, l]));

    let lastPosition: string | null | undefined;

    useEffect(() => { const t = setTimeout(() => window.print(), 400); return () => clearTimeout(t); }, []);

    return (
        <div className="min-h-screen bg-white p-4 text-black">
            <Head title="Хуваарь хэвлэх" />
            <style>{`@page { size: A4 landscape; margin: 8mm; } @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
            <div className="mb-2 flex items-end justify-between">
                <div>
                    <h1 className="text-lg font-black">Ажлын хуваарь — {branch_name}</h1>
                    <p className="text-xs text-gray-600">
                        {month ? `${a.getFullYear()} · ${MONTHS[a.getMonth()]}` : `${a.getFullYear()} · ${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}`}
                        {board.draft_count > 0 && ' · * нийтлэгдээгүй өөрчлөлт'}
                    </p>
                </div>
                <button type="button" onClick={() => window.print()} className="no-print rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Хэвлэх</button>
            </div>

            <table className="w-full border-collapse text-[10px]">
                <thead>
                    <tr>
                        <th className="border border-gray-400 bg-gray-100 px-1 py-1 text-left">Ажилтан</th>
                        {days.map(d => (
                            <th key={d} className={`border border-gray-400 px-0.5 py-1 ${dowIndex(d) >= 5 ? 'bg-orange-50' : 'bg-gray-100'}`}>
                                <div className="text-[8px] font-semibold text-gray-500">{DOW_SHORT[dowIndex(d)]}</div>
                                <div className="font-black">{parseDS(d).getDate()}</div>
                            </th>
                        ))}
                        <th className="border border-gray-400 bg-gray-100 px-1">Цаг</th>
                    </tr>
                </thead>
                <tbody>
                    {board.employees.map(e => {
                        const header = e.position !== lastPosition;
                        lastPosition = e.position;
                        return [
                            header && (
                                <tr key={`h-${e.id}`}>
                                    <td colSpan={days.length + 2} className="border border-gray-400 bg-gray-200 px-1 py-0.5 text-[10px] font-bold">{e.position ?? 'Албан тушаалгүй'}</td>
                                </tr>
                            ),
                            <tr key={e.id}>
                                <td className="whitespace-nowrap border border-gray-400 px-1 py-0.5 font-semibold">{e.short_name}</td>
                                {days.map(d => {
                                    const list = byCell.get(`${e.id}|${d}`) ?? [];
                                    const l = leave.get(`${e.id}|${d}`);
                                    return (
                                        <td key={d} className="border border-gray-400 px-0.5 py-0.5 text-center align-middle">
                                            {list.map(s => {
                                                const t = s.template_id ? tpl.get(s.template_id) : undefined;
                                                const color = t?.color ?? (s.kind === 'work' ? '#6366f1' : '#94a3b8');
                                                const other = s.branch_id && s.branch_id !== (board.branch_id ?? e.branch_id) ? branchAbbr.get(s.branch_id) : null;
                                                return (
                                                    <div key={s.id} className="leading-tight">
                                                        <span className="inline-block rounded px-0.5 font-black" style={{ background: color, color: inkOn(color) }}>{t?.code ?? '•'}</span>
                                                        {!month && s.start_time && <span className="ml-0.5 tabular-nums">{s.start_time}–{s.end_time}</span>}
                                                        {other && <span className="ml-0.5 font-bold">({other})</span>}
                                                        {s.state !== 'published' && '*'}
                                                        {!month && s.assigned_doctor_id && <div className="text-[8px] text-gray-600">↔ {doctorName.get(s.assigned_doctor_id)}</div>}
                                                    </div>
                                                );
                                            })}
                                            {list.length === 0 && l && <span className="text-[8px] font-bold text-violet-700">{month ? 'Ч' : l.label}</span>}
                                        </td>
                                    );
                                })}
                                <td className="border border-gray-400 px-1 text-center font-bold tabular-nums">{fmtHours(board.hours[e.id] ?? 0)}</td>
                            </tr>,
                        ];
                    })}
                </tbody>
            </table>

            <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-gray-700">
                {templates.filter(t => t.is_active).map(t => (
                    <span key={t.id} className="flex items-center gap-1">
                        <span className="rounded px-1 font-black" style={{ background: t.color, color: inkOn(t.color) }}>{t.code}</span>
                        {t.name}{t.start_time ? ` ${t.start_time}–${t.end_time}` : ''}
                    </span>
                ))}
            </div>
        </div>
    );
}
