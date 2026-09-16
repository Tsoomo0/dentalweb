<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\DocumentTemplate;
use App\Models\HR\Position;
use App\Services\HR\DocumentRenderer;
use App\Services\HR\HtmlSanitizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Гэрээ / ажлын байрны тодорхойлолтын загварын удирдлага.
 */
class DocumentTemplateController extends Controller
{
    public function index(): Response
    {
        $templates = DocumentTemplate::with(['position', 'creator'])
            ->withCount('documents')
            ->orderBy('type')
            ->orderBy('sort_order')
            ->orderBy('title')
            ->get()
            ->map(fn (DocumentTemplate $t) => [
                'id' => $t->id,
                'type' => $t->type,
                'type_label' => $t->type_label,
                'title' => $t->title,
                'code' => $t->code,
                'description' => $t->description,
                'position_id' => $t->position_id,
                'position' => $t->position?->name,
                'body' => $t->body,
                'requires_employer_signature' => $t->requires_employer_signature,
                'requires_employee_signature' => $t->requires_employee_signature,
                'is_active' => $t->is_active,
                'sort_order' => $t->sort_order,
                'documents_count' => $t->documents_count,
                'created_by' => $t->creator?->name,
                'updated_at' => $t->updated_at?->format('Y-m-d H:i'),
            ]);

        return Inertia::render('hr/document-templates/index', [
            'templates' => $templates,
            'positions' => Position::orderBy('name')->get(['id', 'name']),
            'types' => DocumentTemplate::TYPES,
            'catalog' => DocumentRenderer::catalog(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $data['body'] = HtmlSanitizer::clean($data['body']);
        $data['created_by'] = Auth::id();

        DocumentTemplate::create($data);

        return back()->with('success', 'Загвар үүслээ.');
    }

    public function update(Request $request, DocumentTemplate $documentTemplate): RedirectResponse
    {
        $data = $this->validated($request, $documentTemplate->id);

        $data['body'] = HtmlSanitizer::clean($data['body']);

        $documentTemplate->update($data);

        return back()->with('success', 'Загвар шинэчлэгдлээ.');
    }

    /** Ижил төстэй загвар хурдан гаргахад ашиглана. */
    public function duplicate(DocumentTemplate $documentTemplate): RedirectResponse
    {
        $copy = $documentTemplate->replicate(['code']);
        $copy->title = $documentTemplate->title.' (хуулбар)';
        $copy->code = null;
        $copy->is_active = false;
        $copy->created_by = Auth::id();
        $copy->save();

        return back()->with('success', 'Загвар хуулагдлаа.');
    }

    public function destroy(DocumentTemplate $documentTemplate): RedirectResponse
    {
        // Загвараас гарсан баримтууд өөрсдийн хувилбарыг хадгалдаг тул
        // загварыг устгасан ч гарын үсэгтэй гэрээнүүд бүрэн бүтэн үлдэнэ.
        $documentTemplate->delete();

        return back()->with('success', 'Загвар устлаа.');
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'type' => 'required|in:'.implode(',', array_keys(DocumentTemplate::TYPES)),
            'title' => 'required|string|max:200',
            'code' => 'nullable|string|max:60|unique:hr_document_templates,code'.($ignoreId ? ','.$ignoreId : ''),
            'position_id' => 'nullable|exists:positions,id',
            'description' => 'nullable|string|max:1000',
            'body' => 'required|string|max:200000',
            'requires_employer_signature' => 'boolean',
            'requires_employee_signature' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0|max:9999',
        ], [
            'title.required' => 'Загварын нэрийг бөглөнө үү',
            'body.required' => 'Гэрээний агуулгыг бөглөнө үү',
            'code.unique' => 'Ийм код бүхий загвар аль хэдийн байна',
        ]);
    }
}
