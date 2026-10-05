<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Хуучин 3 хуваарийн хүснэгтийг (employee_work_schedules, ortho_schedules,
 * support_schedules) шинэ `shifts` руу нийтлэгдсэн төлөвөөр хөрвүүлнэ.
 *
 * Хуучин хүснэгтүүдийг УСТГАХГҮЙ — production дээр шилжүүлэлтийг шалгасны
 * дараа тусад нь цэвэрлэнэ. Энэ migration-ийг дахин ажиллуулахад давхардахгүй
 * (source=legacy мөр байвал хөрвүүлэлтийг алгасна).
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $this->seedSettings($now);
        $templates = $this->seedTemplates($now);

        if (! DB::table('shifts')->where('source', 'legacy')->exists()) {
            $this->copyLegacy($templates, $now);
        }

        $this->convertPermissions();
    }

    public function down(): void
    {
        DB::table('shifts')->where('source', 'legacy')->delete();
        DB::table('settings')->where('group', 'schedule')->delete();
    }

    private function seedSettings($now): void
    {
        $rows = [
            ['schedule_late_grace_minutes', '5', 'Хоцролтын хүлцэл (минут)', 'Хуваарийн эхлэлээс хойш энэ хугацаанд ирвэл хоцорсонд тооцохгүй'],
            ['schedule_overtime_min_minutes', '15', 'Илүү цагийн доод хэмжээ (минут)', 'Хуваарийн дуусахаас хойш үүнээс бага саатвал илүү цаг гэж тооцохгүй'],
            ['schedule_weekly_hours_limit', '40', '7 хоногийн цагийн хязгаар', 'Хэтэрвэл хуваарь дээр анхааруулга гарна'],
            ['schedule_min_rest_hours', '11', 'Ээлж хоорондын амралт (цаг)', 'Өмнөх өдрийн ээлж дуусахаас дараагийн эхлэх хүртэлх доод хугацаа'],
            ['schedule_max_consecutive_days', '6', 'Дараалан ажиллах дээд өдөр', 'Хэтэрвэл хуваарь дээр анхааруулга гарна'],
        ];

        foreach ($rows as [$key, $value, $label, $description]) {
            if (DB::table('settings')->where('key', $key)->exists()) {
                continue;
            }

            DB::table('settings')->insert([
                'key' => $key, 'value' => $value, 'group' => 'schedule', 'label' => $label,
                'description' => $description, 'type' => 'integer', 'is_sensitive' => false,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }
    }

    /**
     * Анхны ээлжийн загварууд. Эмчийн албан тушаал байвал эмчид зориулсан
     * өөр цагтай ижил кодтой (Ө/О/Б) загвар үүсгэнэ — бийрээр будахад мөрийн
     * албан тушаалд таарсныг автоматаар сонгоно.
     *
     * @return array<string, int> түлхүүр → template id
     */
    private function seedTemplates($now): array
    {
        $doctorPositions = DB::table('positions')->get(['id', 'name', 'portal'])
            ->filter(fn ($p) => $p->portal === 'doctor' || $this->isDoctorName($p->name))
            ->pluck('id')->map(fn ($id) => (int) $id)->values()->all();

        $defs = [
            'morning' => ['Өглөө', 'Ө', 'work', '08:30', '16:30', '#0ea5e9', null],
            'afternoon' => ['Орой', 'О', 'work', '12:30', '20:30', '#f97316', null],
            'full' => ['Бүтэн', 'Б', 'work', '08:30', '20:30', '#10b981', null],
            'off' => ['Амралт', 'А', 'off', null, null, '#94a3b8', null],
            'warehouse' => ['Агуулах', 'Аг', 'work', null, null, '#d97706', null],
            'vacation' => ['Ээлжийн амралт', 'ЭА', 'off', null, null, '#8b5cf6', null],
            'holiday' => ['Баяр, наадам', 'Ба', 'off', null, null, '#ec4899', null],
        ];

        if ($doctorPositions) {
            $defs['doc_morning'] = ['Өглөө', 'Ө', 'work', '09:00', '15:00', '#0284c7', $doctorPositions];
            $defs['doc_afternoon'] = ['Орой', 'О', 'work', '15:00', '20:00', '#ea580c', $doctorPositions];
            $defs['doc_full'] = ['Бүтэн', 'Б', 'work', '09:00', '20:00', '#059669', $doctorPositions];
        }

        $ids = [];
        $existing = DB::table('shift_templates')->count();
        $order = 0;

        foreach ($defs as $key => [$name, $code, $kind, $start, $end, $color, $positions]) {
            $order++;

            if ($existing > 0) {
                // Загварууд аль хэдийн байгаа — зөвхөн хөрвүүлэлтэд хэрэгтэй id-г олно.
                $found = DB::table('shift_templates')->where('code', $code)->where('kind', $kind)
                    ->when($positions, fn ($q) => $q->whereNotNull('position_ids'), fn ($q) => $q->whereNull('position_ids'))
                    ->value('id');
                if ($found) {
                    $ids[$key] = (int) $found;
                }

                continue;
            }

            $ids[$key] = (int) DB::table('shift_templates')->insertGetId([
                'name' => $name, 'code' => $code, 'kind' => $kind,
                'start_time' => $start, 'end_time' => $end, 'break_minutes' => 0,
                'color' => $color, 'position_ids' => $positions ? json_encode($positions) : null,
                'sort_order' => $order, 'is_active' => true,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        return $ids;
    }

    /** @param array<string, int> $templates */
    private function copyLegacy(array $templates, $now): void
    {
        $employees = DB::table('employees')
            ->leftJoin('positions', 'positions.id', '=', 'employees.position_id')
            ->get(['employees.id', 'employees.branch_id', 'positions.name as position', 'positions.portal'])
            ->keyBy('id');

        $isDoctor = fn ($emp) => $emp && ($emp->portal === 'doctor' || $this->isDoctorName($emp->position));
        $pick = function (string $shiftType, $emp) use ($templates, $isDoctor): ?int {
            if ($shiftType === 'off') {
                return $templates['off'] ?? null;
            }
            if (! in_array($shiftType, ['morning', 'afternoon', 'full'], true)) {
                return null;
            }

            return ($isDoctor($emp) ? ($templates['doc_'.$shiftType] ?? null) : null) ?? $templates[$shiftType] ?? null;
        };

        $rows = [];
        $push = function (array $row) use (&$rows, $now) {
            $rows[] = $row + [
                'status' => 'published', 'published_at' => $now, 'source' => 'legacy',
                'replaces_id' => null, 'is_removal' => false, 'updated_by' => null,
                'created_at' => $now, 'updated_at' => $now,
            ];
        };

        if (Schema::hasTable('employee_work_schedules')) {
            foreach (DB::table('employee_work_schedules')->whereNull('deleted_at')->orderBy('id')->cursor() as $s) {
                $emp = $employees->get($s->employee_id);
                if (! $emp) {
                    continue;
                }
                $off = $s->shift_type === 'off';
                $push([
                    'employee_id' => $s->employee_id, 'branch_id' => $off ? null : $emp->branch_id,
                    'date' => $s->date, 'shift_template_id' => $pick($s->shift_type, $emp),
                    'kind' => $off ? 'off' : 'work',
                    'start_time' => $off ? null : $s->start_time, 'end_time' => $off ? null : $s->end_time,
                    'break_minutes' => 0, 'assigned_doctor_id' => $s->assigned_doctor_id,
                    'room' => $s->room ? mb_substr($s->room, 0, 50) : null,
                    'note' => $s->notes ? mb_substr($s->notes, 0, 500) : null,
                    'created_by' => $s->created_by,
                ]);
            }
        }

        if (Schema::hasTable('support_schedules')) {
            foreach (DB::table('support_schedules')->orderBy('id')->cursor() as $s) {
                $emp = $employees->get($s->employee_id);
                if (! $emp) {
                    continue;
                }
                $off = $s->shift_type === 'off';
                $push([
                    'employee_id' => $s->employee_id, 'branch_id' => $off ? null : $emp->branch_id,
                    'date' => $s->date, 'shift_template_id' => $pick($s->shift_type, $emp),
                    'kind' => $off ? 'off' : 'work',
                    'start_time' => $off ? null : $s->start_time, 'end_time' => $off ? null : $s->end_time,
                    'break_minutes' => 0, 'assigned_doctor_id' => null, 'room' => null,
                    'note' => $s->note, 'created_by' => $s->created_by,
                ]);
            }
        }

        if (Schema::hasTable('ortho_schedules')) {
            $stateTemplate = [
                'work' => $templates['full'] ?? null, 'warehouse' => $templates['warehouse'] ?? null,
                'off' => $templates['off'] ?? null, 'vacation' => $templates['vacation'] ?? null,
                'holiday' => $templates['holiday'] ?? null,
            ];
            foreach (DB::table('ortho_schedules')->orderBy('id')->cursor() as $s) {
                $emp = $employees->get($s->employee_id);
                if (! $emp) {
                    continue;
                }
                $working = in_array($s->state, ['work', 'warehouse'], true);
                // Гажиг заслын хуучин хуваарьт цаг байгаагүй — цагийг зохиож бичихгүй.
                $push([
                    'employee_id' => $s->employee_id,
                    'branch_id' => $working ? ($s->branch_id ?? $emp->branch_id) : null,
                    'date' => $s->date, 'shift_template_id' => $stateTemplate[$s->state] ?? null,
                    'kind' => $working ? 'work' : 'off', 'start_time' => null, 'end_time' => null,
                    'break_minutes' => 0, 'assigned_doctor_id' => $s->assigned_doctor_id, 'room' => null,
                    'note' => $s->note, 'created_by' => $s->created_by,
                ]);
            }
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('shifts')->insert($chunk);
        }
    }

    /**
     * Хуваарь гаргах эрх: хуучин таб түлхүүрүүд ('clinic', 'xray' …) → албан тушаалын id.
     * Хуучин "Эмч · сувилагч" таб салбарын бүх ажилтныг нэмэх боломжтой байсан тул '*' болно.
     */
    private function convertPermissions(): void
    {
        $positions = DB::table('positions')->get(['id', 'name']);
        $match = fn (array $needles) => $positions
            ->filter(function ($p) use ($needles) {
                $name = mb_strtolower($p->name);
                foreach ($needles as $n) {
                    if (str_contains($name, $n)) {
                        return true;
                    }
                }

                return false;
            })
            ->pluck('id')->map(fn ($id) => (string) $id)->all();

        $map = [
            'ortho' => ['гажиг'], 'xray' => ['рентген'], 'sterile' => ['ариутгал'],
            'reception' => ['ресепшн', 'хүлээн'], 'cleaner' => ['үйлчлэгч'], 'technician' => ['техник', 'загвар'],
        ];

        foreach (DB::table('employees')->whereNotNull('schedule_permissions')->get(['id', 'schedule_permissions']) as $e) {
            $old = json_decode((string) $e->schedule_permissions, true);
            if (! is_array($old) || $old === []) {
                continue;
            }

            // Аль хэдийн шинэ хэлбэрт (тоо эсвэл '*') байвал хөндөхгүй.
            if (collect($old)->every(fn ($v) => $v === '*' || ctype_digit((string) $v))) {
                continue;
            }

            $new = in_array('clinic', $old, true) ? ['*'] : [];
            if ($new === []) {
                foreach ($old as $area) {
                    $new = array_merge($new, $match($map[$area] ?? []));
                }
            }

            DB::table('employees')->where('id', $e->id)->update([
                'schedule_permissions' => json_encode(array_values(array_unique($new))),
            ]);
        }
    }

    private function isDoctorName(?string $name): bool
    {
        $p = mb_strtolower((string) $name);

        return str_contains($p, 'эмч') && ! str_contains($p, 'туслах');
    }
};
