<?php

namespace App\Services\Social;

use App\Events\Social\SocialMessageReceived;
use App\Models\Setting;
use App\Models\Social\SocialAccount;
use App\Models\Social\SocialAiFaq;
use App\Models\Social\SocialAiSetting;
use App\Models\Social\SocialContact;
use App\Models\Social\SocialConversation;
use App\Models\Social\SocialFlowNode;
use App\Models\Social\SocialMessage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Ботын урсгал/keyword-д таараагүй чөлөөт асуултад AI-аар хариулна. 2 горим:
 *  - generative: AI эмнэлгийн context дээр тулгуурлан хариу ЗОХИОНО (чанар моделоос хамаарна).
 *  - retrieval : AI зөвхөн аль FAQ таарахыг СОНГОНО (classify), хариу нь хүний бичсэн
 *                тогтмол монгол текст → чанар өндөр, жигд, үнэгүй загварт ч сайн.
 * Провайдер: Gemini эсвэл Groq (OpenAI-compatible).
 */
class SocialAiReplyService
{
    /** Ажилтан руу шилжүүлэхийг илэрхийлэх нууц тэмдэг (үйлчлүүлэгчид харагдахгүй). */
    private const HANDOFF_TAG = '[[OPERATOR]]';

    /** Ажилтанд шилжүүлэх үед үйлчлүүлэгчид илгээх богино мэдэгдэл. */
    private const HANDOFF_NOTICE = 'Түр хүлээнэ үү, ажилтан тантай холбогдоно 💬';

    /** Сүүлийн дуудлагын алдааны шалтгаан (rate_limit / empty / http_xxx). */
    private ?string $lastError = null;

    /** Симуляц (тест чат) горим: broadcast хийхгүй. */
    private bool $simulate = false;

    public function __construct(
        private readonly MetaGraphService $meta,
        private readonly ClinicKnowledgeService $knowledge,
    ) {}

    /** Тест чатын симуляц горимыг асаана. */
    public function simulate(bool $on = true): static
    {
        $this->simulate = $on;

        return $this;
    }

    /** Идэвхтэй провайдер (gemini | groq). */
    private function provider(): string
    {
        return SocialAiSetting::current()->provider ?: 'gemini';
    }

    /** Хариултын горим (generative | retrieval). */
    private function mode(): string
    {
        return SocialAiSetting::current()->mode ?: 'generative';
    }

    /** Идэвхтэй провайдерын API түлхүүр тохирсон эсэх (мастер унтраалга). */
    public function hasKey(): bool
    {
        return ! empty(config('services.'.$this->provider().'.api_key'));
    }

    /** AI идэвхтэй эсэх: түлхүүр бий + тохиргоонд асаалттай + тухайн хуудсанд унтраагаагүй. */
    public function isEnabled(SocialAccount $account): bool
    {
        if (! $this->hasKey() || ! SocialAiSetting::current()->enabled) {
            return false;
        }

        return ($account->meta['ai_enabled'] ?? true) !== false;
    }

    /**
     * Асуултад хариулна. Хариулж чадсан бол true (илгээсэн), эс бөгөөс false
     * (дуудагч талдаа default урсгал руу шилжинэ).
     */
    public function reply(
        SocialAccount $account,
        SocialConversation $conversation,
        SocialContact $contact,
        string $text,
    ): bool {
        $text = trim($text);
        if ($text === '' || mb_strlen($text) > 1500) {
            return false;
        }

        $r = $this->respond($text, $this->history($conversation, $text));

        if ($r['answer'] === null || trim($r['answer']) === '') {
            // Хариултгүй ч ажилтанд шилжүүлэх шаардлагатай бол (FAQ/Flow-д тохирохгүй) —
            // богино мэдэгдэл илгээгээд ажилтанд өгнө. Ингэснээр default flow руу явахгүй,
            // фэйк хариу ч өгөхгүй.
            if ($r['handoff']) {
                $this->deliver($account, $conversation, $contact, self::HANDOFF_NOTICE);
                $conversation->update([
                    'status' => SocialConversation::STATUS_OPEN,
                    'awaiting_node_id' => null,
                    'unread_count' => ($conversation->unread_count ?? 0) + 1,
                ]);

                return true;
            }

            return false; // AI алдаа/унтраалттай — дуудагч default flow руу шилжинэ.
        }

        $this->deliver($account, $conversation, $contact, $r['answer']);

        if ($r['handoff']) {
            $conversation->update([
                'status' => SocialConversation::STATUS_OPEN,
                'awaiting_node_id' => null,
            ]);
        }

        return true;
    }

    /**
     * Тест — админ хуудаснаас асуулт илгээж, хариуг Meta руу явуулалгүйгээр буцаана.
     *
     * @param  array<int, array{role?: string, text?: string}>  $history
     * @return array{ok: bool, answer?: string, handoff?: bool, error?: string}
     */
    public function preview(string $message, array $history = []): array
    {
        $message = trim($message);
        if ($message === '') {
            return ['ok' => false, 'error' => 'Асуултаа бичнэ үү.'];
        }
        if (! $this->hasKey()) {
            $env = $this->provider() === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY';

            return ['ok' => false, 'error' => "{$env} тохируулаагүй байна. .env-д нэмнэ үү."];
        }

        $contents = [];
        foreach ($history as $h) {
            $t = trim((string) ($h['text'] ?? ''));
            if ($t === '') {
                continue;
            }
            $role = ($h['role'] ?? '') === 'ai' ? 'model' : 'user';
            if ($contents === [] && $role !== 'user') {
                continue;
            }
            $contents[] = ['role' => $role, 'parts' => [['text' => $t]]];
        }
        $contents[] = ['role' => 'user', 'parts' => [['text' => $message]]];

        $r = $this->respond($message, $contents);
        if ($r['answer'] === null || trim($r['answer']) === '') {
            if ($r['handoff']) {
                return ['ok' => true, 'answer' => '(Тохирох FAQ/Flow алга — ажилтанд шилжүүлнэ 💬)', 'handoff' => true];
            }

            return ['ok' => false, 'error' => match ($this->lastError) {
                'rate_limit' => '⏳ Хэт олон хүсэлт илгээгдлээ (үнэгүй хязгаар). ~1 минут хүлээгээд дахин оролдоно уу.',
                'too_large' => '📄 «Нэмэлт мэдлэг» хэт том — Groq-ийн үнэгүй хязгаарт багтахгүй. Богиносгох, эсвэл «FAQ» горим руу шилжүүлж файлаа импортлоно уу.',
                'empty' => 'AI хоосон хариу буцаалаа. Дахин оролдоно уу.',
                'no_faq' => 'FAQ хариулт алга байна. "FAQ хариултууд" хэсэгт нэмнэ үү.',
                default => 'AI хариу өгсөнгүй. Дахин оролдоно уу (эсвэл түлхүүр/загвараа шалгана уу).',
            }];
        }

        return ['ok' => true, 'answer' => $r['answer'], 'handoff' => $r['handoff']];
    }

    /**
     * Горимоор нь хариу бэлдэнэ.
     *
     * @param  array<int, array{role: string, parts: array<int, array{text: string}>}>  $contents
     * @return array{answer: ?string, handoff: bool}
     */
    private function respond(string $text, array $contents): array
    {
        if ($this->mode() === 'retrieval') {
            return $this->retrieve($text);
        }

        // Generative — AI эмнэлгийн context дээр хариу зохионо.
        try {
            $answer = $this->ask($contents, $this->systemPrompt());
        } catch (\Throwable $e) {
            Log::warning('Social AI generate failed', ['error' => $e->getMessage()]);

            return ['answer' => null, 'handoff' => false];
        }

        if ($answer === null || trim($answer) === '') {
            return ['answer' => null, 'handoff' => false];
        }

        $handoff = str_contains($answer, self::HANDOFF_TAG);
        $answer = trim(str_replace(self::HANDOFF_TAG, '', $answer));
        if ($answer === '') {
            $answer = 'Таны асуултыг манай ажилтан хариулж туслах болно. Түр хүлээнэ үү 💬';
        }

        return ['answer' => $answer, 'handoff' => $handoff];
    }

    /**
     * Retrieval — AI зөвхөн аль нэрлэсэн агуулга (FAQ + Chatbot Flow) таарахыг сонгоно,
     * хариу нь хүний бичсэн тогтмол текст.
     *
     * @return array{answer: ?string, handoff: bool}
     */
    private function retrieve(string $text): array
    {
        $candidates = $this->candidates();
        if ($candidates === []) {
            // FAQ/Flow-д юу ч алга — шууд операторт (бот хариулахгүй).
            return ['answer' => null, 'handoff' => true];
        }

        $idx = $this->classify($text, $candidates);
        if ($idx === -1) {
            return ['answer' => null, 'handoff' => false]; // провайдер алдаа (lastError тавигдсан)
        }
        if ($idx < 1 || $idx > count($candidates)) {
            // Тохирох FAQ/Flow олдсонгүй — фэйк хариу өгөхгүй, шууд операторт шилжүүлнэ.
            return ['answer' => null, 'handoff' => true];
        }

        $answer = trim($this->fillSlots($candidates[$idx - 1]['a']));
        $handoff = str_contains($answer, self::HANDOFF_TAG);
        $answer = trim(str_replace(self::HANDOFF_TAG, '', $answer));

        // FAQ хариу хоосон бол мөн операторт (утгагүй хариу гаргахгүй).
        if ($answer === '') {
            return ['answer' => null, 'handoff' => true];
        }

        return ['answer' => $answer, 'handoff' => $handoff];
    }

    /**
     * Retrieval-ийн эх сурвалж: FAQ хариултууд + Chatbot Flow-ийн текст агуулга.
     * Ингэснээр урсгалд бичсэн зүйлээ FAQ-д дахин бичихгүйгээр AI ашиглана.
     *
     * @return array<int, array{q: string, a: string}>
     */
    private function candidates(): array
    {
        $out = [];

        // 1. FAQ хариултууд
        foreach (SocialAiFaq::where('is_active', true)->orderBy('order')->get() as $f) {
            $out[] = ['q' => (string) $f->question, 'a' => (string) $f->answer];
        }

        // 2. Chatbot Flow — message болон carousel блокуудын текст
        $nodes = SocialFlowNode::whereIn('type', [SocialFlowNode::TYPE_MESSAGE, SocialFlowNode::TYPE_CAROUSEL])->get();
        foreach ($nodes as $n) {
            $kw = is_array($n->keywords) ? implode(', ', $n->keywords) : '';

            if ($n->type === SocialFlowNode::TYPE_MESSAGE) {
                $body = trim((string) $n->body);
                if ($body === '') {
                    continue;
                }
                $topic = trim(($n->title ? $n->title.' ' : '').$kw.' '.mb_substr($body, 0, 80));
                $out[] = ['q' => $topic !== '' ? $topic : mb_substr($body, 0, 80), 'a' => $body];
            } else { // carousel — карт бүрийн гарчиг+дэд гарчиг
                foreach ((array) $n->cards as $card) {
                    $title = trim((string) ($card['title'] ?? ''));
                    $sub = trim((string) ($card['subtitle'] ?? ''));
                    $ans = trim($title."\n".$sub);
                    if ($ans === '') {
                        continue;
                    }
                    $out[] = ['q' => trim($kw.' '.$title) ?: $title, 'a' => $ans];
                }
            }
        }

        return $out;
    }

    /**
     * AI-гаар аль агуулга таарахыг ангилуулна. 1-based индекс, тохирохгүй бол 0, алдаа бол -1.
     *
     * @param  array<int, array{q: string, a: string}>  $candidates
     */
    private function classify(string $text, array $candidates): int
    {
        $list = '';
        foreach ($candidates as $i => $c) {
            $list .= ($i + 1).'. '.mb_substr(trim($c['q']), 0, 200)."\n";
        }

        $system = <<<PROMPT
        Чи бол ангилагч. Хэрэглэгчийн асуултад доорх сэдвүүдээс хамгийн ТОХИРОХ нэгийг сонгож, зөвхөн ТҮҮНИЙ ДУГААРЫГ (ганц бүхэл тоо) буцаа. Аль нь ч тохирохгүй бол 0 буцаа. Тайлбар, өгүүлбэр бүү бич — зөвхөн тоо.

        СЭДВҮҮД:
        {$list}
        PROMPT;

        $out = $this->ask([['role' => 'user', 'parts' => [['text' => $text]]]], $system);
        if ($out === null) {
            return -1;
        }

        return preg_match('/\d+/', $out, $m) ? (int) $m[0] : 0;
    }

    /** FAQ хариу дахь {{slot}}-уудыг Тохиргоо/DB-ийн утгаар солино. */
    private function fillSlots(string $text): string
    {
        $text = strtr($text, [
            '{{clinic_name}}' => (string) Setting::get('site_name', 'Кутикул шүдний эмнэлэг'),
            '{{working_hours}}' => (string) Setting::get('working_hours', ''),
            '{{phone}}' => (string) Setting::get('contact_phone', ''),
            '{{email}}' => (string) Setting::get('contact_email', ''),
            '{{address}}' => (string) Setting::get('address', ''),
            '{{doctors}}' => $this->knowledge->doctorList(),
        ]);

        // Динамик: {{treatments}} бүх эмчилгээ, {{treatments:Гажиг засал}} тухайн ангилал.
        $text = preg_replace_callback('/\{\{treatments(?::([^}]+))?\}\}/u', function ($m) {
            return $this->knowledge->treatmentList(isset($m[1]) ? trim($m[1]) : null);
        }, $text) ?? $text;

        // Flow-ийн үлдсэн personalization токен ({{full_name}} г.м.) цэвэрлэнэ.
        return trim(preg_replace('/\{\{[^}]+\}\}/u', '', $text) ?? $text);
    }

    /**
     * Идэвхтэй провайдераар хариу авна.
     *
     * @param  array<int, array{role: string, parts: array<int, array{text: string}>}>  $contents
     */
    private function ask(array $contents, string $system): ?string
    {
        $this->lastError = null;

        return $this->provider() === 'groq'
            ? $this->askGroq($contents, $system)
            : $this->askGemini($contents, $system);
    }

    /** Google Gemini (generateContent). */
    private function askGemini(array $contents, string $system): ?string
    {
        $key = (string) config('services.gemini.api_key');
        $model = SocialAiSetting::current()->model ?: (string) config('services.gemini.model', 'gemini-2.5-flash');
        $base = rtrim((string) config('services.gemini.base_url'), '/');

        $generationConfig = ['temperature' => 0.3, 'maxOutputTokens' => 800];
        if (str_contains($model, '2.5')) {
            $generationConfig['thinkingConfig'] = ['thinkingBudget' => 0];
        }

        $response = Http::withHeaders(['x-goog-api-key' => $key])
            ->timeout(20)
            ->post("{$base}/models/{$model}:generateContent", [
                'systemInstruction' => ['parts' => [['text' => $system]]],
                'contents' => $contents,
                'generationConfig' => $generationConfig,
            ]);

        if ($response->failed()) {
            $this->lastError = match (true) {
                $response->status() === 429 => 'rate_limit',
                $response->status() === 413 => 'too_large',
                default => 'http_'.$response->status(),
            };
            Log::warning('Gemini API error', ['status' => $response->status(), 'body' => mb_substr($response->body(), 0, 500)]);

            return null;
        }

        $parts = $response->json('candidates.0.content.parts', []);
        if (! is_array($parts) || $parts === []) {
            $this->lastError = 'empty';

            return null;
        }

        $out = '';
        foreach ($parts as $p) {
            $out .= $p['text'] ?? '';
        }

        return $out !== '' ? $out : null;
    }

    /** Groq (OpenAI-compatible chat/completions). */
    private function askGroq(array $contents, string $system): ?string
    {
        $key = (string) config('services.groq.api_key');
        $model = SocialAiSetting::current()->model ?: (string) config('services.groq.model', 'llama-3.3-70b-versatile');
        $base = rtrim((string) config('services.groq.base_url'), '/');

        $messages = [['role' => 'system', 'content' => $system]];
        foreach ($contents as $c) {
            $role = ($c['role'] ?? 'user') === 'model' ? 'assistant' : 'user';
            $t = '';
            foreach ($c['parts'] ?? [] as $p) {
                $t .= $p['text'] ?? '';
            }
            $messages[] = ['role' => $role, 'content' => $t];
        }

        $response = Http::withToken($key)
            ->timeout(20)
            ->post("{$base}/chat/completions", [
                'model' => $model,
                'messages' => $messages,
                'temperature' => 0.3,
                'max_tokens' => 800,
            ]);

        if ($response->failed()) {
            $this->lastError = match (true) {
                $response->status() === 429 => 'rate_limit',
                $response->status() === 413 => 'too_large',
                default => 'http_'.$response->status(),
            };
            Log::warning('Groq API error', ['status' => $response->status(), 'body' => mb_substr($response->body(), 0, 500)]);

            return null;
        }

        $text = $response->json('choices.0.message.content');
        if (! is_string($text) || trim($text) === '') {
            $this->lastError = 'empty';

            return null;
        }

        return $text;
    }

    /** Системийн заавар (generative горим — Монгол хэл, засварлагдах дүрэм, эмнэлгийн context). */
    private function systemPrompt(): string
    {
        $name = Setting::get('site_name', 'Кутикул шүдний эмнэлэг');
        $setting = SocialAiSetting::current();
        $rules = trim($setting->system_rules ?: SocialAiSetting::defaultRules());
        $context = $this->knowledge->context();

        if ($extra = trim((string) $setting->extra_knowledge)) {
            $context .= "\n\nНЭМЭЛТ МЭДЭЭЛЭЛ:\n{$extra}";
        }

        $tag = self::HANDOFF_TAG;

        return <<<PROMPT
        Чи бол "{$name}" шүдний эмнэлгийн албан ёсны туслах. Facebook/Instagram-аар бичсэн үйлчлүүлэгчид Монгол хэлээр, эелдэг хариулна.

        ДҮРЭМ:
        {$rules}

        ШИЛЖҮҮЛЭХ: Цаг захиалах хүсэлт, гомдол/маргаан/эмзэг асуудал, онош/эмчилгээний тодорхой зөвлөгөө шаардсан, эсвэл доорх мэдээллээр хариулж боломжгүй асуулт гарвал — эхлээд эелдэг богино хариу бичээд, хариултынхаа ТӨГСГӨЛД шинэ мөрөнд яг {$tag} гэж нэм (энэ тэмдэг үйлчлүүлэгчид харагдахгүй, оператор руу шилжүүлнэ).

        === ЭМНЭЛГИЙН МЭДЭЭЛЭЛ ===
        {$context}
        === ТӨГСГӨЛ ===
        PROMPT;
    }

    /**
     * Сүүлийн ярианы түүхийг Gemini-ийн contents хэлбэрт хөрвүүлнэ.
     *
     * @return array<int, array{role: string, parts: array<int, array{text: string}>}>
     */
    private function history(SocialConversation $conversation, string $fallbackText): array
    {
        $messages = SocialMessage::where('social_conversation_id', $conversation->id)
            ->where('type', 'text')
            ->whereNotNull('text')
            ->orderByDesc('id')
            ->limit(8)
            ->get()
            ->reverse();

        $contents = [];
        foreach ($messages as $m) {
            $role = $m->direction === SocialMessage::DIR_IN ? 'user' : 'model';
            if ($contents === [] && $role !== 'user') {
                continue;
            }
            $contents[] = ['role' => $role, 'parts' => [['text' => (string) $m->text]]];
        }

        if ($contents === []) {
            $contents[] = ['role' => 'user', 'parts' => [['text' => $fallbackText]]];
        }

        return $contents;
    }

    /** Хариуг сувгийн урт хязгаараар хэсэглэн илгээж, бот мессежээр бүртгэнэ. */
    private function deliver(
        SocialAccount $account,
        SocialConversation $conversation,
        SocialContact $contact,
        string $answer,
    ): void {
        $limit = $conversation->channel === 'instagram' ? 1000 : 2000;
        $mid = null;
        foreach ($this->chunk($answer, $limit) as $chunk) {
            if (trim($chunk) === '') {
                continue;
            }
            $mid = $this->meta->sendText($account, $contact->external_id, $chunk)['mid'] ?? $mid;
        }

        $message = SocialMessage::create([
            'social_conversation_id' => $conversation->id,
            'direction' => SocialMessage::DIR_OUT,
            'sender' => SocialMessage::SENDER_AI,
            'type' => 'text',
            'text' => $answer,
            'external_mid' => $mid,
            'delivered_at' => now(),
        ]);

        $conversation->update([
            'last_message_at' => now(),
            'last_message_text' => mb_substr($answer, 0, 1000),
        ]);

        if ($this->simulate) {
            return; // тест чат — real-time broadcast хийхгүй
        }

        try {
            broadcast(new SocialMessageReceived($message));
        } catch (\Throwable $e) {
            Log::warning('Social AI broadcast failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Текстийг хязгаараас доош, аль болох мөр/зайгаар таслан хэсэглэнэ.
     *
     * @return array<int, string>
     */
    private function chunk(string $text, int $limit): array
    {
        $text = trim($text);
        if (mb_strlen($text) <= $limit) {
            return [$text];
        }

        $chunks = [];
        while (mb_strlen($text) > $limit) {
            $slice = mb_substr($text, 0, $limit);
            $cut = max((int) mb_strrpos($slice, "\n"), (int) mb_strrpos($slice, ' '));
            if ($cut < (int) ($limit * 0.5)) {
                $cut = $limit;
            }
            $chunks[] = trim(mb_substr($text, 0, $cut));
            $text = trim(mb_substr($text, $cut));
        }
        if ($text !== '') {
            $chunks[] = $text;
        }

        return $chunks;
    }
}
