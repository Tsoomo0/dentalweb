<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\Employee;
use App\Models\HR\SchedulePattern;
use App\Models\HR\Shift;
use App\Models\HR\ShiftSwapRequest;
use App\Models\HR\ShiftTemplate;
use App\Models\HR\StaffingRule;
use App\Services\Schedule\EffectiveShifts;
use App\Services\Schedule\ScheduleSettings;
use App\Services\Schedule\ShiftSwapService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Хуваарийн тохиргоо (зөвхөн HR): ээлжийн загвар, давтагдах хэв маяг,
 * хүн хүчний шаардлага, ирцийн дүрэм, ээлж солих хүсэлтийн шийдвэр.
 */
class ScheduleSetupController extends Controller
{
    // ── Ээлжийн загвар ─────────────────────────────────────────────────────

    public function storeTemplate(Request $request): RedirectResponse
    {
        $data = $this->validateTemplate($request);
        $data['sort_order'] = (int) ShiftTemplate::max('sort_order') + 1;
        ShiftTemplate::create($data);

        return back()->with('success', 'Ээлжийн загвар нэмэгдлээ.');
    }

    public function updateTemplate(Request $request, ShiftTemplate $template): RedirectResponse
    {
        $template->update($this->validateTemplate($request));

        return back()->with('success', 'Ээлжийн загвар шинэчлэгдлээ.');
    }

    /** Хэрэглэгдэж байсан загварыг устгахгүй, идэвхгүй болгоно — хуучин хуваарийн нэр/өнгө хадгалагдана. */
    public function destroyTemplate(ShiftTemplate $template): RedirectResponse
    {
        if (Shift::where('shift_template_id', $template->id)->exists()) {
            $template->update(['is_active' => false]);

            return back()->with('success', 'Загвар хуваарьт хэрэглэгдсэн тул идэвхгүй болголоо.');
        }

        $template->delete();

        return back()->with('success', 'Ээлжийн загвар устгагдлаа.');
    }

    public function reorderTemplates(Request $request): RedirectResponse
    {
        $data = $request->validate(['ids' => 'required|array', 'ids.*' => 'integer|exists:shift_templates,id']);
        foreach ($data['ids'] as $i => $id) {
            ShiftTemplate::whereKey($id)->update(['sort_order' => $i + 1]);
        }

        return back();
    }

    private function validateTemplate(Request $request): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:50',
            'code' => 'required|string|max:4',
            'kind' => 'required|in:work,off',
            'start_time' => 'nullable|date_format:H:i|required_with:end_time',
            'end_time' => 'nullable|date_format:H:i|required_with:start_time',
            'break_minutes' => 'nullable|integer|min:0|max:600',
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'branch_id' => 'nullable|integer|exists:branches,id',
            'position_ids' => 'nullable|array',
            'position_ids.*' => 'integer|exists:positions,id',
            'is_active' => 'boolean',
        ], [
            'start_time.required_with' => 'Эхлэх цагийг оруулна уу.',
            'end_time.required_with' => 'Дуусах цагийг оруулна уу.',
            'color.regex' => 'Өнгө #RRGGBB хэлбэртэй байна.',
        ]);

        $off = $data['kind'] === 'off';

        return [
            'name' => trim($data['name']),
            'code' => trim($data['code']),
            'kind' => $data['kind'],
            'start_time' => $off ? null : ($data['start_time'] ?? null),
            'end_time' => $off ? null : ($data['end_time'] ?? null),
            'break_minutes' => $off ? 0 : (int) ($data['break_minutes'] ?? 0),
            'color' => strtolower($data['color']),
            'branch_id' => $data['branch_id'] ?? null,
            'position_ids' => ! empty($data['position_ids']) ? array_values(array_map('intval', $data['position_ids'])) : null,
            'is_active' => $data['is_active'] ?? true,
        ];
    }

    // ── Давтагдах хэв маяг ─────────────────────────────────────────────────

    public function savePattern(Request $request, Employee $employee): RedirectResponse
    {
        $data = $request->validate([
            'cycle_weeks' => 'required|integer|min:1|max:4',
            'starts_on' => 'required|date_format:Y-m-d',
            'days' => 'required|array',
            'days.*' => 'present|array|max:2',
            'days.*.*.template_id' => 'required|integer|exists:shift_templates,id',
            'days.*.*.branch_id' => 'nullable|integer|exists:branches,id',
            'is_active' => 'boolean',
        ]);

        $length = $data['cycle_weeks'] * 7;
        $days = [];
        for ($i = 0; $i < $length; $i++) {
            $days[] = array_values(array_map(fn ($e) => [
                'template_id' => (int) $e['template_id'],
                'branch_id' => isset($e['branch_id']) ? (int) $e['branch_id'] : null,
            ], $data['days'][$i] ?? []));
        }

        SchedulePattern::updateOrCreate(['employee_id' => $employee->id], [
            'cycle_weeks' => $data['cycle_weeks'],
            'starts_on' => Carbon::parse($data['starts_on'])->startOfWeek(Carbon::MONDAY)->toDateString(),
            'days' => $days,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return back()->with('success', "{$employee->short_name}-ийн хэв маяг хадгалагдлаа.");
    }

    /** Ажилтны тухайн 7 хоногийн хуваарийг шууд хэв маяг болгоно (1 долоо хоногийн мөчлөг). */
    public function patternFromWeek(Request $request, Employee $employee): RedirectResponse
    {
        $data = $request->validate(['monday' => 'required|date_format:Y-m-d']);
        $monday = Carbon::parse($data['monday'])->startOfWeek(Carbon::MONDAY);

        $live = EffectiveShifts::live(EffectiveShifts::resolve(
            Shift::where('employee_id', $employee->id)
                ->whereBetween('date', [$monday->toDateString(), $monday->copy()->addDays(6)->toDateString()])->get()
        ));

        $days = array_fill(0, 7, []);
        foreach ($live as $s) {
            if ($s->shift_template_id) {
                $days[$s->date->dayOfWeekIso - 1][] = [
                    'template_id' => $s->shift_template_id,
                    'branch_id' => $s->branch_id && $s->branch_id !== $employee->branch_id ? $s->branch_id : null,
                ];
            }
        }

        if (collect($days)->flatten(1)->isEmpty()) {
            return back()->with('error', 'Энэ 7 хоногт загвартай ээлж алга — эхлээд хуваариа оруулна уу.');
        }

        SchedulePattern::updateOrCreate(['employee_id' => $employee->id], [
            'cycle_weeks' => 1, 'starts_on' => $monday->toDateString(), 'days' => $days, 'is_active' => true,
        ]);

        return back()->with('success', "{$employee->short_name}-ийн энэ 7 хоногийн хуваарь хэв маяг боллоо.");
    }

    public function destroyPattern(Employee $employee): RedirectResponse
    {
        SchedulePattern::where('employee_id', $employee->id)->delete();

        return back()->with('success', 'Хэв маяг устгагдлаа.');
    }

    // ── Хүн хүчний шаардлага ───────────────────────────────────────────────

    public function saveRule(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'position_id' => 'required|integer|exists:positions,id',
            'min_count' => 'required|integer|min:0|max:50',
            'weekdays' => 'nullable|array',
            'weekdays.*' => 'integer|between:1,7',
        ]);

        if ((int) $data['min_count'] === 0) {
            StaffingRule::where('branch_id', $data['branch_id'])->where('position_id', $data['position_id'])->delete();

            return back()->with('success', 'Шаардлага хасагдлаа.');
        }

        StaffingRule::updateOrCreate(
            ['branch_id' => $data['branch_id'], 'position_id' => $data['position_id']],
            ['min_count' => $data['min_count'], 'weekdays' => ! empty($data['weekdays']) && count($data['weekdays']) < 7
                ? array_values(array_unique(array_map('intval', $data['weekdays']))) : null],
        );

        return back()->with('success', 'Хүн хүчний шаардлага хадгалагдлаа.');
    }

    public function destroyRule(StaffingRule $rule): RedirectResponse
    {
        $rule->delete();

        return back()->with('success', 'Шаардлага хасагдлаа.');
    }

    // ── Ирц / хуваарийн дүрэм ──────────────────────────────────────────────

    public function saveSettings(Request $request): RedirectResponse
    {
        $rules = [];
        foreach (ScheduleSettings::DEFAULTS as $key => [, $min, $max]) {
            $rules[$key] = "required|integer|min:{$min}|max:{$max}";
        }

        ScheduleSettings::save($request->validate($rules));

        return back()->with('success', 'Дүрэм хадгалагдлаа.');
    }

    // ── Ээлж солих хүсэлт ──────────────────────────────────────────────────

    public function decideSwap(Request $request, ShiftSwapRequest $swap, ShiftSwapService $service): RedirectResponse
    {
        $data = $request->validate([
            'approve' => 'required|boolean',
            'reason' => ['nullable', 'string', 'max:500', Rule::requiredIf(! $request->boolean('approve'))],
        ], ['reason.required' => 'Татгалзах шалтгаанаа бичнэ үү.']);

        $service->decide($swap, (bool) $data['approve'], $request->user()?->id, $data['reason'] ?? null);

        return back()->with('success', $data['approve'] ? 'Ээлж шилжүүлэлт батлагдлаа.' : 'Хүсэлт татгалзагдлаа.');
    }
}
