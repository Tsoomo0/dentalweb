<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\SupportSchedule;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SupportScheduleController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'shift_type' => 'required|in:'.implode(',', array_keys(SupportSchedule::SHIFTS)),
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'note' => 'nullable|string|max:255',
        ]);

        $off = $data['shift_type'] === 'off';

        SupportSchedule::updateOrCreate(
            ['employee_id' => $data['employee_id'], 'date' => $data['date']],
            [
                'shift_type' => $data['shift_type'],
                'start_time' => $off ? null : ($data['start_time'] ?? null),
                'end_time' => $off ? null : ($data['end_time'] ?? null),
                'note' => $data['note'] ?? null,
                'created_by' => Auth::id(),
            ]
        );

        return back()->with('success', 'Хадгалагдлаа.');
    }

    public function destroy(SupportSchedule $supportSchedule): RedirectResponse
    {
        $supportSchedule->delete();

        return back()->with('success', 'Устгагдлаа.');
    }

    /**
     * Нэг ажилтны нэг ээлжийг 7 хоногийн бүх өдөр (эсвэл зөвхөн ажлын өдрүүд) рүү бөөнөөр тавина.
     */
    public function rowFill(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'week_start' => 'required|date',
            'shift_type' => 'required|in:'.implode(',', array_keys(SupportSchedule::SHIFTS)),
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'weekdays_only' => 'boolean',
        ]);

        $weekStart = Carbon::parse($data['week_start'])->startOfWeek(Carbon::MONDAY);
        $off = $data['shift_type'] === 'off';
        $days = ($data['weekdays_only'] ?? false) ? 5 : 7;

        DB::transaction(function () use ($data, $weekStart, $off, $days) {
            for ($i = 0; $i < $days; $i++) {
                $date = $weekStart->copy()->addDays($i)->format('Y-m-d');

                SupportSchedule::updateOrCreate(
                    ['employee_id' => $data['employee_id'], 'date' => $date],
                    [
                        'shift_type' => $data['shift_type'],
                        'start_time' => $off ? null : ($data['start_time'] ?? null),
                        'end_time' => $off ? null : ($data['end_time'] ?? null),
                        'created_by' => Auth::id(),
                    ]
                );
            }
        });

        return back()->with('success', '7 хоногийн хуваарь тавигдлаа.');
    }
}
