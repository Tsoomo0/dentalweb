<?php

namespace App\Models\HR;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReceptionBonusEntry extends Model
{
    protected $table = 'reception_bonus_entries';

    protected $fillable = [
        'bonus_run_id', 'employee_id',
        'registrations', 'calls_received', 'call_reminders',
        'complaints', 'compliments', 'hubspot_regs', 'payments',
        'total_amount', 'is_sent', 'sent_at',
    ];

    protected $casts = [
        'is_sent' => 'boolean',
        'sent_at' => 'datetime',
    ];

    // Unit prices per criterion
    public const CRITERIA = [
        'registrations' => ['label' => 'Бүртгэл хийж үйлчлүүлэгч оруулах', 'unit' => 'удаа',         'price' => 100],
        'calls_received' => ['label' => 'Дуудлага хүлээн авах',               'unit' => 'дуудлага',     'price' => 100],
        'call_reminders' => ['label' => 'Утсаар цаг сануулах',                 'unit' => 'удаа',         'price' => 100],
        'complaints' => ['label' => 'Санал гомдол гаргасан байдал',        'unit' => 'гомдол',       'price' => -10000],
        'compliments' => ['label' => 'Талархал хүлээн авсан байдал',        'unit' => 'талархал',     'price' => 10000],
        'hubspot_regs' => ['label' => 'Hubspot-д үйлчлүүлэгч бүртгэсэн',    'unit' => 'үйлчлүүлэгч', 'price' => 100],
        'payments' => ['label' => 'Төлбөр тооцоо',                       'unit' => 'баримт',       'price' => 100],
    ];

    public function run(): BelongsTo
    {
        return $this->belongsTo(ReceptionBonusRun::class, 'bonus_run_id')->withTrashed();
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function calcTotal(): float
    {
        $total = 0;
        foreach (self::CRITERIA as $key => $c) {
            $total += ($this->{$key} ?? 0) * $c['price'];
        }

        return $total;
    }
}
