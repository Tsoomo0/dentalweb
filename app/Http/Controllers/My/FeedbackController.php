<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\FeedbackRequest;
use App\Models\User;
use App\Notifications\FeedbackSubmitted;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FeedbackController extends Controller
{
    public function index(): Response
    {
        $employee = ProfileController::resolveEmployee();

        if (! $employee) {
            return Inertia::render('my/feedback', ['feedbacks' => [], 'employee' => null]);
        }

        $employee->load(['position', 'branch']);

        $feedbacks = FeedbackRequest::with('reviewer')
            ->where('employee_id', $employee->id)
            ->latest()
            ->get()
            ->map(fn ($f) => [
                'id' => $f->id,
                'type' => $f->type,
                'type_label' => $f->type_label,
                'subject' => $f->subject,
                'body' => $f->body,
                'status' => $f->status,
                'status_label' => $f->status_label,
                'admin_response' => $f->admin_response,
                'reviewed_by' => $f->reviewer?->name,
                'reviewed_at' => $f->reviewed_at?->format('Y-m-d H:i'),
                'created_at' => $f->created_at->format('Y-m-d'),
            ]);

        return Inertia::render('my/feedback', [
            'feedbacks' => $feedbacks,
            'employee' => [
                'full_name' => $employee->full_name,
                'position' => $employee->position?->name,
                'photo_url' => $employee->photo_url,
                'initials' => mb_substr($employee->last_name ?? '', 0, 1).mb_substr($employee->first_name ?? '', 0, 1),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (! $employee) {
            abort(403);
        }

        $request->validate([
            'type' => 'required|in:suggestion,request,complaint',
            'subject' => 'required|string|max:200',
            'body' => 'required|string|max:3000',
        ]);

        $feedback = FeedbackRequest::create([
            'employee_id' => $employee->id,
            'type' => $request->type,
            'subject' => $request->subject,
            'body' => $request->body,
        ]);

        $feedback->load('employee');

        User::whereHas('role', fn ($q) => $q->where('name', 'admin'))
            ->get()
            ->each(function ($u) use ($feedback) {
                try {
                    $u->notify(new FeedbackSubmitted($feedback));
                } catch (\Throwable) {
                }
            });

        return back()->with('success', 'Таны '.$feedback->type_label.' амжилттай илгээгдлээ.');
    }
}
