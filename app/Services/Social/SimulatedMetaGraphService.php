<?php

namespace App\Services\Social;

use App\Models\Social\SocialAccount;

/**
 * MetaGraphService-ийн симуляц хувилбар — АИ туслах хуудасны тест чатад ашиглана.
 * Facebook/Instagram руу ЮУ Ч ИЛГЭЭХГҮЙ; илгээх ёстой байсан мессеж бүрийг ($captured)
 * бүтэцлэн санах ойд хадгална. Ингэснээр SocialFlowRunner-ийн жинхэнэ логик
 * (түлхүүр үг, товч, welcome, карусель, AI fallback) яг адилхан ажиллаж, үр дүнг нь
 * админ хуудсанд харуулна.
 */
class SimulatedMetaGraphService extends MetaGraphService
{
    /** @var array<int, array<string, mixed>> Барьж авсан гарах мессежүүд (frontend-д зориулж нормчилсон). */
    private array $captured = [];

    private int $mid = 0;

    /** @return array<int, array<string, mixed>> */
    public function captured(): array
    {
        return $this->captured;
    }

    /** Дараагийн send-үүд амжилттай мэт fake хариу. */
    private function ok(): array
    {
        return ['ok' => true, 'mid' => 'sim-'.(++$this->mid), 'error' => null];
    }

    public function sendText(SocialAccount $account, string $recipientId, string $text): array
    {
        $this->captured[] = ['kind' => 'text', 'text' => $text];

        return $this->ok();
    }

    public function sendAttachment(SocialAccount $account, string $recipientId, string $type, string $url): array
    {
        $this->captured[] = ['kind' => $type === 'image' ? 'image' : 'file', 'url' => $url, 'ftype' => $type];

        return $this->ok();
    }

    public function sendButtonTemplate(SocialAccount $account, string $recipientId, string $text, array $buttons, array $quickReplies = []): array
    {
        $this->captured[] = [
            'kind' => 'buttons',
            'text' => $text,
            'buttons' => $this->normalizeButtons($buttons),
            'quick' => $this->normalizeQuick($quickReplies),
        ];

        return $this->ok();
    }

    public function sendQuickReplies(SocialAccount $account, string $recipientId, string $text, array $replies): array
    {
        $this->captured[] = [
            'kind' => 'buttons',
            'text' => $text,
            'buttons' => [],
            'quick' => $this->normalizeQuick($replies),
        ];

        return $this->ok();
    }

    public function sendGenericTemplate(SocialAccount $account, string $recipientId, array $elements): array
    {
        $cards = [];
        foreach ($elements as $el) {
            $cards[] = [
                'title' => (string) ($el['title'] ?? ''),
                'subtitle' => $el['subtitle'] ?? null,
                'image' => $el['image_url'] ?? null,
                'buttons' => $this->normalizeButtons($el['buttons'] ?? []),
            ];
        }
        $this->captured[] = ['kind' => 'carousel', 'cards' => $cards];

        return $this->ok();
    }

    /** "Бичиж байна…" — симуляцад алгасна. */
    public function sendTyping(SocialAccount $account, string $recipientId): void
    {
        // no-op
    }

    /**
     * Meta товчны бүтцийг frontend-д ойлгомжтой болгож нормчилно.
     *
     * @param  array<int, array<string, mixed>>  $buttons
     * @return array<int, array{title: string, type: string, payload?: string, url?: string}>
     */
    private function normalizeButtons(array $buttons): array
    {
        $out = [];
        foreach ($buttons as $b) {
            $type = (string) ($b['type'] ?? 'postback');
            $item = ['title' => (string) ($b['title'] ?? ''), 'type' => $type];
            if ($type === 'web_url') {
                $item['url'] = (string) ($b['url'] ?? '');
            } else {
                // postback / phone_number — аль аль нь payload авна.
                $item['payload'] = (string) ($b['payload'] ?? '');
            }
            $out[] = $item;
        }

        return $out;
    }

    /**
     * Quick reply чипүүдийг нормчилно (үргэлж дарж болох postback).
     *
     * @param  array<int, array{title?: string, payload?: string}>  $replies
     * @return array<int, array{title: string, type: string, payload: string}>
     */
    private function normalizeQuick(array $replies): array
    {
        $out = [];
        foreach ($replies as $r) {
            $out[] = ['title' => (string) ($r['title'] ?? ''), 'type' => 'postback', 'payload' => (string) ($r['payload'] ?? '')];
        }

        return $out;
    }
}
