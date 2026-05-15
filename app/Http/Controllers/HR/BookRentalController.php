<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\BookRental;
use App\Notifications\BookRentalDecision;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class BookRentalController extends Controller
{
    public function index(): Response
    {
        $rentals = BookRental::with(['book.category', 'employee.position', 'employee.branch', 'approver'])
            ->latest()
            ->get()
            ->map(fn(BookRental $r) => [
                'id'               => $r->id,
                'book_id'          => $r->book_id,
                'book_title'       => $r->book->title,
                'book_author'      => $r->book->author,
                'book_isbn'        => $r->book->isbn,
                'book_cover_url'   => $r->book->cover_url,
                'category_name'    => $r->book->category?->name,
                'category_color'   => $r->book->category?->color ?? 'blue',
                'employee_id'      => $r->employee_id,
                'employee_name'    => $r->employee->full_name,
                'employee_number'  => $r->employee->employee_number,
                'employee_photo'   => $r->employee->photo_url,
                'position'         => $r->employee->position?->name,
                'branch'           => $r->employee->branch?->name,
                'status'           => $r->status,
                'rejection_reason' => $r->rejection_reason,
                'notes'            => $r->notes,
                'approved_by'      => $r->approver?->name,
                'approved_at'      => $r->approved_at?->toDateString(),
                'returned_at'      => $r->returned_at?->toDateString(),
                'created_at'       => $r->created_at->toDateString(),
            ]);

        return Inertia::render('hr/book-rentals/index', [
            'rentals' => $rentals,
        ]);
    }

    public function approve(BookRental $bookRental): RedirectResponse
    {
        if (!$bookRental->isPending()) {
            return back()->with('error', 'Энэ хүсэлт аль хэдийн шийдвэрлэгдсэн байна.');
        }

        $available = $bookRental->book->available_copies;
        if ($available <= 0) {
            return back()->with('error', 'Уг номын боломжит хувь дууссан байна.');
        }

        $bookRental->update([
            'status'      => 'approved',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        $this->notifyEmployee($bookRental);

        return back()->with('success', 'Номын түрээс зөвшөөрөгдлөө.');
    }

    public function reject(Request $request, BookRental $bookRental): RedirectResponse
    {
        if (!$bookRental->isPending()) {
            return back()->with('error', 'Энэ хүсэлт аль хэдийн шийдвэрлэгдсэн байна.');
        }

        $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $bookRental->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'approved_by'      => Auth::id(),
            'approved_at'      => now(),
        ]);

        $this->notifyEmployee($bookRental);

        return back()->with('success', 'Номын түрээс цуцлагдлаа.');
    }

    public function markReturned(BookRental $bookRental): RedirectResponse
    {
        if (!$bookRental->isApproved()) {
            return back()->with('error', 'Зөвхөн зөвшөөрөгдсөн түрээсийг буцааж болно.');
        }

        $bookRental->update([
            'status'      => 'returned',
            'returned_at' => now(),
        ]);

        return back()->with('success', 'Ном буцааж авсан гэж тэмдэглэлээ.');
    }

    public function destroy(BookRental $bookRental): RedirectResponse
    {
        $bookRental->load('book', 'employee');
        $emp   = $bookRental->employee?->full_name ?? '—';
        $book  = $bookRental->book?->title ?? '—';
        $stat  = $bookRental->status;

        $bookRental->delete();

        AuditService::log('deleted', $bookRental, null, null,
            "Номын түрээс устгав: {$emp} — {$book} (төлөв: {$stat})");

        return back()->with('success', 'Номын түрээсийн хүсэлт устгагдлаа.');
    }

    private function notifyEmployee(BookRental $bookRental): void
    {
        $bookRental->load('book.category', 'employee');
        $user = $bookRental->employee->user ?? null;
        if ($user) {
            $user->notify(new BookRentalDecision($bookRental));
        }
    }
}
