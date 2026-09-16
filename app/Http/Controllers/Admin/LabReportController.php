<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HR\Employee;
use App\Models\LabOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Лабын нэгдсэн тайлан — удирдлагад зориулсан самбар.
 *
 * Хугацааны тэнхлэг нь ЗАХИАЛСАН огноо (order_date). Ажилтны гүйцэтгэлийн
 * хуудас нь лаб дуусгасан огноогоор боддог тул тоо бага зэрэг зөрж болно —
 * тэр нь "хэзээ хийгдсэн", энэ нь "хэзээ захиалагдсан" гэсэн өөр асуулт.
 */
class LabReportController extends Controller
{
    private const LAB = 'Кутикул лаб';

    public function index(Request $request): Response
    {
        [$from, $to, $filters] = $this->period($request);
        $branchId = $request->integer('branch') ?: null;
        $filters['branch'] = $branchId;

        // Багануудыг бүрэн нэрээр заана — доор join хийдэг query-үүд дээр
        // (салбар, эмч) нэр давхцаж, "ambiguous column" алдаа өгдөг.
        $scope = fn () => LabOrder::where('lab_orders.lab_name', self::LAB)
            ->when($branchId, fn ($q) => $q->where('lab_orders.branch_id', $branchId))
            ->when($from, fn ($q) => $q->whereBetween('lab_orders.order_date', [$from->toDateString(), $to->toDateString()]));

        $orders = $scope()->count();
        $returnedOrders = (clone $scope())->where('return_count', '>', 0)->count();

        $stats = [
            'orders'      => $orders,
            'active'      => (clone $scope())->where('is_completed', false)->count(),
            'completed'   => (clone $scope())->where('is_completed', true)->count(),
            'returned'    => $returnedOrders,
            'return_total'=> (int) (clone $scope())->sum('return_count'),
            'return_open' => (clone $scope())->whereIn('return_status', [LabOrder::RETURN_SENT, LabOrder::RETURN_READY])->count(),
            'return_rate' => $orders > 0 ? round($returnedOrders / $orders * 100, 1) : 0,
            'due'         => (int) (clone $scope())->sum('amount_due'),
            'paid'        => (int) (clone $scope())->sum('amount_paid'),
        ];
        $stats['outstanding'] = max(0, $stats['due'] - $stats['paid']);

        return Inertia::render('admin/lab-report/index', [
            'stats'      => $stats,
            'monthly'    => $this->monthly($scope),
            'workTypes'  => $this->byWorkType($scope),
            'branches'   => $this->byBranch($scope, $branchId),
            'doctors'    => $this->byDoctor($scope),
            'employees'  => $this->byEmployee($from, $to, $branchId),
            'reasons'    => $this->returnReasons($from, $to, $branchId),
            'filters'    => $filters,
            'years'      => $this->availableYears(),
            'branchList' => \App\Models\Branch::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /** Сар бүрийн захиалга, дуусгалт, буцаалт, орлого */
    private function monthly(callable $scope): array
    {
        return $scope()
            ->selectRaw("
                DATE_FORMAT(lab_orders.order_date, '%Y-%m') as ym,
                COUNT(*) as orders,
                SUM(lab_orders.is_completed) as completed,
                SUM(CASE WHEN lab_orders.return_count > 0 THEN 1 ELSE 0 END) as returned,
                SUM(lab_orders.amount_due) as due,
                SUM(lab_orders.amount_paid) as paid
            ")
            ->whereNotNull('lab_orders.order_date')
            ->groupBy('ym')
            ->orderBy('ym')
            ->get()
            ->map(fn ($r) => [
                'month'     => $r->ym,
                'label'     => (int) substr($r->ym, 5, 2).'-р сар',
                'orders'    => (int) $r->orders,
                'completed' => (int) $r->completed,
                'returned'  => (int) $r->returned,
                'due'       => (int) $r->due,
                'paid'      => (int) $r->paid,
            ])
            ->all();
    }

    /** Ажлын төрлөөр — буцаалтын хувьтай нь */
    private function byWorkType(callable $scope): array
    {
        return $scope()
            ->selectRaw("
                lab_orders.work_description as work,
                COUNT(*) as orders,
                SUM(CASE WHEN lab_orders.return_count > 0 THEN 1 ELSE 0 END) as returned_orders,
                SUM(lab_orders.return_count) as return_total,
                SUM(lab_orders.amount_due) as due
            ")
            ->groupBy('lab_orders.work_description')
            ->orderByDesc('orders')
            ->get()
            ->map(fn ($r) => [
                'work'         => $r->work,
                'orders'       => (int) $r->orders,
                'returned'     => (int) $r->returned_orders,
                'return_total' => (int) $r->return_total,
                'return_rate'  => $r->orders > 0 ? round($r->returned_orders / $r->orders * 100, 1) : 0,
                'due'          => (int) $r->due,
            ])
            ->all();
    }

    private function byBranch(callable $scope, ?int $branchId): array
    {
        // Салбараар шүүсэн үед задаргаа утгагүй тул хоосон буцаана
        if ($branchId) {
            return [];
        }

        return $scope()
            ->leftJoin('branches as b', 'b.id', '=', 'lab_orders.branch_id')
            ->selectRaw("
                COALESCE(b.name, '— Салбаргүй —') as branch,
                COUNT(*) as orders,
                SUM(CASE WHEN lab_orders.return_count > 0 THEN 1 ELSE 0 END) as returned,
                SUM(lab_orders.amount_due) as due
            ")
            ->groupBy('branch')
            ->orderByDesc('orders')
            ->get()
            ->map(fn ($r) => [
                'branch'      => $r->branch,
                'orders'      => (int) $r->orders,
                'returned'    => (int) $r->returned,
                'return_rate' => $r->orders > 0 ? round($r->returned / $r->orders * 100, 1) : 0,
                'due'         => (int) $r->due,
            ])
            ->all();
    }

    private function byDoctor(callable $scope): array
    {
        return $scope()
            ->leftJoin('doctors as d', 'd.id', '=', 'lab_orders.doctor_id')
            ->selectRaw("
                COALESCE(d.name, '— Эмчгүй —') as doctor,
                COUNT(*) as orders,
                SUM(CASE WHEN lab_orders.return_count > 0 THEN 1 ELSE 0 END) as returned,
                SUM(lab_orders.amount_due) as due
            ")
            ->groupBy('doctor')
            ->orderByDesc('orders')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'doctor'      => $r->doctor,
                'orders'      => (int) $r->orders,
                'returned'    => (int) $r->returned,
                'return_rate' => $r->orders > 0 ? round($r->returned / $r->orders * 100, 1) : 0,
                'due'         => (int) $r->due,
            ])
            ->all();
    }

    /**
     * Ажилтны гүйцэтгэл — ажлыг лаб дуусгасан огноогоор тооцно
     * (ажилтны хуудастай ижил арга).
     */
    private function byEmployee(?Carbon $from, ?Carbon $to, ?int $branchId): array
    {
        $base = fn () => DB::table('lab_order_employee as p')
            ->join('lab_orders as o', 'o.id', '=', 'p.lab_order_id')
            ->where('o.lab_name', self::LAB)
            ->whereNull('o.deleted_at')
            ->when($branchId, fn ($q) => $q->where('o.branch_id', $branchId))
            ->when($from, fn ($q) => $q->whereRaw('COALESCE(o.lab_ready_date, o.order_date) BETWEEN ? AND ?', [
                $from->toDateString(), $to->toDateString(),
            ]));

        $work = $base()
            ->selectRaw('p.employee_id, COUNT(*) as works, COUNT(DISTINCT p.lab_order_id) as orders')
            ->groupBy('p.employee_id')
            ->get()
            ->keyBy('employee_id');

        $returned = $base()
            ->where('o.return_count', '>', 0)
            ->selectRaw('p.employee_id, COUNT(DISTINCT p.lab_order_id) as c')
            ->groupBy('p.employee_id')
            ->pluck('c', 'employee_id');

        $fixed = DB::table('lab_order_return_employee as p')
            ->join('lab_order_returns as r', 'r.id', '=', 'p.lab_order_return_id')
            ->join('lab_orders as o', 'o.id', '=', 'r.lab_order_id')
            ->where('o.lab_name', self::LAB)
            ->whereNull('o.deleted_at')
            ->whereNull('r.cancelled_at')
            ->when($branchId, fn ($q) => $q->where('o.branch_id', $branchId))
            ->when($from, fn ($q) => $q->whereRaw('COALESCE(r.ready_date, DATE(r.returned_at)) BETWEEN ? AND ?', [
                $from->toDateString(), $to->toDateString(),
            ]))
            ->selectRaw('p.employee_id, COUNT(*) as c')
            ->groupBy('p.employee_id')
            ->pluck('c', 'employee_id');

        return Employee::with('branch')
            ->whereHas('position', fn ($q) => $q->where('portal', 'lab'))
            ->get()
            ->map(function (Employee $e) use ($work, $returned, $fixed) {
                $w = $work[$e->id] ?? null;
                $orders = (int) ($w->orders ?? 0);
                $ret    = (int) ($returned[$e->id] ?? 0);

                return [
                    'id'          => $e->id,
                    'name'        => $e->short_name,
                    'branch_name' => $e->branch?->name,
                    'works'       => (int) ($w->works ?? 0),
                    'orders'      => $orders,
                    'returned'    => $ret,
                    'return_rate' => $orders > 0 ? round($ret / $orders * 100, 1) : 0,
                    'fixed'       => (int) ($fixed[$e->id] ?? 0),
                ];
            })
            ->filter(fn ($r) => $r['works'] > 0 || $r['fixed'] > 0)
            ->sortByDesc('works')
            ->values()
            ->all();
    }

    /** Сүүлийн буцаалтууд — шалтгаанаа шууд харах */
    private function returnReasons(?Carbon $from, ?Carbon $to, ?int $branchId): array
    {
        return DB::table('lab_order_returns as r')
            ->join('lab_orders as o', 'o.id', '=', 'r.lab_order_id')
            ->leftJoin('branches as b', 'b.id', '=', 'o.branch_id')
            ->where('o.lab_name', self::LAB)
            ->whereNull('o.deleted_at')
            ->whereNull('r.cancelled_at')
            ->when($branchId, fn ($q) => $q->where('o.branch_id', $branchId))
            ->when($from, fn ($q) => $q->whereBetween('o.order_date', [$from->toDateString(), $to->toDateString()]))
            ->orderByDesc('r.returned_at')
            ->limit(12)
            ->selectRaw('
                r.attempt, r.reason, r.returned_at, r.ready_date, r.closed_at,
                o.id as lab_order_id, o.work_description, o.return_count,
                o.patient_last_name, o.patient_first_name, b.name as branch_name
            ')
            ->get()
            ->map(fn ($r) => [
                'lab_order_id'     => (int) $r->lab_order_id,
                'attempt'          => (int) $r->attempt,
                'return_count'     => (int) $r->return_count,
                'reason'           => $r->reason,
                'returned_at'      => $r->returned_at ? substr($r->returned_at, 0, 10) : null,
                'ready_date'       => $r->ready_date,
                'closed_at'        => $r->closed_at ? substr($r->closed_at, 0, 10) : null,
                'work_description' => $r->work_description,
                'patient'          => trim(($r->patient_last_name ?? '').' '.$r->patient_first_name),
                'branch_name'      => $r->branch_name,
            ])
            ->all();
    }

    // ── Хугацааны шүүлт (ажилтны хуудастай ижил дүрэм) ───────────────────────

    /** @return array{0: ?Carbon, 1: ?Carbon, 2: array} */
    private function period(Request $request): array
    {
        $year    = $request->integer('year')    ?: null;
        $quarter = $request->integer('quarter') ?: null;
        $month   = $request->integer('month')   ?: null;

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
        if ($year && $month) {
            $quarter = (int) ceil($month / 3);
        }

        $filters = ['year' => $year, 'quarter' => $quarter, 'month' => $month];

        if (! $year) {
            return [null, null, $filters];
        }
        if ($month) {
            $f = Carbon::create($year, $month, 1)->startOfMonth();

            return [$f, $f->copy()->endOfMonth(), $filters];
        }
        if ($quarter) {
            $f = Carbon::create($year, ($quarter - 1) * 3 + 1, 1)->startOfMonth();

            return [$f, $f->copy()->addMonths(2)->endOfMonth(), $filters];
        }

        $f = Carbon::create($year, 1, 1)->startOfYear();

        return [$f, $f->copy()->endOfYear(), $filters];
    }

    private function availableYears(): array
    {
        return LabOrder::where('lab_name', self::LAB)
            ->selectRaw('DISTINCT YEAR(order_date) as y')
            ->orderByDesc('y')
            ->pluck('y')
            ->filter()
            ->map(fn ($y) => (int) $y)
            ->values()
            ->all();
    }
}
