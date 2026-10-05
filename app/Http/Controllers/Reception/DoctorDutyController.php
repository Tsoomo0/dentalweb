<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Doctor;
use App\Services\Schedule\RosterLookup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Цаг захиалга бүртгэхэд: тухайн өдөр эмч нийтлэгдсэн хуваарьтай эсэх, хэдээс хэдэн цаг, аль салбарт.
 * Эмч ажилтны бүртгэлтэй холбогдоогүй (employee_id хоосон) бол хуваарь мэдэгдэхгүй гэж буцаана.
 */
class DoctorDutyController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate(['date' => 'required|date_format:Y-m-d']);

        $doctors = Doctor::where('is_active', true)->whereNotNull('employee_id')->get(['id', 'employee_id']);
        $plans = RosterLookup::plans($doctors->pluck('employee_id'), $data['date'], $data['date']);
        $branches = Branch::pluck('name', 'id');

        return response()->json([
            'date' => $data['date'],
            'duty' => $doctors->mapWithKeys(function (Doctor $d) use ($plans, $data, $branches) {
                $plan = $plans[$d->employee_id][$data['date']] ?? null;

                return [$d->id => [
                    'status' => $plan === null ? 'none' : ($plan['work'] ? 'work' : 'off'),
                    'start' => $plan['start'] ?? null,
                    'end' => $plan['end'] ?? null,
                    'label' => $plan['label'] ?? null,
                    'branch_ids' => $plan['branch_ids'] ?? [],
                    'branches' => collect($plan['branch_ids'] ?? [])->map(fn ($id) => $branches[$id] ?? null)->filter()->values(),
                ]];
            }),
        ]);
    }
}
