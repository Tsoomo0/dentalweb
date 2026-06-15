<?php

namespace App\Jobs\Social;

use App\Models\Social\SocialAccount;
use App\Models\Social\SocialContact;
use App\Models\Social\SocialConversation;
use App\Services\Social\SocialFlowRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Delay блокийн дараа flow-г тодорхой node-оос үргэлжлүүлнэ.
 */
class SocialFlowContinue implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly int $accountId,
        public readonly int $conversationId,
        public readonly int $contactId,
        public readonly int $nodeId,
    ) {}

    public function handle(SocialFlowRunner $runner): void
    {
        $account = SocialAccount::find($this->accountId);
        $conversation = SocialConversation::find($this->conversationId);
        $contact = SocialContact::find($this->contactId);

        if (! $account || ! $conversation || ! $contact) {
            return;
        }

        // Оператор гар авсан бол bot үргэлжлүүлэхгүй.
        if ($conversation->status !== SocialConversation::STATUS_BOT) {
            return;
        }

        $runner->runNodeId($account, $conversation, $contact, $this->nodeId);
    }
}
