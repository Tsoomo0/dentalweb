<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\Employee;
use App\Models\HR\EmployeeExitChecklist;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ExitChecklistController extends Controller
{
    public function index(Request $request): Response
    {
        $query = EmployeeExitChecklist::with(['employee.position', 'employee.branch'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('q')) {
            $query->whereHas('employee', fn ($q) => $q->where('first_name', 'like', '%'.$request->q.'%')
                ->orWhere('last_name', 'like', '%'.$request->q.'%'));
        }

        $checklists = $query->get()->map(fn ($c) => $this->formatList($c));

        return Inertia::render('hr/exit-checklists/index', [
            'checklists' => $checklists,
            'filters' => $request->only(['status', 'q']),
        ]);
    }

    public function create(Request $request): Response
    {
        $employees = Employee::with(['position', 'branch'])
            ->where('status', 'active')
            ->whereDoesntHave('exitChecklist')
            ->orderBy('last_name')->orderBy('first_name')
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'name' => $e->full_name,
                'position' => $e->position?->name,
                'branch' => $e->branch?->name,
            ]);

        return Inertia::render('hr/exit-checklists/create', [
            'employees' => $employees,
            'selected_employee' => $request->integer('employee_id') ?: null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id|unique:employee_exit_checklists,employee_id',
            'exit_date' => 'required|date',
            'exit_type' => 'required|in:resignation,termination,contract_end,retirement,death,other',
            'reason' => 'nullable|string|max:2000',
            'notice_date' => 'nullable|date',
            'replacement_plan' => 'nullable|string|max:500',
        ]);

        $checklist = EmployeeExitChecklist::create([
            'employee_id' => $request->employee_id,
            'exit_date' => $request->exit_date,
            'exit_type' => $request->exit_type,
            'reason' => $request->reason,
            'notice_date' => $request->notice_date,
            'replacement_plan' => $request->replacement_plan,
            'status' => 'draft',
        ]);

        return redirect()->route('hr.exit-checklists.show', $checklist)
            ->with('success', 'Гарах бүртгэл үүсгэгдлээ.');
    }

    public function show(EmployeeExitChecklist $exitChecklist): Response
    {
        $exitChecklist->load(['employee.position', 'employee.branch', 'completedBy']);

        return Inertia::render('hr/exit-checklists/show', [
            'checklist' => $this->formatDetail($exitChecklist),
        ]);
    }

    public function update(Request $request, EmployeeExitChecklist $exitChecklist): RedirectResponse
    {
        if ($exitChecklist->isCompleted()) {
            return back()->with('error', 'Дууссан бүртгэлийг өөрчлөх боломжгүй.');
        }

        $fields = array_merge(
            ['exit_date', 'exit_type', 'reason', 'notice_date', 'replacement_plan',
                'notes_property', 'notes_it', 'notes_finance', 'notes_general',
                'eligible_for_rehire', 'exit_interview_notes'],
            EmployeeExitChecklist::$allItems
        );

        $data = $request->only($fields);

        // Determine status
        $completed = collect(EmployeeExitChecklist::$allItems)->filter(fn ($k) => ! empty($data[$k]))->count();
        $data['status'] = $completed === 0 ? 'draft'
            : ($completed === count(EmployeeExitChecklist::$allItems) ? 'in_progress' : 'in_progress');

        $exitChecklist->update($data);

        return back()->with('success', 'Хадгалагдлаа.');
    }

    public function complete(EmployeeExitChecklist $exitChecklist): RedirectResponse
    {
        if ($exitChecklist->isCompleted()) {
            return back()->with('error', 'Аль хэдийн дуусгагдсан байна.');
        }

        $exitChecklist->update([
            'status' => 'completed',
            'completed_by' => Auth::id(),
            'completed_at' => now(),
        ]);

        // Set employee to inactive
        $exitChecklist->employee->update(['status' => 'inactive']);

        return redirect()->route('hr.exit-checklists.show', $exitChecklist)
            ->with('success', 'Гарах бүртгэл дуусгагдлаа. Ажилтны статус "Идэвхгүй" болов.');
    }

    public function reopen(EmployeeExitChecklist $exitChecklist): RedirectResponse
    {
        $exitChecklist->update([
            'status' => 'in_progress',
            'completed_by' => null,
            'completed_at' => null,
        ]);

        return back()->with('success', 'Бүртгэл дахин нээгдлээ.');
    }

    public function destroy(EmployeeExitChecklist $exitChecklist): RedirectResponse
    {
        $exitChecklist->delete();

        return redirect()->route('hr.exit-checklists.index')
            ->with('success', 'Бүртгэл устгагдлаа.');
    }

    private function formatList(EmployeeExitChecklist $c): array
    {
        return [
            'id' => $c->id,
            'employee_id' => $c->employee_id,
            'employee_name' => $c->employee?->full_name,
            'position' => $c->employee?->position?->name,
            'branch' => $c->employee?->branch?->name,
            'exit_date' => $c->exit_date?->format('Y-m-d'),
            'exit_type' => $c->exit_type,
            'status' => $c->status,
            'progress' => $c->progressPercent(),
            'completed_count' => $c->completedCount(),
            'total_items' => $c->totalItems(),
            'created_at' => $c->created_at->format('Y-m-d'),
        ];
    }

    private function formatDetail(EmployeeExitChecklist $c): array
    {
        return [
            'id' => $c->id,
            'employee_id' => $c->employee_id,
            'employee_name' => $c->employee?->full_name,
            'employee_number' => $c->employee?->employee_number,
            'position' => $c->employee?->position?->name,
            'branch' => $c->employee?->branch?->name,
            'hired_date' => $c->employee?->hired_date?->format('Y-m-d'),
            'exit_date' => $c->exit_date?->format('Y-m-d'),
            'exit_type' => $c->exit_type,
            'reason' => $c->reason,
            'notice_date' => $c->notice_date?->format('Y-m-d'),
            'replacement_plan' => $c->replacement_plan,
            // Property
            'item_equipment_returned' => $c->item_equipment_returned,
            'item_badge_returned' => $c->item_badge_returned,
            'item_keys_returned' => $c->item_keys_returned,
            'item_books_returned' => $c->item_books_returned,
            'item_uniform_returned' => $c->item_uniform_returned,
            'notes_property' => $c->notes_property,
            // IT
            'item_system_access_revoked' => $c->item_system_access_revoked,
            'item_email_deactivated' => $c->item_email_deactivated,
            'item_files_transferred' => $c->item_files_transferred,
            'notes_it' => $c->notes_it,
            // Finance
            'item_final_salary_processed' => $c->item_final_salary_processed,
            'item_advances_settled' => $c->item_advances_settled,
            'item_insurance_notified' => $c->item_insurance_notified,
            'item_tax_notified' => $c->item_tax_notified,
            'notes_finance' => $c->notes_finance,
            // Management
            'item_handover_completed' => $c->item_handover_completed,
            'item_exit_interview_done' => $c->item_exit_interview_done,
            'item_certificate_issued' => $c->item_certificate_issued,
            'eligible_for_rehire' => $c->eligible_for_rehire,
            'exit_interview_notes' => $c->exit_interview_notes,
            'notes_general' => $c->notes_general,
            // Status
            'status' => $c->status,
            'progress' => $c->progressPercent(),
            'completed_count' => $c->completedCount(),
            'total_items' => $c->totalItems(),
            'completed_by' => $c->completedBy?->name,
            'completed_at' => $c->completed_at?->format('Y-m-d H:i'),
            'created_at' => $c->created_at->format('Y-m-d'),
        ];
    }
}
