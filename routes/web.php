<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\TreatmentController;
use App\Http\Controllers\Admin\TreatmentCategoryController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\ArticleController;
use App\Http\Controllers\Admin\DoctorController;
use App\Http\Controllers\Admin\SubTreatmentController;
use App\Http\Controllers\Admin\FaqController;
use App\Http\Controllers\Admin\AppointmentController;
use App\Http\Controllers\Admin\GalleryController;
use App\Http\Controllers\BookingController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ── Helper closures ──────────────────────────────────────────────────────────
$doctorMapper = fn($d) => array_merge($d->only([
    'id', 'name', 'specialization', 'degree', 'experience_years', 'description',
    'phone', 'email', 'experiences',
]), [
    'photo_url'   => $d->photo ? \Illuminate\Support\Facades\Storage::url($d->photo) : null,
    'branch_name' => $d->branch?->name,
    'branch_id'   => $d->branch_id,
]);

$galleryMapper = fn($g) => [
    'id'            => $g->id,
    'title'         => $g->title,
    'description'   => $g->description,
    'before_url'    => $g->before_image ? \Illuminate\Support\Facades\Storage::url($g->before_image) : null,
    'after_url'     => $g->after_image  ? \Illuminate\Support\Facades\Storage::url($g->after_image)  : null,
    'category_name' => $g->category?->name,
];

$articleMapper = fn($a) => [
    'id'             => $a->id,
    'title'          => $a->title,
    'slug'           => $a->slug,
    'excerpt'        => $a->excerpt,
    'category'       => $a->category,
    'featured_image' => $a->featured_image ? \Illuminate\Support\Facades\Storage::url($a->featured_image) : null,
    'published_at'   => $a->published_at?->format('Y.m.d'),
];

// ── Public pages ─────────────────────────────────────────────────────────────

Route::get('/', function () use ($doctorMapper, $galleryMapper, $articleMapper) {
    return Inertia::render('welcome', [
        'doctors' => \App\Models\Doctor::with('branch')
            ->where('is_active', true)->orderBy('order')->get()->map($doctorMapper),

        'treatments' => \App\Models\TreatmentCategory::with([
                'treatments' => fn($q) => $q->where('is_active', true)->orderBy('order')
                    ->with(['subTreatments' => fn($sq) => $sq->where('is_active', true)->orderBy('order')])
            ])
            ->where('is_active', true)->orderBy('order')->get()->map(fn($c) => [
                'id'   => $c->id, 'name' => $c->name, 'icon' => $c->icon,
                'treatments' => $c->treatments->map(fn($t) => array_merge(
                    $t->only(['id','title','description','price_min','price_max','duration_min']),
                    [
                        'image_url'      => $t->image ? \Illuminate\Support\Facades\Storage::url($t->image) : null,
                        'sub_treatments' => $t->subTreatments->map(fn($s) =>
                            $s->only(['id','title','description','price_min','price_max','duration_min'])
                        ),
                    ]
                )),
            ]),

        'gallery' => \App\Models\GalleryItem::with('category')->where('is_active', true)
            ->orderBy('order')->get()->map($galleryMapper),

        'articles' => \App\Models\Article::where('status', 'published')
            ->orderByDesc('published_at')->limit(3)->get()->map($articleMapper),

        'faqs' => \App\Models\Faq::where('is_active', true)->orderBy('order')
            ->get(['id', 'question', 'answer', 'category']),

        'branches' => \App\Models\Branch::where('is_active', true)->orderBy('order')
            ->get(['id', 'name', 'address', 'phone', 'type']),

        'stats' => [
            'doctors'      => \App\Models\Doctor::where('is_active', true)->count(),
            'appointments' => \App\Models\Appointment::count(),
            'branches'     => \App\Models\Branch::where('is_active', true)->count(),
        ],
    ]);
})->name('home');

Route::get('/about', function () {
    return Inertia::render('about', [
        'stats' => [
            'doctors'      => \App\Models\Doctor::where('is_active', true)->count(),
            'appointments' => \App\Models\Appointment::count(),
            'branches'     => \App\Models\Branch::where('is_active', true)->count(),
        ],
    ]);
})->name('about');

Route::get('/services', function () {
    return Inertia::render('services', [
        'treatments' => \App\Models\TreatmentCategory::with([
                'treatments' => fn($q) => $q->where('is_active', true)->orderBy('order')
                    ->with(['subTreatments' => fn($sq) => $sq->where('is_active', true)->orderBy('order')])
            ])
            ->where('is_active', true)->orderBy('order')->get()->map(fn($c) => [
                'id'   => $c->id, 'name' => $c->name, 'icon' => $c->icon,
                'treatments' => $c->treatments->map(fn($t) => array_merge(
                    $t->only(['id','title','description','price_min','price_max','duration_min']),
                    [
                        'image_url'      => $t->image ? \Illuminate\Support\Facades\Storage::url($t->image) : null,
                        'sub_treatments' => $t->subTreatments->map(fn($s) =>
                            $s->only(['id','title','description','price_min','price_max','duration_min'])
                        ),
                    ]
                )),
            ]),
    ]);
})->name('services');

Route::get('/doctors', function () use ($doctorMapper) {
    return Inertia::render('doctors', [
        'doctors'  => \App\Models\Doctor::with('branch')->where('is_active', true)->orderBy('order')->get()->map($doctorMapper),
        'branches' => \App\Models\Branch::where('is_active', true)->orderBy('order')->get(['id', 'name', 'address', 'phone']),
    ]);
})->name('doctors');

Route::get('/gallery', function () use ($galleryMapper) {
    return Inertia::render('gallery', [
        'gallery'    => \App\Models\GalleryItem::with('category')->where('is_active', true)->orderBy('order')->get()->map($galleryMapper),
        'categories' => \App\Models\TreatmentCategory::where('is_active', true)->orderBy('order')->get(['id', 'name']),
    ]);
})->name('gallery');

Route::get('/articles', function () use ($articleMapper) {
    return Inertia::render('articles', [
        'articles' => \App\Models\Article::where('status', 'published')
            ->orderByDesc('published_at')->get()->map($articleMapper),
    ]);
})->name('articles');

Route::get('/contact', function () {
    return Inertia::render('contact', [
        'branches' => \App\Models\Branch::where('is_active', true)->orderBy('order')
            ->get(['id', 'name', 'address', 'phone', 'type']),
    ]);
})->name('contact');

// Public booking
Route::get('/booking', [BookingController::class, 'index'])->name('booking');
Route::post('/booking', [BookingController::class, 'store'])->name('booking.store');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        return redirect()->route('admin.dashboard');
    })->name('dashboard');
});

// ✅ Admin route
Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('treatments', TreatmentController::class)->except(['show']);
    Route::resource('treatment-categories', TreatmentCategoryController::class)->except(['show', 'create', 'edit']);
    Route::resource('treatments.sub-treatments', SubTreatmentController::class)->only(['store', 'update', 'destroy']);
    Route::resource('branches', BranchController::class)->except(['show']);
    Route::resource('doctors', DoctorController::class)->except(['show']);
    Route::resource('articles', ArticleController::class)->except(['show']);
    Route::resource('faqs', FaqController::class)->except(['show']);
    Route::resource('gallery', GalleryController::class)->except(['show']);
    Route::get('appointments/pending-poll', [AppointmentController::class, 'pendingPoll'])->name('appointments.pending-poll');
    Route::resource('appointments', AppointmentController::class)->except(['edit']);
    Route::patch('appointments/{appointment}/status', [AppointmentController::class, 'changeStatus'])->name('appointments.status');
    Route::patch('faqs/{faq}/toggle', [FaqController::class, 'toggle'])->name('faqs.toggle');
    Route::patch('doctors/{doctor}/toggle', function (\App\Models\Doctor $doctor) {
        $doctor->update(['is_active' => !$doctor->is_active]);
        return back();
    })->name('doctors.toggle');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
