<?php

namespace App\Http\Controllers;

use App\Models\HR\Employee;
use App\Models\UserSignature;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Хэрэглэгчийн хадгалсан гарын үсгийн сан.
 *
 * Гарын үсгийг зурж эсвэл зургаар оруулаад нэг удаа хадгалснаар цаашид
 * гэрээ, ажлын байрны тодорхойлолт болон бусад баримтад дахин ашиглана.
 */
class SignatureController extends Controller
{
    public function index(): JsonResponse
    {
        $userId = $this->userId();

        if (! $userId) {
            return response()->json(['signatures' => []]);
        }

        $signatures = UserSignature::where('user_id', $userId)
            ->orderByDesc('is_default')
            ->orderByDesc('last_used_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (UserSignature $s) => $this->format($s));

        return response()->json(['signatures' => $signatures]);
    }

    public function store(Request $request): JsonResponse
    {
        $userId = $this->userId();

        if (! $userId) {
            return response()->json(['message' => 'Хэрэглэгч танигдсангүй.'], 403);
        }

        $validated = $request->validate([
            // Зургийг хөтөч дээр PNG болгож хөрвүүлээд data URL хэлбэрээр илгээнэ
            'image' => ['required', 'string', 'max:4000000'],
            'label' => ['nullable', 'string', 'max:80'],
            'source' => ['nullable', 'in:draw,upload'],
            'is_default' => ['nullable', 'boolean'],
        ], [
            'image.required' => 'Гарын үсгийн зураг дутуу байна',
            'image.max' => 'Зураг хэт том байна. Жижигрүүлээд дахин оролдоно уу.',
        ]);

        if (! UserSignature::isValidImage($validated['image'])) {
            return response()->json(['message' => 'Гарын үсэг буруу форматтай байна.'], 422);
        }

        if (UserSignature::where('user_id', $userId)->count() >= UserSignature::MAX_PER_USER) {
            return response()->json([
                'message' => 'Хамгийн ихдээ '.UserSignature::MAX_PER_USER.' гарын үсэг хадгална. Хуучныг устгана уу.',
            ], 422);
        }

        $isFirst = ! UserSignature::where('user_id', $userId)->exists();
        $makeDefault = $isFirst || $request->boolean('is_default');

        $signature = DB::transaction(function () use ($userId, $validated, $makeDefault) {
            if ($makeDefault) {
                UserSignature::where('user_id', $userId)->update(['is_default' => false]);
            }

            return UserSignature::create([
                'user_id' => $userId,
                'label' => $validated['label'] ?? null,
                'image' => $validated['image'],
                'source' => $validated['source'] ?? 'draw',
                'is_default' => $makeDefault,
            ]);
        });

        return response()->json(['signature' => $this->format($signature)], 201);
    }

    public function setDefault(UserSignature $signature): JsonResponse
    {
        $this->authorizeSignature($signature);

        DB::transaction(function () use ($signature) {
            UserSignature::where('user_id', $signature->user_id)->update(['is_default' => false]);
            $signature->update(['is_default' => true]);
        });

        return response()->json(['signature' => $this->format($signature->fresh())]);
    }

    /** Баримтад ашиглах бүрд сүүлд хэрэглэсэн огноог тэмдэглэнэ. */
    public function touch(UserSignature $signature): JsonResponse
    {
        $this->authorizeSignature($signature);

        $signature->forceFill(['last_used_at' => now()])->save();

        return response()->json(['ok' => true]);
    }

    public function destroy(UserSignature $signature): JsonResponse
    {
        $this->authorizeSignature($signature);

        $wasDefault = $signature->is_default;
        $userId = $signature->user_id;
        $signature->delete();

        // Үндсэн гарын үсэг устсан бол дараагийнхыг үндсэн болгоно
        if ($wasDefault) {
            $next = UserSignature::where('user_id', $userId)->orderByDesc('id')->first();
            $next?->update(['is_default' => true]);
        }

        return response()->json(['ok' => true]);
    }

    // ── Туслахууд ────────────────────────────────────────────────────────────

    private function authorizeSignature(UserSignature $signature): void
    {
        if ($signature->user_id !== $this->userId()) {
            abort(403);
        }
    }

    /**
     * Одоогийн хэрэглэгчийн users.id — эмчийн guard-аар нэвтэрсэн бол
     * ажилтнаар нь дамжуулан холбогдох хэрэглэгчийг олно.
     */
    private function userId(): ?int
    {
        if (Auth::guard('web')->check()) {
            return Auth::guard('web')->id();
        }

        if (Auth::guard('doctor')->check()) {
            $doctor = Auth::guard('doctor')->user();

            return $doctor?->employee_id
                ? Employee::find($doctor->employee_id)?->user_id
                : null;
        }

        return null;
    }

    private function format(UserSignature $s): array
    {
        return [
            'id' => $s->id,
            'label' => $s->label,
            'image' => $s->image,
            'source' => $s->source,
            'is_default' => $s->is_default,
            'created_at' => $s->created_at?->format('Y-m-d'),
        ];
    }
}
