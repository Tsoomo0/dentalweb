<?php

namespace App\Models\CallPro;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Спам / хамааралгүй дугаарын жагсаалт.
 *
 * Энд байгаа дугаараас ирсэн дуудлага бүртгэгдсэн хэвээр байх боловч
 * мэдэгдэл өгөхгүй, SLA-д орохгүй, тайлангийн үзүүлэлтийг гажуудуулахгүй.
 * Дуудлагыг УСТГАХГҮЙ — дараа нь буруу тэмдэглэсэн бол буцаах боломжтой.
 */
class CallBlockedNumber extends Model
{
    protected $fillable = ['number_norm', 'label', 'reason', 'created_by'];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public static function isBlocked(?string $numberNorm): bool
    {
        return $numberNorm !== null
            && static::where('number_norm', $numberNorm)->exists();
    }
}
