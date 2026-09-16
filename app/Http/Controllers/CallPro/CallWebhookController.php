<?php

namespace App\Http\Controllers\CallPro;

use App\Http\Controllers\Controller;
use App\Jobs\CallPro\ProcessCallEvent;
use App\Models\CallPro\CallEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * CallPro-с ирэх дуудлагын event хүлээн авна.
 *
 *   POST|GET /webhooks/callpro/start
 *   POST|GET /webhooks/callpro/answered
 *   POST|GET /webhooks/callpro/end
 *   POST|GET /webhooks/callpro/abandoned
 *
 * CallPro payload дотроо event нэрээ илгээдэггүй тул URL-аар ялгав. Хэрэв
 * event заагаагүй бол талбаруудаас нь таамаглана.
 *
 * ЧУХАЛ: CallPro дахин илгээх (retry) бодлогогүй — нэг алдсан хүсэлт бүрмөсөн
 * алдагдана. Тиймээс энэ endpoint нь ямар ч тохиолдолд алдаа шидэхгүй, түүхий
 * payload-ыг эхлээд хадгалаад 200 буцаана. Бүх боловсруулалт queue дээр явна.
 *
 * Энэ route CSRF-аас чөлөөлөгдсөн (bootstrap/app.php), эх сурвалжийг
 * VerifyCallProWebhook middleware шалгана.
 */
class CallWebhookController extends Controller
{
    public function handle(Request $request, ?string $event = null): JsonResponse
    {
        // `all()` нь query string болон body хоёуланг нэгтгэдэг тул GET, POST,
        // JSON, form-urlencoded бүгд ажиллана.
        $payload = $request->all();

        try {
            $callEvent = CallEvent::create([
                'event' => $event ?? 'auto',
                'payload' => $payload,
                'source' => $request->query('source') === 'history' ? 'backfill' : 'realtime',
                'ip' => $request->ip(),
                'received_at' => now(),
            ]);

            ProcessCallEvent::dispatch($callEvent->id);
        } catch (\Throwable $e) {
            // Мэдээллийн сан унасан ч payload-ыг лог дээр үлдээнэ — дахин
            // илгээгдэхгүй тул энэ бол сүүлчийн боломж.
            Log::error('CallPro webhook: хадгалж чадсангүй', [
                'err' => $e->getMessage(),
                'event' => $event,
                'payload' => $payload,
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
