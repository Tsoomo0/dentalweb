<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Doctor;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AppointmentExportController extends Controller
{
    public function pdf(Request $request): Response
    {
        $query = Appointment::with(['doctor', 'branch'])
            ->orderBy('appointment_date')
            ->orderBy('appointment_time');

        if ($request->filled('status'))    $query->where('status', $request->status);
        if ($request->filled('doctor_id')) $query->where('doctor_id', $request->doctor_id);
        if ($request->filled('branch_id')) $query->where('branch_id', $request->branch_id);
        if ($request->filled('type'))      $query->where('type', $request->type);

        if ($request->filled('date_from')) $query->whereDate('appointment_date', '>=', $request->date_from);
        if ($request->filled('date_to'))   $query->whereDate('appointment_date', '<=', $request->date_to);

        if ($request->filled('month')) {
            $query->whereYear('appointment_date', substr($request->month, 0, 4))
                  ->whereMonth('appointment_date', substr($request->month, 5, 2));
        } elseif (! $request->filled('date_from') && ! $request->filled('date_to')) {
            $query->whereDate('appointment_date', '>=', Carbon::today()->startOfMonth())
                  ->whereDate('appointment_date', '<=', Carbon::today()->endOfMonth());
        }

        $appointments = $query->limit(500)->get();
        $doctors      = Doctor::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $branches     = Branch::where('is_active', true)->orderBy('name')->get(['id', 'name']);

        $html = view('exports.appointments-pdf', compact('appointments', 'request', 'doctors', 'branches'))->render();

        return response($html)->header('Content-Type', 'text/html; charset=UTF-8');
    }
}
