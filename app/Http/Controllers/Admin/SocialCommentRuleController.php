<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Social\SocialAccount;
use App\Models\Social\SocialCommentRule;
use App\Models\Social\SocialFlow;
use App\Services\Social\MetaGraphService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SocialCommentRuleController extends Controller
{
    public function __construct(private readonly MetaGraphService $meta) {}

    /** Хуудасны постуудыг буцаах (коммент дүрэмд сонгох). */
    public function posts(SocialAccount $account): JsonResponse
    {
        return response()->json(['posts' => $this->meta->fetchPosts($account)]);
    }

    public function index(): Response
    {
        return Inertia::render('admin/Social/CommentRules', [
            'rules' => SocialCommentRule::query()
                ->orderBy('sort_order')->orderBy('id')
                ->get()
                ->map(fn (SocialCommentRule $r) => [
                    'id' => $r->id,
                    'social_account_id' => $r->social_account_id,
                    'name' => $r->name,
                    'post_id' => $r->post_id,
                    'match_type' => $r->match_type,
                    'keywords' => $r->keywords ?? [],
                    'public_reply' => $r->public_reply,
                    'dm_template' => $r->dm_template,
                    'dm_flow_id' => $r->dm_flow_id,
                    'dm_node_id' => $r->dm_node_id,
                    'is_active' => $r->is_active,
                    'matched_count' => $r->matched_count,
                ]),
            'accounts' => SocialAccount::where('is_active', true)->get(['id', 'page_name']),
            'flows' => SocialFlow::with(['nodes' => fn ($q) => $q->orderBy('sort_order')->orderBy('id')])
                ->orderBy('name')->get()
                ->map(fn (SocialFlow $f) => [
                    'id' => $f->id,
                    'name' => $f->name,
                    'nodes' => $f->nodes
                        ->whereIn('type', ['message', 'carousel', 'image'])
                        ->map(fn ($n) => [
                            'id' => $n->id,
                            'label' => $n->title ?: (mb_substr(trim((string) $n->body), 0, 40) ?: 'Блок #'.$n->id),
                        ])->values(),
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        SocialCommentRule::create($this->validated($request));

        return back()->with('success', 'Дүрэм нэмэгдлээ.');
    }

    public function update(SocialCommentRule $rule, Request $request): RedirectResponse
    {
        $rule->update($this->validated($request));

        return back()->with('success', 'Дүрэм шинэчлэгдлээ.');
    }

    public function destroy(SocialCommentRule $rule): RedirectResponse
    {
        $rule->delete();

        return back()->with('success', 'Дүрэм устгагдлаа.');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'social_account_id' => 'nullable|integer|exists:social_accounts,id',
            'name' => 'required|string|max:120',
            'post_id' => 'nullable|string|max:120',
            'match_type' => 'required|in:any,contains,exact',
            'keywords' => 'nullable|array',
            'keywords.*' => 'string|max:60',
            'public_reply' => 'nullable|string|max:1000',
            'dm_template' => 'nullable|string|max:1000',
            'dm_flow_id' => 'nullable|integer|exists:social_flows,id',
            'dm_node_id' => 'nullable|integer|exists:social_flow_nodes,id',
            'is_active' => 'boolean',
        ]);

        $data['keywords'] = $data['match_type'] === 'any' ? [] : ($data['keywords'] ?? []);

        return $data;
    }
}
