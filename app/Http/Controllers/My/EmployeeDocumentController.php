<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Http\Controllers\HR\EmployeeDocumentController as HrEmployeeDocumentController;
use App\Models\HR\EmployeeDocument;
use App\Services\HR\DocumentRenderer;
use App\Services\HR\EmployeeDocumentFlow;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * Ажилтны талын гэрээ / ажлын байрны тодорхойлолт —
 * агуулгатай танилцаж гарын үсэг зурна.
 */
class EmployeeDocumentController extends Controller
{
    public function index(): Response
    {
        $employee = ProfileController::resolveEmployee();

        if (! $employee) {
            return Inertia::render('my/contracts', [
                'pending' => [],
                'signed' => [],
                'employee' => null,
            ]);
        }

        $employee->load(['position', 'branch']);

        $documents = EmployeeDocument::with('employerUser')
            ->where('employee_id', $employee->id)
            // Ноорог болон цуцлагдсаныг ажилтан харах шаардлагагүй
            ->whereIn('status', ['pending_employee', 'completed', 'declined'])
            ->latest()
            ->get();

        return Inertia::render('my/contracts', [
            'pending' => $documents->where('status', 'pending_employee')->values()->map(fn ($d) => $this->format($d)),
            'signed' => $documents->whereIn('status', ['completed', 'declined'])->values()->map(fn ($d) => $this->format($d)),
            'employee' => [
                'full_name' => $employee->full_name,
                'short_name' => DocumentRenderer::shortName($employee),
                'position' => $employee->position?->name,
                'photo_url' => $employee->photo_url,
                'initials' => mb_substr($employee->last_name ?? '', 0, 1).mb_substr($employee->first_name ?? '', 0, 1),
            ],
        ]);
    }

    public function sign(Request $request, EmployeeDocument $employeeDocument): RedirectResponse
    {
        $document = $this->authorizeDocument($employeeDocument);

        if (! $document->awaitsEmployee()) {
            return back()->with('error', 'Энэ баримт гарын үсэг хүлээж байгаа төлөвт байхгүй байна.');
        }

        $validated = $request->validate([
            'signature' => 'required|string',
            'agreed' => 'accepted',
        ], [
            'signature.required' => 'Гарын үсэг зурна уу',
            'agreed.accepted' => 'Гэрээний нөхцөлтэй танилцсанаа баталгаажуулна уу',
        ]);

        if (! preg_match('~^data:image/(png|jpeg);base64,[a-z0-9+/=\s]+$~i', $validated['signature'])) {
            return back()->with('error', 'Гарын үсэг буруу форматтай байна.');
        }

        $document->forceFill([
            'employee_signature' => $validated['signature'],
            'employee_signed_at' => now(),
        ])->save();

        EmployeeDocumentFlow::afterEmployeeSigned($document);

        return back()->with('success', 'Гарын үсэг зурагдаж, гэрээ баталгаажлаа. Хувийг и-мэйлээр удахгүй илгээнэ.');
    }

    public function decline(Request $request, EmployeeDocument $employeeDocument): RedirectResponse
    {
        $document = $this->authorizeDocument($employeeDocument);

        if (! $document->awaitsEmployee()) {
            return back()->with('error', 'Энэ баримт гарын үсэг хүлээж байгаа төлөвт байхгүй байна.');
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:2000',
        ], [
            'reason.required' => 'Татгалзсан шалтгаанаа бичнэ үү',
        ]);

        EmployeeDocumentFlow::decline($document, $validated['reason']);

        return back()->with('success', 'Татгалзсан шалтгааныг хүний нөөцөд илгээлээ.');
    }

    public function pdf(Request $request, EmployeeDocument $employeeDocument): HttpResponse
    {
        $document = $this->authorizeDocument($employeeDocument);

        return HrEmployeeDocumentController::pdfResponse($document, $request->boolean('inline'));
    }

    private function authorizeDocument(EmployeeDocument $document): EmployeeDocument
    {
        $employee = ProfileController::resolveEmployee();

        if (! $employee || $document->employee_id !== $employee->id) {
            abort(403);
        }

        return $document;
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
            'body' => $d->body,
            'employer_name' => $d->employer_name,
            'employer_position' => $d->employer_position,
            'employer_signature' => $d->employer_signature,
            'employer_stamp' => $d->employer_stamp,
            'employer_signed_at' => $d->employer_signed_at?->format('Y-m-d H:i'),
            'employee_name' => $d->employee_name,
            'employee_position' => $d->employee_position,
            'employee_signature' => $d->employee_signature,
            'employee_signed_at' => $d->employee_signed_at?->format('Y-m-d H:i'),
            'effective_date' => $d->effective_date?->format('Y-m-d'),
            'expires_at' => $d->expires_at?->format('Y-m-d'),
            'sent_at' => $d->sent_at?->format('Y-m-d H:i'),
            'completed_at' => $d->completed_at?->format('Y-m-d H:i'),
            'decline_reason' => $d->decline_reason,
        ];
    }
}
