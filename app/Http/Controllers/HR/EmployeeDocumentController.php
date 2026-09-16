<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\DocumentTemplate;
use App\Models\HR\Employee;
use App\Models\HR\EmployeeDocument;
use App\Models\Setting;
use App\Services\HR\CompanyStamp;
use App\Services\HR\DocumentRenderer;
use App\Services\HR\EmployeeDocumentFlow;
use App\Services\HR\EmployeeDocumentPdf;
use App\Services\HR\HtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * Ажилтанд илгээх гэрээ / ажлын байрны тодорхойлолт.
 *
 * Урсгал: загвар сонгоно → ажилтан сонгоно → захирал гарын үсэг зурна
 *         → ажилтан руу очно → ажилтан гарын үсэг зурна → 2 талд PDF и-мэйлдэнэ.
 */
class EmployeeDocumentController extends Controller
{
    /** Нэг хуудсанд харуулах гэрээний тоо. */
    private const PER_PAGE = 15;

    public function index(Request $request): Response
    {
        $filters = [
            'status' => $request->string('status')->toString(),
            'type' => $request->string('type')->toString(),
            'search' => $request->string('search')->toString(),
        ];

        $query = EmployeeDocument::with(['employee.position', 'employee.branch', 'creator'])
            ->when($filters['status'], fn ($q, $v) => $q->where('status', $v))
            ->when($filters['type'], fn ($q, $v) => $q->where('type', $v))
            ->when($filters['search'], function ($q, $v) {
                $q->where(function ($q) use ($v) {
                    $q->where('title', 'like', "%{$v}%")
                        ->orWhere('doc_number', 'like', "%{$v}%")
                        ->orWhere('employee_name', 'like', "%{$v}%")
                        ->orWhereHas('employee', fn ($e) => $e
                            ->where('last_name', 'like', "%{$v}%")
                            ->orWhere('first_name', 'like', "%{$v}%"));
                });
            })
            ->latest();

        // Жагсаалтад гэрээний бүтэн агуулгыг явуулахгүй — олон ажилтантай үед
        // хуудас хэдэн мегабайт болно. Агуулгыг нээх үед тусад нь татна.
        $documents = $query->paginate(self::PER_PAGE)->withQueryString()
            ->through(fn (EmployeeDocument $d) => $this->format($d));

        return Inertia::render('hr/employee-documents/index', [
            'documents' => $documents,
            'filters' => $filters,
            'stats' => $this->stats(),
            // Хүнд өгөгдлүүдийг closure-т оруулснаар шүүлтүүр/хуудас солиход
            // (partial reload) дахин тооцоологдохгүй — таб шууд солигдоно.
            'employees' => fn () => $this->employeeOptions(),
            'templates' => fn () => $this->templateOptions(),
            'types' => DocumentTemplate::TYPES,
            'statuses' => EmployeeDocument::STATUSES,
            'catalog' => fn () => DocumentRenderer::catalog(),
            'employerDefaults' => fn () => [
                'name' => Setting::get('director_name', 'Ж. Оюунбилэг'),
                'position' => Setting::get('director_position', 'Гүйцэтгэх захирал'),
            ],
            'companyStamp' => fn () => CompanyStamp::dataUri(),
        ]);
    }

    /** Гэрээний агуулга — харах/гарын үсэг зурах үед л татна. */
    public function show(EmployeeDocument $employeeDocument): JsonResponse
    {
        $employeeDocument->loadMissing(['employee.position', 'employee.branch']);

        return response()->json([
            'id' => $employeeDocument->id,
            'body' => $employeeDocument->body,
            'notes' => $employeeDocument->notes,
        ]);
    }

    /** Төлөв тус бүрийн тоо — шүүлтүүрийн хажууд харагдана. */
    private function stats(): array
    {
        $counts = EmployeeDocument::selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'total' => (int) $counts->sum(),
            'draft' => (int) $counts->get('draft', 0),
            'pending_employee' => (int) $counts->get('pending_employee', 0),
            'completed' => (int) $counts->get('completed', 0),
            'declined' => (int) $counts->get('declined', 0),
        ];
    }

    /** @return Collection<int, array<string, mixed>> */
    private function employeeOptions()
    {
        return Employee::with(['position', 'branch'])
            ->where('status', 'active')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get()
            ->map(fn (Employee $e) => [
                'id' => $e->id,
                'name' => $e->full_name,
                'position' => $e->position?->name,
                'position_id' => $e->position_id,
                'branch' => $e->branch?->name,
                'email' => $e->email,
                'has_account' => (bool) $e->user_id,
                // Загварын {{талбар}}-ууд урьдчилан харахад шууд орлуулагдана
                'variables' => DocumentRenderer::variables($e),
            ]);
    }

    /** @return Collection<int, array<string, mixed>> */
    private function templateOptions()
    {
        return DocumentTemplate::where('is_active', true)
            ->orderBy('type')
            ->orderBy('sort_order')
            ->orderBy('title')
            ->get()
            ->map(fn (DocumentTemplate $t) => [
                'id' => $t->id,
                'type' => $t->type,
                'type_label' => $t->type_label,
                'title' => $t->title,
                'position_id' => $t->position_id,
                'body' => $t->body,
                'requires_employer_signature' => $t->requires_employer_signature,
                'requires_employee_signature' => $t->requires_employee_signature,
            ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'template_id' => 'required|exists:hr_document_templates,id',
            'title' => 'nullable|string|max:200',
            'doc_number' => 'nullable|string|max:60',
            'effective_date' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:effective_date',
            'notes' => 'nullable|string|max:2000',
            'variables' => 'nullable|array',
            'variables.*' => 'nullable|string|max:2000',
        ], [
            'employee_id.required' => 'Ажилтнаа сонгоно уу',
            'template_id.required' => 'Загвараа сонгоно уу',
        ]);

        $employee = Employee::with(['position', 'branch'])->findOrFail($validated['employee_id']);
        $template = DocumentTemplate::findOrFail($validated['template_id']);

        $document = EmployeeDocument::create(
            $this->buildAttributes($employee, $template, $validated) + [
                'status' => 'draft',
                'created_by' => Auth::id(),
            ]
        );

        return back()->with('success', "«{$document->title}» гэрээ үүслээ. Захирлын гарын үсэг зурснаар ажилтанд илгээгдэнэ.");
    }

    /** Гарын үсэг зурахаас өмнөх үе шатанд агуулга, нөхцөлийг засах. */
    public function update(Request $request, EmployeeDocument $employeeDocument): RedirectResponse
    {
        if (! in_array($employeeDocument->status, ['draft', 'declined'], true)) {
            return back()->with('error', 'Гарын үсэг зурагдсан баримтыг засах боломжгүй.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:200',
            'doc_number' => 'nullable|string|max:60',
            'effective_date' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:effective_date',
            'notes' => 'nullable|string|max:2000',
            'body' => 'required|string|max:200000',
        ]);

        $validated['body'] = HtmlSanitizer::clean($validated['body']);

        // Татгалзсан баримтыг засвал дахин «гэрээ үүссэн» болж, урсгал шинээр эхэлнэ
        if ($employeeDocument->status === 'declined') {
            $validated['status'] = 'draft';
            $validated['decline_reason'] = null;
        }

        $employeeDocument->update($validated);

        return back()->with('success', 'Баримт шинэчлэгдлээ.');
    }

    /**
     * Захирал (ажил олгогч) гарын үсэг зурна — үүний дараа баримт
     * ажилтан руу автоматаар илгээгдэнэ.
     */
    public function signEmployer(Request $request, EmployeeDocument $employeeDocument): RedirectResponse
    {
        if (! in_array($employeeDocument->status, ['draft', 'pending_employer'], true)) {
            return back()->with('error', 'Энэ баримт ажил олгогчийн гарын үсэг хүлээж байгаа төлөвт байхгүй байна.');
        }

        $validated = $request->validate([
            'signature' => 'required|string',
            'employer_name' => 'required|string|max:120',
            'employer_position' => 'required|string|max:120',
            'apply_stamp' => 'nullable|boolean',
        ], [
            'signature.required' => 'Гарын үсэг зурна уу',
            'employer_name.required' => 'Гарын үсэг зурагчийн нэрийг оруулна уу',
        ]);

        if (! $this->isSignatureImage($validated['signature'])) {
            return back()->with('error', 'Гарын үсэг буруу форматтай байна.');
        }

        $employeeDocument->forceFill([
            'employer_name' => $validated['employer_name'],
            'employer_position' => $validated['employer_position'],
            'employer_user_id' => Auth::id(),
            'employer_signature' => $validated['signature'],
            'employer_signed_at' => now(),
            // Тамгыг тухайн үеийн байдлаар хувилж хадгална — дараа компанийн
            // тамга солигдсон ч баталгаажсан гэрээ хэвээр үлдэнэ.
            'employer_stamp' => $request->boolean('apply_stamp', true) ? CompanyStamp::dataUri() : null,
        ])->save();

        $employeeDocument->load('template', 'employee.user');

        EmployeeDocumentFlow::afterEmployerSigned($employeeDocument);

        return back()->with('success', $employeeDocument->fresh()->status === 'completed'
            ? 'Баримт баталгаажиж, и-мэйлээр илгээгдлээ.'
            : 'Гарын үсэг зурагдаж, ажилтан руу илгээгдлээ.');
    }

    /**
     * Баталгаажсан гэрээг хоёр талд дахин и-мэйлдэх — хүрээгүй тохиолдолд.
     */
    public function redeliver(EmployeeDocument $employeeDocument): RedirectResponse
    {
        if ($employeeDocument->status !== 'completed') {
            return back()->with('error', 'Зөвхөн баталгаажсан гэрээг дахин илгээнэ.');
        }

        EmployeeDocumentFlow::redeliver($employeeDocument);

        return back()->with('success', 'Гэрээг дахин илгээхээр дараалалд оруулав.');
    }

    /** Ажилтан хараагүй байгаа бол дахин сануулах. */
    public function remind(EmployeeDocument $employeeDocument): RedirectResponse
    {
        if ($employeeDocument->status !== 'pending_employee') {
            return back()->with('error', 'Зөвхөн ажилтны гарын үсэг хүлээж буй баримтад сануулна.');
        }

        EmployeeDocumentFlow::notifyEmployee($employeeDocument);

        return back()->with('success', 'Ажилтанд сануулга илгээлээ.');
    }

    public function cancel(EmployeeDocument $employeeDocument): RedirectResponse
    {
        if ($employeeDocument->status === 'completed') {
            return back()->with('error', 'Баталгаажсан гэрээг цуцлах боломжгүй.');
        }

        $employeeDocument->update(['status' => 'cancelled']);

        return back()->with('success', 'Баримт цуцлагдлаа.');
    }

    /**
     * Гэрээг устгана. Баталгаажсаныг устгах нь буцаах боломжгүй тул
     * тусгайлан баталгаажуулсан үед л зөвшөөрнө.
     */
    public function destroy(Request $request, EmployeeDocument $employeeDocument): RedirectResponse
    {
        if ($employeeDocument->status === 'completed' && ! $request->boolean('confirm')) {
            return back()->with('error', 'Баталгаажсан гэрээг устгахын өмнө баталгаажуулна уу.');
        }

        // Хадгалсан PDF-ийг ардаа үлдээхгүй
        if ($employeeDocument->pdf_path) {
            Storage::disk(EmployeeDocumentPdf::DISK)->delete($employeeDocument->pdf_path);
        }

        $title = $employeeDocument->title;
        $employeeDocument->delete();

        return back()->with('success', "«{$title}» гэрээ устлаа.");
    }

    /** PDF-ээр татах — баталгаажаагүй бол ч урьдчилан харах боломжтой. */
    public function pdf(Request $request, EmployeeDocument $employeeDocument): HttpResponse
    {
        return $this->pdfResponse($employeeDocument, $request->boolean('inline'));
    }

    // ── Дотоод туслахууд ─────────────────────────────────────────────────────

    /**
     * PDF-ийг буцаана — баталгаажсан баримтын хувьд хадгалсан файлыг,
     * бусад тохиолдолд шинээр үүсгэж өгнө.
     */
    public static function pdfResponse(EmployeeDocument $document, bool $inline = false): HttpResponse
    {
        $name = EmployeeDocumentPdf::fileName($document);

        $content = $document->pdf_path && Storage::disk(EmployeeDocumentPdf::DISK)->exists($document->pdf_path)
            ? Storage::disk(EmployeeDocumentPdf::DISK)->get($document->pdf_path)
            : EmployeeDocumentPdf::raw($document);

        return response($content, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => ($inline ? 'inline' : 'attachment').'; filename="'.addslashes($name).'"',
        ]);
    }

    /** Загвар + ажилтнаас баримтын талбаруудыг угсарна. */
    private function buildAttributes(Employee $employee, DocumentTemplate $template, array $validated): array
    {
        $overrides = array_filter(
            $validated['variables'] ?? [],
            fn ($key) => in_array($key, DocumentRenderer::keys(), true),
            ARRAY_FILTER_USE_KEY
        );

        if (! empty($validated['doc_number'])) {
            $overrides['doc_number'] = $validated['doc_number'];
        }

        $variables = DocumentRenderer::variables(
            $employee,
            $overrides,
            ! empty($validated['effective_date']) ? Carbon::parse($validated['effective_date']) : null
        );

        return [
            'employee_id' => $employee->id,
            'template_id' => $template->id,
            'type' => $template->type,
            'title' => ($validated['title'] ?? '') ?: $template->title,
            'doc_number' => $validated['doc_number'] ?? null,
            'body' => DocumentRenderer::render($template->body, $variables),
            'variables' => $variables,
            'employer_name' => Setting::get('director_name', 'Ж. Оюунбилэг'),
            'employer_position' => Setting::get('director_position', 'Гүйцэтгэх захирал'),
            'employee_name' => DocumentRenderer::shortName($employee),
            'employee_position' => $employee->position?->name,
            'effective_date' => $validated['effective_date'] ?? null,
            'expires_at' => $validated['expires_at'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ];
    }

    private function isSignatureImage(string $value): bool
    {
        return (bool) preg_match('~^data:image/(png|jpeg);base64,[a-z0-9+/=\s]+$~i', $value);
    }

    private function format(EmployeeDocument $d): array
    {
        return [
            'id' => $d->id,
            'type' => $d->type,
            'type_label' => $d->type_label,
            'title' => $d->title,
            'doc_number' => $d->doc_number,
            'status' => $d->status,
            'status_label' => $d->status_label,
            'employee_id' => $d->employee_id,
            'employee_name' => $d->employee_name ?: $d->employee?->full_name,
            'employee_position' => $d->employee_position,
            'employee_branch' => $d->employee?->branch?->name,
            'employee_has_account' => (bool) $d->employee?->user_id,
            'template' => $d->template?->title,
            'employer_name' => $d->employer_name,
            'employer_position' => $d->employer_position,
            'employer_signature' => $d->employer_signature,
            'employer_stamp' => $d->employer_stamp,
            'employer_signed_at' => $d->employer_signed_at?->format('Y-m-d H:i'),
            'employee_signature' => $d->employee_signature,
            'employee_signed_at' => $d->employee_signed_at?->format('Y-m-d H:i'),
            'effective_date' => $d->effective_date?->format('Y-m-d'),
            'expires_at' => $d->expires_at?->format('Y-m-d'),
            'sent_at' => $d->sent_at?->format('Y-m-d H:i'),
            'completed_at' => $d->completed_at?->format('Y-m-d H:i'),
            'delivered_at' => $d->delivered_at?->format('Y-m-d H:i'),
            'delivered_to' => $d->delivered_to,
            'delivery_error' => $d->delivery_error,
            'employee_email' => $d->employee?->email ?: $d->employee?->user?->email,
            'decline_reason' => $d->decline_reason,
            'notes' => $d->notes,
            'created_by' => $d->creator?->name,
            'created_at' => $d->created_at->format('Y-m-d'),
        ];
    }
}
