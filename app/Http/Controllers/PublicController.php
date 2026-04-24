<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\Faq;
use App\Models\GalleryItem;
use App\Models\TreatmentCategory;
use App\Models\Appointment;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PublicController extends Controller
{
    public function home(): Response
    {
        return Inertia::render('welcome', [
            'doctors' => $this->doctorList(),

            'treatments' => TreatmentCategory::with([
                    'treatments' => fn($q) => $q->where('is_active', true)->orderBy('order')
                        ->with(['subTreatments' => fn($sq) => $sq->where('is_active', true)->orderBy('order')])
                ])
                ->where('is_active', true)->orderBy('order')->get()
                ->map(fn($c) => [
                    'id'   => $c->id, 'name' => $c->name, 'icon' => $c->icon,
                    'treatments' => $c->treatments->map(fn($t) => array_merge(
                        $t->only(['id','title','description','price_min','price_max','duration_min']),
                        [
                            'image_url'      => $t->image ? Storage::url($t->image) : null,
                            'sub_treatments' => $t->subTreatments->map(fn($s) =>
                                $s->only(['id','title','description','price_min','price_max','duration_min'])
                            ),
                        ]
                    )),
                ]),

            'gallery' => $this->galleryList(),

            'articles' => Article::where('status', 'published')
                ->orderByDesc('published_at')->limit(3)->get()
                ->map(fn($a) => $this->mapArticle($a)),

            'faqs' => Faq::where('is_active', true)->orderBy('order')
                ->get(['id', 'question', 'answer', 'category']),

            'branches' => Branch::where('is_active', true)->orderBy('order')
                ->get(['id', 'name', 'address', 'phone', 'type']),

            'stats' => $this->stats(),
        ]);
    }

    public function about(): Response
    {
        return Inertia::render('about', [
            'stats' => $this->stats(),
        ]);
    }

    public function services(): Response
    {
        return Inertia::render('services', [
            'treatments' => TreatmentCategory::with([
                    'treatments' => fn($q) => $q->where('is_active', true)->orderBy('order')
                        ->with(['subTreatments' => fn($sq) => $sq->where('is_active', true)->orderBy('order')])
                ])
                ->where('is_active', true)->orderBy('order')->get()
                ->map(fn($c) => [
                    'id'   => $c->id, 'name' => $c->name, 'icon' => $c->icon,
                    'treatments' => $c->treatments->map(fn($t) => array_merge(
                        $t->only(['id','title','description','price_min','price_max','duration_min']),
                        [
                            'image_url'      => $t->image ? Storage::url($t->image) : null,
                            'sub_treatments' => $t->subTreatments->map(fn($s) =>
                                $s->only(['id','title','description','price_min','price_max','duration_min'])
                            ),
                        ]
                    )),
                ]),
        ]);
    }

    public function doctors(): Response
    {
        return Inertia::render('doctors', [
            'doctors'  => $this->doctorList(),
            'branches' => Branch::where('is_active', true)->orderBy('order')
                ->get(['id', 'name', 'address', 'phone']),
        ]);
    }

    public function gallery(): Response
    {
        return Inertia::render('gallery', [
            'gallery'    => $this->galleryList(),
            'categories' => TreatmentCategory::where('is_active', true)->orderBy('order')
                ->get(['id', 'name']),
        ]);
    }

    public function articles(): Response
    {
        return Inertia::render('articles', [
            'articles' => Article::where('status', 'published')
                ->orderByDesc('published_at')->get()
                ->map(fn($a) => $this->mapArticle($a)),
        ]);
    }

    public function contact(): Response
    {
        return Inertia::render('contact', [
            'branches' => Branch::where('is_active', true)->orderBy('order')
                ->get(['id', 'name', 'address', 'phone', 'type']),
        ]);
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private function doctorList(): \Illuminate\Support\Collection
    {
        return Doctor::with('branch')->where('is_active', true)->orderBy('order')->get()
            ->map(fn($d) => array_merge($d->only([
                'id', 'name', 'specialization', 'degree', 'experience_years', 'description',
                'phone', 'email', 'experiences',
            ]), [
                'photo_url'   => $d->photo ? Storage::url($d->photo) : null,
                'branch_name' => $d->branch?->name,
                'branch_id'   => $d->branch_id,
            ]));
    }

    private function galleryList(): \Illuminate\Support\Collection
    {
        return GalleryItem::with('category')->where('is_active', true)->orderBy('order')->get()
            ->map(fn($g) => [
                'id'            => $g->id,
                'title'         => $g->title,
                'description'   => $g->description,
                'before_url'    => $g->before_image ? Storage::url($g->before_image) : null,
                'after_url'     => $g->after_image  ? Storage::url($g->after_image)  : null,
                'category_name' => $g->category?->name,
            ]);
    }

    private function mapArticle($a): array
    {
        return [
            'id'           => $a->id,
            'title'        => $a->title,
            'slug'         => $a->slug,
            'excerpt'      => $a->excerpt,
            'image_url'    => $a->image ? Storage::url($a->image) : null,
            'published_at' => $a->published_at?->format('Y.m.d'),
        ];
    }

    private function stats(): array
    {
        return [
            'doctors'      => Doctor::where('is_active', true)->count(),
            'appointments' => Appointment::count(),
            'branches'     => Branch::where('is_active', true)->count(),
        ];
    }
}
