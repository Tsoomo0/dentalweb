<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\AttendanceLog;
use App\Models\HR\WorkSchedule;
use App\Models\User;
use App\Notifications\LateCheckIn;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function checkIn(Request $request): RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (!$employee) return redirect()->route('portal.select');

        $employee->load('branch');
        $branch = $employee->branch;

        $lat = $request->input('lat');
        $lng = $request->input('lng');

        if ($branch && $branch->lat && $branch->lng) {
            if ($lat === null || $lng === null) {
                return redirect()->back()->withErrors([
                    'geofence' => 'Байршил тогтоогдсонгүй. Утасны байршлын зөвшөөрлийг идэвхжүүлнэ үү.',
                ]);
            }
            $distance = $this->haversine($lat, $lng, $branch->lat, $branch->lng);
            $radius   = $branch->radius_m ?? 100;

            if ($distance > $radius) {
                return redirect()->back()->withErrors([
                    'geofence' => "Та салбараасаа хол байна ({$distance}м). Зөвхөн {$radius}м дотор бүртгэх боломжтой.",
                ]);
            }
        }

        $today = Carbon::today();
        $log   = AttendanceLog::firstOrCreate(
            ['employee_id' => $employee->id, 'date' => $today->toDateString()],
        );

        if (!$log->checked_in_at) {
            $now = now();
            $log->update([
                'checked_in_at' => $now,
                'check_in_lat'  => $lat,
                'check_in_lng'  => $lng,
            ]);

            $this->notifyIfLate($employee, $now, $today);
        }

        return redirect()->back();
    }

    public function checkOut(Request $request): RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (!$employee) return redirect()->route('portal.select');

        $employee->load('branch');
        $branch = $employee->branch;

        $lat = $request->input('lat');
        $lng = $request->input('lng');

        if ($branch && $branch->lat && $branch->lng) {
            if ($lat === null || $lng === null) {
                return redirect()->back()->withErrors([
                    'geofence' => 'Байршил тогтоогдсонгүй. Утасны байршлын зөвшөөрлийг идэвхжүүлнэ үү.',
                ]);
            }
            $distance = $this->haversine($lat, $lng, $branch->lat, $branch->lng);
            $radius   = $branch->radius_m ?? 100;

            if ($distance > $radius) {
                return redirect()->back()->withErrors([
                    'geofence' => "Та салбараасаа хол байна ({$distance}м). Зөвхөн {$radius}м дотор бүртгэх боломжтой.",
                ]);
            }
        }

        $today = Carbon::today();
        $log   = AttendanceLog::where('employee_id', $employee->id)
            ->where('date', $today->toDateString())
            ->first();

        if ($log && $log->checked_in_at && !$log->checked_out_at) {
            $log->update([
                'checked_out_at' => now(),
                'check_out_lat'  => $lat,
                'check_out_lng'  => $lng,
            ]);
        }

        return redirect()->back();
    }

    private function notifyIfLate($employee, Carbon $checkedInAt, Carbon $today): void
    {
        $schedule = WorkSchedule::where('employee_id', $employee->id)
            ->where('date', $today->toDateString())
            ->whereNotIn('shift_type', ['off'])
            ->first();

        if (!$schedule || !$schedule->start_time) return;

        $scheduledStart = Carbon::createFromFormat('H:i:s', $schedule->start_time, $today->timezone);
        $scheduledStart->setDate($today->year, $today->month, $today->day);

        $lateMinutes = (int) $scheduledStart->diffInMinutes($checkedInAt, false);

        if ($lateMinutes <= 0) return;

        $hrAdmins = User::whereHas('role', fn($q) => $q->whereIn('name', ['admin', 'hr']))->get();

        foreach ($hrAdmins as $admin) {
            $admin->notify(new LateCheckIn(
                employee:       $employee,
                checkedInAt:    $checkedInAt->format('H:i'),
                scheduledStart: substr($schedule->start_time, 0, 5),
                lateMinutes:    $lateMinutes,
                date:           $today->toDateString(),
            ));
        }
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
