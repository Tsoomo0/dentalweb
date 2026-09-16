<?php

namespace App\Http\Controllers\Admin;

use App\Exports\LabEmployeeWorkExport;
use App\Http\Controllers\Controller;
use App\Models\HR\Employee;
use App\Models\LabOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Лаб ажилтны гүйцэтгэл — хэн ямар ажил хийснийг сар / улирал / жилээр харна.
 *
 * Ажлыг хоёр эх сурвалжаас цуглуулна:
 *   1. lab_order_employee        — анхны мөчлөгийн нугалсан / өнгөлсөн
 *   2. lab_order_return_employee — буцаалтын мөчлөгийн нугалсан / өнгөлсөн
 *
 * Ажил "хэзээ хийгдсэн" гэдгийг лаб дуусгасан огноогоор тооцно
 * (байхгүй бол захиалсан огноогоор).
 */
class LabEmployeeController extends Controller
{
    private const LAB = 'Кутикул лаб';

    public function index(Request $request): Response
    {
        [$from, $to, $filters] = $this->period($request);

        // Ажлын төрлөөр шүүх — сонгосон ажилд хэн хэдийг хийснийг харна
        $work = trim((string) $request->input('work', '')) ?: null;
        $filters['work'] = $work;

        $employees = $this->labEmployees();

        $original = $this->originalWorkCounts($from, $to, $work);   // өөрийн хийсэн анхны ажил
        $quality  = $this->returnedAgainst($from, $to, $work);      // өөрийн ажлаас хэд нь буцаагдсан
        $fixed    = $this->fixWorkCounts($from, $to, $work);        // буцаалтыг янзалсан ажил

        $rows = $employees->map(function (Employee $e) use ($original, $quality, $fixed) {
            $o = $original[$e->id] ?? ['bender' => 0, 'polisher' => 0, 'orders' => 0];
            $q = $quality[$e->id]  ?? 0;
            $f = $fixed[$e->id]    ?? ['bender' => 0, 'polisher' => 0];

            return [
                'id'              => $e->id,
                'employee_number' => $e->employee_number,
                'name'            => $e->short_name,
                'full_name'       => $e->full_name,
                'branch_name'     => $e->branch?->name,
                'photo_url'       => $e->photo_url,
                'status'          => $e->status,
                'bender'          => $o['bender'],
                'polisher'        => $o['polisher'],
                'total'           => $o['bender'] + $o['polisher'],
                // Чанарын үзүүлэлт — ӨӨРИЙН хийсэн ажлаас хэд нь буцаагдсан
                'orders'          => $o['orders'],
                'returned'        => $q,
                'return_rate'     => $o['orders'] > 0 ? round($q / $o['orders'] * 100) : 0,
                // Бусдын буцаалтыг янзалсан ажил — чанарын алдаа биш, нэмэлт ажил
                'fixed'           => $f['bender'] + $f['polisher'],
            ];
        })
            ->sortByDesc(fn ($r) => $r['total'] + $r['fixed'])
            ->values()
            ->all();

        return Inertia::render('admin/lab-employees/index', [
            'employees' => $rows,
            'filters'   => $filters,
            'years'     => $this->availableYears(),
            'workTypes' => $this->workTypes($from, $to),
        ]);
    }

    public function show(Request $request, Employee $employee): Response
    {
        abort_unless($employee->position?->portal === 'lab', 404);

        [$from, $to, $filters] = $this->period($request);
        // Жагсаалтаас ажлын төрлөөр шүүж ирвэл тэр сонголтыг үргэлжлүүлнэ
        $filters['work'] = trim((string) $request->input('work', '')) ?: null;

        $works = collect($this->workRows($employee->id, $from, $to));

        $own      = $works->where('is_return', false);
        $returned = $own->where('order_returned', true);

        $summary = [
            'total'         => $works->count(),
            'own'           => $own->count(),
            'bender'        => $own->where('role', 'bender')->count(),
            'polisher'      => $own->where('role', 'polisher')->count(),
            // Чанар — өөрийн ажлаас хэд нь буцаагдсан (тусдаа захиалгаар)
            'orders'        => $own->pluck('lab_order_id')->unique()->count(),
            'returned'      => $returned->pluck('lab_order_id')->unique()->count(),
            // Бусдын буцаалтыг янзалсан
            'fixed'         => $works->where('is_return', true)->count(),
            'work_types'    => $works->groupBy('work_description')
                ->map->count()->sortDesc()->take(10)
                ->map(fn ($c, $w) => ['work' => $w, 'count' => $c])->values()->all(),
        ];
        $summary['return_rate'] = $summary['orders'] > 0
            ? round($summary['returned'] / $summary['orders'] * 100)
            : 0;

        return Inertia::render('admin/lab-employees/show', [
            'monthly' => $this->monthlySeries($works),
            'employee' => [
                'id'              => $employee->id,
                'employee_number' => $employee->employee_number,
                'name'            => $employee->short_name,
                'full_name'       => $employee->full_name,
                'branch_name'     => $employee->branch?->name,
                'photo_url'       => $employee->photo_url,
                'position_name'   => $employee->position?->name,
                'phone'           => $employee->phone,
                'status'          => $employee->status,
            ],
            'works'   => $works,
            'summary' => $summary,
            'filters' => $filters,
            'years'   => $this->availableYears(),
        ]);
    }

    /**
     * Excel татах — сар/улирал/жилээр, сонгосон баганын бүлгүүдээр.
     *
     * groups: main | role | process | returns | money  (таслалаар)
     */
    public function export(Request $request, Employee $employee): BinaryFileResponse
    {
        abort_unless($employee->position?->portal === 'lab', 404);

        [$from, $to, $filters] = $this->period($request);
        $work = trim((string) $request->input('work', '')) ?: null;

        $groups = collect(explode(',', (string) $request->input('groups', 'main,role,process,returns,money')))
            ->map(fn ($g) => trim($g))
            ->filter()
            ->all();
        if (! $groups) {
            $groups = ['main'];
        }

        $rows = collect($this->workRows($employee->id, $from, $to))
            ->when($work, fn ($c) => $c->where('work_description', $work))
            ->values();

        [$headings, $data] = $this->buildSheet($rows, $groups);

        $period = $this->periodLabel($filters);
        $subtitle = collect([
            $employee->full_name.' ('.$employee->employee_number.')',
            $period,
            $work ? 'Ажил: '.$work : null,
            'Нийт '.$rows->count().' мөр',
            'Татсан: '.now()->format('Y-m-d H:i'),
        ])->filter()->implode(' · ');

        $file = 'lab-'.$employee->employee_number.'-'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(
            new LabEmployeeWorkExport($headings, $data, $subtitle, $employee->short_name),
            $file
        );
    }

    /** Сонгосон бүлгүүдээр багана угсарна */
    private function buildSheet($rows, array $groups): array
    {
        $headings = [];
        if (in_array('main', $groups, true)) {
            $headings = array_merge($headings, [
                'Огноо', 'Захиалга №', 'Өвчтөн', 'Утас', 'Ажил', 'Салбар', 'Эмч',
            ]);
        }
        if (in_array('role', $groups, true)) {
            $headings = array_merge($headings, ['Үүрэг', 'Төрөл']);
        }
        if (in_array('process', $groups, true)) {
            $headings = array_merge($headings, [
                '1. Захиалсан', '2. Лаб руу явсан', '3. Лаб бэлэн болсон',
                '4. Ресепшнд ирсэн', '5. Үйлчлүүлэгч авсан', 'Одоогийн явц',
            ]);
        }
        if (in_array('returns', $groups, true)) {
            $headings = array_merge($headings, ['Буцаалт (удаа)', 'Буцаалтын мөчлөг', 'Буцаалтын шалтгаан']);
        }
        if (in_array('money', $groups, true)) {
            $headings = array_merge($headings, ['Төлөх дүн', 'Хөнгөлөлт %', 'Цэвэр төлөх', 'Төлсөн', 'Дутуу']);
        }

        $data = $rows->map(function (array $w) use ($groups) {
            $row = [];
            if (in_array('main', $groups, true)) {
                $row = array_merge($row, [
                    $w['work_date'] ?? '—',
                    $w['lab_order_id'],
                    $w['patient'] ?: '—',
                    $w['patient_phone'] ?? '—',
                    $w['work_description'],
                    $w['branch_name'] ?? '—',
                    $w['doctor_name'] ?? '—',
                ]);
            }
            if (in_array('role', $groups, true)) {
                $row = array_merge($row, [
                    $w['role'] === 'bender' ? 'Нугалсан' : 'Өнгөлсөн',
                    match (true) {
                        $w['is_return']      => 'Янзалсан'.($w['attempt'] ? ' #'.$w['attempt'] : ''),
                        $w['order_returned'] => 'Буцаагдсан'.($w['return_count'] > 1 ? ' '.$w['return_count'].'x' : ''),
                        default              => 'Анхны ажил',
                    },
                ]);
            }
            if (in_array('process', $groups, true)) {
                $row = array_merge($row, [
                    $w['order_date'] ?? '—',
                    $w['sent_to_lab_date'] ?? '—',
                    $w['lab_ready_date'] ?? '—',
                    $w['arrived_date'] ?? '—',
                    $w['pickup_date'] ?? '—',
                    $this->processLabel($w),
                ]);
            }
            if (in_array('returns', $groups, true)) {
                $cycles = collect($w['return_cycles']);
                $row = array_merge($row, [
                    $w['return_count'] ?: '—',
                    $cycles->isNotEmpty()
                        ? $cycles->map(fn ($c) => '#'.$c['attempt'].' '.($c['returned_at'] ?? '?').' → '.($c['ready_date'] ?? 'янзлагдаагүй'))->implode(' | ')
                        : '—',
                    $cycles->isNotEmpty()
                        ? $cycles->map(fn ($c) => '#'.$c['attempt'].': '.$c['reason'])->implode(' | ')
                        : '—',
                ]);
            }
            if (in_array('money', $groups, true)) {
                $row = array_merge($row, [
                    $w['amount_due'],
                    $w['discount_percent'] ?: 0,
                    $w['effective_due'],
                    $w['amount_paid'],
                    $w['outstanding'],
                ]);
            }

            return $row;
        })->all();

        return [$headings, $data];
    }

    private function processLabel(array $w): string
    {
        return match (true) {
            $w['return_status'] === LabOrder::RETURN_SENT  => 'Буцаалт лаб дээр',
            $w['return_status'] === LabOrder::RETURN_READY => 'Буцаалт янзлагдсан',
            $w['is_completed']          => 'Дууссан',
            (bool) $w['pickup_date']    => 'Үйлчлүүлэгч авсан',
            (bool) $w['arrived_date']   => 'Ресепшнд ирсэн',
            (bool) $w['lab_ready_date'] => 'Лаб бэлэн болсон',
            (bool) $w['sent_to_lab_date'] => 'Лаб дээр байна',
            default                     => 'Захиалсан',
        };
    }

    /** Сонгосон хугацааг хүн уншихаар бичих */
    private function periodLabel(array $f): string
    {
        if (! $f['year']) {
            return 'Бүх хугацаа';
        }
        if ($f['month']) {
            return $f['year'].' оны '.$f['month'].'-р сар';
        }
        if ($f['quarter']) {
            return $f['year'].' оны '.$f['quarter'].'-р улирал';
        }

        return $f['year'].' он';
    }

    /** Сар бүрийн ажлын тоо — графикт зориулав (шинэ нь сүүлд) */
    private function monthlySeries($works): array
    {
        return $works
            ->filter(fn ($w) => $w['work_date'])
            ->groupBy(fn ($w) => substr($w['work_date'], 0, 7))   // YYYY-MM
            ->map(fn ($rows, $month) => [
                'month'    => $month,
                'label'    => (int) substr($month, 5, 2).'-р сар',
                'own'      => collect($rows)->where('is_return', false)->count(),
                'fixed'    => collect($rows)->where('is_return', true)->count(),
                'returned' => collect($rows)->where('is_return', false)->where('order_returned', true)->count(),
            ])
            ->sortKeys()
            ->values()
            ->all();
    }

    // ── Хугацааны шүүлт ──────────────────────────────────────────────────────

    /**
     * year / quarter / month давхар сонголт.
     * Илүү нарийн нь давамгайлна: сар > улирал > жил.
     *
     * @return array{0: ?Carbon, 1: ?Carbon, 2: array}
     */
    private function period(Request $request): array
    {
        $year    = $request->integer('year')   ?: null;
        $quarter = $request->integer('quarter') ?: null;
        $month   = $request->integer('month')  ?: null;

        // Жилгүйгээр улирал/сар утгагүй тул цэвэрлэнэ
        if (! $year) {
            $quarter = null;
            $month = null;
        }
        if ($month && ($month < 1 || $month > 12)) {
            $month = null;
        }
        if ($quarter && ($quarter < 1 || $quarter > 4)) {
            $quarter = null;
        }
        // Сар сонгосон бол түүнийг агуулах улирлыг автоматаар тааруулна
        if ($year && $month) {
            $quarter = (int) ceil($month / 3);
        }

        $filters = ['year' => $year, 'quarter' => $quarter, 'month' => $month];

        if (! $year) {
            return [null, null, $filters];
        }
        if ($month) {
            $from = Carbon::create($year, $month, 1)->startOfMonth();

            return [$from, $from->copy()->endOfMonth(), $filters];
        }
        if ($quarter) {
            $from = Carbon::create($year, ($quarter - 1) * 3 + 1, 1)->startOfMonth();

            return [$from, $from->copy()->addMonths(2)->endOfMonth(), $filters];
        }

        $from = Carbon::create($year, 1, 1)->startOfYear();

        return [$from, $from->copy()->endOfYear(), $filters];
    }

    /** Өгөгдөлд байгаа жилүүд — сонгогчид */
    private function availableYears(): array
    {
        return LabOrder::where('lab_name', self::LAB)
            ->selectRaw('DISTINCT YEAR(COALESCE(lab_ready_date, order_date)) as y')
            ->orderByDesc('y')
            ->pluck('y')
            ->filter()
            ->map(fn ($y) => (int) $y)
            ->values()
            ->all();
    }

    // ── Өгөгдөл цуглуулах ────────────────────────────────────────────────────

    private function labEmployees()
    {
        return Employee::with(['branch', 'position'])
            ->whereHas('position', fn ($q) => $q->where('portal', 'lab'))
            ->orderBy('last_name')
            ->get();
    }

    /**
     * Анхны мөчлөгийн ажлын тоо.
     * [employee_id => ['bender' => n, 'polisher' => n, 'orders' => тусдаа захиалгын тоо]]
     */
    private function originalWorkCounts(?Carbon $from, ?Carbon $to, ?string $work = null): array
    {
        $rows = $this->originalScope($from, $to, $work)
            ->selectRaw('p.employee_id, p.role, COUNT(*) as c')
            ->groupBy('p.employee_id', 'p.role')
            ->get();

        $out = $this->pivotCounts($rows);

        // Нэг захиалгыг нугалаад өнгөлсөн бол 2 мөр болох тул тусдаа тоолно
        $orders = $this->originalScope($from, $to, $work)
            ->selectRaw('p.employee_id, COUNT(DISTINCT p.lab_order_id) as c')
            ->groupBy('p.employee_id')
            ->pluck('c', 'employee_id');

        foreach ($orders as $empId => $c) {
            $out[$empId] ??= ['bender' => 0, 'polisher' => 0];
            $out[$empId]['orders'] = (int) $c;
        }

        return $out;
    }

    /**
     * Чанарын үзүүлэлт — тухайн ажилтны ХИЙСЭН ажлаас хэд нь буцаагдсан бэ.
     * Буцаалтыг янзалсан ажилтанд биш, анхны ажлыг хийсэн ажилтанд тооцно.
     */
    private function returnedAgainst(?Carbon $from, ?Carbon $to, ?string $work = null): array
    {
        return $this->originalScope($from, $to, $work)
            ->where('o.return_count', '>', 0)
            ->selectRaw('p.employee_id, COUNT(DISTINCT p.lab_order_id) as c')
            ->groupBy('p.employee_id')
            ->pluck('c', 'employee_id')
            ->map(fn ($c) => (int) $c)
            ->all();
    }

    /** Буцаалтыг янзалсан ажлын тоо — нэмэлт ажил, чанарын алдаа биш */
    private function fixWorkCounts(?Carbon $from, ?Carbon $to, ?string $work = null): array
    {
        $rows = $this->returnScope($from, $to, $work)
            ->selectRaw('p.employee_id, p.role, COUNT(*) as c')
            ->groupBy('p.employee_id', 'p.role')
            ->get();

        return $this->pivotCounts($rows);
    }

    private function originalScope(?Carbon $from, ?Carbon $to, ?string $work = null)
    {
        return DB::table('lab_order_employee as p')
            ->join('lab_orders as o', 'o.id', '=', 'p.lab_order_id')
            ->where('o.lab_name', self::LAB)
            ->whereNull('o.deleted_at')
            ->when($work, fn ($q) => $q->where('o.work_description', $work))
            ->when($from, fn ($q) => $q->whereRaw('COALESCE(o.lab_ready_date, o.order_date) BETWEEN ? AND ?', [
                $from->toDateString(), $to->toDateString(),
            ]));
    }

    private function returnScope(?Carbon $from, ?Carbon $to, ?string $work = null)
    {
        return DB::table('lab_order_return_employee as p')
            ->join('lab_order_returns as r', 'r.id', '=', 'p.lab_order_return_id')
            ->join('lab_orders as o', 'o.id', '=', 'r.lab_order_id')
            ->where('o.lab_name', self::LAB)
            ->whereNull('o.deleted_at')
            ->whereNull('r.cancelled_at')
            ->when($work, fn ($q) => $q->where('o.work_description', $work))
            ->when($from, fn ($q) => $q->whereRaw('COALESCE(r.ready_date, DATE(r.returned_at)) BETWEEN ? AND ?', [
                $from->toDateString(), $to->toDateString(),
            ]));
    }

    /** Сонгосон хугацаанд ажилтан оноогдсон ажлын төрлүүд — тоотойгоо */
    private function workTypes(?Carbon $from, ?Carbon $to): array
    {
        return $this->originalScope($from, $to)
            ->selectRaw('o.work_description as work, COUNT(DISTINCT p.lab_order_id) as c')
            ->groupBy('o.work_description')
            ->orderByDesc('c')
            ->get()
            ->map(fn ($r) => ['value' => $r->work, 'count' => (int) $r->c])
            ->all();
    }

    private function pivotCounts($rows): array
    {
        $out = [];
        foreach ($rows as $r) {
            $out[$r->employee_id] ??= ['bender' => 0, 'polisher' => 0];
            $out[$r->employee_id][$r->role] = (int) $r->c;
        }

        return $out;
    }

    /** Нэг ажилтны хийсэн ажлын дэлгэрэнгүй жагсаалт (шинэ нь эхэнд) */
    private function workRows(int $employeeId, ?Carbon $from, ?Carbon $to): array
    {
        // Excel шиг бүрэн мэдээлэл — хоёр эх сурвалжид ижил багана
        $columns = "
            o.id, p.role,
            o.order_date, o.sent_to_lab_date, o.lab_ready_date,
            o.arrived_date, o.pickup_date,
            o.work_description, o.patient_last_name, o.patient_first_name, o.patient_phone,
            b.name as branch_name, d.name as doctor_name,
            o.amount_due, o.discount_percent, o.amount_paid,
            o.is_completed, o.return_count, o.return_status,
        ";

        $original = DB::table('lab_order_employee as p')
            ->join('lab_orders as o', 'o.id', '=', 'p.lab_order_id')
            ->leftJoin('branches as b', 'b.id', '=', 'o.branch_id')
            ->leftJoin('doctors as d', 'd.id', '=', 'o.doctor_id')
            ->where('p.employee_id', $employeeId)
            ->where('o.lab_name', self::LAB)
            ->whereNull('o.deleted_at')
            ->when($from, fn ($q) => $q->whereRaw('COALESCE(o.lab_ready_date, o.order_date) BETWEEN ? AND ?', [
                $from->toDateString(), $to->toDateString(),
            ]))
            ->selectRaw($columns."
                COALESCE(o.lab_ready_date, o.order_date) as work_date,
                0 as is_return, NULL as attempt, o.return_reason as reason
            ")
            ->get();

        $returns = DB::table('lab_order_return_employee as p')
            ->join('lab_order_returns as r', 'r.id', '=', 'p.lab_order_return_id')
            ->join('lab_orders as o', 'o.id', '=', 'r.lab_order_id')
            ->leftJoin('branches as b', 'b.id', '=', 'o.branch_id')
            ->leftJoin('doctors as d', 'd.id', '=', 'o.doctor_id')
            ->where('p.employee_id', $employeeId)
            ->where('o.lab_name', self::LAB)
            ->whereNull('o.deleted_at')
            ->whereNull('r.cancelled_at')
            ->when($from, fn ($q) => $q->whereRaw('COALESCE(r.ready_date, DATE(r.returned_at)) BETWEEN ? AND ?', [
                $from->toDateString(), $to->toDateString(),
            ]))
            ->selectRaw($columns."
                COALESCE(r.ready_date, DATE(r.returned_at)) as work_date,
                1 as is_return, r.attempt, r.reason
            ")
            ->get();

        $rows = $original->concat($returns);

        // Мөр бүрийн захиалганд хийгдсэн буцаалтын мөчлөгүүд — явцад харуулна
        $cycles = DB::table('lab_order_returns')
            ->whereIn('lab_order_id', $rows->pluck('id')->unique()->all())
            ->whereNull('cancelled_at')
            ->orderBy('attempt')
            ->get()
            ->groupBy('lab_order_id')
            ->map(fn ($g) => $g->map(fn ($r) => [
                'attempt'     => (int) $r->attempt,
                'returned_at' => $r->returned_at ? substr($r->returned_at, 0, 10) : null,
                'ready_date'  => $r->ready_date,
                'closed_at'   => $r->closed_at ? substr($r->closed_at, 0, 10) : null,
                'reason'      => $r->reason,
            ])->values()->all());

        return $rows
            ->sortByDesc('work_date')
            ->values()
            ->map(function ($w) use ($cycles) {
                $due  = (int) $w->amount_due;
                $pct  = max(0, min(100, (int) $w->discount_percent));
                $net  = (int) round($due * (100 - $pct) / 100);

                return [
                    'lab_order_id'     => (int) $w->id,
                    'work_date'        => $w->work_date,
                    'role'             => $w->role,                     // bender | polisher
                    'work_description' => $w->work_description,
                    'patient'          => trim(($w->patient_last_name ?? '').' '.$w->patient_first_name),
                    'patient_phone'    => $w->patient_phone,
                    'branch_name'      => $w->branch_name,
                    'doctor_name'      => $w->doctor_name,
                    // Ажлын явц
                    'order_date'       => $w->order_date,
                    'sent_to_lab_date' => $w->sent_to_lab_date,
                    'lab_ready_date'   => $w->lab_ready_date,
                    'arrived_date'     => $w->arrived_date,
                    'pickup_date'      => $w->pickup_date,
                    // Тооцоо
                    'amount_due'       => $due,
                    'discount_percent' => $pct,
                    'effective_due'    => $net,
                    'amount_paid'      => (int) $w->amount_paid,
                    'outstanding'      => max(0, $net - (int) $w->amount_paid),
                    // Төлөв
                    'is_completed'     => (bool) $w->is_completed,
                    'return_status'    => $w->return_status,
                    'return_count'     => (int) $w->return_count,
                    // Энэ мөр буцаалтын ажил мөн үү (= бусдын алдааг янзалсан)
                    'is_return'        => (bool) $w->is_return,
                    'attempt'          => $w->attempt !== null ? (int) $w->attempt : null,
                    'reason'           => $w->reason,
                    // Энэ захиалгад хийгдсэн бүх буцаалтын мөчлөг
                    'return_cycles'    => $cycles[$w->id] ?? [],
                    // Энэ нь ӨӨРИЙН ажил бөгөөд дараа нь буцаагдсан эсэх (чанарын алдаа)
                    'order_returned'   => ! $w->is_return && (int) $w->return_count > 0,
                ];
            })
            ->all();
    }
}
