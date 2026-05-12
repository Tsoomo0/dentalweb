import AppLayout from '@/layouts/app-layout';
import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, LogOut, Search } from 'lucide-react';
import { useState } from 'react';

interface Employee { id: number; name: string; position: string | null; branch: string | null; }
interface PageProps {
    employees: Employee[];
    selected_employee: number | null;
    [key: string]: unknown;
}

const EXIT_TYPES = [
    { value: 'resignation',  label: 'Өөрийн хүсэлтээр',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',         border: 'border-blue-400' },
    { value: 'termination',  label: 'Халагдсан',            color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',             border: 'border-red-400' },
    { value: 'contract_end', label: 'Гэрээ дуусгавар',      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', border: 'border-orange-400' },
    { value: 'retirement',   label: 'Тэтгэвэр',             color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', border: 'border-emerald-400' },
    { value: 'death',        label: 'Нас барсан',           color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',            border: 'border-gray-400' },
    { value: 'other',        label: 'Бусад',                color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', border: 'border-violet-400' },
];

export default function ExitChecklistCreate() {
    const { employees, selected_employee } = usePage<PageProps>().props;
    const [empSearch, setEmpSearch] = useState('');

    const { data, setData, post, processing, errors } = useForm({
        employee_id:      selected_employee ?? ('' as number | ''),
        exit_date:        '',
        exit_type:        'resignation',
        reason:           '',
        notice_date:      '',
        replacement_plan: '',
    });

    const filteredEmps = empSearch
        ? employees.filter(e => e.name.toLowerCase().includes(empSearch.toLowerCase()))
        : employees;

    const selectedEmp = employees.find(e => e.id === data.employee_id);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/hr/exit-checklists');
    }

    return (
        <AppLayout breadcrumbs={[
            { title: 'HR', href: '/hr/employees' },
            { title: 'Гарах бүртгэл', href: '/hr/exit-checklists' },
            { title: 'Шинэ бүртгэл', href: '/hr/exit-checklists/create' },
        ]}>
            <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

                <div className="flex items-center gap-3">
                    <Link href="/hr/exit-checklists"
                        className="rounded-xl border p-2 text-muted-foreground hover:bg-muted transition-colors">
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <LogOut className="size-5 text-red-500" /> Гарах бүртгэл үүсгэх
                        </h1>
                        <p className="text-xs text-muted-foreground">Ажилтны гарах үйл явцыг баримтжуулна</p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-5">

                    {/* Employee select */}
                    <div className="rounded-2xl border bg-card p-4 space-y-3">
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Ажилтан сонгох *</h2>
                        {selectedEmp ? (
                            <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 px-3 py-2.5">
                                <div className="size-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 font-black text-xs">
                                    {selectedEmp.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold">{selectedEmp.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{selectedEmp.position}{selectedEmp.branch ? ` · ${selectedEmp.branch}` : ''}</p>
                                </div>
                                <button type="button" onClick={() => setData('employee_id', '')}
                                    className="text-xs text-muted-foreground hover:text-red-600 transition-colors">Солих</button>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                                    <input value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                                        placeholder="Ажилтны нэрээр хайх..."
                                        className="w-full rounded-xl border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1 -mx-1 px-1">
                                    {filteredEmps.length === 0
                                        ? <p className="text-xs text-muted-foreground py-4 text-center">Ажилтан олдсонгүй</p>
                                        : filteredEmps.map(e => (
                                            <button key={e.id} type="button" onClick={() => { setData('employee_id', e.id); setEmpSearch(''); }}
                                                className="w-full flex items-center gap-3 rounded-xl border bg-card hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/20 px-3 py-2 text-left transition-colors">
                                                <div className="size-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                                                    {e.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold truncate">{e.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{e.position}{e.branch ? ` · ${e.branch}` : ''}</p>
                                                </div>
                                            </button>
                                        ))
                                    }
                                </div>
                            </>
                        )}
                        {errors.employee_id && <p className="text-xs text-red-500">{errors.employee_id}</p>}
                    </div>

                    {/* Exit info */}
                    <div className="rounded-2xl border bg-card p-4 space-y-4">
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Гарах мэдээлэл</h2>

                        {/* Exit type */}
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Гарах шалтгаан *</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {EXIT_TYPES.map(t => (
                                    <button key={t.value} type="button" onClick={() => setData('exit_type', t.value)}
                                        className={`rounded-xl border-2 px-3 py-2 text-xs font-semibold text-left transition-all
                                            ${data.exit_type === t.value ? `${t.color} ${t.border}` : 'border-border text-muted-foreground hover:border-gray-400'}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dates row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Сүүлийн ажлын өдөр *</label>
                                <input type="date" value={data.exit_date} onChange={e => setData('exit_date', e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                {errors.exit_date && <p className="mt-1 text-xs text-red-500">{errors.exit_date}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Мэдэгдсэн огноо</label>
                                <input type="date" value={data.notice_date} onChange={e => setData('notice_date', e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Дэлгэрэнгүй шалтгаан <span className="opacity-60">(заавал биш)</span>
                            </label>
                            <textarea value={data.reason} onChange={e => setData('reason', e.target.value)}
                                rows={3} placeholder="Ажилтан яагаад гарсан талаар дэлгэрэнгүй..."
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>

                        {/* Replacement plan */}
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Орлох ажилтны төлөвлөгөө <span className="opacity-60">(заавал биш)</span>
                            </label>
                            <input value={data.replacement_plan} onChange={e => setData('replacement_plan', e.target.value)}
                                placeholder="Хэн орлох, хэзээ авах эсэх..."
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-2">
                        <button type="submit" disabled={processing || !data.employee_id || !data.exit_date}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                            {processing
                                ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                : <LogOut className="size-4" />}
                            Бүртгэл үүсгэх
                        </button>
                        <Link href="/hr/exit-checklists"
                            className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                            Цуцлах
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
