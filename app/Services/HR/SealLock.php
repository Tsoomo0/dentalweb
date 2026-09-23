<?php

namespace App\Services\HR;

use App\Models\Setting;
use Illuminate\Http\Request;

/**
 * Баримтын түгжээ — байгууллагын тамга болон захирлын гарын үсгийг хамгаална.
 *
 * HR портал нь хүн нөөцийн албан тушаалтай бүх ажилтанд нээлттэй тул тамга
 * солих, гэрээнд захирлын нэрээр гарын үсэг зурах зэрэг үйлдлийг нэмэлт PIN
 * кодоор түгждэг. Код зөв оруулсан тохиолдолд сесс дотор тодорхой хугацаанд
 * нээлттэй байж, дараалсан үйлдэл бүрт кодыг дахин асуухгүй.
 */
class SealLock
{
    /** Тохиргоон дахь кодын түлхүүр — админ /admin/settings дээрээс солино. */
    public const SETTING_KEY = 'document_seal_code';

    /** Тохиргоо хоосон байвал ашиглах анхны код. */
    public const DEFAULT_CODE = '1234';

    /** Нэг удаа нээхэд хэдэн секунд нээлттэй байх вэ (15 минут). */
    public const TTL = 900;

    private const SESSION_KEY = 'hr.seal_unlocked_at';

    /** Одоогийн хүчинтэй код. */
    public static function code(): string
    {
        $code = Setting::get(self::SETTING_KEY);

        return $code === null || $code === '' ? self::DEFAULT_CODE : (string) $code;
    }

    /** Оруулсан кодыг цагийн хувьд тогтвортой аргаар шалгана. */
    public static function verify(string $code): bool
    {
        return hash_equals(self::code(), $code);
    }

    public static function unlock(Request $request): void
    {
        $request->session()->put(self::SESSION_KEY, time());
    }

    public static function lock(Request $request): void
    {
        $request->session()->forget(self::SESSION_KEY);
    }

    /** Түгжээ нээлттэй байх үлдсэн секунд (0 = түгжээтэй). */
    public static function remaining(Request $request): int
    {
        $at = (int) $request->session()->get(self::SESSION_KEY, 0);

        if ($at <= 0) {
            return 0;
        }

        return max(0, self::TTL - (time() - $at));
    }

    public static function isUnlocked(Request $request): bool
    {
        return self::remaining($request) > 0;
    }
}
