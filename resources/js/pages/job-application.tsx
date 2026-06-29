import PublicLayout from '@/layouts/public-layout';
import { Head, useForm } from '@inertiajs/react';
import {
    Plus, Trash2, CheckCheck,
    User, GraduationCap, Briefcase, Languages,
    Award, BookUser, Users, Info,
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

/* ─── Shared styles (Кутикул glassmorphism) ──────────────────────────────── */
const glassPanel = 'rounded-[30px] border border-white/70 bg-white/50 shadow-[0_14px_40px_rgba(120,30,50,0.06)] backdrop-blur-xl';
const inp = 'w-full rounded-xl border border-[#ece2e0] bg-[#fdfbfb] px-4 py-3 text-[14px] text-[#1c1a1b] outline-none transition-all duration-200 placeholder:text-[#bdb2ae] hover:border-[#e0c9cd] focus:border-[#c81e3a] focus:bg-white focus:ring-4 focus:ring-[#c81e3a]/10';
const sel = `${inp} cuticul-select cursor-pointer`;
const LEVEL_OPTIONS = ['', 'Анхан', 'Хэрэглээний', 'Бүрэн эзэмшсэн'];

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function SectionCard({ step, icon: Icon, title, children }: {
    step: number; icon: React.ElementType; title: string; children: React.ReactNode;
}) {
    return (
        <div className={`relative overflow-hidden p-6 sm:p-8 ${glassPanel}`}>
            {/* чимэглэлийн булангийн гэрэлтэлт */}
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full"
                style={{ background: 'radial-gradient(circle,rgba(246,160,176,.32),transparent 70%)', filter: 'blur(6px)' }} />
            <div className="relative mb-6 flex items-center gap-4">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl font-onest text-[18px] font-extrabold text-white"
                    style={{ background: 'linear-gradient(150deg,#e8506a,#c81e3a)', boxShadow: '0 10px 22px rgba(200,30,58,0.28)' }}>
                    {String(step).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                    <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#c81e3a]">
                        <Icon className="h-3.5 w-3.5" /> Хэсэг {step}
                    </div>
                    <h2 className="truncate font-onest text-[20px] font-extrabold text-[#1c1a1b]">{title}</h2>
                </div>
            </div>
            <div className="relative rounded-[24px] border border-[#f1e8e7] bg-white/90 p-5 shadow-[0_2px_10px_rgba(120,30,50,0.04)] sm:p-7">{children}</div>
        </div>
    );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="mb-2 block text-[12.5px] font-semibold text-[#5a5350]">
            {children}{required && <span className="ml-0.5 text-[#c81e3a]">*</span>}
        </label>
    );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <Label required={required}>{label}</Label>
            {children}
            {error && <p className="mt-1.5 text-[12px] font-medium text-[#c81e3a]">{error}</p>}
        </div>
    );
}

function SubSectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-4 flex items-center gap-2.5">
            <span className="h-4 w-1 rounded-full" style={{ background: 'linear-gradient(180deg,#e8506a,#c81e3a)' }} />
            <p className="text-[13.5px] font-bold text-[#3a3533]">{children}</p>
        </div>
    );
}

function RowCard({ index, label, onRemove, canRemove, children }: {
    index: number; label: string; onRemove: () => void; canRemove: boolean; children: React.ReactNode;
}) {
    return (
        <div className="group relative mb-3 overflow-hidden rounded-[18px] border border-[#f1e8e7] bg-gradient-to-b from-[#fdf9f8] to-[#fbf4f3] p-4 pl-5 transition-all duration-200 focus-within:border-[#f0c4cc] focus-within:shadow-[0_8px_24px_rgba(120,30,50,0.08)] sm:p-5 sm:pl-6">
            <span aria-hidden className="absolute left-0 top-0 h-full w-[3px]" style={{ background: 'linear-gradient(180deg,#e8506a,#c81e3a)' }} />
            <div className="mb-3.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-[12px] font-bold text-[#6b6360]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fbeef0] font-onest text-[11px] font-extrabold text-[#c81e3a]">{index + 1}</span>
                    {label}
                </span>
                {canRemove && (
                    <button type="button" onClick={onRemove}
                        className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#ece2e0] bg-white text-[#a99e9a] transition-all hover:border-[#c81e3a] hover:bg-[#fbeef0] hover:text-[#c81e3a]"
                        aria-label="Хасах">
                        <Trash2 className="h-3.5 w-3.5" />
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
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-dashed border-[#e7cdd1] bg-[#fdf6f7] py-3 text-[13px] font-bold text-[#c81e3a] transition-all hover:border-[#c81e3a] hover:bg-[#fbeef0]">
            <Plus className="h-4 w-4" /> {label}
        </button>
    );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] px-4 py-3 transition-all duration-200"
            style={checked ? { borderColor: '#c81e3a', background: '#fbeef0' } : { borderColor: '#ece2e0', background: '#fff' }}>
            <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border-[1.5px] transition-all ${
                checked ? 'border-[#c81e3a] bg-[#c81e3a]' : 'border-[#d9cfcd]'
            }`}>
                {checked && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>}
            </span>
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <span className="text-[14px] font-medium text-[#3a3533]">{label}</span>
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

    return (
        <PublicLayout>
            <Head title="Ажлын анкет — Кутикул" />

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            <div className="relative mt-6 overflow-hidden rounded-[32px] border border-white/70 shadow-[0_18px_50px_rgba(120,30,50,0.14)]">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 84% 20%, rgba(255,255,255,.2), transparent 48%), linear-gradient(125deg,#d62a48,#b01533 52%,#7d1226)' }} />
                <div className="absolute left-[-50px] top-[-90px] h-[280px] w-[280px] rounded-full border border-dashed border-white/20" style={{ animation: 'cuticulSpinSlow 48s linear infinite' }} />
                <div className="relative z-[3] p-8 text-center sm:p-14">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-[40px] bg-white/85 px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.05em] text-[#c81e3a]">✦ Ажлын анкет</div>
                    <h1 className="mx-auto mb-3.5 max-w-[640px] font-onest text-[28px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[36px]">Манай багт нэгдэхийг хүсэж байна уу?</h1>
                    <p className="mx-auto max-w-[520px] text-[16px] leading-[1.65] text-white/90">Доорх анкетыг бүрэн бөглөж илгээнэ үү. Бид таны мэдээлэлтэй танилцаад удахгүй холбоо барих болно.</p>
                </div>
            </div>

            {/* ── FORM ──────────────────────────────────────────────────────── */}
            <form onSubmit={submit} className="mt-7 flex flex-col gap-6">

                {/* ── 1. Үндсэн мэдээлэл ── */}
                <SectionCard step={1} icon={User} title="Үндсэн мэдээлэл">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

                    <div className="mt-6 border-t border-[#f1e8e7] pt-5">
                        <SubSectionTitle>2.2 Мэргэшлийн сургалт</SubSectionTitle>
                        {data.professional_training.map((tr: TrainingRow, i: number) => (
                            <RowCard key={i} index={i} label="Сургалт" onRemove={() => removeRow('professional_training', i)} canRemove={data.professional_training.length > 1}>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    <div className="mb-5 grid gap-4 sm:grid-cols-2">
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
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

                    <div className="mt-6 border-t border-[#f1e8e7] pt-5">
                        <SubSectionTitle>4.2 Компьютерийн чадвар</SubSectionTitle>
                        <p className="mb-3 text-[12px] text-[#9a918d]">Түвшин: Анхан / Хэрэглээний / Бүрэн эзэмшсэн</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

                    <div className="mt-6 border-t border-[#f1e8e7] pt-5">
                        <SubSectionTitle>4.3 Авьяас чадвар</SubSectionTitle>
                        {data.skills_talents.map((t: TalentRow, i: number) => (
                            <RowCard key={i} index={i} label="Авьяас" onRemove={() => removeRow('skills_talents', i)} canRemove={data.skills_talents.length > 1}>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                    <p className="mb-4 text-[14px] text-[#6b6360]">Танд тодорхойлолт өгч чадах хүмүүсийн мэдээлэл</p>
                    {data.references.map((r: ReferenceRow, i: number) => (
                        <RowCard key={i} index={i} label="Лавлагаа" onRemove={() => removeRow('references', i)} canRemove={data.references.length > 1}>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

                    <div className="mt-6 border-t border-[#f1e8e7] pt-5">
                        <SubSectionTitle>Ураг төрлийн мэдээлэл</SubSectionTitle>
                        {data.family_relatives.map((r: FamilyMemberRow, i: number) => (
                            <RowCard key={i} index={i} label="Хамаатан" onRemove={() => removeRow('family_relatives', i)} canRemove={data.family_relatives.length > 1}>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                    <div className="grid gap-4 sm:grid-cols-2">
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
                <div className={`flex flex-col items-center gap-4 p-7 text-center sm:flex-row sm:justify-between sm:text-left ${glassPanel}`}>
                    <p className="max-w-[420px] text-[13px] leading-[1.6] text-[#9a918d]">
                        Анкетыг илгээснээр таны мэдээллийг зөвхөн ажилд авах зорилгоор, нууцлалын журмын дагуу хадгална.
                    </p>
                    <button type="submit" disabled={processing}
                        className="flex flex-none items-center gap-2 rounded-[16px] px-10 py-4 text-[15px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg,#e8506a,#c81e3a)', boxShadow: '0 12px 28px rgba(200,30,58,0.32)' }}>
                        {processing
                            ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Илгээж байна...</>
                            : <><CheckCheck className="h-[18px] w-[18px]" /> Анкет илгээх</>
                        }
                    </button>
                </div>

            </form>
        </PublicLayout>
    );
}
