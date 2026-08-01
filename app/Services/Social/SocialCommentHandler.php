<?php

namespace App\Services\Social;

use App\Models\Social\SocialAccount;
use App\Models\Social\SocialCommentRule;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;

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

        // 1. Нийтийн хариу (комментод) — амжилтгүй болвол шалтгааныг дүрэм дээр хадгалж,
        // admin панелд шууд харагдах болгоно (өмнө нь чимээгүй унтардаг байсан).
        $extra = [];

        if (! empty($rule->public_reply)) {
            $result = $this->meta->replyToComment($account, $commentId, $rule->public_reply);

            if (! $result['ok']) {
                Log::warning('Social comment public reply failed', [
                    'rule_id' => $rule->id,
                    'rule_name' => $rule->name,
                    'comment_id' => $commentId,
                    'error' => $result['error'],
                ]);
            }

            $extra['public_reply_error'] = $result['ok'] ? null : ($result['error'] ?? 'Тодорхойгүй алдаа');
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

        $rule->increment('matched_count', 1, $extra);
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
