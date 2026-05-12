import MyLayout from '@/layouts/my-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    BadgeCheck, BookOpen, Briefcase, Calendar, CreditCard,
    Edit2, GraduationCap, Heart,
    Mail, MapPin, Phone, PhoneCall, Plus, Save,
    Shield, Trash2, User, Users, X,
} from 'lucide-react';
import { useState } from 'react';

interface FamilyMember {
    id: number;
    last_name: string; first_name: string;
    relationship: string; phone: string | null;
    birth_date: string | null; employment_status: string | null;
}
interface Contract {
    id: number; contract_type: string; start_date: string | null; end_date: string | null;
}
interface License {
    id: number; name: string; issuer: string | null; start_date: string | null; end_date: string | null;
}
interface Employee {
    id: number;
    employee_number: string; photo_url: string | null; full_name: string;
    last_name: string; first_name: string; family_name: string | null;
    register_number: string | null;
    birth_date: string | null; gender: string | null;
    ethnicity: string | null; birth_place: string | null;
    blood_type: string | null; driver_license: string | null; military_service: boolean;
    education_degree: string | null; education_school: string | null; education_major: string | null;
    phone: string | null; email: string | null; address: string | null;
    emergency_name: string | null; emergency_phone: string | null; emergency_relation: string | null;
    position: string | null; branch: string | null; status: string;
    hired_date: string | null; probation_end_date: string | null;
    is_married: boolean; has_children: boolean; children_count: number;
    bank_name: string | null; bank_account: string | null; bank_account_name: string | null;
    contracts: Contract[]; licenses: License[]; family_members: FamilyMember[];
}
interface Props { employee: Employee }

const CONTRACT_TYPE: Record<string, string> = {
    fixed: 'Тогтмол', part_time: 'Цагийн', probation: 'Туршилт', indefinite: 'Хугацаагүй',
};
const RELATIONSHIPS = ['Эхнэр/Нөхөр', 'Хүүхэд', 'Эцэг', 'Эх', 'Ах', 'Дүү', 'Эгч', 'Өвөө', 'Эмээ', 'Бусад'];

function calcWorkedDuration(hiredDate: string | null): string {
    if (!hiredDate) return '—';
    const hired = new Date(hiredDate);
    const now = new Date();
    let years = now.getFullYear() - hired.getFullYear();
    let months = now.getMonth() - hired.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years > 0 && months > 0) return `${years} жил ${months} сар`;
    if (years > 0) return `${years} жил`;
    if (months > 0) return `${months} сар`;
    return '< 1 сар';
}

/* ── Mobile row ── */
function MRow({ label, value }: { label: string; value?: string | null | boolean }) {
    if (value === null || value === undefined || value === '') return null;
    const display = typeof value === 'boolean' ? (value ? 'Тийм' : 'Үгүй') : value;
    return (
        <div className="my-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px' }}>
            <span style={{ fontSize: 15, color: 'var(--my-muted)', flexShrink: 0, marginRight: 12 }}>{label}</span>
            <span style={{ fontSize: 15, color: 'var(--my-text)', textAlign: 'right', wordBreak: 'break-word', minWidth: 0 }}>{display}</span>
        </div>
    );
}

/* ── Mobile section group ── */
function MGroup({ icon: Icon, color, bg, label, children }: {
    icon: React.ElementType; color: string; bg: string; label: string; children: React.ReactNode;
}) {
    const rows = (Array.isArray(children) ? children : [children]).filter(Boolean);
    if (rows.length === 0) return null;
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingLeft: 2 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon style={{ width: 18, height: 18, color }} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--my-text)', letterSpacing: '-0.2px' }}>{label}</span>
            </div>
            <div style={{ background: 'var(--my-card-bg)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--my-shadow)', border: '1px solid var(--my-card-border)' }}>
                {children}
            </div>
        </div>
    );
}

/* ── Desktop row ── */
function DRow({ label, value }: { label: string; value?: string | null | boolean }) {
    if (value === null || value === undefined || value === '') return null;
    const display = typeof value === 'boolean' ? (value ? 'Тийм' : 'Үгүй') : value;
    return (
        <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/40 last:border-0">
            <span className="text-xs text-muted-foreground shrink-0 w-36">{label}</span>
            <span className="text-sm font-medium text-foreground text-right break-words min-w-0">{display}</span>
        </div>
    );
}

/* ── Desktop section (card with header inside) ── */
function DSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
    const rows = (Array.isArray(children) ? children : [children]).filter(Boolean);
    if (rows.length === 0) return null;
    return (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
            </div>
            <div className="px-5 py-4">{children}</div>
        </div>
    );
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хувийн мэдээлэл', href: '/my/profile' },
];

export default function MyProfile({ employee }: Props) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showAdd,   setShowAdd]   = useState(false);
    const [imgError,  setImgError]  = useState(false);

    const editForm = useForm({ last_name: '', first_name: '', relationship: '', phone: '', birth_date: '', employment_status: '' });
    const addForm  = useForm({ last_name: '', first_name: '', relationship: '', phone: '', birth_date: '', employment_status: '' });

    function startEdit(m: FamilyMember) {
        setEditingId(m.id);
        editForm.setData({
            last_name: m.last_name, first_name: m.first_name,
            relationship: m.relationship, phone: m.phone ?? '',
            birth_date: m.birth_date ?? '', employment_status: m.employment_status ?? '',
        });
    }

    function saveEdit(id: number) {
        editForm.put(`/my/family-members/${id}`, { onSuccess: () => setEditingId(null) });
    }

    function deleteMember(id: number) {
        if (!confirm('Устгах уу?')) return;
        router.delete(`/my/family-members/${id}`);
    }

    function addMember() {
        addForm.post('/my/family-members', {
            onSuccess: () => { setShowAdd(false); addForm.reset(); },
        });
    }

    const isActive  = employee.status === 'active';
    const showPhoto = employee.photo_url && !imgError;
    const initials  = employee.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';
    const statusCls = isActive
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-muted text-muted-foreground';

    const workedDuration = calcWorkedDuration(employee.hired_date);

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title="Хувийн мэдээлэл" />

            {/* ════════════════ MOBILE ════════════════ */}
            <div className="md:hidden" style={{ background: 'var(--my-page-bg)', height: '100%', overflowY: 'auto', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' }}>

                {/* Red hero */}
                <div style={{ background: 'linear-gradient(160deg, #ef4444 0%, #dc2626 30%, #b91c1c 65%, #7f1d1d 100%)', paddingBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '52px 20px 0' }}>
                        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 6 }}>HR · ПРОФАЙЛ</p>
                            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.5px', margin: 0 }}>
                                Хувийн <em style={{ fontStyle: 'italic', fontWeight: 900 }}>мэдээлэл</em>
                            </h1>
                        </div>
                        {showPhoto ? (
                            <img src={employee.photo_url!} alt={employee.full_name} onError={() => setImgError(true)}
                                style={{ width: 72, height: 72, borderRadius: 18, objectFit: 'cover', objectPosition: 'top', border: '3px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
                        ) : (
                            <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '3px solid rgba(255,255,255,0.15)' }}>
                                <span style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{initials}</span>
                            </div>
                        )}
                    </div>
                    <div style={{ padding: '14px 20px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#4ade80' : 'rgba(255,255,255,0.5)', background: isActive ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '2px 10px', letterSpacing: '0.05em' }}>
                                {isActive ? 'ИДЭВХТЭЙ' : 'ИДЭВХГҮЙ'}
                            </span>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{employee.employee_number}</span>
                        </div>
                        <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.3px', margin: 0 }}>{employee.full_name}</p>
                        {employee.position && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2, marginBottom: 0 }}>{employee.position}</p>}
                    </div>
                    {/* Glassmorphism stats */}
                    <div style={{ margin: '20px 16px 0', borderRadius: 18, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', padding: '14px 16px', display: 'flex', alignItems: 'stretch' }}>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 4 }}>АЖИЛЛАСАН</p>
                            <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: 0 }}>{workedDuration}</p>
                        </div>
                        <div style={{ width: 1, background: 'rgba(255,255,255,0.12)', margin: '0 12px' }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 4 }}>ХЭЛТЭС</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2, margin: 0 }}>{employee.branch ?? '—'}</p>
                        </div>
                        <div style={{ width: 1, background: 'rgba(255,255,255,0.12)', margin: '0 12px' }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 4 }}>ТУШААЛ</p>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.2, margin: 0 }}>{employee.position ?? '—'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-7 px-4 pb-10 pt-6">

                    {/* ── Овог нэр ── */}
                    <MGroup icon={User} color="#6366f1" bg="#eef2ff" label="Нэр">
                        <MRow label="Овог"           value={employee.last_name} />
                        <MRow label="Нэр"            value={employee.first_name} />
                        <MRow label="Эцэг/эхийн нэр" value={employee.family_name} />
                    </MGroup>

                    {/* ── Хувийн мэдээлэл ── */}
                    <MGroup icon={BadgeCheck} color="#7c3aed" bg="#f5f3ff" label="Хувийн мэдээлэл">
                        <MRow label="Регистр"         value={employee.register_number} />
                        <MRow label="Төрсөн огноо"    value={employee.birth_date} />
                        <MRow label="Хүйс"            value={employee.gender === 'male' ? 'Эрэгтэй' : employee.gender === 'female' ? 'Эмэгтэй' : null} />
                        <MRow label="Яс үндэс"        value={employee.ethnicity} />
                        <MRow label="Төрсөн газар"    value={employee.birth_place} />
                        <MRow label="Цусны бүлэг"     value={employee.blood_type} />
                        <MRow label="Жолооны үнэмлэх" value={employee.driver_license} />
                        <MRow label="Цэргийн алба"    value={employee.military_service} />
                    </MGroup>

                    {/* ── Холбоо барих ── */}
                    <MGroup icon={Phone} color="#059669" bg="#ecfdf5" label="Холбоо барих">
                        <MRow label="Имэйл" value={employee.email} />
                        <MRow label="Утас"  value={employee.phone} />
                        <MRow label="Хаяг"  value={employee.address} />
                    </MGroup>

                    {/* ── Ажлын мэдээлэл ── */}
                    <MGroup icon={Briefcase} color="#2563eb" bg="#eff6ff" label="Ажлын мэдээлэл">
                        <MRow label="Ажилтны дугаар"    value={employee.employee_number} />
                        <MRow label="Тушаал"             value={employee.position} />
                        <MRow label="Хэлтэс"             value={employee.branch} />
                        <MRow label="Ажилд орсон огноо" value={employee.hired_date} />
                        <MRow label="Туршилтын хугацаа" value={employee.probation_end_date} />
                        <MRow label="Статус"             value={isActive ? 'Идэвхтэй' : 'Идэвхгүй'} />
                    </MGroup>

                    {/* ── Боловсрол ── */}
                    <MGroup icon={GraduationCap} color="#7c3aed" bg="#faf5ff" label="Боловсрол">
                        <MRow label="Зэрэг"    value={employee.education_degree} />
                        <MRow label="Сургууль" value={employee.education_school} />
                        <MRow label="Мэргэжил" value={employee.education_major} />
                    </MGroup>

                    {/* ── Гэр бүлийн байдал ── */}
                    <MGroup icon={Heart} color="#e11d48" bg="#fff1f2" label="Гэр бүлийн байдал">
                        <MRow label="Гэрлэсэн эсэх"  value={employee.is_married} />
                        <MRow label="Хүүхэдтэй эсэх" value={employee.has_children} />
                        {employee.has_children && <MRow label="Хүүхдийн тоо" value={String(employee.children_count)} />}
                    </MGroup>

                    {/* ── Яаралтай холбоо ── */}
                    {(employee.emergency_name || employee.emergency_phone) && (
                        <MGroup icon={PhoneCall} color="#ea580c" bg="#fff7ed" label="Яаралтай холбоо">
                            <MRow label="Нэр"      value={employee.emergency_name} />
                            <MRow label="Утас"     value={employee.emergency_phone} />
                            <MRow label="Хамаарал" value={employee.emergency_relation} />
                        </MGroup>
                    )}

                    {/* ── Банкны мэдээлэл ── */}
                    {(employee.bank_name || employee.bank_account) && (
                        <MGroup icon={CreditCard} color="#059669" bg="#ecfdf5" label="Санхүүгийн мэдээлэл">
                            <MRow label="Банк"          value={employee.bank_name} />
                            <MRow label="Дансны дугаар" value={employee.bank_account} />
                            <MRow label="Дансны эзэн"   value={employee.bank_account_name} />
                        </MGroup>
                    )}

                    {/* ── Section 7: Family members ── */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Users style={{ width: 18, height: 18, color: '#dc2626' }} />
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--my-text)', letterSpacing: '-0.2px' }}>Гэр бүлийн гишүүд</span>
                            </div>
                            <button onClick={() => setShowAdd(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#dc2626', border: 'none', borderRadius: 20, padding: '6px 12px', cursor: 'pointer' }}>
                                <Plus style={{ width: 12, height: 12, color: '#fff' }} />
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Нэмэх</span>
                            </button>
                        </div>
                        <div style={{ background: 'var(--my-card-bg)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--my-shadow)', border: '1px solid var(--my-card-border)' }}>
                            {showAdd && (
                                <div style={{ padding: 16, background: 'rgba(220,38,38,0.06)', borderBottom: '1px solid var(--my-divider)' }}>
                                    <p style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: 'var(--my-text)' }}>Шинэ гишүүн нэмэх</p>
                                    <MemberForm
                                        data={addForm.data}
                                        setData={(k, v) => addForm.setData(k as any, v)}
                                        errors={addForm.errors}
                                        processing={addForm.processing}
                                        onSave={addMember}
                                        onCancel={() => { setShowAdd(false); addForm.reset(); }}
                                    />
                                </div>
                            )}
                            {employee.family_members.length === 0 && !showAdd && (
                                <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 14, color: 'var(--my-faint)' }}>
                                    Гэр бүлийн гишүүн бүртгэгдээгүй байна
                                </div>
                            )}
                            {employee.family_members.map((m, i) => (
                                <div key={m.id} style={{ padding: '12px 16px', borderTop: i === 0 && !showAdd ? 'none' : '1px solid var(--my-divider)' }}>
                                    {editingId === m.id ? (
                                        <MemberForm
                                            data={editForm.data}
                                            setData={(k, v) => editForm.setData(k as any, v)}
                                            errors={editForm.errors}
                                            processing={editForm.processing}
                                            onSave={() => saveEdit(m.id)}
                                            onCancel={() => setEditingId(null)}
                                        />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700, color: '#dc2626' }}>
                                                {m.first_name?.[0]?.toUpperCase() ?? '?'}
                                            </div>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--my-text)', margin: 0 }}>
                                                    {m.last_name} {m.first_name}
                                                    <span style={{ marginLeft: 6, borderRadius: 20, background: 'var(--my-pill-bg)', padding: '2px 8px', fontSize: 11, fontWeight: 400, color: 'var(--my-muted)' }}>{m.relationship}</span>
                                                </p>
                                                <div style={{ marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--my-faint)' }}>
                                                    {m.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Phone style={{ width: 11, height: 11 }} />{m.phone}</span>}
                                                    {m.birth_date && <span><Calendar style={{ display: 'inline', width: 11, height: 11, marginRight: 2 }} />{m.birth_date}</span>}
                                                    {m.employment_status && <span>{m.employment_status}</span>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                                <button onClick={() => startEdit(m)} style={{ borderRadius: 10, padding: 8, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                    <Edit2 style={{ width: 16, height: 16 }} />
                                                </button>
                                                <button onClick={() => deleteMember(m.id)} style={{ borderRadius: 10, padding: 8, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                    <Trash2 style={{ width: 16, height: 16 }} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Contracts ── */}
                    {employee.contracts.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingLeft: 2 }}>
                                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Calendar style={{ width: 18, height: 18, color: '#dc2626' }} />
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--my-text)', letterSpacing: '-0.2px' }}>Гэрээ</span>
                            </div>
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--my-shadow)', border: '1px solid var(--my-card-border)' }}>
                                {employee.contracts.map((c, i) => (
                                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < employee.contracts.length - 1 ? '1px solid var(--my-divider)' : 'none' }}>
                                        <div>
                                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--my-text)', margin: 0 }}>{CONTRACT_TYPE[c.contract_type] ?? c.contract_type}</p>
                                            <p style={{ fontSize: 12, color: 'var(--my-faint)', marginTop: 2, marginBottom: 0 }}>{c.start_date}{c.end_date ? ` → ${c.end_date}` : ' · Хугацаагүй'}</p>
                                        </div>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Calendar style={{ width: 16, height: 16, color: '#dc2626' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Licenses ── */}
                    {employee.licenses.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingLeft: 2 }}>
                                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <BookOpen style={{ width: 18, height: 18, color: '#059669' }} />
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--my-text)', letterSpacing: '-0.2px' }}>Лиценз / Гэрчилгээ</span>
                            </div>
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--my-shadow)', border: '1px solid var(--my-card-border)' }}>
                                {employee.licenses.map((l, i) => (
                                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < employee.licenses.length - 1 ? '1px solid var(--my-divider)' : 'none' }}>
                                        <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
                                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--my-text)', margin: 0 }}>{l.name}</p>
                                            {l.issuer && <p style={{ fontSize: 12, color: 'var(--my-faint)', marginTop: 2, marginBottom: 0 }}>{l.issuer}</p>}
                                            {l.end_date && <p style={{ fontSize: 11, color: '#d1d5db', marginTop: 2, marginBottom: 0 }}>Дуусах: {l.end_date}</p>}
                                        </div>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <BookOpen style={{ width: 16, height: 16, color: '#059669' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ════════════════ DESKTOP ════════════════ */}
            <div className="hidden md:flex h-full flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Хувийн мэдээлэл</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Таны ажлын бүртгэлийн мэдээлэл</p>
                </div>

                {/* Desktop profile card */}
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="h-24 bg-gradient-to-r from-red-500 to-red-600" />
                    <div className="px-6 pb-6">
                        <div className="-mt-10 mb-4 flex items-end justify-between">
                            {showPhoto ? (
                                <img src={employee.photo_url!} alt={employee.full_name}
                                    onError={() => setImgError(true)}
                                    className="size-20 rounded-xl border-4 border-card object-cover object-top shadow" />
                            ) : (
                                <div className="flex size-20 items-center justify-center rounded-xl border-4 border-card bg-red-100 text-red-600 shadow">
                                    <User className="size-9" />
                                </div>
                            )}
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusCls}`}>
                                {isActive ? 'Идэвхтэй' : 'Идэвхгүй'}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-foreground">{employee.full_name}</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            {employee.position && <span className="flex items-center gap-1"><Briefcase className="size-3.5" />{employee.position}</span>}
                            {employee.branch && <span className="flex items-center gap-1"><BadgeCheck className="size-3.5" />{employee.branch}</span>}
                            <span className="text-muted-foreground/50">{employee.employee_number}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                            {employee.phone && (
                                <a href={`tel:${employee.phone}`} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm hover:bg-muted/80 transition-colors">
                                    <Phone className="size-3.5 text-muted-foreground" />{employee.phone}
                                </a>
                            )}
                            {employee.email && (
                                <a href={`mailto:${employee.email}`} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm hover:bg-muted/80 transition-colors">
                                    <Mail className="size-3.5 text-muted-foreground" />{employee.email}
                                </a>
                            )}
                            {employee.address && (
                                <span className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                                    <MapPin className="size-3.5 text-muted-foreground" />{employee.address}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Desktop 2-column info grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <DSection title="Хувийн мэдээлэл" icon={User}>
                        <DRow label="Овог"                value={employee.last_name} />
                        <DRow label="Нэр"                 value={employee.first_name} />
                        <DRow label="Эцэг/эхийн нэр"     value={employee.family_name} />
                        <DRow label="Регистр"             value={employee.register_number} />
                        <DRow label="Төрсөн огноо"        value={employee.birth_date} />
                        <DRow label="Хүйс"                value={employee.gender === 'male' ? 'Эрэгтэй' : employee.gender === 'female' ? 'Эмэгтэй' : null} />
                        <DRow label="Яс үндэс"            value={employee.ethnicity} />
                        <DRow label="Төрсөн газар"        value={employee.birth_place} />
                        <DRow label="Цусны бүлэг"         value={employee.blood_type} />
                        <DRow label="Жолооны үнэмлэх"     value={employee.driver_license} />
                        <DRow label="Цэргийн алба"        value={employee.military_service} />
                    </DSection>

                    <DSection title="Боловсрол" icon={GraduationCap}>
                        <DRow label="Зэрэг"    value={employee.education_degree} />
                        <DRow label="Сургууль" value={employee.education_school} />
                        <DRow label="Мэргэжил" value={employee.education_major} />
                    </DSection>

                    <DSection title="Ажлын мэдээлэл" icon={Briefcase}>
                        <DRow label="Ажилтны дугаар"    value={employee.employee_number} />
                        <DRow label="Албан тушаал"       value={employee.position} />
                        <DRow label="Салбар"             value={employee.branch} />
                        <DRow label="Ажилд орсон огноо" value={employee.hired_date} />
                        <DRow label="Туршилтын хугацаа" value={employee.probation_end_date} />
                        <DRow label="Статус"             value={isActive ? 'Идэвхтэй' : 'Идэвхгүй'} />
                    </DSection>

                    <DSection title="Гэр бүлийн байдал" icon={Heart}>
                        <DRow label="Гэрлэсэн эсэх"   value={employee.is_married} />
                        <DRow label="Хүүхэдтэй эсэх"  value={employee.has_children} />
                        {employee.has_children && <DRow label="Хүүхдийн тоо" value={String(employee.children_count)} />}
                    </DSection>

                    {(employee.emergency_name || employee.emergency_phone) && (
                        <DSection title="Яаралтай холбоо" icon={Phone}>
                            <DRow label="Нэр"      value={employee.emergency_name} />
                            <DRow label="Утас"     value={employee.emergency_phone} />
                            <DRow label="Хамаарал" value={employee.emergency_relation} />
                        </DSection>
                    )}

                    {(employee.bank_name || employee.bank_account) && (
                        <DSection title="Банкны мэдээлэл" icon={Shield}>
                            <DRow label="Банк"           value={employee.bank_name} />
                            <DRow label="Дансны дугаар"  value={employee.bank_account} />
                            <DRow label="Дансны эзэн"    value={employee.bank_account_name} />
                        </DSection>
                    )}
                </div>

                {/* Desktop family members */}
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="border-b bg-muted/30 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="size-4 text-muted-foreground" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Гэр бүлийн гишүүд</p>
                        </div>
                        <button onClick={() => setShowAdd(true)}
                            className="flex items-center gap-1 font-bold text-white bg-red-600 hover:bg-red-700 transition-colors rounded-lg px-3 py-1.5 text-xs">
                            <Plus className="size-3" /> Нэмэх
                        </button>
                    </div>
                    <div className="divide-y divide-border/50">
                        {showAdd && (
                            <div className="bg-red-50/60 dark:bg-red-950/10 p-4">
                                <p className="mb-3 text-sm font-semibold text-foreground">Шинэ гишүүн нэмэх</p>
                                <MemberForm
                                    data={addForm.data}
                                    setData={(k, v) => addForm.setData(k as any, v)}
                                    errors={addForm.errors}
                                    processing={addForm.processing}
                                    onSave={addMember}
                                    onCancel={() => { setShowAdd(false); addForm.reset(); }}
                                />
                            </div>
                        )}
                        {employee.family_members.length === 0 && !showAdd && (
                            <div className="py-10 text-center text-sm text-muted-foreground bg-card">
                                Гэр бүлийн гишүүн бүртгэгдээгүй байна
                            </div>
                        )}
                        {employee.family_members.map(m => (
                            <div key={m.id} className="px-4 py-3 bg-card">
                                {editingId === m.id ? (
                                    <MemberForm
                                        data={editForm.data}
                                        setData={(k, v) => editForm.setData(k as any, v)}
                                        errors={editForm.errors}
                                        processing={editForm.processing}
                                        onSave={() => saveEdit(m.id)}
                                        onCancel={() => setEditingId(null)}
                                    />
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 font-bold text-sm">
                                            {m.first_name?.[0]?.toUpperCase() ?? '?'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-foreground">
                                                {m.last_name} {m.first_name}
                                                <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{m.relationship}</span>
                                            </p>
                                            <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                {m.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{m.phone}</span>}
                                                {m.birth_date && <span><Calendar className="inline size-3 mr-0.5" />{m.birth_date}</span>}
                                                {m.employment_status && <span>{m.employment_status}</span>}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => startEdit(m)}
                                                className="rounded-xl p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                                                <Edit2 className="size-4" />
                                            </button>
                                            <button onClick={() => deleteMember(m.id)}
                                                className="rounded-xl p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {employee.contracts.length > 0 && (
                    <DSection title="Гэрээ" icon={Calendar}>
                        <div className="space-y-3">
                            {employee.contracts.map(c => (
                                <div key={c.id} className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                                    <p className="font-semibold text-foreground">{CONTRACT_TYPE[c.contract_type] ?? c.contract_type}</p>
                                    <p className="mt-0.5 text-muted-foreground">{c.start_date}{c.end_date ? ` → ${c.end_date}` : ' (Хугацаагүй)'}</p>
                                </div>
                            ))}
                        </div>
                    </DSection>
                )}

                {employee.licenses.length > 0 && (
                    <DSection title="Лиценз / Гэрчилгээ" icon={BookOpen}>
                        <div className="space-y-3">
                            {employee.licenses.map(l => (
                                <div key={l.id} className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                                    <p className="font-semibold text-foreground">{l.name}</p>
                                    {l.issuer && <p className="mt-0.5 text-muted-foreground">{l.issuer}</p>}
                                    {l.end_date && <p className="mt-0.5 text-xs text-muted-foreground/70">Дуусах: {l.end_date}</p>}
                                </div>
                            ))}
                        </div>
                    </DSection>
                )}
            </div>
        </MyLayout>
    );
}

function MemberForm({
    data, setData, errors, processing, onSave, onCancel,
}: {
    data: any;
    setData: (key: string, value: string) => void;
    errors: Record<string, string>;
    processing: boolean;
    onSave: () => void;
    onCancel: () => void;
}) {
    const inp = 'w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-400';
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
                <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Овог</label>
                    <input value={data.last_name} onChange={e => setData('last_name', e.target.value)} placeholder="Овог" className={inp} />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Нэр *</label>
                    <input value={data.first_name} onChange={e => setData('first_name', e.target.value)} placeholder="Нэр" className={inp} />
                    {errors.first_name && <p className="mt-1 text-xs text-red-500">{errors.first_name}</p>}
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Хамаарал *</label>
                    <select value={data.relationship} onChange={e => setData('relationship', e.target.value)} className={inp}>
                        <option value="">Сонгох</option>
                        {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {errors.relationship && <p className="mt-1 text-xs text-red-500">{errors.relationship}</p>}
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Утас</label>
                    <input value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="99001122" className={inp} />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Төрсөн огноо</label>
                    <input type="date" value={data.birth_date} onChange={e => setData('birth_date', e.target.value)} className={inp} />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Ажлын байдал</label>
                    <input value={data.employment_status} onChange={e => setData('employment_status', e.target.value)} placeholder="Ажилтай..." className={inp} />
                </div>
            </div>
            <div className="flex gap-2 pt-1">
                <button type="button" onClick={onSave} disabled={processing}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 active:scale-95 transition-all">
                    <Save className="size-4" />
                    {processing ? 'Хадгалж байна...' : 'Хадгалах'}
                </button>
                <button type="button" onClick={onCancel}
                    className="flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted active:scale-95 transition-all">
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}
