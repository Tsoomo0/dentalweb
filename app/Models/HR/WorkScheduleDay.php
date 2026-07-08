<?php

namespace App\Models\HR;

use App\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkScheduleDay extends Model
{
    protected $fillable = ['branch_id', 'date', 'tasks'];

    protected $casts = [
        'date' => 'date',
        'tasks' => 'array',
    ];

    /** Рессепшний өдөр бүр хийх зүйлс. */
    public const RECEPTION_TASKS = [
        'reception_consent' => 'Картны нүүр хавсралт таниулсан зөвшөөрөл хэвлэх',
        'reception_payment' => 'Тооцоог програмд оруулах',
        'reception_remind'  => 'Маргаашийн хүмүүсийн цагийг сануулах',
    ];

    /** Сувилагчийн өдөр бүр хийх зүйлс. */
    public const NURSE_TASKS = [
        'nurse_wash_chair'      => 'Үзлэгийн кресло угаах',
        'nurse_expired_tools'   => 'Хугацаа дууссан багаж ялгах',
        'nurse_prep_tools'      => 'Үзлэгийн багаж материалыг бэлдэх',
        'nurse_write_schedule'  => 'Эмчийн цагийн хүнийг бичих',
        'nurse_card_produce'    => 'Карт загвар гаргах',
        'nurse_card_collect'    => 'Карт загвар хураах',
        'nurse_cut_napkin'      => 'Салфетка энгэрэвч хайчлах',
        'nurse_check_stock'     => 'Нөөц шалгах',
        'nurse_handpiece'       => 'Наконечник ариутган тосолж хураах',
        'nurse_water_off'       => 'Ус тогийг салгах',
        'nurse_compressor_off'  => 'Компрессор унтраах',
        'nurse_refill_supplies' => 'Туслах материалаа шалгаж дүүргэлт хийх',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
