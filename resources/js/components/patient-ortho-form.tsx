import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';

interface OrthoData { [key: string]: string | boolean | null }
interface Props { patientId: number; ortho: { data: OrthoData } | null; route?: string }

function s(v: unknown): string  { return (v as string) ?? ''; }
function b(v: unknown): boolean { return (v as boolean) ?? false; }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            {children}
        </div>
    );
}

function Input({ value, onChange, placeholder = '' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
    );
}

function Textarea({ value, onChange, rows = 2 }: { value: string; onChange: (v: string) => void; rows?: number }) {
    return (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
            className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
    );
}

function CB({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
    return (
        <label className="flex items-center gap-1.5 cursor-pointer text-sm select-none">
            <div onClick={onChange}
                className={`flex size-3.5 shrink-0 items-center justify-center rounded border-2 transition-colors ${checked ? 'bg-emerald-600 border-emerald-600' : 'border-border bg-background'}`}>
                {checked && <svg className="size-2 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <span className="text-foreground">{label}</span>
        </label>
    );
}

function Radio({ label, name, value, checked, onChange }: { label: string; name: string; value: string; checked: boolean; onChange: () => void }) {
    return (
        <label className="flex items-center gap-1.5 cursor-pointer text-sm select-none">
            <div onClick={onChange}
                className={`flex size-3.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${checked ? 'border-emerald-600' : 'border-border bg-background'}`}>
                {checked && <div className="size-1.5 rounded-full bg-emerald-600" />}
            </div>
            <span className="text-foreground">{label}</span>
        </label>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">{title}</h3>
            {children}
        </div>
    );
}

function RLGroup({ label, fieldBase, d, set }: { label: string; fieldBase: string; d: OrthoData; set: (k: string, v: unknown) => void }) {
    return (
        <div className="flex items-center gap-4">
            <span className="text-sm text-foreground w-32 shrink-0">{label}</span>
            <div className="flex gap-3">
                {['R', 'L'].map(side => (
                    <CB key={side} label={side} checked={b(d[`${fieldBase}_${side.toLowerCase()}`])}
                        onChange={() => set(`${fieldBase}_${side.toLowerCase()}`, !b(d[`${fieldBase}_${side.toLowerCase()}`]))} />
                ))}
            </div>
        </div>
    );
}

export default function PatientOrthoForm({ patientId, ortho, route: submitRoute }: Props) {
    const d0: OrthoData = ortho?.data ?? {};

    const { data, setData, put, processing } = useForm<{ data: OrthoData }>({ data: d0 });

    function set(key: string, value: string | boolean | null) {
        setData('data', { ...data.data, [key]: value });
    }

    function get(key: string): string  { return s(data.data[key]); }
    function getB(key: string): boolean { return b(data.data[key]); }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        put(submitRoute ?? `/reception/patients/${patientId}/ortho`);
    }

    return (
        <form onSubmit={submit} className="space-y-6">

            {/* Үндсэн мэдээлэл */}
            <Section title="Үндсэн мэдээлэл">
                <Field label="Гол ирсэн шалтгаан">
                    <Textarea value={get('chief_complaint')} onChange={v => set('chief_complaint', v)} rows={2} />
                </Field>
                <Field label="Одоогийн зовиур">
                    <Textarea value={get('current_symptoms')} onChange={v => set('current_symptoms', v)} rows={2} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Өвчний түүх">
                        <Textarea value={get('medical_history')} onChange={v => set('medical_history', v)} />
                    </Field>
                    <Field label="Гэр бүлийн түүх">
                        <Textarea value={get('family_history')} onChange={v => set('family_history', v)} />
                    </Field>
                </div>
                <Field label="Гажгийн эмчилгээ (өмнөх)">
                    <Input value={get('ortho_treatment_prev')} onChange={v => set('ortho_treatment_prev', v)} />
                </Field>
            </Section>

            {/* Харшил, шүдний түүх */}
            <Section title="Харшил ба шүдний түүх">
                <Field label="Харшил (ургамал / метал Co,Cr,Ni,Fe / эм тариа / хоол хүнс / хуванцар / бусад)">
                    <Input value={get('allergy')} onChange={v => set('allergy', v)} />
                </Field>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label="Цоорол"><Input value={get('dental_caries')} onChange={v => set('dental_caries', v)} /></Field>
                    <Field label="Ломбо"><Input value={get('dental_filling')} onChange={v => set('dental_filling', v)} /></Field>
                    <Field label="Авахуулсан"><Input value={get('dental_extracted')} onChange={v => set('dental_extracted', v)} /></Field>
                    <Field label="Шүдэлбэр"><Input value={get('dental_denture')} onChange={v => set('dental_denture', v)} /></Field>
                    <Field label="Бусад"><Input value={get('dental_other')} onChange={v => set('dental_other', v)} /></Field>
                </div>
            </Section>

            {/* Буруу зуршил */}
            <Section title="Буруу зуршил">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                        ['habit_mouth_breathing', 'Амаар амьсгалдаг'],
                        ['habit_tongue_thrust',   'Хэл хөх'],
                        ['habit_thumb_sucking',   'Хуруу хөх'],
                        ['habit_wrong_swallow',   'Буруу залгидаг'],
                        ['habit_bruxism',         'Шүдээ хавир'],
                        ['habit_nail_biting',     'Хумс мэр'],
                        ['habit_lip_biting',      'Уруул хаз'],
                    ].map(([k, l]) => (
                        <CB key={k} label={l} checked={getB(k)} onChange={() => set(k, !getB(k))} />
                    ))}
                </div>
                <Field label="Бусад зуршил">
                    <Input value={get('habit_other')} onChange={v => set('habit_other', v)} />
                </Field>
            </Section>

            {/* Биеийн өсөлт */}
            <Section title="Биеийн өсөлт">
                <div className="flex gap-6 flex-wrap">
                    <div className="flex gap-3">
                        <Radio label="Хэвийн" name="growth" value="normal" checked={get('growth') === 'normal'} onChange={() => set('growth', 'normal')} />
                        <Radio label="Хэвийн бус" name="growth" value="abnormal" checked={get('growth') === 'abnormal'} onChange={() => set('growth', 'abnormal')} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Growth spurt:</span>
                        {['Өмнө', 'Дунд', 'Дараа'].map(v => (
                            <Radio key={v} label={v} name="growth_spurt" value={v} checked={get('growth_spurt') === v} onChange={() => set('growth_spurt', v)} />
                        ))}
                    </div>
                    <Field label="Bone age">
                        <Input value={get('bone_age')} onChange={v => set('bone_age', v)} />
                    </Field>
                </div>
            </Section>

            {/* Нүүрний шинжилгээ */}
            <Section title="Нүүрний шинжилгээ">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">Эгц урдаас</p>
                        <div className="flex gap-3">
                            <Radio label="Тэгш" name="facial_front" value="symmetrical" checked={get('facial_front') === 'symmetrical'} onChange={() => set('facial_front', 'symmetrical')} />
                            <Radio label="Тэгш бус" name="facial_front" value="asymmetrical" checked={get('facial_front') === 'asymmetrical'} onChange={() => set('facial_front', 'asymmetrical')} />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">Хажуугаас</p>
                        <div className="flex gap-3 flex-wrap">
                            {['Straight', 'Convex', 'Concave'].map(v => (
                                <Radio key={v} label={v} name="facial_side" value={v} checked={get('facial_side') === v} onChange={() => set('facial_side', v)} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Голын шугам — Хоншоор (Зүүн / Баруун, mm)">
                        <Input value={get('midline_upper')} onChange={v => set('midline_upper', v)} placeholder="Хэвийн / Зүүн / Баруун mm" />
                    </Field>
                    <Field label="Голын шугам — Эрүү">
                        <Input value={get('midline_lower')} onChange={v => set('midline_lower', v)} placeholder="Хэвийн / Зүүн / Баруун mm" />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="E-line дээд уруул (mm)"><Input value={get('eline_upper')} onChange={v => set('eline_upper', v)} /></Field>
                    <Field label="E-line доод уруул (mm)"><Input value={get('eline_lower')} onChange={v => set('eline_lower', v)} /></Field>
                </div>
                <CB label="Online" checked={getB('eline_online')} onChange={() => set('eline_online', !getB('eline_online'))} />
            </Section>

            {/* Dental age, зөөлөн эд */}
            <Section title="Шүдний мэдээлэл">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label="Dental age"><Input value={get('dental_age')} onChange={v => set('dental_age', v)} /></Field>
                    <Field label="Шүдний гажиг"><Input value={get('dental_anomaly')} onChange={v => set('dental_anomaly', v)} /></Field>
                    <Field label="Шүдгүйдэл"><Input value={get('missing_teeth')} onChange={v => set('missing_teeth', v)} /></Field>
                    <Field label="Илүү шүд"><Input value={get('extra_teeth')} onChange={v => set('extra_teeth', v)} /></Field>
                    <Field label="Шүдлэлт саатах"><Input value={get('delayed_eruption')} onChange={v => set('delayed_eruption', v)} /></Field>
                    <Field label="Malformed"><Input value={get('malformed')} onChange={v => set('malformed', v)} /></Field>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="Хэл"><Input value={get('soft_tongue')} onChange={v => set('soft_tongue', v)} /></Field>
                    <Field label="Хөвч"><Input value={get('soft_frenum')} onChange={v => set('soft_frenum', v)} /></Field>
                    <Field label="Гүйлсэн булчирхай"><Input value={get('soft_tonsil')} onChange={v => set('soft_tonsil', v)} /></Field>
                    <Field label="Аденойд"><Input value={get('soft_adenoid')} onChange={v => set('soft_adenoid', v)} /></Field>
                </div>
            </Section>

            {/* Хоршилт */}
            <Section title="Хоршилт">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[['1-р их арааны хоршилт', 'molar'], ['Соёоны хоршилт', 'canine']].map(([lbl, base]) => (
                        <div key={base}>
                            <p className="text-xs text-muted-foreground mb-2">{lbl}</p>
                            <div className="grid grid-cols-2 gap-4">
                                {['Баруун', 'Зүүн'].map((side, si) => (
                                    <div key={side}>
                                        <p className="text-xs text-muted-foreground">{side}</p>
                                        <div className="flex gap-2">
                                            {['I', 'II', 'III'].map(cls => (
                                                <Radio key={cls} label={cls} name={`${base}_${si}`} value={cls}
                                                    checked={get(`${base}_${si === 0 ? 'right' : 'left'}`) === cls}
                                                    onChange={() => set(`${base}_${si === 0 ? 'right' : 'left'}`, cls)} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-4">
                    <CB label="Functional" checked={getB('functional')} onChange={() => set('functional', !getB('functional'))} />
                    <Field label="Тайлбар"><Input value={get('functional_note')} onChange={v => set('functional_note', v)} /></Field>
                </div>
            </Section>

            {/* Нумын хэлбэр */}
            <Section title="Нумын хэлбэр">
                <div className="grid grid-cols-2 gap-6">
                    {[['Хоншоор (дээд)', 'arch_upper'], ['Эрүү (доод)', 'arch_lower']].map(([lbl, k]) => (
                        <div key={k}>
                            <p className="text-xs text-muted-foreground mb-2">{lbl}</p>
                            <div className="flex gap-3 flex-wrap">
                                {['Square', 'Parabol', 'Round', 'V shape'].map(v => (
                                    <Radio key={v} label={v} name={k} value={v} checked={get(k) === v} onChange={() => set(k, v)} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Malocclusion */}
            <Section title="Malocclusion">
                <div className="flex flex-wrap gap-4">
                    {[
                        ['malocclusion_maxilla_protrusion', 'Maxilla protrusion'],
                        ['malocclusion_maxilla_retrusion',  'Maxilla retrusion'],
                        ['malocclusion_mandible_protrusion','Mandible protrusion'],
                        ['malocclusion_mandible_retrusion', 'Mandible retrusion'],
                        ['open_bite',  'Open bite'],
                        ['deep_bite',  'Deep bite'],
                        ['diastema',   'Diastema'],
                        ['crossbite',  'Crossbite'],
                        ['scissorbite','Scissorbite'],
                    ].map(([k, l]) => (
                        <CB key={k} label={l} checked={getB(k)} onChange={() => set(k, !getB(k))} />
                    ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label="Overbite (mm)"><Input value={get('overbite')} onChange={v => set('overbite', v)} /></Field>
                    <Field label="Overjet (mm)"><Input value={get('overjet')} onChange={v => set('overjet', v)} /></Field>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-muted-foreground">Амны хөндий Э/А:</span>
                    {['Сайн', 'Хэвийн', 'Муу'].map(v => (
                        <Radio key={v} label={v} name="oral_hygiene" value={v} checked={get('oral_hygiene') === v} onChange={() => set('oral_hygiene', v)} />
                    ))}
                </div>
            </Section>

            {/* Рентген */}
            <Section title="Рентген">
                <div className="flex flex-wrap gap-3">
                    {[['xray_ceph','Ceph L'],['xray_pano','Pano'],['xray_ct','CT'],['xray_frontal','Frontal'],['xray_tmj','TMJ'],['xray_dental','Dental']].map(([k, l]) => (
                        <CB key={k} label={l} checked={getB(k)} onChange={() => set(k, !getB(k))} />
                    ))}
                </div>
                <Field label="Рентген тайлбар">
                    <Textarea value={get('xray_note')} onChange={v => set('xray_note', v)} />
                </Field>
            </Section>

            {/* Arch length */}
            <Section title="Arch length discrepancy">
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Хоншоор (mm)"><Input value={get('arch_disc_upper')} onChange={v => set('arch_disc_upper', v)} /></Field>
                    <Field label="Эрүү (mm)"><Input value={get('arch_disc_lower')} onChange={v => set('arch_disc_lower', v)} /></Field>
                </div>
                <p className="text-xs text-muted-foreground">Хоншоортт шаардлагатай зай</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Field label="SUM 1/2"><Input value={get('upper_sum12')} onChange={v => set('upper_sum12', v)} /></Field>
                    <Field label="SUM 3/4/5"><Input value={get('upper_sum345')} onChange={v => set('upper_sum345', v)} /></Field>
                    <Field label="Spee curve"><Input value={get('upper_spee')} onChange={v => set('upper_spee', v)} /></Field>
                    <Field label="Leeway"><Input value={get('upper_leeway')} onChange={v => set('upper_leeway', v)} /></Field>
                </div>
                <p className="text-xs text-muted-foreground">Эрүүнд шаардлагатай зай</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Field label="SUM 1/2"><Input value={get('lower_sum12')} onChange={v => set('lower_sum12', v)} /></Field>
                    <Field label="SUM 3/4/5"><Input value={get('lower_sum345')} onChange={v => set('lower_sum345', v)} /></Field>
                    <Field label="Spee curve"><Input value={get('lower_spee')} onChange={v => set('lower_spee', v)} /></Field>
                    <Field label="Leeway"><Input value={get('lower_leeway')} onChange={v => set('lower_leeway', v)} /></Field>
                </div>
            </Section>

            {/* TMJ */}
            <Section title="TMJ">
                <div className="space-y-2">
                    {[['tmj_hist', 'TMJ түүх'], ['tmj_now', 'TMJ одоо']].map(([prefix, lbl]) => (
                        <div key={prefix}>
                            <p className="text-xs text-muted-foreground mb-1">{lbl}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {['pain', 'clicking', 'crepitus', 'lock'].map(symptom => (
                                    <RLGroup key={symptom} label={symptom.charAt(0).toUpperCase() + symptom.slice(1)}
                                        fieldBase={`${prefix}_${symptom}`} d={data.data} set={set as (k: string, v: unknown) => void} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Premature contact"><Input value={get('jaw_premature')} onChange={v => set('jaw_premature', v)} /></Field>
                    <Field label="Deviation"><Input value={get('jaw_deviation')} onChange={v => set('jaw_deviation', v)} /></Field>
                    <Field label="Бусад"><Input value={get('jaw_other')} onChange={v => set('jaw_other', v)} /></Field>
                </div>
            </Section>

            {/* Оношилгоо */}
            <Section title="Гажгийн шинж төлөв / Оношилгоо">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[['Skeletal','diag_skeletal'],['Denture','diag_denture'],['Dental','diag_dental'],['Functional','diag_functional'],['Habit','diag_habit']].map(([l, k]) => (
                        <div key={k}>
                            <p className="text-xs text-muted-foreground mb-1">{l}</p>
                            <div className="flex gap-3">
                                <Radio label="-" name={k} value="-" checked={get(k) === '-'} onChange={() => set(k, '-')} />
                                <Radio label="+" name={k} value="+" checked={get(k) === '+'} onChange={() => set(k, '+')} />
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Эмчилгээний төлөвлөгөө */}
            <Section title="Эмчилгээний төлөвлөгөө">
                <Field label="Эмчилгээний зорилго">
                    <Textarea value={get('treatment_goal')} onChange={v => set('treatment_goal', v)} rows={3} />
                </Field>
                <Field label="Setup model">
                    <Textarea value={get('setup_model')} onChange={v => set('setup_model', v)} />
                </Field>
                <Field label="Эмчилгээний төлөвлөгөө">
                    <Textarea value={get('treatment_plan')} onChange={v => set('treatment_plan', v)} rows={3} />
                </Field>
            </Section>

            {/* Бусад тайлбар */}
            <Section title="Бусад тайлбар">
                <Textarea value={get('other_notes')} onChange={v => set('other_notes', v)} rows={2} />
            </Section>

            <button type="submit" disabled={processing}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {processing
                    ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <Save className="size-4" />}
                Хадгалах
            </button>
        </form>
    );
}
