<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Services\HR\CompanyStamp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * Байгууллагын тамганы удирдлага — гэрээнд дарагдах зургийг оруулж, солино.
 */
class CompanyStampController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'has_stamp' => CompanyStamp::exists(),
            'image' => CompanyStamp::dataUri(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // Хөтөч дээр PNG болгож, дэвсгэрийг нь тунгалаг болгоод илгээнэ
            'image' => ['required', 'string', 'max:4000000'],
        ], [
            'image.required' => 'Тамганы зургаа оруулна уу',
            'image.max' => 'Зураг хэт том байна. Жижигрүүлээд дахин оролдоно уу.',
        ]);

        if (! preg_match('~^data:image/png;base64,([a-z0-9+/=\s]+)$~i', $validated['image'], $m)) {
            return response()->json(['message' => 'Тамга буруу форматтай байна.'], 422);
        }

        $binary = base64_decode(preg_replace('~\s+~', '', $m[1]), true);

        if ($binary === false || @imagecreatefromstring($binary) === false) {
            return response()->json(['message' => 'Зургийг уншиж чадсангүй.'], 422);
        }

        CompanyStamp::put($binary);

        return response()->json(['has_stamp' => true, 'image' => CompanyStamp::dataUri()]);
    }

    public function destroy(): JsonResponse
    {
        CompanyStamp::remove();

        return response()->json(['has_stamp' => false, 'image' => null]);
    }

    /** Тамгыг зөвхөн эрхтэй хэрэглэгчид харуулна — нийтэд ил байрлуулахгүй. */
    public function preview(): HttpResponse
    {
        $uri = CompanyStamp::dataUri();

        if (! $uri) {
            abort(404);
        }

        return response(base64_decode(explode(',', $uri, 2)[1]), 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'private, max-age=60',
        ]);
    }
}
