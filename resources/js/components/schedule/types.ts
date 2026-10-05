/* Хуваарийн UI-ийн нийтлэг төрөл ба туслах функцууд (ScheduleBoard.php-ийн хариутай таарна). */

export interface Template {
    id: number; name: string; code: string; kind: 'work' | 'off';
    start_time: string | null; end_time: string | null; break_minutes: number;
    color: string; branch_id: number | null; position_ids: number[] | null;
    sort_order: number; is_active: boolean;
}
export interface Branch { id: number; name: string; abbr: string; }
export interface Position { id: number; name: string; portal: string | null; }
export interface DoctorOption { id: number; name: string; branch_id: number | null; }

export interface BoardEmployee {
    id: number; name: string; short_name: string; photo_url: string | null;
    position_id: number | null; position: string | null; branch_id: number | null;
    is_doctor: boolean; is_guest: boolean;
}
export type ShiftState = 'published' | 'new' | 'changed' | 'removed';
export interface BoardShift {
    id: number; employee_id: number; date: string; branch_id: number | null;
    template_id: number | null; kind: 'work' | 'off';
    start_time: string | null; end_time: string | null; break_minutes: number; minutes: number;
    assigned_doctor_id: number | null; room: string | null; note: string | null;
    state: ShiftState; was: string | null;
}
export interface Leave { employee_id: number; date: string; type: string; label: string; status: 'approved' | 'pending'; }
export interface Unavailable { employee_id: number; date: string; note: string | null; }
export interface Coverage { position_id: number; date: string; required: number; actual: number; }
export interface Conflict { employee_id: number; date: string; level: 'error' | 'warn'; code: string; message: string; }

export interface Board {
    period: { start: string; end: string; days: string[] };
    branch_id: number | null;
    employees: BoardEmployee[];
    shifts: BoardShift[];
    leaves: Leave[];
    unavailable: Unavailable[];
    hours: Record<string, number>;
    coverage: Coverage[];
    conflicts: Conflict[];
    patterns: number[];
    draft_count: number;
}

/** Нүдийг солиход сервер рүү илгээх нэг ээлж. */
export interface ShiftInput {
    id?: number | null; template_id?: number | null; kind?: 'work' | 'off';
    branch_id?: number | null; start_time?: string | null; end_time?: string | null;
    break_minutes?: number; assigned_doctor_id?: number | null; room?: string | null; note?: string | null;
}
export interface DayInput { employee_id: number; date: string; shifts: ShiftInput[]; }

export const MONTHS = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар',
    '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
export const DOW_SHORT = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];
export const DOW_FULL = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

export const pad = (n: number) => String(n).padStart(2, '0');
export const toDS = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDS = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parseDS(s); d.setDate(d.getDate() + n); return toDS(d); };
export const todayDS = () => toDS(new Date());
/** ISO гараг: 0 = Даваа … 6 = Ням */
export const dowIndex = (s: string) => (parseDS(s).getDay() + 6) % 7;
export const mondayOf = (s: string) => addDays(s, -dowIndex(s));

export function fmtHours(min: number | undefined | null): string {
    if (!min) return '0ц';
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h}ц${pad(m)}` : `${h}ц`;
}

export function shiftMinutes(start: string | null | undefined, end: string | null | undefined, brk = 0): number {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let span = eh * 60 + em - (sh * 60 + sm);
    if (span <= 0) span += 1440;
    return Math.max(0, span - brk);
}

/** Тухайн мөрийн албан тушаал/салбарт хэрэглэгдэх эсэх. */
export function appliesTo(t: Template, positionId: number | null, branchId: number | null): boolean {
    if (t.branch_id && branchId && t.branch_id !== branchId) return false;
    return !t.position_ids || t.position_ids.length === 0 || (positionId !== null && t.position_ids.includes(positionId));
}

/**
 * Ижил кодтой загваруудаас мөрт хамгийн тохирохыг сонгоно (сервер ч мөн адил шийднэ).
 * "Ө" будахад эмчид эмчийн өглөө, ресепшнд ерөнхий өглөө.
 */
export function resolveTemplate(chosen: Template, templates: Template[], positionId: number | null, branchId: number | null): Template {
    const score = (t: Template) => (t.position_ids?.length ? 2 : 0) + (t.branch_id ? 1 : 0);
    const best = templates
        .filter(t => t.is_active && t.code === chosen.code && t.kind === chosen.kind && appliesTo(t, positionId, branchId))
        .sort((a, b) => score(b) - score(a))[0];
    if (!best || (appliesTo(chosen, positionId, branchId) && score(chosen) >= score(best))) return chosen;
    return best;
}

/** Тухайн ажилтанд сонгох загварууд — код бүрээс хамгийн тохирохыг нь ганцхан үлдээнэ. */
export function templatesFor(templates: Template[], positionId: number | null, branchId: number | null): Template[] {
    return paletteOf(templates.filter(t => t.is_active && appliesTo(t, positionId, branchId)))
        .map(t => resolveTemplate(t, templates, positionId, branchId));
}

/** Палитрт кодоор нь нэг удаа харуулах (эмчийн "Ө", ерөнхий "Ө" → нэг товч). */
export function paletteOf(templates: Template[]): Template[] {
    const seen = new Map<string, Template>();
    for (const t of templates) {
        if (!t.is_active) continue;
        const key = `${t.kind}:${t.code}`;
        const cur = seen.get(key);
        if (!cur || (cur.position_ids?.length && !t.position_ids?.length)) seen.set(key, t);
    }
    return [...seen.values()].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

/** Өнгөн дээр уншигдах бичгийн өнгө. */
export function inkOn(hex: string): string {
    const h = hex.replace('#', '');
    if (h.length !== 6) return '#fff';
    const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? '#1f2937' : '#ffffff';
}

export function initials(name: string) {
    return name.split(/[\s.]+/).filter(Boolean).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase();
}
