<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Http\Controllers\HR\OrthoScheduleController;
use App\Http\Controllers\HR\SupportScheduleController;
use App\Http\Controllers\HR\WorkScheduleController as HrWorkScheduleController;
use App\Models\Branch;
use App\Models\HR\Employee;
use App\Models\HR\OrthoSchedule;
use App\Models\HR\SupportSchedule;
use App\Models\HR\WorkSchedule;
use App\Models\HR\WorkScheduleDay;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Ажилтан өөрийн эрхээрээ нэвтэрч, ЗӨВХӨН өөрийн салбарын хуваарь гаргах хэсэг.
 * HR-ийн хуваарийн компонентыг дахин ашиглана (portal=my, салбар түгжсэн).
 */
class ScheduleManageController extends Controller
{
    /** Хуваарь гаргах эрхтэй ажилтныг буцаана, эсвэл 403. */
    private function manager(): Employee
    {
        $emp = ProfileController::resolveEmployee();
        abort_if(! $emp || ! $emp->canManageAnySchedule(), 403, 'Хуваарь гаргах эрхгүй байна.');
        abort_if(! $emp->branch_id, 403, 'Танд салбар оноогдоогүй байна.');

        return $emp;
    }

    private function roleGroup(?string $position): string
    {
        $p = mb_strtolower($position ?? '');

        return match (true) {
            str_contains($p, 'туслах')                                 => 'assistant',
            str_contains($p, 'сувилагч')                               => 'nurse',
            str_contains($p, 'эмч')                                    => 'doctor',
            str_contains($p, 'рентген')                                => 'xray',
            str_contains($p, 'ресепшн') || str_contains($p, 'хүлээн')  => 'reception',
            str_contains($p, 'үйлчлэгч')                               => 'cleaner',
            str_contains($p, 'загвар') || str_contains($p, 'техник')   => 'technician',
            default                                                    => 'other',
        };
    }

    public function index(Request $request): Response
    {
        $manager = $this->manager();
        $branchId = $manager->branch_id;

        // Зөвшөөрсөн табууд = эрхүүд нь шууд таб түлхүүр (тус тусдаа)
        $order = ['clinic', 'ortho', 'xray', 'sterile', 'reception', 'cleaner', 'technician'];
        $tabs = array_values(array_filter($order, fn ($t) => $manager->canManageSchedule($t)));

        // ── 7 хоног (clinic) ──
        $focus = $request->date('date') ?? now();
        $weekStart = $focus->copy()->startOfWeek(Carbon::MONDAY);
        $weekEnd = $weekStart->copy()->endOfWeek(Carbon::SUNDAY);

        $employees = Employee::with(['position', 'branch'])
            ->where('status', 'active')
            ->where('branch_id', $branchId)
            ->orderBy('last_name')->orderBy('first_name')
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'name' => $e->full_name,
                'position_id' => $e->position_id,
                'position' => $e->position?->name,
                'role_group' => $this->roleGroup($e->position?->name),
                'branch_id' => $e->branch_id,
                'branch' => $e->branch?->name,
                'photo_url' => $e->photo_url,
            ])->values();

        $empIds = $employees->pluck('id');

        $doctors = $employees->where('role_group', 'doctor')
            ->map(fn ($e) => ['id' => $e['id'], 'name' => $e['name']])->values();

        $schedules = WorkSchedule::whereBetween('date', [$weekStart, $weekEnd])
            ->whereIn('employee_id', $empIds)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id, 'employee_id' => $s->employee_id, 'date' => $s->date->format('Y-m-d'),
                'shift_type' => $s->shift_type, 'shift_label' => $s->shift_label,
                'start_time' => $s->start_time ? substr($s->start_time, 0, 5) : null,
                'end_time' => $s->end_time ? substr($s->end_time, 0, 5) : null,
                'room' => $s->room, 'assigned_doctor_id' => $s->assigned_doctor_id,
                'duties' => $s->duties ?? [], 'notes' => $s->notes,
            ])->values();

        $branches = Branch::where('id', $branchId)
            ->get()
            ->map(fn ($b) => ['id' => $b->id, 'name' => $b->name, 'abbr' => mb_substr($b->name, 0, 3)])
            ->values();

        $dayPlans = WorkScheduleDay::whereBetween('date', [$weekStart, $weekEnd])
            ->get()
            ->mapWithKeys(fn ($d) => [$d->date->format('Y-m-d') => $d->tasks ?? new \stdClass]);

        // ── Гажиг засал (ortho) — салбарын туслах эмч ──
        $oYear = $request->integer('oyear', now()->year);
        $oMonth = $request->integer('omonth', now()->month);
        $oStart = Carbon::create($oYear, $oMonth, 1)->startOfMonth();
        $oEnd = $oStart->copy()->endOfMonth();

        $orthoEmployees = Employee::with('position')
            ->where('status', 'active')
            ->where('branch_id', $branchId)
            ->whereHas('position', fn ($q) => $q->where('name', 'like', '%гажиг%'))
            ->orderBy('last_name')->orderBy('first_name')
            ->get();
        $isOrthoAsst = fn (Employee $e) => str_contains(mb_strtolower($e->position?->name ?? ''), 'туслах');

        $orthoAssistants = $orthoEmployees->filter($isOrthoAsst)->map(fn ($e) => [
            'id' => $e->id, 'name' => $e->full_name, 'position' => $e->position?->name, 'photo_url' => $e->photo_url,
        ])->values();
        $orthoDoctors = $orthoEmployees->reject($isOrthoAsst)->map(fn ($e) => [
            'id' => $e->id, 'name' => $e->full_name, 'abbr' => mb_substr($e->first_name ?? $e->full_name, 0, 3),
        ])->values();
        $orthoSchedules = OrthoSchedule::whereBetween('date', [$oStart, $oEnd])
            ->whereIn('employee_id', $orthoEmployees->pluck('id'))
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id, 'employee_id' => $s->employee_id, 'date' => $s->date->format('Y-m-d'),
                'state' => $s->state, 'branch_id' => $s->branch_id, 'assigned_doctor_id' => $s->assigned_doctor_id, 'note' => $s->note,
            ])->values();

        // ── Туслах ажилтан (support) — салбарынх ──
        $sWeekStart = ($request->date('sdate') ?? now())->copy()->startOfWeek(Carbon::MONDAY);
        $sWeekEnd = $sWeekStart->copy()->endOfWeek(Carbon::SUNDAY);

        $supportStaff = Employee::with(['position', 'branch'])
            ->where('status', 'active')
            ->where('branch_id', $branchId)
            ->whereHas('position', fn ($q) => $q
                ->where('name', 'like', '%рентген%')
                ->orWhere('name', 'like', '%ариутгал%')
                ->orWhere('name', 'like', '%ресепшн%')
                ->orWhere('name', 'like', '%хүлээн%')
                ->orWhere('name', 'like', '%үйлчлэгч%')
                ->orWhere('name', 'like', '%техник%')
                ->orWhere('name', 'like', '%загвар%'))
            ->orderBy('last_name')->orderBy('first_name')
            ->get()
            ->map(function ($e) {
                $p = mb_strtolower($e->position?->name ?? '');
                $group = str_contains($p, 'рентген') ? 'xray'
                    : (str_contains($p, 'ариутгал') ? 'sterile'
                    : (str_contains($p, 'үйлчлэгч') ? 'cleaner'
                    : (str_contains($p, 'техник') || str_contains($p, 'загвар') ? 'technician'
                    : 'reception')));

                return [
                    'id' => $e->id, 'name' => $e->full_name, 'position' => $e->position?->name,
                    'photo_url' => $e->photo_url, 'branch_id' => $e->branch_id, 'group' => $group,
                ];
            })->values();

        $supportSchedules = SupportSchedule::whereBetween('date', [$sWeekStart, $sWeekEnd])
            ->whereIn('employee_id', $supportStaff->pluck('id'))
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id, 'employee_id' => $s->employee_id, 'date' => $s->date->format('Y-m-d'),
                'shift_type' => $s->shift_type,
                'start_time' => $s->start_time ? substr($s->start_time, 0, 5) : null,
                'end_time' => $s->end_time ? substr($s->end_time, 0, 5) : null,
                'note' => $s->note,
            ])->values();

        return Inertia::render('hr/work-schedules/index', [
            'employees' => $employees,
            'doctors' => $doctors,
            'branches' => $branches,
            'schedules' => $schedules,
            'day_plans' => $dayPlans,
            'reception_tasks' => WorkScheduleDay::RECEPTION_TASKS,
            'nurse_tasks' => WorkScheduleDay::NURSE_TASKS,
            'week_start' => $weekStart->format('Y-m-d'),
            'ortho_assistants' => $orthoAssistants,
            'ortho_doctors' => $orthoDoctors,
            'ortho_schedules' => $orthoSchedules,
            'ortho_states' => OrthoSchedule::STATES,
            'ortho_year' => $oYear,
            'ortho_month' => $oMonth,
            'support_staff' => $supportStaff,
            'support_schedules' => $supportSchedules,
            'support_shifts' => SupportSchedule::SHIFTS,
            'support_week_start' => $sWeekStart->format('Y-m-d'),
            // Дахин ашиглах тохиргоо
            'portal' => 'my',
            'route_base' => [
                'work' => '/my/schedule-manage',
                'ortho' => '/my/schedule-manage/ortho',
                'support' => '/my/schedule-manage/support',
            ],
            'locked_branch_id' => $branchId,
            'allowed_tabs' => $tabs,
            'manager_name' => $manager->full_name,
            'manager_position' => $manager->position?->name,
        ]);
    }

    /** Тухайн employee_id манай салбарынх мөн эсэхийг шалгана. */
    private function assertBranch(int $employeeId, Employee $manager): void
    {
        $emp = Employee::find($employeeId);
        abort_if(! $emp || $emp->branch_id !== $manager->branch_id, 403, 'Өөр салбарын ажилтан.');
    }

    private function assertArea(Employee $manager, string $area): void
    {
        abort_unless($manager->canManageSchedule($area), 403, 'Энэ хуваарь гаргах эрхгүй байна.');
    }

    /** Туслах ажилтны албан тушаалаас таб бүлгийг тодорхойлно. */
    private function supportGroup(?string $position): ?string
    {
        $p = mb_strtolower($position ?? '');

        return match (true) {
            str_contains($p, 'рентген')                                => 'xray',
            str_contains($p, 'ариутгал')                               => 'sterile',
            str_contains($p, 'үйлчлэгч')                               => 'cleaner',
            str_contains($p, 'техник') || str_contains($p, 'загвар')   => 'technician',
            str_contains($p, 'ресепшн') || str_contains($p, 'хүлээн')  => 'reception',
            default                                                    => null,
        };
    }

    /** Тухайн туслах ажилтны бүлгийн эрхийг шалгана. */
    private function assertSupportArea(Employee $manager, int $employeeId): void
    {
        $emp = Employee::with('position')->find($employeeId);
        $group = $this->supportGroup($emp?->position?->name);
        abort_unless($group && $manager->canManageSchedule($group), 403, 'Энэ хуваарь гаргах эрхгүй байна.');
    }

    // ── Clinic (эмч сувилагч) ──
    public function storeWork(Request $request): RedirectResponse
    {
        $m = $this->manager();
        $this->assertArea($m, 'clinic');
        $this->assertBranch((int) $request->input('employee_id'), $m);

        return app(HrWorkScheduleController::class)->store($request);
    }

    public function rowFillWork(Request $request): RedirectResponse
    {
        $m = $this->manager();
        $this->assertArea($m, 'clinic');
        $this->assertBranch((int) $request->input('employee_id'), $m);

        return app(HrWorkScheduleController::class)->rowFill($request);
    }

    public function saveTasks(Request $request): RedirectResponse
    {
        $m = $this->manager();
        $this->assertArea($m, 'clinic');

        return app(HrWorkScheduleController::class)->saveTasks($request);
    }

    public function destroyWork(WorkSchedule $workSchedule): RedirectResponse
    {
        $m = $this->manager();
        $this->assertArea($m, 'clinic');
        $this->assertBranch($workSchedule->employee_id, $m);

        return app(HrWorkScheduleController::class)->destroy($workSchedule);
    }

    // ── Ortho (гажиг засал) ──
    public function storeOrtho(Request $request): RedirectResponse
    {
        $m = $this->manager();
        $this->assertArea($m, 'ortho');
        $this->assertBranch((int) $request->input('employee_id'), $m);

        return app(OrthoScheduleController::class)->store($request);
    }

    public function rangeOrtho(Request $request): RedirectResponse
    {
        $m = $this->manager();
        $this->assertArea($m, 'ortho');
        // all_assistants-ийг салбарын хэмжээнд хязгаарлахын тулд хориглоно
        abort_if($request->boolean('all_assistants'), 403, 'Бүх туслах эмчид мөрдөх эрхгүй.');
        $this->assertBranch((int) $request->input('employee_id'), $m);

        return app(OrthoScheduleController::class)->range($request);
    }

    public function clearRangeOrtho(Request $request): RedirectResponse
    {
        $m = $this->manager();
        $this->assertArea($m, 'ortho');
        $this->assertBranch((int) $request->input('employee_id'), $m);

        return app(OrthoScheduleController::class)->clearRange($request);
    }

    public function destroyOrtho(OrthoSchedule $orthoSchedule): RedirectResponse
    {
        $m = $this->manager();
        $this->assertArea($m, 'ortho');
        $this->assertBranch($orthoSchedule->employee_id, $m);

        return app(OrthoScheduleController::class)->destroy($orthoSchedule);
    }

    // ── Support (туслах ажилтан — таб бүлэг тус бүрийн эрхээр) ──
    public function storeSupport(Request $request): RedirectResponse
    {
        $m = $this->manager();
        $empId = (int) $request->input('employee_id');
        $this->assertBranch($empId, $m);
        $this->assertSupportArea($m, $empId);

        return app(SupportScheduleController::class)->store($request);
    }

    public function rowFillSupport(Request $request): RedirectResponse
    {
        $m = $this->manager();
        $empId = (int) $request->input('employee_id');
        $this->assertBranch($empId, $m);
        $this->assertSupportArea($m, $empId);

        return app(SupportScheduleController::class)->rowFill($request);
    }

    public function destroySupport(SupportSchedule $supportSchedule): RedirectResponse
    {
        $m = $this->manager();
        $this->assertBranch($supportSchedule->employee_id, $m);
        $this->assertSupportArea($m, $supportSchedule->employee_id);

        return app(SupportScheduleController::class)->destroy($supportSchedule);
    }
}
