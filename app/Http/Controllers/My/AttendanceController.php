<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\AttendanceLog;
use App\Models\HR\AttendancePunch;
use App\Models\HR\Employee;
use App\Services\Attendance\AttendanceIngestService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Утаснаас байршлаар (GPS) ирц бүртгэх. Бүртгэл нь хурууны хээний
 * төхөөрөмжийнхтэй адил attendance_punches-д орж, өдрийн нэгтгэл
 * AttendanceIngestService-ээр тооцоологдоно.
 */
class AttendanceController extends Controller
{
    public function __construct(private readonly AttendanceIngestService $attendance) {}

    public function checkIn(Request $request): RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (! $employee) {
            return redirect()->route('portal.select');
        }

        if ($error = $this->geofenceError($employee, $request)) {
            return redirect()->back()->withErrors(['geofence' => $error]);
        }

        $log = AttendanceLog::where('employee_id', $employee->id)
            ->whereDate('date', Carbon::today())
            ->first();

        if (! $log?->checked_in_at) {
            $this->attendance->recordGps($employee, AttendancePunch::TYPE_IN, $request->input('lat'), $request->input('lng'));
        }

        return redirect()->back();
    }

    public function checkOut(Request $request): RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (! $employee) {
            return redirect()->route('portal.select');
        }

        if ($error = $this->geofenceError($employee, $request)) {
            return redirect()->back()->withErrors(['geofence' => $error]);
        }

        $log = AttendanceLog::where('employee_id', $employee->id)
            ->whereDate('date', Carbon::today())
            ->first();

        if ($log && $log->checked_in_at && ! $log->checked_out_at) {
            $this->attendance->recordGps($employee, AttendancePunch::TYPE_OUT, $request->input('lat'), $request->input('lng'));
        }

        return redirect()->back();
    }

    /** Салбарт байршлаар бүртгэх хаалттай эсвэл радиусаас гадуур бол алдааны мессеж. */
    private function geofenceError(Employee $employee, Request $request): ?string
    {
        $employee->load('branch');
        $branch = $employee->branch;

        if ($branch && ! $branch->attendance_gps_enabled) {
            return 'Таны салбарт ирцийг хурууны хээний төхөөрөмжөөр бүртгэнэ.';
        }

        if (! $branch || ! $branch->lat || ! $branch->lng) {
            return null;
        }

        $lat = $request->input('lat');
        $lng = $request->input('lng');

        if ($lat === null || $lng === null) {
            return 'Байршил тогтоогдсонгүй. Утасны байршлын зөвшөөрлийг идэвхжүүлнэ үү.';
        }

        $distance = $this->haversine($lat, $lng, $branch->lat, $branch->lng);
        $radius = $branch->radius_m ?? 100;

        if ($distance > $radius) {
            return "Та салбараасаа хол байна ({$distance}м). Зөвхөн {$radius}м дотор бүртгэх боломжтой.";
        }

        return null;
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): int
    {
        $earthRadius = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return (int) round($earthRadius * 2 * asin(sqrt($a)));
    }
}
