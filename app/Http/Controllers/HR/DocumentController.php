<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\HrDocument;
use App\Models\HR\HrDocumentCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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
                'documents_count' => $c->documents()->count(),
            ]);

        $query = HrDocument::with(['uploader', 'category'])->orderByDesc('created_at');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('q')) {
            $query->where('title', 'like', '%'.$request->q.'%');
        }

        $documents = $query->get()->map(fn ($d) => $this->format($d));

        return Inertia::render('hr/documents/index', [
            'documents' => $documents,
            'categories' => $categories,
            'filters' => $request->only(['category_id', 'q']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'title' => 'required|string|max:200',
            'category_id' => 'required|exists:hr_document_categories,id',
            'description' => 'nullable|string|max:1000',
            'expires_at' => 'nullable|date|after:today',
            'file' => 'required|file|max:20480|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,zip,txt',
        ]);

        $file = $request->file('file');
        $ext = $file->getClientOriginalExtension();
        $path = 'hr-documents/'.Str::uuid().'.'.$ext;

        Storage::disk('local')->put($path, file_get_contents($file));

        HrDocument::create([
            'title' => $request->title,
            'category_id' => $request->category_id,
            'description' => $request->description,
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'file_type' => $file->getMimeType(),
            'uploaded_by' => Auth::id(),
            'expires_at' => $request->expires_at ?: null,
            'download_count' => 0,
        ]);

        return back()->with('success', 'Файл амжилттай байршлаа.');
    }

    public function destroy(HrDocument $document): RedirectResponse
    {
        Storage::disk('local')->delete($document->file_path);
        $document->delete();

        return back()->with('success', 'Устгагдлаа.');
    }

    public function download(HrDocument $document): StreamedResponse
    {
        abort_unless(Storage::disk('local')->exists($document->file_path), 404, 'Файл олдсонгүй.');
        $document->increment('download_count');

        return Storage::disk('local')->download($document->file_path, $document->file_name);
    }

    public function view(HrDocument $document): \Symfony\Component\HttpFoundation\Response
    {
        abort_unless(Storage::disk('local')->exists($document->file_path), 404, 'Файл олдсонгүй.');

        return response()->file(
            Storage::disk('local')->path($document->file_path),
            ['Content-Disposition' => 'inline; filename="'.$document->file_name.'"']
        );
    }

    private function format(HrDocument $d): array
    {
        return [
            'id' => $d->id,
            'title' => $d->title,
            'category_id' => $d->category_id,
            'category_name' => $d->category?->name,
            'category_color' => $d->category?->color,
            'description' => $d->description,
            'file_name' => $d->file_name,
            'file_size' => $d->file_size_formatted,
            'file_type' => $d->file_type,
            'uploaded_by' => $d->uploader?->name,
            'expires_at' => $d->expires_at?->format('Y-m-d'),
            'is_expired' => $d->isExpired(),
            'download_count' => $d->download_count,
            'created_at' => $d->created_at->format('Y-m-d'),
        ];
    }
}
