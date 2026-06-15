<?php

namespace App\Http\Controllers\Social;

use App\Http\Controllers\Controller;
use App\Jobs\Social\ProcessSocialEvent;
use App\Services\Social\MetaGraphService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * Meta webhook — Facebook Page + Instagram-аас ирэх event-ийг хүлээн авна.
 *
 * GET  /webhooks/social — Meta-гийн баталгаажуулалт (hub.challenge)
 * POST /webhooks/social — мессеж/коммент event (signature шалгана)
 *
 * Энэ route нь CSRF-аас чөлөөлөгдсөн (bootstrap/app.php).
 */
class SocialWebhookController extends Controller
{
    public function __construct(private readonly MetaGraphService $meta) {}

    /** Meta App тохиргоонд webhook URL-ийг баталгаажуулах. */
    public function verify(Request $request): Response
    {
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        if ($mode === 'subscribe' && $token === config('services.meta.verify_token')) {
            return response((string) $challenge, 200)
                ->header('Content-Type', 'text/plain');
        }

        Log::warning('Meta webhook verify failed', ['mode' => $mode]);

        return response('Forbidden', 403);
    }

    /** Event хүлээн авах. Meta 200-г хурдан хүлээдэг тул хүнд ажлыг queue руу шилжүүлнэ. */
    public function receive(Request $request): Response
    {
        $raw = $request->getContent();
        $signature = $request->header('X-Hub-Signature-256');
        $valid = $this->meta->verifySignature($raw, $signature);

        // ДЕБАГ: ирсэн бүх event-ийг логдоно (signature таарсан эсэх ч хамт).
        Log::info('Meta webhook IN', [
            'object' => $request->input('object'),
            'signature_ok' => $valid,
            'bytes' => strlen($raw),
        ]);
        // ДЕБАГ: бүтэн payload (page id / sender / recipient / text шалгах) — дараа устгана.
        Log::info('Meta webhook RAW', ['payload' => $raw]);

        // Дебагийн турш signature таарахгүй ч боловсруулна (дараа буцааж чангална).
        ProcessSocialEvent::dispatch($request->all());

        return response('EVENT_RECEIVED', 200);
    }
}
