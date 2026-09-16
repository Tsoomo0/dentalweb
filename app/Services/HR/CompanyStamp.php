<?php

namespace App\Services\HR;

use App\Models\Setting;
use Illuminate\Support\Facades\Storage;

/**
 * Байгууллагын тамга.
 *
 * Тамга нь хувийн биш, байгууллагын нэг зураг тул тохиргоонд нэг л удаа
 * оруулаад бүх гэрээнд ашиглана. Хувийн мэдээлэлтэй адил хамгаалалт
 * шаардлагатай учир нийтийн биш, хаалттай дискэнд хадгална.
 */
class CompanyStamp
{
    public const DISK = 'local';

    public const PATH = 'company/stamp.png';

    private const SETTING_KEY = 'company_stamp_path';

    /** Тамга тохируулагдсан эсэх. */
    public static function exists(): bool
    {
        $path = Setting::get(self::SETTING_KEY);

        return ! empty($path) && Storage::disk(self::DISK)->exists($path);
    }

    /** Тамгыг PDF-д шууд суулгах data URI хэлбэрээр буцаана. */
    public static function dataUri(): ?string
    {
        $path = Setting::get(self::SETTING_KEY);

        if (empty($path) || ! Storage::disk(self::DISK)->exists($path)) {
            return null;
        }

        return 'data:image/png;base64,'.base64_encode(Storage::disk(self::DISK)->get($path));
    }

    /**
     * Тамгыг хадгална.
     *
     * @param  string  $png  Түүхий PNG агуулга
     */
    public static function put(string $png): void
    {
        Storage::disk(self::DISK)->put(self::PATH, $png);
        Setting::updateOrCreate(['key' => self::SETTING_KEY], ['value' => self::PATH]);
        Setting::clearCache();
    }

    public static function remove(): void
    {
        $path = Setting::get(self::SETTING_KEY);

        if (! empty($path)) {
            Storage::disk(self::DISK)->delete($path);
        }

        Setting::updateOrCreate(['key' => self::SETTING_KEY], ['value' => null]);
        Setting::clearCache();
    }
}
