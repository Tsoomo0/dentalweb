<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Models\Lab\LabExam;
use App\Models\Lab\LabExamAttempt;
use App\Models\Lab\LabLesson;
use App\Models\Lab\LabLessonView;
use App\Models\LabOrder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Лаб ажилтны хяналтын самбар.
 *
 * Гурван асуултад хариулна:
 *   1. Юуг нь яаралтай хийх вэ? — буцаалт, хугацаа хэтэрсэн, өнөөдрийн ажил
 *   2. Би хэр ажилласан бэ?     — сарын гүйцэтгэл, өмнөх сартай харьцуулсан
 *   3. Юу хүлээгдэж байна вэ?   — сургалтын явц, нээлттэй шалгалт
 */
class LabDashboardController extends Controller
{
    /** Лаб портал нь зөвхөн дотоод лабын ажлыг хардаг. */
    private const LAB = 'Кутикул лаб';

    public function dashboard(): Response
    {
        $user     = Auth::user();
        $branch   = $user?->branch;
        $employee = $user?->employee;

        $today = now()->startOfDay();
        $base  = fn () => LabOrder::where('lab_name', self::LAB);

        $stats = [
            'active'         => (clone $base())->where('is_completed', false)->count(),
            'completed'      => (clone $base())->where('is_completed', true)->count(),
            // Лаб ажлаа дуусгасан, ресепшн хүлээж авах ёстой
            'ready'          => (clone $base())
                ->where('is_completed', false)
                ->whereNotNull('lab_ready_date')
                ->count(),
            'overdue'        => (clone $base())
                ->where('is_completed', false)
                ->whereNotNull('pickup_date')
                ->whereDate('pickup_date', '<', $today->toDateString())
                ->count(),
            'arriving_today' => (clone $base())
                ->where('is_completed', false)
                ->whereDate('pickup_date', $today->toDateString())
                ->count(),
            // Ресепшнээс янзлуулахаар буцаасан ажлууд
            'returns'        => (clone $base())
                ->where('return_status', LabOrder::RETURN_SENT)
                ->count(),
            // Энэ сард лаб дуусгасан ажил — багийн хэмнэл
            'ready_month'    => (clone $base())
                ->whereBetween('lab_ready_date', [
                    $today->copy()->startOfMonth()->toDateString(),
                    $today->copy()->endOfMonth()->toDateString(),
                ])
                ->count(),
        ];

        return Inertia::render('lab/dashboard', [
            'branch' => $branch ? [
                'id'      => $branch->id,
                'name'    => $branch->name,
                'address' => $branch->address,
                'phone'   => $branch->phone,
            ] : null,
            'me' => [
                'name'  => $employee?->short_name ?? $user?->name ?? '—',
                'photo' => $employee?->photo_url,
                'position' => $employee?->position?->name,
            ],
            'stats'     => $stats,
            'queue'     => $this->queue($today),
            'workload'  => $this->workload($today),
            'trend'     => $this->trend($today),
            'workTypes' => $this->workTypes($today),
            'work'      => $employee ? $this->myWork($employee->id, $today) : null,
            'monthly'   => $employee ? $this->monthlySeries($employee->id, $today) : [],
            'training'  => $this->training((int) $user->id),
        ]);
    }

    /**
     * Хийх ажлын дараалал.
     *
     * Эрэмбэ: янзлах буцаалт → хугацаа хэтэрсэн → товлосон огноогоор.
     * Ингэснээр жагсаалтын эхний мөр үргэлж "хамгийн түрүүнд хийх ажил" байна.
     */
    private function queue(Carbon $today): \Illuminate\Support\Collection
    {
        return LabOrder::where('lab_name', self::LAB)
            ->with(['branch:id,name', 'doctor:id,name'])
            ->where('is_completed', false)
            ->orderByRaw('CASE
                WHEN return_status = ? THEN 0
                WHEN pickup_date IS NOT NULL AND pickup_date < CURDATE() THEN 1
                ELSE 2 END', [LabOrder::RETURN_SENT])
            ->orderByRaw('pickup_date IS NULL, pickup_date ASC')
            ->orderByDesc('id')
            ->limit(24)
            ->get()
            ->map(fn (LabOrder $o) => [
                'id'                 => $o->id,
                'order_date'         => $o->order_date?->toDateString(),
                'sent_to_lab_date'   => $o->sent_to_lab_date?->toDateString(),
                'patient'            => trim(($o->patient_last_name ?? '').' '.$o->patient_first_name) ?: '—',
                'doctor_name'        => $o->doctor?->name,
                'branch_name'        => $o->branch?->name,
                'work_description'   => $o->work_description,
                'pickup_date'        => $o->pickup_date?->toDateString(),
                'lab_ready_date'     => $o->lab_ready_date?->toDateString(),
                'return_status'      => $o->return_status,
                'return_reason'      => $o->return_reason,
                'return_count'       => (int) $o->return_count,
                // Хэдэн хоног үлдсэн (сөрөг бол хэтэрсэн) — өнгө, шошгыг эндээс шийднэ
                'days_left'          => $o->pickup_date
                    ? (int) $today->diffInDays($o->pickup_date->copy()->startOfDay(), false)
                    : null,
            ]);
    }

    /** Ирэх 7 хоногийн ачаалал — товлосон огноогоор. */
    private function workload(Carbon $today): array
    {
        $until = $today->copy()->addDays(6);

        $counts = LabOrder::where('lab_name', self::LAB)
            ->where('is_completed', false)
            ->whereBetween('pickup_date', [$today->toDateString(), $until->toDateString()])
            ->selectRaw('pickup_date, COUNT(*) as c')
            ->groupBy('pickup_date')
            ->pluck('c', 'pickup_date');

        // Түлхүүр нь драйвераас хамаараад datetime мөр ирж болзошгүй тул
        // огноог нь эргүүлж таслаад авна.
        $byDate = collect($counts)->mapWithKeys(
            fn ($c, $date) => [substr((string) $date, 0, 10) => (int) $c],
        );

        $days = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];

        return collect(range(0, 6))->map(function (int $i) use ($today, $byDate, $days) {
            $date = $today->copy()->addDays($i);

            return [
                'date'  => $date->toDateString(),
                'label' => $days[(int) $date->dayOfWeek],
                'day'   => $date->day,
                'count' => $byDate[$date->toDateString()] ?? 0,
                'today' => $i === 0,
            ];
        })->all();
    }

    /**
     * Сүүлийн 30 хоногийн урсгал — лаб руу ирсэн ба лаб дуусгасан ажил.
     *
     * Хоёр цуваа зэрэгцэж харагдсанаар "орж ирж байгаа ажил гарч байгаагаас
     * их үү" гэдэг нь нэг харцаар мэдэгдэнэ.
     */
    private function trend(Carbon $today): array
    {
        $from = $today->copy()->subDays(29);

        $sent = LabOrder::where('lab_name', self::LAB)
            ->whereBetween('sent_to_lab_date', [$from->toDateString(), $today->toDateString()])
            ->selectRaw('sent_to_lab_date as d, COUNT(*) as c')
            ->groupBy('d')->pluck('c', 'd');

        $ready = LabOrder::where('lab_name', self::LAB)
            ->whereBetween('lab_ready_date', [$from->toDateString(), $today->toDateString()])
            ->selectRaw('lab_ready_date as d, COUNT(*) as c')
            ->groupBy('d')->pluck('c', 'd');

        $key = fn ($col) => collect($col)->mapWithKeys(
            fn ($c, $d) => [substr((string) $d, 0, 10) => (int) $c],
        );

        $sentBy  = $key($sent);
        $readyBy = $key($ready);

        return collect(range(0, 29))->map(function (int $i) use ($from, $sentBy, $readyBy) {
            $date = $from->copy()->addDays($i);
            $d    = $date->toDateString();

            return [
                'date'  => $d,
                'label' => $date->format('m/d'),
                'sent'  => $sentBy[$d] ?? 0,
                'ready' => $readyBy[$d] ?? 0,
            ];
        })->all();
    }

    /** Энэ сард лаб дуусгасан ажлын төрлийн бүтэц — эхний 6, үлдсэн нь "Бусад". */
    private function workTypes(Carbon $today): array
    {
        $rows = LabOrder::where('lab_name', self::LAB)
            ->whereBetween('lab_ready_date', [
                $today->copy()->startOfMonth()->toDateString(),
                $today->copy()->endOfMonth()->toDateString(),
            ])
            ->selectRaw('work_description as work, COUNT(*) as c')
            ->groupBy('work')
            ->orderByDesc('c')
            ->get()
            ->map(fn ($r) => ['name' => $r->work, 'value' => (int) $r->c]);

        $top  = $rows->take(6)->values();
        $rest = $rows->skip(6)->sum('value');

        if ($rest > 0) {
            $top->push(['name' => 'Бусад', 'value' => $rest]);
        }

        return $top->all();
    }

    /**
     * Миний сүүлийн 6 сарын ажил — нугалсан / өнгөлсөн / янзалсан.
     *
     * Сар бүрд тусад нь query явуулахгүй: нэг бүлэглэсэн уншилтаар аваад
     * PHP тал дээр саруудад тарааж өгнө.
     */
    private function monthlySeries(int $employeeId, Carbon $today): array
    {
        $from = $today->copy()->subMonthsNoOverflow(5)->startOfMonth();
        $to   = $today->copy()->endOfMonth();

        $own = DB::table('lab_order_employee as p')
            ->join('lab_orders as o', 'o.id', '=', 'p.lab_order_id')
            ->where('o.lab_name', self::LAB)
            ->whereNull('o.deleted_at')
            ->where('p.employee_id', $employeeId)
            ->whereRaw('COALESCE(o.lab_ready_date, o.order_date) BETWEEN ? AND ?', [
                $from->toDateString(), $to->toDateString(),
            ])
            ->selectRaw("
                DATE_FORMAT(COALESCE(o.lab_ready_date, o.order_date), '%Y-%m') as ym,
                SUM(p.role = 'bender')   as bender,
                SUM(p.role = 'polisher') as polisher
            ")
            ->groupBy('ym')
            ->get()
            ->keyBy('ym');

        $fixed = DB::table('lab_order_return_employee as p')
            ->join('lab_order_returns as r', 'r.id', '=', 'p.lab_order_return_id')
            ->join('lab_orders as o', 'o.id', '=', 'r.lab_order_id')
            ->where('o.lab_name', self::LAB)
            ->whereNull('o.deleted_at')
            ->whereNull('r.cancelled_at')
            ->where('p.employee_id', $employeeId)
            ->whereRaw('COALESCE(r.ready_date, DATE(r.returned_at)) BETWEEN ? AND ?', [
                $from->toDateString(), $to->toDateString(),
            ])
            ->selectRaw("DATE_FORMAT(COALESCE(r.ready_date, DATE(r.returned_at)), '%Y-%m') as ym, COUNT(*) as c")
            ->groupBy('ym')
            ->pluck('c', 'ym');

        return collect(range(5, 0))->map(function (int $back) use ($today, $own, $fixed) {
            $month = $today->copy()->subMonthsNoOverflow($back);
            $ym    = $month->format('Y-m');
            $row   = $own[$ym] ?? null;

            return [
                'label'    => $month->month.'-р',
                'bender'   => (int) ($row->bender ?? 0),
                'polisher' => (int) ($row->polisher ?? 0),
                'fixed'    => (int) ($fixed[$ym] ?? 0),
            ];
        })->values()->all();
    }

    /**
     * Миний гүйцэтгэл — энэ сар, өмнөх сартай харьцуулсан.
     *
     * Ажлыг лаб дуусгасан огноогоор тооцно (байхгүй бол захиалсан огноогоор) —
     * админы "Лаб ажилтан" тайлантай нэг аргачлал, ингэснээр хоёр тал дээрх
     * тоо зөрөхгүй.
     */
    private function myWork(int $employeeId, Carbon $today): array
    {
        $month = $this->periodCounts($employeeId, $today->copy()->startOfMonth(), $today->copy()->endOfMonth());
        $prev  = $this->periodCounts(
            $employeeId,
            $today->copy()->subMonthNoOverflow()->startOfMonth(),
            $today->copy()->subMonthNoOverflow()->endOfMonth(),
        );

        return [
            'month'      => $month,
            'prev_total' => $prev['total'],
            'week'       => $this->periodCounts($employeeId, $today->copy()->startOfWeek(), $today->copy()->endOfWeek())['total'],
            'top_works'  => $this->topWorks($employeeId, $today->copy()->startOfMonth(), $today->copy()->endOfMonth()),
        ];
    }

    /** Нэг хугацааны нугалсан / өнгөлсөн / янзалсан / буцаагдсан тоо. */
    private function periodCounts(int $employeeId, Carbon $from, Carbon $to): array
    {
        $own = DB::table('lab_order_employee as p')
            ->join('lab_orders as o', 'o.id', '=', 'p.lab_order_id')
            ->where('o.lab_name', self::LAB)
            ->whereNull('o.deleted_at')
            ->where('p.employee_id', $employeeId)
            ->whereRaw('COALESCE(o.lab_ready_date, o.order_date) BETWEEN ? AND ?', [
                $from->toDateString(), $to->toDateString(),
            ])
            ->selectRaw("
                SUM(p.role = 'bender')   as bender,
                SUM(p.role = 'polisher') as polisher,
                COUNT(DISTINCT p.lab_order_id) as orders,
                COUNT(DISTINCT CASE WHEN o.return_count > 0 THEN p.lab_order_id END) as returned
            ")
            ->first();

        // Бусдын буцаалтыг янзалсан ажил — нэмэлт ажил, чанарын алдаа биш
        $fixed = DB::table('lab_order_return_employee as p')
            ->join('lab_order_returns as r', 'r.id', '=', 'p.lab_order_return_id')
            ->join('lab_orders as o', 'o.id', '=', 'r.lab_order_id')
            ->where('o.lab_name', self::LAB)
            ->whereNull('o.deleted_at')
            ->whereNull('r.cancelled_at')
            ->where('p.employee_id', $employeeId)
            ->whereRaw('COALESCE(r.ready_date, DATE(r.returned_at)) BETWEEN ? AND ?', [
                $from->toDateString(), $to->toDateString(),
            ])
            ->count();

        $bender   = (int) ($own->bender ?? 0);
        $polisher = (int) ($own->polisher ?? 0);
        $orders   = (int) ($own->orders ?? 0);
        $returned = (int) ($own->returned ?? 0);

        return [
            'bender'      => $bender,
            'polisher'    => $polisher,
            'fixed'       => $fixed,
            'total'       => $bender + $polisher + $fixed,
            'orders'      => $orders,
            'returned'    => $returned,
            'return_rate' => $orders > 0 ? (int) round($returned / $orders * 100) : 0,
        ];
    }

    /** Энэ сард хамгийн их хийсэн ажлын төрлүүд. */
    private function topWorks(int $employeeId, Carbon $from, Carbon $to): array
    {
        return DB::table('lab_order_employee as p')
            ->join('lab_orders as o', 'o.id', '=', 'p.lab_order_id')
            ->where('o.lab_name', self::LAB)
            ->whereNull('o.deleted_at')
            ->where('p.employee_id', $employeeId)
            ->whereRaw('COALESCE(o.lab_ready_date, o.order_date) BETWEEN ? AND ?', [
                $from->toDateString(), $to->toDateString(),
            ])
            ->selectRaw('o.work_description as work, COUNT(DISTINCT p.lab_order_id) as c')
            ->groupBy('o.work_description')
            ->orderByDesc('c')
            ->limit(4)
            ->get()
            ->map(fn ($r) => ['work' => $r->work, 'count' => (int) $r->c])
            ->all();
    }

    /**
     * Сургалтын явц — хичээл, заавал үзэх, нээлттэй шалгалт.
     *
     * Дотоод сургалт нь ажилтны хэсэгт (/my/training) шилжсэн ч лаб ажилтанд
     * самбар дээрээ явцаа харах нь хэвээр. Тоо нь албан тушаалдаа нээлттэй
     * сургалтуудаар л бодогдоно — эс тэгвээс харах эрхгүй хичээл дутуу
     * гүйцэтгэл болж харагдана.
     */
    private function training(int $userId): array
    {
        $positionId = Auth::user()?->employee?->position_id;

        $lessons = LabLesson::where('is_published', true)
            ->forPosition($positionId)
            ->whereHas('course', fn ($q) => $q->where('is_published', true))
            ->get(['id', 'title', 'is_required', 'due_at']);

        $views = LabLessonView::where('user_id', $userId)
            ->whereIn('lab_lesson_id', $lessons->pluck('id'))
            ->get(['lab_lesson_id', 'completed_at', 'progress_percent', 'watched_seconds']);

        $done = $views->whereNotNull('completed_at')->pluck('lab_lesson_id')->flip();

        $pending = $lessons->filter(fn (LabLesson $l) => ! $done->has($l->id));

        $exams = LabExam::available()->forPosition($positionId)->get();

        return [
            'total'     => $lessons->count(),
            'done'      => $done->count(),
            'required'  => $pending->where('is_required', true)->count(),
            'overdue'   => $pending->filter(fn (LabLesson $l) => $l->isOverdue())->count(),
            'watch_min' => (int) round($views->sum('watched_seconds') / 60),
            // Үргэлжлүүлэх — сүүлд үзсэн, дуусаагүй хичээл
            'resume'    => $this->resume($userId),
            'exams_open'    => $exams->filter(fn (LabExam $e) => $e->isOpen())->count(),
            'exams_pending' => LabExamAttempt::where('user_id', $userId)
                ->where('status', LabExamAttempt::STATUS_SUBMITTED)
                ->count(),
        ];
    }

    /** Сүүлд үзсэн, дуусаагүй хичээл. */
    private function resume(int $userId): ?array
    {
        $view = LabLessonView::where('user_id', $userId)
            ->whereNull('completed_at')
            ->where('progress_percent', '>', 0)
            ->whereHas('lesson', fn ($q) => $q->where('is_published', true)
                ->forPosition(Auth::user()?->employee?->position_id))
            ->with('lesson:id,title,poster_url,lab_course_id')
            ->latest('last_viewed_at')
            ->first();

        return $view ? [
            'lesson_id' => $view->lab_lesson_id,
            'title'     => $view->lesson->title,
            'percent'   => (int) $view->progress_percent,
        ] : null;
    }
}
