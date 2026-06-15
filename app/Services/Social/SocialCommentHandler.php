<?php

namespace App\Services\Social;

use App\Models\Social\SocialAccount;
use App\Models\Social\SocialCommentRule;
use Illuminate\Database\Eloquent\Builder;

/**
 * Постын коммент авто-хариулт — keyword дүрэмд тааруулж нийтийн хариу + хувийн DM явуулна.
 */
class SocialCommentHandler
{
    public function __construct(
        private readonly MetaGraphService $meta,
        private readonly SocialFlowRunner $runner,
    ) {}

    public function handle(SocialAccount $account, string $commentId, ?string $postId, string $text, string $fromId = '', string $channel = 'messenger'): void
    {
        $rule = $this->matchRule($account, $postId, $text);

        if (! $rule) {
            return;
        }

        // 1. Нийтийн хариу (комментод)
        if (! empty($rule->public_reply)) {
            $this->meta->replyToComment($account, $commentId, $rule->public_reply);
        }

        // 2. Хувийн DM — flow холбосон бол БҮТЭН flow ажиллуулна, үгүй бол энгийн текст.
        if ($rule->dm_flow_id && $fromId !== '') {
            $rule->loadMissing('dmFlow');
            if ($rule->dmFlow) {
                $this->runner->startFlowFromComment($account, $commentId, $fromId, $channel, $rule->dmFlow, $rule->dm_node_id);
            }
        } elseif (! empty($rule->dm_template)) {
            $this->meta->sendPrivateReply($account, $commentId, $rule->dm_template);
        }

        $rule->increment('matched_count');
    }

    private function matchRule(SocialAccount $account, ?string $postId, string $text): ?SocialCommentRule
    {
        $rules = SocialCommentRule::query()
            ->where('is_active', true)
            ->where(fn (Builder $q) => $q->whereNull('social_account_id')->orWhere('social_account_id', $account->id))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        foreach ($rules as $rule) {
            // Тодорхой пост заасан бол зөвхөн тэр постод хамаарна.
            if (! empty($rule->post_id) && $postId !== null && $rule->post_id !== $postId) {
                continue;
            }

            if ($rule->matches($text)) {
                return $rule;
            }
        }

        return null;
    }
}
