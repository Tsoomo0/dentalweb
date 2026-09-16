<?php

namespace App\Http\Controllers\CallPro;

use App\Http\Controllers\Controller;
use App\Models\CallPro\Call;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Ярианы бичлэгийг ӨӨРИЙН сервер дээгүүр дамжуулна.
 *
 * Яагаад шууд линк өгөхгүй вэ:
 *   1. CallPro-гийн бичлэгийн URL нууцлалгүй байх магадлалтай (жишээ линк нь
 *      ямар ч нэвтрэлтгүй харагдсан). Тэр URL хөтөч рүү нэг л удаа гарвал
 *      эмнэлгийн яриа хэн ч сонсох боломжтой болно.
 *   2. Хэн, хэзээ, аль дуудлагыг сонссоныг бүртгэх шаардлагатай.
 *   3. CallPro линкийн бүтэц өөрчлөгдвөл нэг л газар засна.
 *
 * Range хүсэлтийг дамжуулдаг тул тоглуулагч дээр урагш-хойш гүйлгэх ажиллана.
 */
class CallRecordingController extends Controller
{
    public function __invoke(Request $request, Call $call): StreamedResponse
    {
        abort_unless($this->canListen($request, $call), 403, 'Энэ дуудлагыг сонсох эрхгүй байна.');
        abort_unless($call->hasRecording(), 404, 'Энэ дуудлагад бичлэг алга.');

        AuditService::log(
            'viewed',
            $call,
            null,
            ['number' => $call->number, 'started_at' => $call->started_at?->toDateTimeString()],
            'Ярианы бичлэг сонсов: '.$call->number,
            notify: false,
        );

        return $this->stream($call, $request->header('Range'));
    }

    /** Админ бүгдийг, ресепшн зөвхөн өөрийн салбарын дуудлагыг сонсоно. */
    private function canListen(Request $request, Call $call): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $user->isReceptionist()
            && $call->branch_id !== null
            && $call->branch_id === $user->branch_id;
    }

    private function stream(Call $call, ?string $range): StreamedResponse
    {
        $upstream = Http::timeout(30)
            ->withOptions(['stream' => true])
            ->when($range, fn ($h) => $h->withHeaders(['Range' => $range]))
            ->get($call->call_record);

        if ($upstream->failed()) {
            Log::warning('CallPro бичлэг татаж чадсангүй', [
                'call_id' => $call->id,
                'status' => $upstream->status(),
            ]);

            abort(502, 'Бичлэгийг CallPro-с татаж чадсангүй.');
        }

        $body = $upstream->toPsrResponse()->getBody();

        $headers = array_filter([
            'Content-Type' => $upstream->header('Content-Type') ?: 'audio/mpeg',
            'Content-Length' => $upstream->header('Content-Length') ?: null,
            'Content-Range' => $upstream->header('Content-Range') ?: null,
            'Accept-Ranges' => 'bytes',
            // Бичлэгийг прокси/CDN дээр кэшлэхийг хориглоно.
            'Cache-Control' => 'private, no-store',
        ]);

        return response()->stream(function () use ($body) {
            while (! $body->eof()) {
                echo $body->read(64 * 1024);
                flush();
            }
        }, $upstream->status(), $headers);
    }
}
