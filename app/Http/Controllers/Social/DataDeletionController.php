<?php

namespace App\Http\Controllers\Social;

use App\Http\Controllers\Controller;
use App\Models\Social\SocialContact;
use App\Models\Social\SocialConversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Facebook Data Deletion — App Review-д шаардлагатай.
 *
 * POST /data-deletion — Facebook `signed_request`-ийг хүлээн авч хэрэглэгчийн
 *                       өгөгдлийг устгаад { url, confirmation_code } JSON буцаана.
 * GET  /data-deletion — устгалын төлөв харуулах хуудас (?code=...).
 *
 * Энэ route нь CSRF-аас чөлөөлөгдсөн (bootstrap/app.php).
 */
class DataDeletionController extends Controller
{
    /** Facebook Data Deletion Callback. */
    public function callback(Request $request): JsonResponse
    {
        $userId = $this->parseSignedRequest((string) $request->input('signed_request'));

        $code = 'del_'.Str::lower(Str::random(16));

        $deleted = 0;
        if ($userId !== null) {
            $deleted = $this->deleteUserData($userId);
        }

        Log::info('Meta data deletion request', ['user_id' => $userId, 'code' => $code, 'deleted' => $deleted]);

        return response()->json([
            'url' => route('data-deletion.status', ['code' => $code]),
            'confirmation_code' => $code,
        ]);
    }

    /** Устгалын төлөв харуулах нийтийн хуудас. */
    public function status(Request $request): Response
    {
        $code = htmlspecialchars((string) $request->query('code', ''), ENT_QUOTES, 'UTF-8');

        $html = <<<HTML
<!DOCTYPE html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Мэдээлэл устгах хүсэлт — Cuticul Dental Clinic</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:640px;margin:0 auto;padding:48px 20px;line-height:1.7;color:#1f2937}
  h1{font-size:24px}.muted{color:#6b7280;font-size:14px}a{color:#1877F2}
  .box{background:#f3f4f6;border-radius:12px;padding:18px 20px;margin:20px 0}
  code{background:#e5e7eb;padding:2px 8px;border-radius:6px}
</style>
</head>
<body>
  <h1>Мэдээлэл устгах хүсэлт хүлээн авлаа</h1>
  <p>Таны Facebook / Instagram-аас цуглуулсан мэдээллийг (мессеж, нэр, харилцааны түүх) устгах хүсэлтийг хүлээн авч боловсрууллаа.</p>
  <div class="box">
    <p class="muted">Баталгаажуулах код</p>
    <p><code>{$code}</code></p>
  </div>
  <p>Асуулт байвал <a href="mailto:info@cuticul.mn">info@cuticul.mn</a> хаягаар хандана уу.</p>
  <p class="muted">Cuticul Dental Clinic — Кутикул Шүдний эмнэлэг · <a href="https://cuticul.mn/privacy">Нууцлалын бодлого</a></p>
</body>
</html>
HTML;

        return response($html)->header('Content-Type', 'text/html; charset=utf-8');
    }

    /** signed_request-ийг App Secret-ээр шалгаж user_id буцаана. */
    private function parseSignedRequest(string $signed): ?string
    {
        if (! str_contains($signed, '.')) {
            return null;
        }

        [$encodedSig, $payload] = explode('.', $signed, 2);

        $sig = base64_decode(strtr($encodedSig, '-_', '+/'), true);
        $data = json_decode((string) base64_decode(strtr($payload, '-_', '+/'), true), true);

        $secret = (string) config('services.meta.app_secret');
        $expected = hash_hmac('sha256', $payload, $secret, true);

        if ($sig === false || ! hash_equals($expected, $sig)) {
            Log::warning('Data deletion: signed_request signature invalid');

            return null;
        }

        return isset($data['user_id']) ? (string) $data['user_id'] : null;
    }

    /** Тухайн хэрэглэгчийн (external_id) бүх харилцаа/мессежийг устгана. */
    private function deleteUserData(string $externalId): int
    {
        $deleted = 0;

        SocialContact::where('external_id', $externalId)->get()->each(function (SocialContact $contact) use (&$deleted) {
            SocialConversation::where('social_contact_id', $contact->id)->get()->each(function (SocialConversation $conv) {
                $conv->messages()->delete();
                $conv->delete();
            });
            $contact->delete();
            $deleted++;
        });

        return $deleted;
    }
}
