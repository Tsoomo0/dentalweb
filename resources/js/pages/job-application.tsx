import PublicLayout from '@/layouts/public-layout';
import { Head, useForm } from '@inertiajs/react';
import {
    Plus, Trash2, CheckCheck, ClipboardList,
    User, GraduationCap, Briefcase, Languages,
    Award, BookUser, Users, Info, ChevronRight,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface EducationRow      { school: string; enrolled_year: string; graduated_year: string; major: string; degree: string; gpa: string }
interface TrainingRow       { organization: string; date: string; duration: string; field: string }
interface WorkRow           { organization: string; position: string; duties: string; start_date: string; end_date: string; leave_reason: string; gap_reason: string }
interface LanguageRow       { name: string; write: string; speak: string; listen: string; read: string; interpret_oral: string; interpret_written: string }
interface ComputerSkills    { ms_word: string; ms_excel: string; ms_powerpoint: string; ms_project: string; access: string; outlook: string; internet: string; other: string }
interface TalentRow         { type: string; years: string; achievement: string }
interface AwardRow          { year: string; name: string; description: string }
interface ReferenceRow      { name: string; relation: string; phone: string; occupation: string }
interface FamilyMemberRow   { name: string; relation: string; birth_year: string; occupation: string; phone: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface FormData extends Record<string, any> {
    last_name: string; first_name: string; family_name: string;
    gender: string; birth_city: string; birth_date: string; register_no: string;
    has_insurance: boolean; has_health_insurance: boolean; address: string;
    has_driving_license: boolean; driving_class: string; has_car: boolean;
    phone_home: string; phone_mobile: string; email: string;
    education: EducationRow[];
    professional_training: TrainingRow[];
    total_work_years: string; unverified_work_years: string; employment_status: string;
    work_experience: WorkRow[];
    skills_languages: LanguageRow[];
    skills_computer: ComputerSkills;
    skills_talents: TalentRow[];
    awards: AwardRow[];
    references: ReferenceRow[];
    is_married: boolean;
    family_members: FamilyMemberRow[];
    family_relatives: FamilyMemberRow[];
    health_status: string; goals_5years: string;
    strengths: string; weaknesses: string;
    additional_info: string; info_source: string;
}

/* ─── Default rows ────────────────────────────────────────────────────────── */
const defEdu     = (): EducationRow    => ({ school: '', enrolled_year: '', graduated_year: '', major: '', degree: '', gpa: '' });
const defTraining= (): TrainingRow     => ({ organization: '', date: '', duration: '', field: '' });
const defWork    = (): WorkRow         => ({ organization: '', position: '', duties: '', start_date: '', end_date: '', leave_reason: '', gap_reason: '' });
const defLang    = (): LanguageRow     => ({ name: '', write: '', speak: '', listen: '', read: '', interpret_oral: '', interpret_written: '' });
const defTalent  = (): TalentRow       => ({ type: '', years: '', achievement: '' });
const defAward   = (): AwardRow        => ({ year: '', name: '', description: '' });
const defRef     = (): ReferenceRow    => ({ name: '', relation: '', phone: '', occupation: '' });
const defFamily  = (): FamilyMemberRow => ({ name: '', relation: '', birth_year: '', occupation: '', phone: '' });

/* ─── Shared styles ───────────────────────────────────────────────────────── */
const inp = 'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all placeholder:text-gray-400 bg-white';
const sel = inp;
const LEVEL_OPTIONS = ['', 'Анхан', 'Хэрэглээний', 'Бүрэн эзэмшсэн'];

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function SectionCard({ step, icon: Icon, title, children }: {
    step: number; icon: React.ElementType; title: string; children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <span className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                    {step}
                </span>
                <Icon className="w-4 h-4 text-red-500" />
                <h2 className="font-bold text-gray-800 text-sm">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {children}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
    );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <Label required={required}>{label}</Label>
            {children}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function SubSectionTitle({ children }: { children: React.ReactNode }) {
    return <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">{children}</p>;
}

function RowCard({ index, label, onRemove, canRemove, children }: {
    index: number; label: string; onRemove: () => void; canRemove: boolean; children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500">{label} {index + 1}</span>
                {canRemove && (
                    <button type="button" onClick={onRemove}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Хасах
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button type="button" onClick={onClick}
            className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-semibold transition-colors mt-1">
            <Plus className="w-4 h-4" /> {label}
        </button>
    );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                checked ? 'bg-red-600 border-red-600' : 'border-gray-300 group-hover:border-red-400'
            }`}>
                {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>}
            </div>
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <span className="text-sm text-gray-700">{label}</span>
        </label>
    );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function JobApplicationPage() {
    const { data, setData, post, processing, errors, reset } = useForm<FormData>({
        last_name: '', first_name: '', family_name: '', gender: '', birth_city: '',
        birth_date: '', register_no: '',
        has_insurance: false, has_health_insurance: false,
        address: '', has_driving_license: false, driving_class: '', has_car: false,
        phone_home: '', phone_mobile: '', email: '',
        education: [defEdu()],
        professional_training: [defTraining()],
        total_work_years: '', unverified_work_years: '', employment_status: '',
        work_experience: [defWork()],
        skills_languages: [defLang()],
        skills_computer: { ms_word: '', ms_excel: '', ms_powerpoint: '', ms_project: '', access: '', outlook: '', internet: '', other: '' },
        skills_talents: [defTalent()],
        awards: [defAward()],
        references: [defRef()],
        is_married: false,
        family_members: [defFamily()],
        family_relatives: [defFamily()],
        health_status: '', goals_5years: '', strengths: '', weaknesses: '',
        additional_info: '', info_source: '',
    });

    function addRow<T>(field: keyof FormData, def: () => T) {
        setData(field, [...(data[field] as T[]), def()]);
    }
    function removeRow(field: keyof FormData, idx: number) {
        const arr = data[field] as unknown[];
        if (arr.length > 1) setData(field, arr.filter((_, i) => i !== idx));
    }
    function setRow<T>(field: keyof FormData, idx: number, val: Partial<T>) {
        const arr = [...(data[field] as T[])];
        arr[idx] = { ...arr[idx], ...val };
        setData(field, arr);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/job-application', {
            onSuccess: () => reset(),
        });
    }

    const STEPS = [
        'Үндсэн мэдээлэл', 'Боловсрол', 'Ажлын туршлага',
        'Ур чадвар', 'Шагнал', 'Тодорхойлолт', 'Гэр бүл', 'Бусад',
    ];

    return (
        <>
            <Head title="Ажлын анкет" />
            <PublicLayout>

                {/* ── Hero ── */}
                <section className="pt-20 sm:pt-28 pb-12 sm:pb-16 bg-[#16100A] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-[140px] -translate-x-1/3 -translate-y-1/3 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.16) 0%, transparent 70%)' }} />
                    <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(140,10,10,0.1) 0%, transparent 70%)' }} />
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />

                    <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
                        <span className="inline-flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-5 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
                            <ClipboardList className="w-3.5 h-3.5" /> Ажлын байр
                        </span>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight mb-4">
                            Ажлын анкет<br/>
                            <span className="text-red-500">бөглөх</span>
                        </h1>
                        <p className="text-gray-400 text-base leading-relaxed max-w-md mx-auto mb-8">
                            Доорх маягтыг бүрэн бөглөж илгээнэ үү. Бид тантай удахгүй холбоо барих болно.
                        </p>
                        {/* Step indicators */}
                        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs text-gray-500">
                            {STEPS.map((s, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 text-[10px] font-black flex items-center justify-center">
                                            {i + 1}
                                        </span>
                                        {s}
                                    </span>
                                    {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-700 flex-shrink-0" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Form ── */}
                <section className="py-10 sm:py-14 bg-[#F9F4F2]">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6">
                        <form onSubmit={submit} className="flex flex-col gap-5">

                            {/* ── 1. Үндсэн мэдээлэл ── */}
                            <SectionCard step={1} icon={User} title="Үндсэн мэдээлэл">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Эцэг/эхийн нэр" required error={errors.last_name}>
                                        <input className={inp} value={data.last_name}
                                            onChange={e => setData('last_name', e.target.value)} />
                                    </Field>
                                    <Field label="Өөрийн нэр" required error={errors.first_name}>
                                        <input className={inp} value={data.first_name}
                                            onChange={e => setData('first_name', e.target.value)} />
                                    </Field>
                                    <Field label="Ургийн овог">
                                        <input className={inp} value={data.family_name}
                                            onChange={e => setData('family_name', e.target.value)} />
                                    </Field>
                                    <Field label="Хүйс">
                                        <select className={sel} value={data.gender}
                                            onChange={e => setData('gender', e.target.value)}>
                                            <option value="">Сонгох...</option>
                                            <option>Эрэгтэй</option>
                                            <option>Эмэгтэй</option>
                                        </select>
                                    </Field>
                                    <Field label="Төрсөн аймаг, хот">
                                        <input className={inp} value={data.birth_city}
                                            onChange={e => setData('birth_city', e.target.value)} />
                                    </Field>
                                    <Field label="Төрсөн он, сар, өдөр">
                                        <input type="date" className={inp} value={data.birth_date}
                                            onChange={e => setData('birth_date', e.target.value)} />
                                    </Field>
                                    <Field label="Регистр №">
                                        <input className={inp} value={data.register_no}
                                            onChange={e => setData('register_no', e.target.value)} />
                                    </Field>
                                    <Field label="Утас (гар)" required error={errors.phone_mobile}>
                                        <input className={inp} value={data.phone_mobile}
                                            onChange={e => setData('phone_mobile', e.target.value)} />
                                    </Field>
                                    <Field label="Утас (гэр)">
                                        <input className={inp} value={data.phone_home}
                                            onChange={e => setData('phone_home', e.target.value)} />
                                    </Field>
                                    <Field label="И-мэйл хаяг">
                                        <input type="email" className={inp} value={data.email}
                                            onChange={e => setData('email', e.target.value)} />
                                    </Field>
                                </div>
                                <div className="mt-4">
                                    <Field label="Оршин суугаа хаяг">
                                        <textarea rows={2} className={inp} value={data.address}
                                            onChange={e => setData('address', e.target.value)} />
                                    </Field>
                                </div>
                                <div className="mt-5 grid sm:grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-3">
                                        <CheckField label="НДД-тэй эсэх" checked={data.has_insurance} onChange={v => setData('has_insurance', v)} />
                                        <CheckField label="ЭМДД-тэй эсэх" checked={data.has_health_insurance} onChange={v => setData('has_health_insurance', v)} />
                                        <CheckField label="Хувийн машинтай эсэх" checked={data.has_car} onChange={v => setData('has_car', v)} />
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <CheckField label="Жолооны үнэмлэхтэй эсэх" checked={data.has_driving_license} onChange={v => setData('has_driving_license', v)} />
                                        {data.has_driving_license && (
                                            <Field label="Жолооны ангилал">
                                                <input className={inp} value={data.driving_class}
                                                    onChange={e => setData('driving_class', e.target.value)}
                                                    placeholder="A, B, C..." />
                                            </Field>
                                        )}
                                    </div>
                                </div>
                            </SectionCard>

                            {/* ── 2. Боловсрол ── */}
                            <SectionCard step={2} icon={GraduationCap} title="Боловсрол">
                                <SubSectionTitle>2.1 Боловсрол</SubSectionTitle>
                                {data.education.map((edu: EducationRow, i: number) => (
                                    <RowCard key={i} index={i} label="Сургууль" onRemove={() => removeRow('education', i)} canRemove={data.education.length > 1}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Field label="Сургуулийн нэр">
                                                <input className={inp} value={edu.school} onChange={e => setRow('education', i, { school: e.target.value })} />
                                            </Field>
                                            <Field label="Эзэмшсэн мэргэжил">
                                                <input className={inp} value={edu.major} onChange={e => setRow('education', i, { major: e.target.value })} />
                                            </Field>
                                            <Field label="Элссэн он">
                                                <input className={inp} placeholder="2015" value={edu.enrolled_year} onChange={e => setRow('education', i, { enrolled_year: e.target.value })} />
                                            </Field>
                                            <Field label="Төгссөн он">
                                                <input className={inp} placeholder="2019" value={edu.graduated_year} onChange={e => setRow('education', i, { graduated_year: e.target.value })} />
                                            </Field>
                                            <Field label="Зэрэг цол">
                                                <input className={inp} value={edu.degree} onChange={e => setRow('education', i, { degree: e.target.value })} />
                                            </Field>
                                            <Field label="Голч дүн">
                                                <input className={inp} value={edu.gpa} onChange={e => setRow('education', i, { gpa: e.target.value })} />
                                            </Field>
                                        </div>
                                    </RowCard>
                                ))}
                                <AddButton onClick={() => addRow('education', defEdu)} label="Сургууль нэмэх" />

                                <div className="mt-6 pt-5 border-t border-gray-100">
                                    <SubSectionTitle>2.2 Мэргэшлийн сургалт</SubSectionTitle>
                                    {data.professional_training.map((tr: TrainingRow, i: number) => (
                                        <RowCard key={i} index={i} label="Сургалт" onRemove={() => removeRow('professional_training', i)} canRemove={data.professional_training.length > 1}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <Field label="Байгууллагын нэр">
                                                    <input className={inp} value={tr.organization} onChange={e => setRow('professional_training', i, { organization: e.target.value })} />
                                                </Field>
                                                <Field label="Чиглэл">
                                                    <input className={inp} value={tr.field} onChange={e => setRow('professional_training', i, { field: e.target.value })} />
                                                </Field>
                                                <Field label="Хэзээ">
                                                    <input className={inp} value={tr.date} onChange={e => setRow('professional_training', i, { date: e.target.value })} />
                                                </Field>
                                                <Field label="Үргэлжилсэн хугацаа">
                                                    <input className={inp} value={tr.duration} onChange={e => setRow('professional_training', i, { duration: e.target.value })} />
                                                </Field>
                                            </div>
                                        </RowCard>
                                    ))}
                                    <AddButton onClick={() => addRow('professional_training', defTraining)} label="Сургалт нэмэх" />
                                </div>
                            </SectionCard>

                            {/* ── 3. Ажлын туршлага ── */}
                            <SectionCard step={3} icon={Briefcase} title="Ажлын туршлага">
                                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                                    <Field label="Нийт ажилласан жил">
                                        <input className={inp} value={data.total_work_years} onChange={e => setData('total_work_years', e.target.value)} />
                                    </Field>
                                    <Field label="НДД-ээр баталгаажаагүй жил">
                                        <input className={inp} value={data.unverified_work_years} onChange={e => setData('unverified_work_years', e.target.value)} />
                                    </Field>
                                    <Field label="Хөдөлмөр эрхлэлтийн байдал">
                                        <input className={inp} value={data.employment_status} onChange={e => setData('employment_status', e.target.value)} placeholder="Ажилтай / Ажилгүй..." />
                                    </Field>
                                </div>
                                {data.work_experience.map((w: WorkRow, i: number) => (
                                    <RowCard key={i} index={i} label="Ажлын байр" onRemove={() => removeRow('work_experience', i)} canRemove={data.work_experience.length > 1}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Field label="Байгууллагын нэр">
                                                <input className={inp} value={w.organization} onChange={e => setRow('work_experience', i, { organization: e.target.value })} />
                                            </Field>
                                            <Field label="Албан тушаал">
                                                <input className={inp} value={w.position} onChange={e => setRow('work_experience', i, { position: e.target.value })} />
                                            </Field>
                                            <Field label="Орсон огноо">
                                                <input className={inp} placeholder="2020.01" value={w.start_date} onChange={e => setRow('work_experience', i, { start_date: e.target.value })} />
                                            </Field>
                                            <Field label="Гарсан огноо">
                                                <input className={inp} placeholder="2023.06" value={w.end_date} onChange={e => setRow('work_experience', i, { end_date: e.target.value })} />
                                            </Field>
                                        </div>
                                        <div className="mt-3">
                                            <Field label="Хийж гүйцэтгэсэн ажил үүрэг">
                                                <textarea rows={2} className={inp} value={w.duties} onChange={e => setRow('work_experience', i, { duties: e.target.value })} />
                                            </Field>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                            <Field label="Гарсан шалтгаан">
                                                <input className={inp} value={w.leave_reason} onChange={e => setRow('work_experience', i, { leave_reason: e.target.value })} />
                                            </Field>
                                            <Field label="Удаан ажилгүй байсан шалтгаан">
                                                <input className={inp} value={w.gap_reason} onChange={e => setRow('work_experience', i, { gap_reason: e.target.value })} />
                                            </Field>
                                        </div>
                                    </RowCard>
                                ))}
                                <AddButton onClick={() => addRow('work_experience', defWork)} label="Ажлын байр нэмэх" />
                            </SectionCard>

                            {/* ── 4. Ур чадвар ── */}
                            <SectionCard step={4} icon={Languages} title="Ур чадвар">
                                <SubSectionTitle>4.1 Гадаад хэл</SubSectionTitle>
                                {data.skills_languages.map((lang: LanguageRow, i: number) => (
                                    <RowCard key={i} index={i} label="Хэл" onRemove={() => removeRow('skills_languages', i)} canRemove={data.skills_languages.length > 1}>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <Field label="Хэлний нэр">
                                                <input className={inp} value={lang.name} onChange={e => setRow('skills_languages', i, { name: e.target.value })} />
                                            </Field>
                                            {(['write', 'speak', 'listen', 'read', 'interpret_oral', 'interpret_written'] as const).map(k => (
                                                <Field key={k} label={
                                                    k === 'write' ? 'Бичих' : k === 'speak' ? 'Ярих' :
                                                    k === 'listen' ? 'Сонсож ойлгох' : k === 'read' ? 'Уншиж ойлгох' :
                                                    k === 'interpret_oral' ? 'Орчуулах (аман)' : 'Орчуулах (бичгийн)'
                                                }>
                                                    <select className={sel} value={lang[k]}
                                                        onChange={e => setRow('skills_languages', i, { [k]: e.target.value })}>
                                                        {LEVEL_OPTIONS.map(o => <option key={o} value={o}>{o || 'Сонгох...'}</option>)}
                                                    </select>
                                                </Field>
                                            ))}
                                        </div>
                                    </RowCard>
                                ))}
                                <AddButton onClick={() => addRow('skills_languages', defLang)} label="Хэл нэмэх" />

                                <div className="mt-6 pt-5 border-t border-gray-100">
                                    <SubSectionTitle>4.2 Компьютерийн чадвар</SubSectionTitle>
                                    <p className="text-xs text-gray-400 mb-3">Түвшин: Анхан / Хэрэглээний / Бүрэн эзэмшсэн</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {([
                                            ['ms_word', 'MS Word'], ['ms_excel', 'MS Excel'],
                                            ['ms_powerpoint', 'MS PowerPoint'], ['ms_project', 'MS Project'],
                                            ['access', 'Access'], ['outlook', 'Outlook'],
                                            ['internet', 'Internet'], ['other', 'Бусад'],
                                        ] as [keyof ComputerSkills, string][]).map(([k, label]) => (
                                            <Field key={k} label={label}>
                                                <select className={sel} value={data.skills_computer[k]}
                                                    onChange={e => setData('skills_computer', { ...data.skills_computer, [k]: e.target.value })}>
                                                    {LEVEL_OPTIONS.map(o => <option key={o} value={o}>{o || 'Сонгох...'}</option>)}
                                                </select>
                                            </Field>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-6 pt-5 border-t border-gray-100">
                                    <SubSectionTitle>4.3 Авьяас чадвар</SubSectionTitle>
                                    {data.skills_talents.map((t: TalentRow, i: number) => (
                                        <RowCard key={i} index={i} label="Авьяас" onRemove={() => removeRow('skills_talents', i)} canRemove={data.skills_talents.length > 1}>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <Field label="Төрөл">
                                                    <input className={inp} value={t.type} onChange={e => setRow('skills_talents', i, { type: e.target.value })} />
                                                </Field>
                                                <Field label="Хичээллэсэн жил">
                                                    <input className={inp} value={t.years} onChange={e => setRow('skills_talents', i, { years: e.target.value })} />
                                                </Field>
                                                <Field label="Амжилт, цол">
                                                    <input className={inp} value={t.achievement} onChange={e => setRow('skills_talents', i, { achievement: e.target.value })} />
                                                </Field>
                                            </div>
                                        </RowCard>
                                    ))}
                                    <AddButton onClick={() => addRow('skills_talents', defTalent)} label="Авьяас нэмэх" />
                                </div>
                            </SectionCard>

                            {/* ── 5. Гавъяа шагнал ── */}
                            <SectionCard step={5} icon={Award} title="Гавъяа шагнал">
                                {data.awards.map((a: AwardRow, i: number) => (
                                    <RowCard key={i} index={i} label="Шагнал" onRemove={() => removeRow('awards', i)} canRemove={data.awards.length > 1}>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <Field label="Шагнагдсан он">
                                                <input className={inp} value={a.year} onChange={e => setRow('awards', i, { year: e.target.value })} />
                                            </Field>
                                            <Field label="Шагналын нэр">
                                                <input className={inp} value={a.name} onChange={e => setRow('awards', i, { name: e.target.value })} />
                                            </Field>
                                            <Field label="Тайлбар">
                                                <input className={inp} value={a.description} onChange={e => setRow('awards', i, { description: e.target.value })} />
                                            </Field>
                                        </div>
                                    </RowCard>
                                ))}
                                <AddButton onClick={() => addRow('awards', defAward)} label="Шагнал нэмэх" />
                            </SectionCard>

                            {/* ── 6. Тодорхойлолт ── */}
                            <SectionCard step={6} icon={BookUser} title="Тодорхойлолт">
                                <p className="text-sm text-gray-500 mb-4">Танд тодорхойлолт өгч чадах хүмүүсийн мэдээлэл</p>
                                {data.references.map((r: ReferenceRow, i: number) => (
                                    <RowCard key={i} index={i} label="Лавлагаа" onRemove={() => removeRow('references', i)} canRemove={data.references.length > 1}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Field label="Овог нэр">
                                                <input className={inp} value={r.name} onChange={e => setRow('references', i, { name: e.target.value })} />
                                            </Field>
                                            <Field label="Таны юу болох">
                                                <input className={inp} value={r.relation} onChange={e => setRow('references', i, { relation: e.target.value })} />
                                            </Field>
                                            <Field label="Эрхэлдэг ажил">
                                                <input className={inp} value={r.occupation} onChange={e => setRow('references', i, { occupation: e.target.value })} />
                                            </Field>
                                            <Field label="Холбоо барих утас">
                                                <input className={inp} value={r.phone} onChange={e => setRow('references', i, { phone: e.target.value })} />
                                            </Field>
                                        </div>
                                    </RowCard>
                                ))}
                                <AddButton onClick={() => addRow('references', defRef)} label="Лавлагаа нэмэх" />
                            </SectionCard>

                            {/* ── 7. Гэр бүлийн байдал ── */}
                            <SectionCard step={7} icon={Users} title="Гэр бүлийн байдал">
                                <div className="mb-5">
                                    <CheckField label="Гэрлэсэн" checked={data.is_married} onChange={v => setData('is_married', v)} />
                                </div>

                                <SubSectionTitle>Гэр бүлийн гишүүд</SubSectionTitle>
                                {data.family_members.map((m: FamilyMemberRow, i: number) => (
                                    <RowCard key={i} index={i} label="Гишүүн" onRemove={() => removeRow('family_members', i)} canRemove={data.family_members.length > 1}>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <Field label="Овог нэр">
                                                <input className={inp} value={m.name} onChange={e => setRow('family_members', i, { name: e.target.value })} />
                                            </Field>
                                            <Field label="Таны юу болох">
                                                <input className={inp} value={m.relation} onChange={e => setRow('family_members', i, { relation: e.target.value })} />
                                            </Field>
                                            <Field label="Төрсөн он">
                                                <input className={inp} value={m.birth_year} onChange={e => setRow('family_members', i, { birth_year: e.target.value })} />
                                            </Field>
                                            <Field label="Одоо эрхэлж буй ажил">
                                                <input className={inp} value={m.occupation} onChange={e => setRow('family_members', i, { occupation: e.target.value })} />
                                            </Field>
                                            <Field label="Холбоо барих утас">
                                                <input className={inp} value={m.phone} onChange={e => setRow('family_members', i, { phone: e.target.value })} />
                                            </Field>
                                        </div>
                                    </RowCard>
                                ))}
                                <AddButton onClick={() => addRow('family_members', defFamily)} label="Гишүүн нэмэх" />

                                <div className="mt-6 pt-5 border-t border-gray-100">
                                    <SubSectionTitle>Ураг төрлийн мэдээлэл</SubSectionTitle>
                                    {data.family_relatives.map((r: FamilyMemberRow, i: number) => (
                                        <RowCard key={i} index={i} label="Хамаатан" onRemove={() => removeRow('family_relatives', i)} canRemove={data.family_relatives.length > 1}>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                <Field label="Овог нэр">
                                                    <input className={inp} value={r.name} onChange={e => setRow('family_relatives', i, { name: e.target.value })} />
                                                </Field>
                                                <Field label="Таны юу болох">
                                                    <input className={inp} value={r.relation} onChange={e => setRow('family_relatives', i, { relation: e.target.value })} />
                                                </Field>
                                                <Field label="Төрсөн он">
                                                    <input className={inp} value={r.birth_year} onChange={e => setRow('family_relatives', i, { birth_year: e.target.value })} />
                                                </Field>
                                                <Field label="Одоо эрхэлж буй ажил">
                                                    <input className={inp} value={r.occupation} onChange={e => setRow('family_relatives', i, { occupation: e.target.value })} />
                                                </Field>
                                                <Field label="Холбоо барих утас">
                                                    <input className={inp} value={r.phone} onChange={e => setRow('family_relatives', i, { phone: e.target.value })} />
                                                </Field>
                                            </div>
                                        </RowCard>
                                    ))}
                                    <AddButton onClick={() => addRow('family_relatives', defFamily)} label="Хамаатан нэмэх" />
                                </div>
                            </SectionCard>

                            {/* ── 8. Бусад ── */}
                            <SectionCard step={8} icon={Info} title="Бусад">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <Field label="Эрүүл мэндийн байдал">
                                        <input className={inp} value={data.health_status}
                                            onChange={e => setData('health_status', e.target.value)}
                                            placeholder="Сайн / Дундаж..." />
                                    </Field>
                                    <Field label="Ажлын мэдээлэл авсан эх сурвалж">
                                        <input className={inp} value={data.info_source}
                                            onChange={e => setData('info_source', e.target.value)}
                                            placeholder="Найз, сошиал медиа, зар..." />
                                    </Field>
                                </div>
                                <div className="mt-4 flex flex-col gap-4">
                                    <Field label="Ойрын 5 жилийн зорилго">
                                        <textarea rows={3} className={inp} value={data.goals_5years}
                                            onChange={e => setData('goals_5years', e.target.value)} />
                                    </Field>
                                    <Field label="Давуу тал">
                                        <textarea rows={3} className={inp} value={data.strengths}
                                            onChange={e => setData('strengths', e.target.value)} />
                                    </Field>
                                    <Field label="Сул тал">
                                        <textarea rows={3} className={inp} value={data.weaknesses}
                                            onChange={e => setData('weaknesses', e.target.value)} />
                                    </Field>
                                    <Field label="Нэмэлт танилцуулга">
                                        <textarea rows={4} className={inp} value={data.additional_info}
                                            onChange={e => setData('additional_info', e.target.value)} />
                                    </Field>
                                </div>
                            </SectionCard>

                            {/* ── Submit ── */}
                            <div className="flex justify-end pt-1">
                                <button type="submit" disabled={processing}
                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold px-10 py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md text-sm">
                                    {processing
                                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Илгээж байна...</>
                                        : <><CheckCheck className="w-4 h-4" /> Анкет илгээх</>
                                    }
                                </button>
                            </div>

                        </form>
                    </div>
                </section>

            </PublicLayout>
        </>
    );
}
