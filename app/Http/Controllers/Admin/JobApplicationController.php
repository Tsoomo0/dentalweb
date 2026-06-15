<?php

namespace App\Http\Controllers\Admin;

use App\Exports\JobApplicationExport;
use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class JobApplicationController extends Controller
{
    public function index(Request $request)
    {
        $query = JobApplication::latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('first_name', 'like', "%$s%")
                    ->orWhere('last_name', 'like', "%$s%")
                    ->orWhere('email', 'like', "%$s%")
                    ->orWhere('phone_mobile', 'like', "%$s%");
            });
        }

        $applications = $query->get()->map(fn ($a) => [
            'id' => $a->id,
            'full_name' => $a->last_name.' '.$a->first_name,
            'email' => $a->email,
            'phone_mobile' => $a->phone_mobile,
            'status' => $a->status,
            'created_at' => $a->created_at->format('Y.m.d H:i'),
        ]);

        return Inertia::render('admin/job-applications/index', [
            'applications' => $applications,
            'stats' => [
                'total' => JobApplication::count(),
                'pending' => JobApplication::where('status', 'pending')->count(),
                'reviewed' => JobApplication::where('status', 'reviewed')->count(),
                'shortlisted' => JobApplication::where('status', 'shortlisted')->count(),
                'rejected' => JobApplication::where('status', 'rejected')->count(),
            ],
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    public function show(JobApplication $jobApplication)
    {
        $a = $jobApplication;

        return Inertia::render('admin/job-applications/show', [
            'application' => array_merge($a->toArray(), [
                'birth_date' => $a->birth_date?->format('Y.m.d'),
                'created_at' => $a->created_at->format('Y.m.d H:i'),
                'updated_at' => $a->updated_at->format('Y.m.d H:i'),
            ]),
        ]);
    }

    public function update(Request $request, JobApplication $jobApplication)
    {
        $request->validate([
            'status' => 'required|in:pending,reviewed,shortlisted,rejected',
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        $jobApplication->update($request->only(['status', 'admin_notes']));

        return back()->with('success', 'Анкет амжилттай шинэчлэгдлээ.');
    }

    public function destroy(JobApplication $jobApplication)
    {
        $jobApplication->delete();

        return redirect()->route('admin.job-applications.index')
            ->with('success', 'Анкет устгагдлаа.');
    }

    public function exportCsv(Request $request): BinaryFileResponse
    {
        $query = JobApplication::latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $applications = $query->get();

        $filename = 'job_applications_'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(new JobApplicationExport($applications), $filename);
    }
}
