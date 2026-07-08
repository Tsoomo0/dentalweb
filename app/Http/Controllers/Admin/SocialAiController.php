<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Social\SocialAccount;
use App\Models\Social\SocialAiFaq;
use App\Models\Social\SocialAiSetting;
use App\Models\Social\SocialContact;
use App\Models\Social\SocialConversation;
use App\Services\Social\ClinicKnowledgeService;
use App\Services\Social\PersonalizationResolver;
use App\Services\Social\SimulatedMetaGraphService;
use App\Services\Social\SocialAiReplyService;
use App\Services\Social\SocialFlowRunner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Smalot\PdfParser\Parser as PdfParser;

class SocialAiController extends Controller
{
    public function index(ClinicKnowledgeService $knowledge): Response
    {
        $setting = SocialAiSetting::current();

        return Inertia::render('admin/Social/AiAssistant', [
            'setting' => [
                'enabled' => $setting->enabled,
                'provider' => $setting->provider ?: 'gemini',
                'mode' => $setting->mode ?: 'generative',
                'system_rules' => $setting->system_rules ?: SocialAiSetting::defaultRules(),
                'extra_knowledge' => $setting->extra_knowledge ?? '',
                'model' => $setting->model ?? '',
            ],
            'faqs' => SocialAiFaq::orderBy('order')->get(['id', 'question', 'answer', 'is_active']),
            'defaults' => [
                'rules' => SocialAiSetting::defaultRules(),
                'gemini_model' => (string) config('services.gemini.model', 'gemini-2.5-flash'),
                'groq_model' => (string) config('services.groq.model', 'llama-3.3-70b-versatile'),
            ],
            // Аль провайдерт түлхүүр тохирсоныг харуулна.
            'status' => [
                'gemini' => ! empty(config('services.gemini.api_key')),
                'groq' => ! empty(config('services.groq.api_key')),
            ],
            // AI DB-ээс автоматаар харж буй мэдээлэл (зөвхөн харах).
            'knowledge_preview' => $knowledge->context(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'provider' => ['required', 'in:gemini,groq'],
            'mode' => ['required', 'in:generative,retrieval'],
            'system_rules' => ['nullable', 'string', 'max:8000'],
            'extra_knowledge' => ['nullable', 'string', 'max:200000'],
            'model' => ['nullable', 'string', 'max:100'],
        ]);

        $setting = SocialAiSetting::current();
        $setting->update([
            'enabled' => $data['enabled'],
            'provider' => $data['provider'],
            'mode' => $data['mode'],
            'system_rules' => trim((string) ($data['system_rules'] ?? '')) ?: null,
            'extra_knowledge' => trim((string) ($data['extra_knowledge'] ?? '')) ?: null,
            'model' => trim((string) ($data['model'] ?? '')) ?: null,
        ]);

        // Мэдээлэл шинэчилсэн тул context cache-ийг цэвэрлэнэ (шинэ утга шууд тусна).
        ClinicKnowledgeService::forget();

        return back()->with('success', 'AI тохиргоо хадгалагдлаа.');
    }

    public function test(Request $request, SocialAiReplyService $ai): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:1500'],
            'history' => ['nullable', 'array', 'max:20'],
            'history.*.role' => ['nullable', 'string'],
            'history.*.text' => ['nullable', 'string'],
        ]);

        // Хамгийн сүүлийн засвар шууд тусахын тулд cache-ийг цэвэрлэнэ.
        ClinicKnowledgeService::forget();

        return response()->json($ai->preview($data['message'], $data['history'] ?? []));
    }

    /**
     * Бүрэн симуляц — жинхэнэ SocialFlowRunner-ийг тест sandbox дээр ажиллуулна.
     * Flow (түлхүүр үг, товч, welcome, карусель), AI fallback, оператор шилжүүлэлт бүгд
     * бодит адил ажиллана; гэхдээ Facebook руу ЮУ Ч ИЛГЭЭХГҮЙ, DB-д мөр үлдээхгүй
     * (transaction rollback). Харилцааны төлөв (awaiting/attributes/tags/status) session-д
     * хадгалагдаж, олон алхамт flow, товч дарах үргэлжлэлийг дэмжинэ.
     */
    public function simulate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'text' => ['nullable', 'string', 'max:1500'],
            'payload' => ['nullable', 'string', 'max:255'],
            'channel' => ['nullable', 'in:messenger,instagram'],
            'reset' => ['sometimes', 'boolean'],
        ]);

        $key = 'social_ai_sim';

        // Дахин эхлүүлэх — sandbox төлвийг цэвэрлэнэ.
        if (! empty($data['reset'])) {
            $request->session()->forget($key);

            return response()->json(['ok' => true, 'messages' => [], 'reset' => true]);
        }

        $text = trim((string) ($data['text'] ?? '')) ?: null;
        $payload = trim((string) ($data['payload'] ?? '')) ?: null;
        if ($text === null && $payload === null) {
            return response()->json(['ok' => false, 'error' => 'Мессеж хоосон байна.']);
        }

        // Байгаа бол жинхэнэ account (flow scoping зөв ажиллана); байхгүй бол доор
        // transaction дотор sandbox account үүсгэнэ (rollback-д цэвэрлэгдэнэ).
        $account = SocialAccount::query()->orderBy('id')->first();

        $state = $request->session()->get($key, [
            'started' => false,
            'awaiting_node_id' => null,
            'attributes' => [],
            'tags' => [],
            'status' => SocialConversation::STATUS_BOT,
            'channel' => $data['channel'] ?? 'messenger',
        ]);
        $channel = $state['channel'] ?? 'messenger';

        // Хамгийн сүүлийн засвар (үнэ, эмч, FAQ) шууд тусахын тулд knowledge cache цэвэрлэнэ.
        ClinicKnowledgeService::forget();

        // Симуляц үйлчилгээ — flow runner ба AI хоёул үүгээр «илгээнэ» (барьж авна).
        $sim = new SimulatedMetaGraphService;
        $ai = (new SocialAiReplyService($sim, app(ClinicKnowledgeService::class)))->simulate();
        $runner = (new SocialFlowRunner($sim, app(PersonalizationResolver::class), $ai))->simulate();

        $captured = [];
        $newState = $state;
        $error = null;

        DB::beginTransaction();
        try {
            // Холбогдсон account байхгүй бол sandbox account (rollback-д устана).
            if (! $account) {
                $account = SocialAccount::create([
                    'page_id' => '__sim__',
                    'page_name' => 'Sandbox',
                    'page_access_token' => 'sim',
                    'is_active' => true,
                ]);
            }

            $contact = SocialContact::create([
                'social_account_id' => $account->id,
                'channel' => $channel,
                'external_id' => 'SIM-'.$account->id.'-'.($request->user()?->id ?? 0),
                'name' => 'Тест хэрэглэгч',
                'attributes' => $state['attributes'],
                'tags' => $state['tags'],
                'last_interacted_at' => now(),
            ]);

            $conversation = SocialConversation::create([
                'social_account_id' => $account->id,
                'social_contact_id' => $contact->id,
                'channel' => $channel,
                'status' => $state['status'],
                'awaiting_node_id' => $state['awaiting_node_id'],
                'unread_count' => 0,
                'window_expires_at' => now()->addHours(24),
            ]);

            $isNew = ! ($state['started'] ?? false);

            // Жинхэнэ ProcessSocialEvent-тэй адил: зөвхөн bot горимд автоматаар хариулна.
            if ($conversation->status === SocialConversation::STATUS_BOT) {
                $runner->handleIncoming($account, $conversation, $contact, $text, $payload, $isNew);
            }

            $captured = $sim->captured();
            $newState = [
                'started' => true,
                'awaiting_node_id' => $conversation->awaiting_node_id,
                'attributes' => $contact->attributes ?? [],
                'tags' => $contact->tags ?? [],
                'status' => $conversation->status,
                'channel' => $channel,
            ];
        } catch (\Throwable $e) {
            report($e);
            $error = 'Симуляц гүйцэтгэхэд алдаа гарлаа: '.$e->getMessage();
        } finally {
            DB::rollBack(); // sandbox — DB-д юу ч үлдээхгүй
        }

        if ($error !== null) {
            return response()->json(['ok' => false, 'error' => $error]);
        }

        $request->session()->put($key, $newState);

        $startOperator = ($state['status'] ?? 'bot') === SocialConversation::STATUS_OPEN;
        $endOperator = $newState['status'] === SocialConversation::STATUS_OPEN;

        return response()->json([
            'ok' => true,
            'messages' => $captured,
            'handoff' => ! $startOperator && $endOperator,   // энэ алхамд операторт шилжсэн
            'operator_mode' => $startOperator,               // өмнөх алхмаас операторт байсан — бот чимээгүй
            'awaiting' => $newState['awaiting_node_id'] !== null,
        ]);
    }

    /** FAQ хариулт нэмэх (retrieval горим). */
    public function storeFaq(Request $request): JsonResponse
    {
        $data = $request->validate([
            'question' => ['required', 'string', 'max:500'],
            'answer' => ['required', 'string', 'max:3000'],
        ]);

        $faq = SocialAiFaq::create([
            'question' => $data['question'],
            'answer' => $data['answer'],
            'is_active' => true,
            'order' => (int) SocialAiFaq::max('order') + 1,
        ]);

        return response()->json(['ok' => true, 'faq' => $faq->only(['id', 'question', 'answer', 'is_active'])]);
    }

    /** FAQ хариулт засах. */
    public function updateFaq(Request $request, SocialAiFaq $faq): JsonResponse
    {
        $data = $request->validate([
            'question' => ['required', 'string', 'max:500'],
            'answer' => ['required', 'string', 'max:3000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $faq->update($data);

        return response()->json(['ok' => true]);
    }

    /** FAQ хариулт устгах. */
    public function destroyFaq(SocialAiFaq $faq): JsonResponse
    {
        $faq->delete();

        return response()->json(['ok' => true]);
    }

    /** Word/PDF файлаас FAQ-уудыг автоматаар ялгаж, retrieval FAQ болгож үүсгэнэ. */
    public function importFaqs(Request $request): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'max:10240']]);

        try {
            $text = $this->extractText($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()]);
        }

        $entries = $this->splitFaqs($text);
        if ($entries === []) {
            return response()->json(['ok' => false, 'error' => 'Файлаас FAQ ялгаж чадсангүй. Асуулт/хариултаа хоосон мөрөөр тусгаарлаж бичсэн эсэхээ шалгана уу.']);
        }

        $order = (int) SocialAiFaq::max('order');
        $created = [];
        foreach ($entries as [$q, $a]) {
            if (trim($q) === '' || trim($a) === '') {
                continue;
            }
            $faq = SocialAiFaq::create([
                'question' => mb_substr(trim($q), 0, 500),
                'answer' => mb_substr(trim($a), 0, 3000),
                'is_active' => true,
                'order' => ++$order,
            ]);
            $created[] = $faq->only(['id', 'question', 'answer', 'is_active']);
        }

        return response()->json(['ok' => true, 'faqs' => $created, 'count' => count($created)]);
    }

    /**
     * Текстийг FAQ асуулт-хариулт хосуудад хуваана (хоосон мөрөөр, «Асуулт:/Хариулт:» загвар г.м.).
     *
     * @return array<int, array{0: string, 1: string}>
     */
    private function splitFaqs(string $text): array
    {
        $blocks = preg_split('/\n\s*\n/u', trim($text)) ?: [];
        $entries = [];

        foreach ($blocks as $block) {
            $block = trim($block);
            if (mb_strlen($block) < 3) {
                continue;
            }
            $lines = array_values(array_filter(array_map('trim', explode("\n", $block)), fn ($l) => $l !== ''));
            if ($lines === []) {
                continue;
            }
            $first = $lines[0];

            if (count($lines) >= 2 && preg_match('/^(асуулт|q|question)\s*[:：]/iu', $first)) {
                $q = preg_replace('/^(асуулт|q|question)\s*[:：]\s*/iu', '', $first);
                $a = preg_replace('/^(хариулт|a|answer)\s*[:：]\s*/iu', '', implode("\n", array_slice($lines, 1)));
                $entries[] = [$q, $a];
            } elseif (count($lines) >= 2 && (mb_strlen($first) <= 120 || str_ends_with($first, '?'))) {
                $entries[] = [$first, implode("\n", array_slice($lines, 1))];
            } else {
                $entries[] = [mb_substr($first, 0, 200), $block];
            }
        }

        return $entries;
    }

    /** Word/PDF баримт оруулж, текстийг задлан буцаана (админ засаад «Нэмэлт мэдээлэл»-д хадгална). */
    public function document(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'], // 10MB
        ]);

        $file = $request->file('file');

        try {
            $text = $this->extractText($file);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()]);
        }

        $text = trim(preg_replace('/[ \t]+/', ' ', preg_replace('/\n{3,}/', "\n\n", $text)));
        if ($text === '') {
            return response()->json(['ok' => false, 'error' => 'Файлаас текст олдсонгүй (зурган PDF байж магадгүй).']);
        }

        return response()->json([
            'ok' => true,
            'text' => $text,
            'name' => $file->getClientOriginalName(),
        ]);
    }

    /** PDF (smalot/pdfparser) эсвэл .docx (ZipArchive) файлаас текст задална. */
    private function extractText(UploadedFile $file): string
    {
        $ext = strtolower($file->getClientOriginalExtension());
        $path = $file->getRealPath();

        if ($ext === 'pdf') {
            return (new PdfParser)->parseFile($path)->getText();
        }

        if ($ext === 'docx') {
            $zip = new \ZipArchive;
            if ($zip->open($path) !== true) {
                throw new \RuntimeException('DOCX файл нээгдсэнгүй.');
            }
            $xml = $zip->getFromName('word/document.xml') ?: '';
            $zip->close();
            $xml = preg_replace('/<\/w:p>/', "\n", $xml);          // догол мөр
            $xml = preg_replace('/<w:tab\b[^>]*\/?>/', ' ', $xml); // таб
            $text = strip_tags((string) $xml);

            return html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');
        }

        throw new \RuntimeException('Зөвхөн PDF болон .docx дэмжинэ (.doc бол .docx болгож хадгалаад оруулна уу).');
    }
}
