<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\JobApplication;
use App\Models\Treatment;
use App\Models\TreatmentCategory;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $today     = Carbon::today();
        $thisMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();

        /* ── Цаг захиалга ── */
        $appointmentsToday     = Appointment::whereDate('appointment_date', $today)->count();
        $appointmentsPending   = Appointment::where('status', 'pending')->count();
        $appointmentsConfirmed = Appointment::where('status', 'confirmed')->count();
        $appointmentsTotal     = Appointment::count();
        $appointmentsCancelled = Appointment::where('status', 'cancelled')->count();
        $appointmentsOnline    = Appointment::where('type', 'online')->count();
        $appointmentsInPerson  = Appointment::where('type', 'in_person')->count();

        /* ── Төлбөр ── */
        $revenueTotal   = Appointment::where('payment_status', 'paid')->sum('payment_amount');
        $revenueMonth   = Appointment::where('payment_status', 'paid')
                            ->where('created_at', '>=', $thisMonth)->sum('payment_amount');
        $revenuePending = Appointment::where('payment_status', 'pending')
                            ->whereNotNull('payment_amount')->sum('payment_amount');

        /* ── Өсөлт (өмнөх сартай харьцуулах) ── */
        $appsThisMonth = Appointment::where('created_at', '>=', $thisMonth)->count();
        $appsLastMonth = Appointment::whereBetween('created_at', [$lastMonth, $thisMonth])->count();
        $appointmentGrowth = $appsLastMonth > 0
            ? round((($appsThisMonth - $appsLastMonth) / $appsLastMonth) * 100, 1)
            : 0;

        /* ── Сүүлийн 7 өдрийн цаг захиалгын тоо ── */
        $weeklyData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $weeklyData[] = [
                'date'  => $date->format('M d'),
                'day'   => $date->format('D'),
                'count' => Appointment::whereDate('appointment_date', $date)->count(),
            ];
        }

        /* ── Сүүлийн 6 сарын орлого ── */
        $monthlyRevenue = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $monthlyRevenue[] = [
                'month'   => $month->format('M Y'),
                'short'   => $month->format('M'),
                'revenue' => (int) Appointment::where('payment_status', 'paid')
                                ->whereYear('created_at', $month->year)
                                ->whereMonth('created_at', $month->month)
                                ->sum('payment_amount'),
            ];
        }

        /* ── Эмч / Салбар ── */
        $doctorsTotal  = Doctor::count();
        $doctorsActive = Doctor::where('is_active', true)->count();
        $branches      = Branch::withCount(['doctors' => fn($q) => $q->where('is_active', true)])
                            ->where('is_active', true)->orderBy('name')->get(['id','name','doctors_count']);

        /* ── Эмчилгээ ── */
        $treatmentsTotal  = Treatment::count();
        $treatmentsActive = Treatment::where('is_active', true)->count();

        /* ── Хэрэглэгч ── */
        $usersTotal = User::count();

        /* ── Ажлын анкет ── */
        $jobsPending = JobApplication::where('status', 'pending')->count();
        $jobsTotal   = JobApplication::count();
        $recentJobs  = JobApplication::latest()->take(5)->get([
            'id','last_name','first_name','email','status','created_at',
        ]);

        /* ── Сүүлийн цаг захиалгууд ── */
        $recentAppointments = Appointment::with('doctor:id,name')
            ->latest()
            ->take(8)
            ->get([
                'id','appointment_number','patient_name','patient_phone',
                'appointment_date','appointment_time','status','type',
                'payment_status','payment_amount','doctor_id','service',
            ]);

        /* ── Өнөөдрийн захиалгууд ── */
        $todayAppointments = Appointment::with('doctor:id,name')
            ->whereDate('appointment_date', $today)
            ->orderBy('appointment_time')
            ->get([
                'id','appointment_number','patient_name',
                'appointment_time','status','type','doctor_id','service',
            ]);

        /* ── Цаг захиалга статус хуваарилалт ── */
        $statusBreakdown = Appointment::selectRaw('status, count(*) as count')
            ->groupBy('status')->pluck('count', 'status');

        return Inertia::render('admin/dashboard', [
            'stats' => [
                // Цаг захиалга
                'appointments_today'     => $appointmentsToday,
                'appointments_pending'   => $appointmentsPending,
                'appointments_confirmed' => $appointmentsConfirmed,
                'appointments_cancelled' => $appointmentsCancelled,
                'appointments_total'     => $appointmentsTotal,
                'appointment_growth'     => $appointmentGrowth,
                'apps_this_month'        => $appsThisMonth,
                'appointments_online'    => $appointmentsOnline,
                'appointments_in_person' => $appointmentsInPerson,

                // Төлбөр
                'revenue_total'          => (int) $revenueTotal,
                'revenue_month'          => (int) $revenueMonth,
                'revenue_pending'        => (int) $revenuePending,

                // Эмч / Салбар
                'doctors_total'          => $doctorsTotal,
                'doctors_active'         => $doctorsActive,

                // Эмчилгээ
                'treatments_total'       => $treatmentsTotal,
                'treatments_active'      => $treatmentsActive,
                'categories_total'       => TreatmentCategory::count(),

                // Хэрэглэгч
                'users_total'            => $usersTotal,

                // Ажлын анкет
                'jobs_pending'           => $jobsPending,
                'jobs_total'             => $jobsTotal,
            ],

            'weekly_data'           => $weeklyData,
            'monthly_revenue'       => $monthlyRevenue,
            'status_breakdown'      => $statusBreakdown,
            'branches'              => $branches,
            'recent_appointments'   => $recentAppointments,
            'today_appointments'    => $todayAppointments,
            'recent_jobs'           => $recentJobs,
        ]);
    }
}
