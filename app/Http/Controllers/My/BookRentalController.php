<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\Book;
use App\Models\HR\BookRental;
use App\Models\User;
use App\Notifications\BookRentalSubmitted;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BookRentalController extends Controller
{
    public function index(): Response|RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (!$employee) return redirect()->route('portal.select');

        $employee->load(['position', 'branch']);

        // My rental history
        $rentals = BookRental::with(['book.category'])
            ->where('employee_id', $employee->id)
            ->latest()
            ->get()
            ->map(fn(BookRental $r) => [
                'id'               => $r->id,
                'book_title'       => $r->book->title,
                'book_author'      => $r->book->author,
                'book_isbn'        => $r->book->isbn,
                'book_cover_url'   => $r->book->cover_url,
                'category_name'    => $r->book->category?->name,
                'category_color'   => $r->book->category?->color ?? 'blue',
                'status'           => $r->status,
                'rejection_reason' => $r->rejection_reason,
                'approved_at'      => $r->approved_at?->toDateString(),
                'returned_at'      => $r->returned_at?->toDateString(),
                'created_at'       => $r->created_at->toDateString(),
            ]);

        // My active rental book IDs (can't request again if already pending/approved)
        $activeBookIds = BookRental::where('employee_id', $employee->id)
            ->whereIn('status', ['pending', 'approved'])
            ->pluck('book_id')
            ->toArray();

        // Available books list
        $books = Book::with(['category', 'activeRentals'])
            ->latest()
            ->get()
            ->map(fn(Book $b) => [
                'id'               => $b->id,
                'title'            => $b->title,
                'author'           => $b->author,
                'isbn'             => $b->isbn,
                'cover_url'        => $b->cover_url,
                'total_copies'     => $b->total_copies,
                'available_copies' => $b->available_copies,
                'category_name'    => $b->category?->name,
                'category_color'   => $b->category?->color ?? 'blue',
                'already_requested'=> in_array($b->id, $activeBookIds),
            ]);

        return Inertia::render('my/book-rentals', [
            'employee' => [
                'id'        => $employee->id,
                'name'      => $employee->full_name,
                'position'  => $employee->position?->name,
                'branch'    => $employee->branch?->name,
                'photo_url' => $employee->photo_url,
                'initials'  => mb_substr($employee->last_name ?? '', 0, 1) . mb_substr($employee->first_name ?? '', 0, 1),
            ],
            'rentals' => $rentals,
            'books'   => $books,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (!$employee) abort(403);

        $request->validate([
            'book_id' => 'required|exists:books,id',
        ]);

        $book = Book::findOrFail($request->book_id);

        // Check if already has active request for this book
        $existing = BookRental::where('employee_id', $employee->id)
            ->where('book_id', $book->id)
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($existing) {
            return back()->with('error', 'Та энэ номонд аль хэдийн хүсэлт гаргасан байна.');
        }

        // Check availability
        if ($book->available_copies <= 0) {
            return back()->with('error', 'Уг номын боломжит хувь дууссан байна.');
        }

        $rental = BookRental::create([
            'book_id'     => $book->id,
            'employee_id' => $employee->id,
            'status'      => 'pending',
        ]);

        $rental->load('book.category', 'employee.position', 'employee.branch');

        // Notify all admins
        $admins = User::whereHas('role', fn($q) => $q->where('name', 'admin'))->get();
        foreach ($admins as $admin) {
            $admin->notify(new BookRentalSubmitted($rental));
        }

        return back()->with('success', 'Номын түрээсийн хүсэлт амжилттай илгээгдлээ.');
    }
}
