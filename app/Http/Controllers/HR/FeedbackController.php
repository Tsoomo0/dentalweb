<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\FeedbackRequest;
use App\Notifications\FeedbackResponded;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class FeedbackController extends Controller
{
    public function index(): Response
    {
        $feedbacks = FeedbackRequest::with(['employee.position', 'employee.branch', 'reviewer'])
            ->latest()
            ->get()
            ->map(fn($f) => [
                'id'             => $f->id,
                'type'           => $f->type,
                'type_label'     => $f->type_label,
                'subject'        => $f->subject,
                'body'           => $f->body,
                'status'         => $f->status,
                'status_label'   => $f->status_label,
                'admin_response' => $f->admin_response,
                'employee_name'  => $f->employee->full_name,
                'employee_position' => $f->employee->position?->name,
                'employee_branch'   => $f->employee->branch?->name,
                'reviewed_by'    => $f->reviewer?->name,
                'reviewed_at'    => $f->reviewed_at?->format('Y-m-d H:i'),
                'created_at'     => $f->created_at->format('Y-m-d'),
            ]);

        return Inertia::render('hr/feedback/index', ['feedbacks' => $feedbacks]);
    }

    public function respond(Request $request, FeedbackRequest $feedback): RedirectResponse
    {
        $request->validate([
            'status'         => 'required|in:reviewed,resolved,rejected',
            'admin_response' => 'required|string|max:3000',
        ]);

        $feedback->update([
            'status'         => $request->status,
            'admin_response' => $request->admin_response,
            'reviewed_by'    => Auth::id(),
            'reviewed_at'    => now(),
        ]);

        $feedback->load(['employee.user', 'employee.position']);

        if ($feedback->employee->user) {
            try {
                $feedback->employee->user->notify(new FeedbackResponded($feedback));
            } catch (\Throwable) {}
        }

        return back()->with('success', 'Хариу амжилттай илгээгдлээ.');
    }
}
