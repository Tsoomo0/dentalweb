import { router } from '@inertiajs/react';
import {
    AlertCircle, Calendar, CheckCircle2, ChevronDown, ChevronUp,
    Clock, FileText, PenLine, Save, X,
} from 'lucide-react';
import axios from 'axios';
import { useEffect, useState } from 'react';

/* ── Types ─────────────────────────────────────────────────────────────── */
export interface OrthoVisit {
    id: number;
    visit_date: string;
    data: Record<string, unknown>;
    created_at: string;
}

interface Props {
    patientId: number;
    visits: OrthoVisit[];
    routePrefix: string; // '/doctor/patients/{id}'
}

/* ── Small helpers ──────────────────────────────────────────────────────── */
function CB({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
            <div
                onClick={() => onChange(!checked)}
                style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    border: checked ? 'none' : '1.5px solid #d1d5db',
                    background: checked ? '#dc2626' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
            >
                {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{label}</span>
        </label>
    );
}

function Radio({ label, name, value, current, onChange }: { label: string; name: string; value: string; current: string; onChange: (v: string) => void }) {
    const checked = current === value;
    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <div
                onClick={() => onChange(value)}
                style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: checked ? '4px solid #dc2626' : '1.5px solid #d1d5db',
                    background: 'transparent', cursor: 'pointer',
                }}
            />
            <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{label}</span>
        </label>
    );
}

function fmtDate(s: string) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s.slice(0, 10);
    return d.toLocaleDateString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

const INP: React.CSSProperties = {
    width: '100%', border: '1px solid var(--border)', borderRadius: 10,
    padding: '7px 10px', fontSize: 13, background: 'var(--background)',
    color: 'var(--foreground)', outline: 'none', boxSizing: 'border-box',
};

function Section({ title, children, color = '#dc2626' }: { title: string; children: React.ReactNode; color?: string }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 4, height: 18, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: 0.4 }}>{title}</span>
            </div>
            <div style={{ paddingLeft: 12 }}>{children}</div>
        </div>
    );
}

/* ── Wire selector for upper/lower ─────────────────────────────────────── */
function WireSection({ label, prefix, data, set }: { label: string; prefix: string; data: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
    const wireTypes = ['Niti', 'SS', 'Reverse'];
    const wireSizes = ['0.012', '0.014', '0.016', '0.018', '0.016×0.016', '0.016×0.022', '0.017×0.025', '0.018×0.025', '0.019×0.025'];

    return (
        <div style={{ background: 'var(--muted)', borderRadius: 12, padding: '10px 14px', marginBottom: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', margin: '0 0 8px' }}>{label}</p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                {wireTypes.map(t => (
                    <CB key={t} label={t}
                        checked={!!data[`${prefix}_${t.toLowerCase()}`]}
                        onChange={v => set(`${prefix}_${t.toLowerCase()}`, v)} />
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {wireSizes.map(s => {
                    const key = `${prefix}_size_${s.replace('×', 'x')}`;
                    const checked = !!data[key];
                    return (
                        <button key={s} type="button" onClick={() => set(key, !checked)}
                            style={{
                                padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                                border: checked ? 'none' : '1px solid var(--border)',
                                background: checked ? '#dc2626' : 'transparent',
                                color: checked ? 'white' : 'var(--muted-foreground)',
                                cursor: 'pointer',
                            }}>
                            {s}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   VISIT FORM (blank or prefilled for editing)
════════════════════════════════════════════════════════════════════════ */
function VisitForm({ patientId, routePrefix, visit, onClose }: {
    patientId: number;
    routePrefix: string;
    visit?: OrthoVisit;
    onClose: () => void;
}) {
    const today = new Date().toISOString().slice(0, 10);
    const initData = (visit?.data ?? {}) as Record<string, unknown>;

    const [visitDate, setVisitDate] = useState(visit?.visit_date?.slice(0, 10) ?? today);
    const [data, setData] = useState<Record<string, unknown>>(initData);
    const [processing, setProcessing] = useState(false);

    function set(k: string, v: unknown) {
        setData(d => ({ ...d, [k]: v }));
    }
    function str(k: string) { return (data[k] as string) ?? ''; }
    function bool(k: string) { return !!(data[k]); }

    function handleSubmit() {
        setProcessing(true);
        const url = visit
            ? `${routePrefix}/ortho-visits/${visit.id}`
            : `${routePrefix}/ortho-visits`;
        const method = visit ? 'put' : 'post';
        router[method](url, { visit_date: visitDate, data } as any, {
            preserveScroll: true,
            onSuccess: () => { setProcessing(false); onClose(); },
            onError: () => setProcessing(false),
        });
    }

    return (
        <div style={{
            background: 'var(--card)', borderRadius: 20,
            border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 12,
        }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg,#dc2626,#7f1d1d)',
                padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={18} color="white" />
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>
                        {visit ? 'Үзлэг засах' : 'Гажиг заслын явц — шинэ'}
                    </span>
                </div>
                <button type="button" onClick={onClose}
                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '4px 6px', cursor: 'pointer' }}>
                    <X size={16} color="white" />
                </button>
            </div>

            <div style={{ padding: '18px 20px' }}>

                {/* Огноо */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', display: 'block', marginBottom: 6 }}>
                        ОГНОО
                    </label>
                    <div style={{ position: 'relative', maxWidth: 200 }}>
                        <Calendar size={14} color="var(--muted-foreground)"
                            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                        <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)}
                            style={{ ...INP, paddingLeft: 32 }} />
                    </div>
                </div>

                {/* Гомдол */}
                <Section title="ГОМДОЛ (Chief complaint)">
                    <textarea value={str('chief_complaint')} onChange={e => set('chief_complaint', e.target.value)}
                        rows={2} placeholder="Гомдлоо бичнэ үү..."
                        style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }} />
                </Section>

                {/* Гажгийн төлөв */}
                <Section title="ГАЖГИЙН ТӨЛӨВ" color="#2563eb">
                    {/* Голын шугам */}
                    <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>1. Голын шугам</p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Radio label="Хэвийн" name="midline" value="normal" current={str('midline')} onChange={v => set('midline', v)} />
                            <Radio label="Баруун тийш" name="midline" value="right" current={str('midline')} onChange={v => set('midline', v)} />
                            {str('midline') === 'right' && (
                                <input type="number" value={str('midline_mm')} onChange={e => set('midline_mm', e.target.value)}
                                    placeholder="мм" style={{ ...INP, width: 70 }} />
                            )}
                            <Radio label="Зүүн тийш" name="midline" value="left" current={str('midline')} onChange={v => set('midline', v)} />
                            {str('midline') === 'left' && (
                                <input type="number" value={str('midline_mm')} onChange={e => set('midline_mm', e.target.value)}
                                    placeholder="мм" style={{ ...INP, width: 70 }} />
                            )}
                        </div>
                    </div>

                    {/* Overjet */}
                    <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>2. Overjet</p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Radio label="Хэвийн" name="overjet" value="normal" current={str('overjet')} onChange={v => set('overjet', v)} />
                            <Radio label="Хэвийн бус" name="overjet" value="abnormal" current={str('overjet')} onChange={v => set('overjet', v)} />
                            {str('overjet') === 'abnormal' && (
                                <input type="number" value={str('overjet_mm')} onChange={e => set('overjet_mm', e.target.value)}
                                    placeholder="мм" style={{ ...INP, width: 70 }} />
                            )}
                        </div>
                    </div>

                    {/* Overbite */}
                    <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>3. Overbite</p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Radio label="Хэвийн" name="overbite" value="normal" current={str('overbite')} onChange={v => set('overbite', v)} />
                            <Radio label="Хэвийн бус" name="overbite" value="abnormal" current={str('overbite')} onChange={v => set('overbite', v)} />
                            {str('overbite') === 'abnormal' && (
                                <input type="number" value={str('overbite_mm')} onChange={e => set('overbite_mm', e.target.value)}
                                    placeholder="мм" style={{ ...INP, width: 70 }} />
                            )}
                        </div>
                    </div>

                    {/* Spee curve */}
                    <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>4. Spee curve</p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Radio label="Үгүй" name="spee" value="no" current={str('spee')} onChange={v => set('spee', v)} />
                            <Radio label="Тийм" name="spee" value="yes" current={str('spee')} onChange={v => set('spee', v)} />
                            {str('spee') === 'yes' && (
                                <input type="text" value={str('spee_side')} onChange={e => set('spee_side', e.target.value)}
                                    placeholder="Аль талд..." style={{ ...INP, flex: 1, minWidth: 120 }} />
                            )}
                        </div>
                    </div>

                    {/* Зуултын төлөв */}
                    <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>5. Зуултын төлөв</p>
                        <textarea value={str('bite_status')} onChange={e => set('bite_status', e.target.value)}
                            rows={2} placeholder="Зуултын төлөв..." style={{ ...INP, resize: 'vertical' }} />
                    </div>

                    {/* Бусад */}
                    <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>6. Бусад</p>
                        <textarea value={str('malocclusion_other')} onChange={e => set('malocclusion_other', e.target.value)}
                            rows={2} placeholder="Бусад..." style={{ ...INP, resize: 'vertical' }} />
                    </div>
                </Section>

                {/* Амны хөндийн эрүүл ахуй */}
                <Section title="АМНЫ ХӨНДИЙН ЭРҮҮЛ АХУЙ" color="#059669">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>1. Шүд угаалт</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {[['good', 'Сайн'], ['medium', 'Дунд'], ['bad', 'Муу'], ['very_bad', 'Маш муу']].map(([v, l]) => (
                                    <Radio key={v} label={l} name="brushing" value={v} current={str('brushing')} onChange={vv => set('brushing', vv)} />
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>2. Буйлны үрэвсэл</p>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <Radio label="Тийм" name="gum_inf" value="yes" current={str('gum_inflammation')} onChange={v => set('gum_inflammation', v)} />
                                    <Radio label="Үгүй" name="gum_inf" value="no" current={str('gum_inflammation')} onChange={v => set('gum_inflammation', v)} />
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>3. Тулгуур эдийн эмчид</p>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <Radio label="Тийм" name="perio" value="yes" current={str('perio_referral')} onChange={v => set('perio_referral', v)} />
                                    <Radio label="Үгүй" name="perio" value="no" current={str('perio_referral')} onChange={v => set('perio_referral', v)} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>4. Шүдний цоорол</p>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Radio label="Цооролгүй" name="caries" value="no" current={str('caries')} onChange={v => set('caries', v)} />
                            <Radio label="Цооролтой" name="caries" value="yes" current={str('caries')} onChange={v => set('caries', v)} />
                            {str('caries') === 'yes' && (
                                <input type="text" value={str('caries_detail')} onChange={e => set('caries_detail', e.target.value)}
                                    placeholder="Дэлгэрэнгүй..." style={{ ...INP, flex: 1, minWidth: 120 }} />
                            )}
                        </div>
                    </div>
                </Section>

                {/* Шүдний хөдөлгөөн */}
                <Section title="ШҮДНИЙ ХӨДӨЛГӨӨН" color="#7c3aed">
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                        <Radio label="Үгүй" name="mobility" value="no" current={str('mobility')} onChange={v => set('mobility', v)} />
                        <Radio label="Тийм" name="mobility" value="yes" current={str('mobility')} onChange={v => set('mobility', v)} />
                        {str('mobility') === 'yes' && (
                            <input type="text" value={str('mobility_tooth')} onChange={e => set('mobility_tooth', e.target.value)}
                                placeholder="Аль шүд..." style={{ ...INP, flex: 1, minWidth: 120 }} />
                        )}
                    </div>
                    {str('mobility') === 'yes' && (
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>Хөдөлгөөний зэрэг</p>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {['1', '2', '3', '4'].map(g => (
                                    <Radio key={g} label={`${g}-р зэрэг`} name="mob_grade" value={g}
                                        current={str('mobility_grade')} onChange={v => set('mobility_grade', v)} />
                                ))}
                            </div>
                        </div>
                    )}
                </Section>

                {/* Өмнөх сарын үр дүн */}
                <Section title="ӨМНӨХ САРЫН ҮР ДҮН БОЛОН ГАРСАН ӨӨРЧЛӨЛТ" color="#d97706">
                    <textarea value={str('prev_month_result')} onChange={e => set('prev_month_result', e.target.value)}
                        rows={3} placeholder="Өмнөх сарын үр дүн, гарсан өөрчлөлт..."
                        style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }} />
                </Section>

                {/* Хийгдсэн эмчилгээ */}
                <Section title="ХИЙГДСЭН ЭМЧИЛГЭЭ" color="#dc2626">
                    {/* Wire */}
                    <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: 6 }}>1. Нум</p>
                        <WireSection label="Дээд нум" prefix="upper" data={data} set={set} />
                        <WireSection label="Доод нум" prefix="lower" data={data} set={set} />
                    </div>

                    {/* Other treatments */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>2. Stripping</p>
                            <input type="text" value={str('stripping')} onChange={e => set('stripping', e.target.value)}
                                placeholder="..." style={INP} />
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>3. Lacing</p>
                            <input type="text" value={str('lacing')} onChange={e => set('lacing', e.target.value)}
                                placeholder="..." style={INP} />
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>4. PC</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {[['pc_short', 'Short'], ['pc_long', 'Long'], ['pc_continuous', 'Continuous']].map(([k, l]) => (
                                    <CB key={k} label={l} checked={bool(k)} onChange={v => set(k, v)} />
                                ))}
                            </div>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>5. Open coil</p>
                            <input type="text" value={str('open_coil')} onChange={e => set('open_coil', e.target.value)}
                                placeholder="..." style={INP} />
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>6. Lingual button</p>
                            <input type="text" value={str('lingual_button')} onChange={e => set('lingual_button', e.target.value)}
                                placeholder="..." style={INP} />
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>7. Stopper</p>
                            <input type="text" value={str('stopper')} onChange={e => set('stopper', e.target.value)}
                                placeholder="..." style={INP} />
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>8. Crimpable hook</p>
                            <input type="text" value={str('crimpable_hook')} onChange={e => set('crimpable_hook', e.target.value)}
                                placeholder="..." style={INP} />
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>9. Closing loop</p>
                            <input type="text" value={str('closing_loop')} onChange={e => set('closing_loop', e.target.value)}
                                placeholder="..." style={INP} />
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>10. Rotation wedge</p>
                            <input type="text" value={str('rotation_wedge')} onChange={e => set('rotation_wedge', e.target.value)}
                                placeholder="..." style={INP} />
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>11. Tube</p>
                            <input type="text" value={str('tube')} onChange={e => set('tube', e.target.value)}
                                placeholder="..." style={INP} />
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>12. Tooth torque spring</p>
                            <input type="text" value={str('tooth_torque_spring')} onChange={e => set('tooth_torque_spring', e.target.value)}
                                placeholder="..." style={INP} />
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>13. Mini screw</p>
                            <input type="text" value={str('mini_screw')} onChange={e => set('mini_screw', e.target.value)}
                                placeholder="..." style={INP} />
                        </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>14. Бусад зүйлс</p>
                        <textarea value={str('other_treatment')} onChange={e => set('other_treatment', e.target.value)}
                            rows={2} placeholder="Бусад..." style={{ ...INP, resize: 'vertical' }} />
                    </div>
                    <div style={{ marginTop: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>15. Салсан зүйл наах</p>
                        <input type="text" value={str('rebond')} onChange={e => set('rebond', e.target.value)}
                            placeholder="..." style={INP} />
                    </div>
                    <div style={{ marginTop: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>16. Elastic</p>
                        <input type="text" value={str('elastic')} onChange={e => set('elastic', e.target.value)}
                            placeholder="..." style={INP} />
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>15. Фторжуулалт</p>
                        <Radio label="Үгүй" name="fluor" value="no" current={str('fluoride')} onChange={v => set('fluoride', v)} />
                        <Radio label="Тийм" name="fluor" value="yes" current={str('fluoride')} onChange={v => set('fluoride', v)} />
                    </div>
                </Section>

                {/* Дараа сард хийгдэх эмчилгээ */}
                <Section title="ДАРАА САРД ХИЙГДЭХ ЭМЧИЛГЭЭ" color="#0891b2">
                    <textarea value={str('next_treatment')} onChange={e => set('next_treatment', e.target.value)}
                        rows={3} placeholder="Дараа сарын эмчилгээний төлөвлөгөө..."
                        style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }} />
                </Section>

                {/* Зөвлөгөө */}
                <Section title="ЗӨВЛӨГӨӨ" color="#16a34a">
                    <textarea value={str('advice')} onChange={e => set('advice', e.target.value)}
                        rows={2} placeholder="Зөвлөгөө..."
                        style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }} />
                </Section>

                {/* Үзлэгийн үргэлжилсэн хугацаа */}
                <Section title="ҮЗЛЭГИЙН ҮРГЭЛЖИЛСЭН ХУГАЦАА" color="#d97706">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                        {[['arrival_time', 'Ирсэн цаг'], ['start_time', 'Эхэлсэн цаг'], ['end_time', 'Дууссан цаг']].map(([k, l]) => (
                            <div key={k}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>{l}</p>
                                <div style={{ position: 'relative' }}>
                                    <Clock size={12} color="var(--muted-foreground)"
                                        style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input type="time" value={str(k)} onChange={e => set(k, e.target.value)}
                                        style={{ ...INP, paddingLeft: 26 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>Хүлээлгэсэн хугацаа</p>
                        <input type="text" value={str('waiting_time')} onChange={e => set('waiting_time', e.target.value)}
                            placeholder="мин..." style={{ ...INP, maxWidth: 160 }} />
                    </div>
                </Section>

                {/* Гажиг заслын эмчилгээ завсардсан байдал */}
                <Section title="ГАЖИГ ЗАСЛЫН ЭМЧИЛГЭЭ ЗАВСАРДСАН БАЙДАЛ" color="#dc2626">
                    <textarea value={str('treatment_interruption')} onChange={e => set('treatment_interruption', e.target.value)}
                        rows={2} placeholder="..." style={{ ...INP, resize: 'vertical' }} />
                </Section>

                {/* Нийт дүн */}
                <Section title="НИЙТ ДҮН" color="#059669">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                            ['total_amount', 'Нийт дүн'],
                            ['tightening', 'Чангалгаа'],
                            ['leasing', 'Лизинг'],
                            ['removable_price', 'Авагддаг аппарат үнэ'],
                            ['fixed_price', 'Авагддаггүй бэхжүүлэгчний үнэ'],
                        ].map(([k, l]) => (
                            <div key={k}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>{l}</p>
                                <input type="number" value={str(k)} onChange={e => set(k, e.target.value)}
                                    placeholder="₮" style={INP} />
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Дараагийн ирэлт */}
                <Section title="ДАРААГИЙН ИРЭЛТ" color="#7c3aed">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>Огноо</p>
                            <input type="date" value={str('next_appt_date')} onChange={e => set('next_appt_date', e.target.value)}
                                style={INP} />
                        </div>
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>Цаг</p>
                            <input type="time" value={str('next_appt_time')} onChange={e => set('next_appt_time', e.target.value)}
                                style={INP} />
                        </div>
                    </div>
                </Section>

                {/* Эмчлүүлэгчийн санал */}
                <Section title="ЭМЧЛҮҮЛЭГЧИЙН САНАЛ ХҮСЭЛТ" color="#475569">
                    <textarea value={str('patient_feedback')} onChange={e => set('patient_feedback', e.target.value)}
                        rows={2} placeholder="Санал хүсэлт..." style={{ ...INP, resize: 'vertical' }} />
                </Section>

                {/* Submit */}
                <button type="button" onClick={handleSubmit} disabled={processing}
                    style={{
                        width: '100%', padding: '13px', borderRadius: 14, border: 'none',
                        background: processing ? '#999' : 'linear-gradient(135deg,#dc2626,#7f1d1d)',
                        color: 'white', fontSize: 14, fontWeight: 800, cursor: processing ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: processing ? 'none' : '0 6px 20px rgba(220,38,38,0.3)',
                    }}>
                    {processing
                        ? <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                        : <Save size={16} />}
                    Хадгалах
                </button>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   VISIT CARD (collapsed view of one visit)
════════════════════════════════════════════════════════════════════════ */
function VisitCard({ visit, patientId, routePrefix }: { visit: OrthoVisit; patientId: number; routePrefix: string }) {
    const [expanded, setExpanded]       = useState(false);
    const [editing, setEditing]         = useState(false);
    const [deleting, setDeleting]       = useState(false);
    const [reqSig, setReqSig]           = useState(false);

    function handleDelete() {
        if (!deleting) { setDeleting(true); return; }
        router.delete(`${routePrefix}/ortho-visits/${visit.id}`, { preserveScroll: true });
    }

    function handleRequestSignature(e: React.MouseEvent) {
        e.stopPropagation();
        setReqSig(true);
        router.post(`${routePrefix}/ortho-visits/${visit.id}/request-signature`, {}, {
            preserveScroll: true,
            onFinish: () => setReqSig(false),
        });
    }

    const d = (visit.data ?? {}) as Record<string, string | boolean | undefined>;
    const sigRequested = !!d.signature_requested_at;
    const sigSigned    = !!d.patient_signature;

    if (editing) {
        return <VisitForm patientId={patientId} routePrefix={routePrefix} visit={visit} onClose={() => setEditing(false)} />;
    }

    return (
        <div style={{
            background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)',
            overflow: 'hidden', marginBottom: 10,
        }}>
            {/* Header row */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px',
                cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border)' : 'none',
            }} onClick={() => setExpanded(e => !e)}>
                <div style={{
                    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                    background: 'linear-gradient(135deg,#fca5a5,#dc2626)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <FileText size={18} color="white" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>
                            {fmtDate(visit.visit_date)}
                        </p>
                        {sigSigned ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', borderRadius: 99, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <CheckCircle2 size={10} /> Гарын үсэг зурагдсан
                            </span>
                        ) : sigRequested ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fffbeb', borderRadius: 99, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <PenLine size={10} /> Гарын үсэг хүлээгдэж байна
                            </span>
                        ) : null}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: '2px 0 0' }}>
                        Гажиг заслын явц · {d.chief_complaint ? String(d.chief_complaint).slice(0, 40) + (String(d.chief_complaint).length > 40 ? '…' : '') : 'Гомдол бичигдээгүй'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {!sigSigned && (
                        <button type="button" onClick={handleRequestSignature} disabled={reqSig}
                            style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: sigRequested ? '#fffbeb' : '#fef2f2', fontSize: 11, fontWeight: 700, color: sigRequested ? '#d97706' : '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <PenLine size={11} /> {sigRequested ? 'Дахин хүсэх' : 'Гарын үсэг хүсэх'}
                        </button>
                    )}
                    <button type="button" onClick={() => setEditing(true)}
                        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                        Засах
                    </button>
                    <button type="button" onClick={handleDelete}
                        style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: deleting ? '#dc2626' : '#fef2f2', fontSize: 11, fontWeight: 700, color: deleting ? 'white' : '#dc2626', cursor: 'pointer' }}>
                        {deleting ? 'Баталгаажуулах' : 'Устгах'}
                    </button>
                </div>
                {expanded ? <ChevronUp size={16} color="var(--muted-foreground)" /> : <ChevronDown size={16} color="var(--muted-foreground)" />}
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        {[
                            ['Гомдол', 'chief_complaint'],
                            ['Голын шугам', 'midline'],
                            ['Overjet', 'overjet'],
                            ['Overbite', 'overbite'],
                            ['Өмнөх сарын үр дүн', 'prev_month_result'],
                            ['Дараа сарын эмчилгээ', 'next_treatment'],
                            ['Зөвлөгөө', 'advice'],
                            ['Нийт дүн ₮', 'total_amount'],
                        ].map(([label, key]) => d[key] ? (
                            <div key={key}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</p>
                                <p style={{ fontSize: 13, color: 'var(--foreground)', margin: 0 }}>{String(d[key])}</p>
                            </div>
                        ) : null)}
                    </div>
                    {/* Signature info */}
                    {sigSigned && (
                        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <CheckCircle2 size={18} color="#16a34a" />
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', margin: 0 }}>Гарын үсэг зурагдсан</p>
                                {d.patient_signer_name && <p style={{ fontSize: 11, color: '#15803d', margin: '2px 0 0' }}>{String(d.patient_signer_name)}</p>}
                                {d.patient_signed_at && <p style={{ fontSize: 10, color: '#86efac', margin: '1px 0 0' }}>{new Date(String(d.patient_signed_at)).toLocaleString('mn-MN')}</p>}
                            </div>
                            {d.patient_signature && (
                                <img src={String(d.patient_signature)} alt="Гарын үсэг"
                                    style={{ height: 40, marginLeft: 'auto', border: '1px solid #bbf7d0', borderRadius: 8, background: 'white', padding: 4 }} />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════════════════════════════════════ */
export default function PatientOrthoVisitForm({ patientId, visits: initVisits, routePrefix }: Props) {
    const [showForm,    setShowForm]    = useState(false);
    const [localVisits, setLocalVisits] = useState<OrthoVisit[]>(initVisits);

    // Inertia props шинэчлэгдэхэд синхрончлох
    useEffect(() => {
        setLocalVisits(initVisits);
        setShowForm(false);
    }, [initVisits]);

    /* 15s signature-status poll */
    useEffect(() => {
        const poll = () => {
            axios.get(`${routePrefix}/ortho-visits/poll`)
                .then(res => {
                    if (Array.isArray(res.data.visits)) {
                        setLocalVisits(res.data.visits);
                    }
                })
                .catch(() => {});
        };
        const id = setInterval(poll, 15000);
        return () => clearInterval(id);
    }, [routePrefix]);

    return (
        <div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={18} color="#dc2626" />
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>
                        Гажиг заслын эмчилгээний явц
                    </span>
                    <span style={{
                        fontSize: 11, fontWeight: 700, color: '#dc2626',
                        background: '#fef2f2', borderRadius: 99, padding: '2px 8px',
                    }}>
                        {localVisits.length} үзлэг
                    </span>
                </div>
                <button type="button" onClick={() => setShowForm(v => !v)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 12, border: 'none',
                        background: showForm ? 'var(--muted)' : '#dc2626',
                        color: showForm ? 'var(--muted-foreground)' : 'white',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}>
                    {showForm ? <><X size={14} /> Хаах</> : <>+ Шинэ үзлэг</>}
                </button>
            </div>

            {/* New visit form */}
            {showForm && (
                <VisitForm patientId={patientId} routePrefix={routePrefix} onClose={() => setShowForm(false)} />
            )}

            {/* Visit history */}
            {localVisits.length === 0 && !showForm ? (
                <div style={{
                    background: 'var(--muted)', borderRadius: 18, padding: '36px 20px',
                    textAlign: 'center',
                }}>
                    <AlertCircle size={32} color="var(--muted-foreground)" style={{ margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted-foreground)', margin: 0 }}>Үзлэгийн тэмдэглэл байхгүй</p>
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '4px 0 0' }}>Шинэ үзлэг дарж тэмдэглэл нэмнэ үү</p>
                </div>
            ) : (
                localVisits.map(v => (
                    <VisitCard key={v.id} visit={v} patientId={patientId} routePrefix={routePrefix} />
                ))
            )}
        </div>
    );
}
