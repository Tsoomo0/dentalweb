import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';

interface MedHistory {
    has_heart_disease: boolean; has_diabetes: boolean; has_hypertension: boolean;
    has_hepatitis: boolean; has_bleeding_disorder: boolean; has_asthma: boolean;
    has_epilepsy: boolean; has_kidney_disease: boolean; has_hiv: boolean;
    has_mental_disorder: boolean; has_cancer: boolean; is_cancer_treatment: boolean;
    has_thyroid_disorder: boolean; has_anemia: boolean; takes_blood_thinners: boolean;
    has_tuberculosis: boolean; has_infectious_hepatitis: boolean; has_tonsils: boolean;
    is_pregnant: boolean; is_nursing: boolean; has_womens_condition: boolean;
    is_smoker: boolean; drinks_alcohol: boolean;
    other_conditions: string | null; organ_stones: string | null;
    allergy_penicillin: boolean; allergy_aspirin: boolean; allergy_latex: boolean;
    allergy_anesthetic: boolean; had_anesthetic_allergy: boolean; allergy_other: string | null;
    current_medications: string | null; special_ongoing_treatment: string | null;
    had_dental_complications: boolean; dental_complication_detail: string | null;
    previous_surgeries: string | null; previous_dental_treatments: string | null;
    last_checkup: string | null; previous_dental_clinics: string | null;
}

interface Props { patientId: number; medical: MedHistory | null; route?: string; onSuccess?: () => void }

const BOOL_DEFAULT = false;
const TEXT_DEFAULT = '';

function bool(v: boolean | null | undefined) { return v ?? BOOL_DEFAULT; }
function text(v: string | null | undefined)  { return v ?? TEXT_DEFAULT; }

function CB({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
    return (
        <label className="flex items-center gap-2 cursor-pointer select-none">
            <div onClick={onChange}
                className={`flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${checked ? 'bg-red-600 border-red-600' : 'border-border bg-background'}`}>
                {checked && (
                    <svg className="size-2.5 text-white" fill="none" viewBox="0 0 10 8">
                        <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>
            <span className="text-sm text-foreground">{label}</span>
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

function Textarea({ label, value, onChange, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">{label}</label>
            <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
        </div>
    );
}

export default function PatientMedicalForm({ patientId, medical, route: submitRoute, onSuccess }: Props) {
    const { data, setData, put, processing } = useForm({
        has_heart_disease:        bool(medical?.has_heart_disease),
        has_diabetes:             bool(medical?.has_diabetes),
        has_hypertension:         bool(medical?.has_hypertension),
        has_hepatitis:            bool(medical?.has_hepatitis),
        has_infectious_hepatitis: bool(medical?.has_infectious_hepatitis),
        has_bleeding_disorder:    bool(medical?.has_bleeding_disorder),
        has_asthma:               bool(medical?.has_asthma),
        has_epilepsy:             bool(medical?.has_epilepsy),
        has_kidney_disease:       bool(medical?.has_kidney_disease),
        has_hiv:                  bool(medical?.has_hiv),
        has_mental_disorder:      bool(medical?.has_mental_disorder),
        has_cancer:               bool(medical?.has_cancer),
        is_cancer_treatment:      bool(medical?.is_cancer_treatment),
        has_thyroid_disorder:     bool(medical?.has_thyroid_disorder),
        has_anemia:               bool(medical?.has_anemia),
        takes_blood_thinners:     bool(medical?.takes_blood_thinners),
        has_tuberculosis:         bool(medical?.has_tuberculosis),
        has_tonsils:              bool(medical?.has_tonsils),
        is_pregnant:              bool(medical?.is_pregnant),
        is_nursing:               bool(medical?.is_nursing),
        has_womens_condition:     bool(medical?.has_womens_condition),
        is_smoker:                bool(medical?.is_smoker),
        drinks_alcohol:           bool(medical?.drinks_alcohol),
        other_conditions:         text(medical?.other_conditions),
        organ_stones:             text(medical?.organ_stones),
        allergy_penicillin:       bool(medical?.allergy_penicillin),
        allergy_aspirin:          bool(medical?.allergy_aspirin),
        allergy_latex:            bool(medical?.allergy_latex),
        allergy_anesthetic:       bool(medical?.allergy_anesthetic),
        had_anesthetic_allergy:   bool(medical?.had_anesthetic_allergy),
        allergy_other:            text(medical?.allergy_other),
        current_medications:      text(medical?.current_medications),
        special_ongoing_treatment:text(medical?.special_ongoing_treatment),
        had_dental_complications: bool(medical?.had_dental_complications),
        dental_complication_detail: text(medical?.dental_complication_detail),
        previous_surgeries:       text(medical?.previous_surgeries),
        previous_dental_treatments: text(medical?.previous_dental_treatments),
        last_checkup:             text(medical?.last_checkup),
        previous_dental_clinics:  text(medical?.previous_dental_clinics),
    });

    function toggle(key: keyof typeof data) {
        setData(key, !data[key] as never);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        put(submitRoute ?? `/reception/patients/${patientId}/medical`, {
            onSuccess: () => onSuccess?.(),
        });
    }

    return (
        <form onSubmit={submit} className="space-y-6">

            {/* 1. Эм тариа */}
            <Section title="1. Байнга хэрэглэдэг эм тариа">
                <Textarea label="" value={data.current_medications} onChange={v => setData('current_medications', v)} />
            </Section>

            {/* 2. Харшил */}
            <Section title="2. Эм, эмийн бодис болон бусад зүйлст харшил">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <CB label="Пенициллин"       checked={data.allergy_penicillin}     onChange={() => toggle('allergy_penicillin')} />
                    <CB label="Аспирин"           checked={data.allergy_aspirin}        onChange={() => toggle('allergy_aspirin')} />
                    <CB label="Latex"             checked={data.allergy_latex}          onChange={() => toggle('allergy_latex')} />
                    <CB label="Мэдээ алдуулагч"   checked={data.allergy_anesthetic}     onChange={() => toggle('allergy_anesthetic')} />
                </div>
                <Textarea label="Бусад харшил" value={data.allergy_other} onChange={v => setData('allergy_other', v)} rows={1} />
            </Section>

            {/* 3. Өмнөх эмчилгээний хүндрэл */}
            <Section title="3. Өмнө шүдний эмчилгээний үед хүндрэл гарч байсан эсэх">
                <CB label="Тийм (цус алдах, бие эвгүйцэх, ухаан алдах гэх мэт)"
                    checked={data.had_dental_complications} onChange={() => toggle('had_dental_complications')} />
                {data.had_dental_complications && (
                    <Textarea label="Дэлгэрэнгүй" value={data.dental_complication_detail} onChange={v => setData('dental_complication_detail', v)} />
                )}
            </Section>

            {/* 4. Хэсгийн мэдээ алдуулагч харшил */}
            <Section title="4. Хэсгийн мэдээ алдуулах бодис харшилж байсан эсэх">
                <CB label="Тийм" checked={data.had_anesthetic_allergy} onChange={() => toggle('had_anesthetic_allergy')} />
            </Section>

            {/* 5. Өвөрмөц эмчилгээ */}
            <Section title="5. Хийгдэж буй өвөрмөц эмчилгээ (туяа, хими, дархлаа дарангуйлах гэх мэт)">
                <Textarea label="" value={data.special_ongoing_treatment} onChange={v => setData('special_ongoing_treatment', v)} rows={1} />
            </Section>

            {/* 6. Ангина */}
            <Section title="6. Ангина (хоолойн мах)-тай эсэх">
                <CB label="Тийм" checked={data.has_tonsils} onChange={() => toggle('has_tonsils')} />
            </Section>

            {/* 7. Өвчнүүд */}
            <Section title="7. Дараах өвчин байгаа эсэх">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <CB label="Зүрхний өвчин"          checked={data.has_heart_disease}        onChange={() => toggle('has_heart_disease')} />
                    <CB label="Даралт ихсэлт"           checked={data.has_hypertension}         onChange={() => toggle('has_hypertension')} />
                    <CB label="Уналт таталт"            checked={data.has_epilepsy}             onChange={() => toggle('has_epilepsy')} />
                    <CB label="Чихрийн шижин"           checked={data.has_diabetes}             onChange={() => toggle('has_diabetes')} />
                    <CB label="Элэгний үрэвсэл"         checked={data.has_hepatitis}            onChange={() => toggle('has_hepatitis')} />
                    <CB label="Сэтгэцийн эмгэг"         checked={data.has_mental_disorder}      onChange={() => toggle('has_mental_disorder')} />
                    <CB label="Хавдар"                  checked={data.has_cancer}               onChange={() => toggle('has_cancer')} />
                    <CB label="Хавдрын эмчилгээ хийлгэж буй" checked={data.is_cancer_treatment} onChange={() => toggle('is_cancer_treatment')} />
                    <CB label="Тамхи татдаг"            checked={data.is_smoker}                onChange={() => toggle('is_smoker')} />
                    <CB label="Бамбай булчирхайн эмгэг" checked={data.has_thyroid_disorder}     onChange={() => toggle('has_thyroid_disorder')} />
                    <CB label="Цус багадалт"            checked={data.has_anemia}               onChange={() => toggle('has_anemia')} />
                    <CB label="Цус бүлэгнэлтийн эсрэг эм" checked={data.takes_blood_thinners}  onChange={() => toggle('takes_blood_thinners')} />
                    <CB label="Сүрьеэ"                  checked={data.has_tuberculosis}         onChange={() => toggle('has_tuberculosis')} />
                    <CB label="Халдварт шар"             checked={data.has_infectious_hepatitis} onChange={() => toggle('has_infectious_hepatitis')} />
                    <CB label="ДОХ"                     checked={data.has_hiv}                  onChange={() => toggle('has_hiv')} />
                    <CB label="Астма"                   checked={data.has_asthma}               onChange={() => toggle('has_asthma')} />
                </div>
                <Textarea label="Дотор эрхтний чулуу (аль эрхтэн)" value={data.organ_stones} onChange={v => setData('organ_stones', v)} rows={1} />
                <Textarea label="Бусад өвчин" value={data.other_conditions} onChange={v => setData('other_conditions', v)} rows={1} />
            </Section>

            {/* Эмэгтэйчүүд */}
            <Section title="Эмэгтэйчүүдийн асуумж">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <CB label="Жирэмсэн"             checked={data.is_pregnant}        onChange={() => toggle('is_pregnant')} />
                    <CB label="Хөхүүл"                checked={data.is_nursing}         onChange={() => toggle('is_nursing')} />
                    <CB label="Эмэгтэйчүүдийн өвчин" checked={data.has_womens_condition} onChange={() => toggle('has_womens_condition')} />
                </div>
            </Section>

            {/* 8-10 нэмэлт */}
            <Section title="Нэмэлт мэдээлэл">
                <Textarea label="9. Хамгийн сүүлд хэзээ ямар үзлэгт хамрагдсан" value={data.last_checkup} onChange={v => setData('last_checkup', v)} rows={1} />
                <Textarea label="10. Одоо хийлгэж байгаа эмчилгээ" value={data.previous_dental_treatments} onChange={v => setData('previous_dental_treatments', v)} rows={1} />
                <Textarea label="Өмнө нь үзүүлж байсан шүдний эмнэлгүүд" value={data.previous_dental_clinics} onChange={v => setData('previous_dental_clinics', v)} rows={1} />
            </Section>

            <button type="submit" disabled={processing}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors">
                {processing
                    ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <Save className="size-4" />}
                Хадгалах
            </button>
        </form>
    );
}
