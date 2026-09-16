<?php

namespace App\Models\CallPro;

use App\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * CallPro-гийн дуудлагын бүлэг (queue) → салбар холбоос.
 *
 * IVR дээр товч дарахад үйлчлүүлэгч тухайн бүлэгт ордог тул алдсан дуудлага
 * зөвхөн энэ нэрээр салбартаа хуваарилагдана.
 *
 * `branch_id = null` нь "зориуд салбаргүй" гэсэн утгатай (жишээ: Medeelel avah
 * — бүх салбарын үйлчлүүлэгч ордог). Ийм queue-гээс гарсан алдсан дуудлагад
 * зөвхөн админ мэдэгдэл авна — аль салбарынх нь тодорхойгүй тул ресепшнд
 * үзүүлбэл хэн ч хариуцахгүй өнгөрөх эрсдэлтэй.
 */
class CallQueue extends Model
{
    protected $fillable = ['name', 'branch_id', 'label', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Жиших түлхүүр — CallPro дээрх бичилт өөрчлөгдөж болзошгүй тул үсгийн
     * хэмжээ, зураас, зайг тооцохгүй. "Khan-Uul", "khanuul", "Khan Uul" ижил.
     */
    public static function key(string $value): string
    {
        return strtolower(str_replace([' ', '-', '_', '(', ')', '+', '.'], '', trim($value)));
    }
}
