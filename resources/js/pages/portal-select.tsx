import { Head, router } from '@inertiajs/react';
import { Briefcase, LogOut, Stethoscope, User } from 'lucide-react';

interface Props {
    name: string;
    position: string;
    portal: string;
}

const PORTAL_LABEL: Record<string, string> = {
    doctor:    'Эмч',
    reception: 'Ресепшн',
    hr:        'HR',
    admin:     'Админ',
    staff:     'Ажилтан',
};

export default function PortalSelect({ name, position, portal }: Props) {
    function logout() {
        router.post('/logout');
    }

    return (
        <>
            <Head title="Портал сонгох" />

            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">

                {/* Logout */}
                <div className="absolute top-5 right-5">
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <LogOut className="size-4" />
                        Гарах
                    </button>
                </div>

                {/* Avatar + name */}
                <div className="mb-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <User className="size-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">{name}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {position || PORTAL_LABEL[portal] || portal}
                    </p>
                </div>

                {/* Portal cards */}
                <div className="grid w-full max-w-lg grid-cols-2 gap-5">

                    {/* Ажлын хэсэг */}
                    <a
                        href="/portal/work"
                        className="group flex flex-col items-center gap-4 rounded-2xl border bg-card p-8 shadow-sm transition-all hover:border-red-400 hover:shadow-md"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-colors group-hover:bg-red-100">
                            <Briefcase className="size-7" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-foreground">Ажлын хэсэг</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {portal === 'doctor'    && 'Эмчийн портал'}
                                {portal === 'reception' && 'Ресепшний портал'}
                                {portal === 'hr'        && 'HR удирдлага'}
                                {portal === 'admin'     && 'Админ панел'}
                                {portal === 'staff'     && 'Ажлын хэсэг'}
                            </p>
                        </div>
                    </a>

                    {/* HR хэсэг */}
                    <a
                        href="/portal/hr"
                        className="group flex flex-col items-center gap-4 rounded-2xl border bg-card p-8 shadow-sm transition-all hover:border-blue-400 hover:shadow-md"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                            <Stethoscope className="size-7" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-foreground">HR хэсэг</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Хувийн мэдээлэл харах
                            </p>
                        </div>
                    </a>
                </div>

                <p className="mt-8 text-xs text-muted-foreground/60">
                    Dental Management System
                </p>
            </div>
        </>
    );
}
