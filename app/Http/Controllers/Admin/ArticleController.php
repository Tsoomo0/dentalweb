<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ArticleController extends Controller
{
    public function index(): Response
    {
        $articles = Article::orderByDesc('order')
            ->orderByDesc('published_at')
            ->get()
            ->map(fn($a) => array_merge($a->toArray(), [
                'image_url'      => $a->featured_image ? Storage::url($a->featured_image) : null,
                'published_date' => $a->published_at?->format('Y оны m сарын d'),
            ]));

        return Inertia::render('admin/articles/index', [
            'articles' => $articles,
            'stats'    => [
                'total'     => Article::count(),
                'published' => Article::where('status', 'published')->count(),
                'draft'     => Article::where('status', 'draft')->count(),
                'archived'  => Article::where('status', 'archived')->count(),
                'avg_views' => (int) Article::avg('views'),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/articles/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'title'          => 'required|string|max:255',
            'content'        => 'required|string',
            'excerpt'        => 'nullable|string|max:500',
            'category'       => 'nullable|string|max:100',
            'status'         => 'required|in:draft,published,archived',
            'featured_image' => 'nullable|image|max:5120',
            'published_at'   => 'nullable|date',
        ]);

        $data                = $request->only('title', 'content', 'excerpt', 'category', 'status');
        $data['slug']        = Str::slug($request->title) . '-' . Str::random(5);
        $data['order']       = Article::max('order') + 1;
        $data['published_at'] = $request->status === 'published'
            ? ($request->published_at ?? now())
            : $request->published_at;

        if ($request->hasFile('featured_image')) {
            $data['featured_image'] = $request->file('featured_image')->store('articles', 'public');
        }

        Article::create($data);

        return redirect()->route('admin.articles.index')->with('success', 'Нийтлэл амжилттай нэмэгдлээ.');
    }

    public function edit(Article $article): Response
    {
        $article->image_url = $article->featured_image ? Storage::url($article->featured_image) : null;

        return Inertia::render('admin/articles/edit', [
            'article' => $article,
        ]);
    }

    public function update(Request $request, Article $article): RedirectResponse
    {
        $request->validate([
            'title'          => 'required|string|max:255',
            'content'        => 'required|string',
            'excerpt'        => 'nullable|string|max:500',
            'category'       => 'nullable|string|max:100',
            'status'         => 'required|in:draft,published,archived',
            'featured_image' => 'nullable|image|max:5120',
            'published_at'   => 'nullable|date',
        ]);

        $data                = $request->only('title', 'content', 'excerpt', 'category', 'status');
        $data['published_at'] = $request->status === 'published' && !$article->published_at
            ? now()
            : $request->published_at;

        if ($request->hasFile('featured_image')) {
            if ($article->featured_image) Storage::disk('public')->delete($article->featured_image);
            $data['featured_image'] = $request->file('featured_image')->store('articles', 'public');
        }

        $article->update($data);

        return redirect()->route('admin.articles.index')->with('success', 'Нийтлэл амжилттай шинэчлэгдлээ.');
    }

    public function destroy(Article $article): RedirectResponse
    {
        if ($article->featured_image) Storage::disk('public')->delete($article->featured_image);
        $article->delete();

        return back()->with('success', 'Нийтлэл устгагдлаа.');
    }
}
