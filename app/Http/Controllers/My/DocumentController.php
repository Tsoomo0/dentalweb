<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\HrDocument;
use App\Models\HR\HrDocumentCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function index(Request $request): Response
    {
        $categories = HrDocumentCategory::orderBy('order')->orderBy('name')->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'color' => $c->color,
            ]);

        $query = HrDocument::with('category')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>=', now()))
            ->orderByDesc('created_at');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('q')) {
            $query->where('title', 'like', '%'.$request->q.'%');
        }

        $documents = $query->get()->map(fn ($d) => [
            'id' => $d->id,
            'title' => $d->title,
            'category_id' => $d->category_id,
            'category_name' => $d->category?->name,
            'category_color' => $d->category?->color,
            'description' => $d->description,
            'file_name' => $d->file_name,
            'file_size' => $d->file_size_formatted,
            'file_type' => $d->file_type,
            'expires_at' => $d->expires_at?->format('Y-m-d'),
            'download_count' => $d->download_count,
            'created_at' => $d->created_at->format('Y-m-d'),
        ]);

        $employee = ProfileController::resolveEmployee();
        $employee?->load(['position', 'branch']);

        return Inertia::render('my/documents', [
            'documents' => $documents,
            'categories' => $categories,
            'filters' => $request->only(['category_id', 'q']),
            'employee' => $employee ? [
                'full_name' => $employee->full_name,
                'position' => $employee->position?->name,
                'photo_url' => $employee->photo_url,
                'initials' => mb_substr($employee->last_name ?? '', 0, 1).mb_substr($employee->first_name ?? '', 0, 1),
            ] : null,
        ]);
    }

    public function download(HrDocument $document): StreamedResponse
    {
        abort_if($document->isExpired(), 403);
        $document->increment('download_count');

        return Storage::disk('local')->download($document->file_path, $document->file_name);
    }

    public function view(HrDocument $document): \Symfony\Component\HttpFoundation\Response
    {
        abort_if($document->isExpired(), 403);
        abort_unless(Storage::disk('local')->exists($document->file_path), 404, 'Файл олдсонгүй.');

        return response()->file(
            Storage::disk('local')->path($document->file_path),
            ['Content-Disposition' => 'inline; filename="'.$document->file_name.'"']
        );
    }
}
