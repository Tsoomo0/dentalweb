<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OverpaidUsage extends Model
{
    protected $fillable = [
        'source_entry_id',
        'target_receipt',
        'target_date',
        'amount',
        'method',
        'used_by',
    ];

    protected $casts = [
        'amount' => 'integer',
        'target_date' => 'date',
    ];

    /**
     * Нэг өдрийн хуудсанд ижил баримтын дугаартай хэд хэдэн мөр байж болно
     * (жишээ нь чангалгаа + сойз хоёулаа 593). Кредит нэг л удаа тоологдох ёстой
     * тул хамгийн түрүүнд үүссэн (хамгийн бага id) мөрийг эзэмшигч гэж үзнэ.
     *
     * @param  iterable<DailySheetEntry|object>  $entries
     * @return array<string, int> баримтын дугаар => кредит эзэмших entry id
     */
    public static function creditHolderIds(iterable $entries): array
    {
        $holders = [];
        foreach ($entries as $e) {
            $receipt = trim((string) $e->appointment_number);
            if ($receipt === '') {
                continue;
            }
            if (! isset($holders[$receipt]) || (int) $e->id < $holders[$receipt]) {
                $holders[$receipt] = (int) $e->id;
            }
        }

        return $holders;
    }

    public function sourceEntry(): BelongsTo
    {
        return $this->belongsTo(DailySheetEntry::class, 'source_entry_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'used_by');
    }
}
