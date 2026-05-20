<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\NurseBonusEntry;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class NurseBonusController extends Controller
{
    public function index(): Response|RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (! $employee) {
            return redirect()->route('portal.select');
        }

        // Зөвхөн "Сувилагч" албан тушаал (ариутгалын сувилагч гэх мэт хасагдана)
        $position = mb_strtolower(trim($employee->position?->name ?? ''));
        if ($position !== 'сувилагч') {
            return redirect()->route('portal.select');
        }

        $entries = NurseBonusEntry::with('run')
            ->where('employee_id', $employee->id)
            ->where('is_sent', true)
            ->orderByDesc('nurse_bonus_run_id')
            ->get()
            ->filter(fn ($e) => $e->run !== null)
            ->map(fn ($e) => [
                'id' => $e->id,
                'run_id' => $e->nurse_bonus_run_id,
                'run_title' => $e->run->title,
                'half_label' => $e->run->half_label,
                'date' => $e->run->date?->toDateString(),
                'year' => $e->run->year,
                'month' => $e->run->month,
                'half' => $e->run->half,
                'visit_count' => $e->visit_count,
                'clothing' => $e->clothing,
                'hand_hygiene' => $e->hand_hygiene,
                'chair_sterilization' => $e->chair_sterilization,
                'equipment_prep' => $e->equipment_prep,
                'material_prep' => $e->material_prep,
                'card_issued' => $e->card_issued,
                'card_collected' => $e->card_collected,
                'pre_exam_prep' => $e->pre_exam_prep,
                'exam_chair_prep' => $e->exam_chair_prep,
                'post_exam_chair_sterilize' => $e->post_exam_chair_sterilize,
                'tube_sterilization' => $e->tube_sterilization,
                'suction_filter' => $e->suction_filter,
                'quartz_before' => $e->quartz_before,
                'quartz_after' => $e->quartz_after,
                'xray' => $e->xray,
                'model_cast' => $e->model_cast,
                'implant' => $e->implant,
                'blood_pressure' => $e->blood_pressure,
                'complaint' => $e->complaint,
                'absent' => $e->absent,
                'total_amount' => $e->total_amount,
            ]);

        return Inertia::render('my/nurse-bonus', [
            'employee' => [
                'full_name' => $employee->full_name,
                'employee_number' => $employee->employee_number,
                'position' => $employee->position?->name,
            ],
            'entries' => $entries,
            'criteria' => NurseBonusEntry::CRITERIA,
        ]);
    }
}
