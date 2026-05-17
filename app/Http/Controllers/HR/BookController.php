<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\Book;
use App\Models\HR\BookCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class BookController extends Controller
{
    public function index(): Response
    {
        $books = Book::with(['category', 'activeRentals.employee'])
            ->latest()
            ->get()
            ->map(fn (Book $b) => [
                'id' => $b->id,
                'title' => $b->title,
                'author' => $b->author,
                'isbn' => $b->isbn,
                'cover_url' => $b->cover_url,
                'total_copies' => $b->total_copies,
                'available_copies' => $b->available_copies,
                'description' => $b->description,
                'category_id' => $b->book_category_id,
                'category_name' => $b->category?->name,
                'category_color' => $b->category?->color ?? 'blue',
                'rented_by' => $b->activeRentals->map(fn ($r) => [
                    'id' => $r->employee_id,
                    'name' => $r->employee->full_name,
                ])->values()->all(),
            ]);

        $categories = BookCategory::orderBy('name')->get(['id', 'name', 'color']);

        return Inertia::render('hr/books/index', [
            'books' => $books,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'author' => 'nullable|string|max:255',
            'isbn' => 'nullable|string|max:50',
            'book_category_id' => 'nullable|exists:book_categories,id',
            'total_copies' => 'required|integer|min:1|max:999',
            'description' => 'nullable|string|max:2000',
            'cover' => 'nullable|image|max:2048',
        ]);

        $coverPath = null;
        if ($request->hasFile('cover')) {
            $coverPath = $request->file('cover')->store('books', 'public');
        }

        Book::create([
            'title' => $request->title,
            'author' => $request->author,
            'isbn' => $request->isbn,
            'book_category_id' => $request->book_category_id,
            'total_copies' => $request->total_copies,
            'description' => $request->description,
            'cover_image' => $coverPath,
        ]);

        return back()->with('success', 'Ном нэмэгдлээ.');
    }

    public function update(Request $request, Book $book): RedirectResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'author' => 'nullable|string|max:255',
            'isbn' => 'nullable|string|max:50',
            'book_category_id' => 'nullable|exists:book_categories,id',
            'total_copies' => 'required|integer|min:1|max:999',
            'description' => 'nullable|string|max:2000',
            'cover' => 'nullable|image|max:2048',
        ]);

        $data = $request->only(['title', 'author', 'isbn', 'book_category_id', 'total_copies', 'description']);

        if ($request->hasFile('cover')) {
            if ($book->cover_image) {
                Storage::disk('public')->delete($book->cover_image);
            }
            $data['cover_image'] = $request->file('cover')->store('books', 'public');
        }

        $book->update($data);

        return back()->with('success', 'Ном шинэчлэгдлээ.');
    }

    public function destroy(Book $book): RedirectResponse
    {
        if ($book->rentals()->whereIn('status', ['pending', 'approved'])->exists()) {
            return back()->with('error', 'Энэ номд идэвхтэй хүсэлт байгаа тул устгах боломжгүй.');
        }

        if ($book->cover_image) {
            Storage::disk('public')->delete($book->cover_image);
        }

        $book->delete();

        return back()->with('success', 'Ном устгагдлаа.');
    }
}
