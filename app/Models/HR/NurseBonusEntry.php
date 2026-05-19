<?php

namespace App\Models\HR;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NurseBonusEntry extends Model
{
    protected $table = 'nurse_bonus_entries';

    protected $fillable = [
        'nurse_bonus_run_id', 'employee_id',
        'clothing', 'hand_hygiene', 'chair_sterilization', 'equipment_prep', 'material_prep',
        'visit_count',
        'card_issued', 'card_collected', 'pre_exam_prep', 'exam_chair_prep',
        'post_exam_chair_sterilize', 'tube_sterilization', 'suction_filter',
        'quartz_before', 'quartz_after', 'xray', 'model_cast', 'implant',
        'blood_pressure', 'complaint', 'absent',
        'total_amount', 'is_sent', 'sent_at',
    ];

    protected $casts = [
        'is_sent' => 'boolean',
        'sent_at' => 'datetime',
    ];

    public const CRITERIA = [
        'clothing' => ['label' => 'Хувцаслалт',                                           'unit' => 'удаа',        'price' => 100],
        'hand_hygiene' => ['label' => 'Гарын ариун цэвэр',                                    'unit' => 'удаа',        'price' => 100],
        'chair_sterilization' => ['label' => 'Крисло халдваргүйжүүлэлт',                             'unit' => 'удаа',        'price' => 100],
        'equipment_prep' => ['label' => 'Багаж бэлтгэл',                                         'unit' => 'удаа',        'price' => 100],
        'material_prep' => ['label' => 'Материал бэлтгэл',                                     'unit' => 'удаа',        'price' => 100],
        'card_issued' => ['label' => 'Карт гаргасан байдал',                                  'unit' => 'карт',        'price' => 500],
        'card_collected' => ['label' => 'Карт хураасан байдал',                                  'unit' => 'карт',        'price' => 500],
        'pre_exam_prep' => ['label' => 'Үзлэгийн өмнөх эм/материал/бусад бэлтгэл',            'unit' => 'удаа',        'price' => 500],
        'exam_chair_prep' => ['label' => 'Үзлэгийн бэлтгэл крисло халдваргүйжүүлэлт',           'unit' => 'удаа',        'price' => 500],
        'post_exam_chair_sterilize' => ['label' => 'Үзлэгийн хаалт крисло халдваргүйжүүлэлт',             'unit' => 'удаа',        'price' => 500],
        'tube_sterilization' => ['label' => 'Крислын шүгамны халдваргүйжүүлэлт',                    'unit' => 'удаа',        'price' => 500],
        'suction_filter' => ['label' => 'Шүлс сорогчийн шүүлтүүр цэвэрлэсэн',                  'unit' => 'удаа',        'price' => 500],
        'quartz_before' => ['label' => 'Кварц үзлэгийн өмнө асаах',                            'unit' => 'удаа',        'price' => 500],
        'quartz_after' => ['label' => 'Кварц үзлэгийн дараа асаах',                           'unit' => 'удаа',        'price' => 500],
        'xray' => ['label' => '1 шудний рентген зураг',                                'unit' => 'шүд',         'price' => 500],
        'model_cast' => ['label' => 'Загвар цутгасан байдал',                                'unit' => 'удаа',        'price' => 500],
        'implant' => ['label' => 'Имплант хийсэн байдал',                                'unit' => 'тохиолдол',   'price' => 10000],
        'blood_pressure' => ['label' => 'Даралт үзсэн байдал',                                   'unit' => 'удаа',        'price' => 100],
        'complaint' => ['label' => 'Санал гомдол гаргасан байдал',                         'unit' => 'гомдол',      'price' => -10000],
        'absent' => ['label' => 'Бичигдсэн хуваарьтаа ирээгүй байдал',                 'unit' => 'тохиолдол',   'price' => -10000],
    ];

    public function run(): BelongsTo
    {
        return $this->belongsTo(NurseBonusRun::class, 'nurse_bonus_run_id')->withTrashed();
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public const PRE_KEYS = ['clothing', 'hand_hygiene', 'chair_sterilization', 'equipment_prep', 'material_prep'];

    public const DEDUCT_KEYS = ['complaint', 'absent'];

    public function calcTotal(): float
    {
        // Нийлбэр оноо = visit_count × (pre-group count-уудын нийлбэр)
        $sumCounts = 0;
        foreach (self::PRE_KEYS as $key) {
            $sumCounts += ($this->{$key} ?? 0);
        }
        $niilberOnoo = ($this->visit_count ?? 0) * $sumCounts;

        // Post-group: зөвхөн count нэмнэ (үнэгүй)
        $postAdd = 0;
        foreach (self::CRITERIA as $key => $c) {
            if (! in_array($key, self::PRE_KEYS) && ! in_array($key, self::DEDUCT_KEYS)) {
                $postAdd += ($this->{$key} ?? 0);
            }
        }

        // complaint, absent: 10,000 оноо тус бүр хасна
        $deduct = 0;
        foreach (self::DEDUCT_KEYS as $key) {
            $deduct += ($this->{$key} ?? 0) * 10000;
        }

        return $niilberOnoo + $postAdd - $deduct;
    }
}
