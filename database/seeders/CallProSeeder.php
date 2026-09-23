<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\CallPro\CallExtension;
use App\Models\CallPro\CallQueue;
use Illuminate\Database\Seeder;

/**
 * CallPro салбарын тохиргоо — дотуур дугаар болон queue нэрсийг суулгана.
 *
 * Ажиллуулах:  php artisan db:seed --class=CallProSeeder
 *
 * Дахин ажиллуулахад аюулгүй (updateOrCreate). Гараар өөрчилсөн салбарын
 * харьяаллыг ДАРЖ БИЧНЭ гэдгийг анхаарна уу — жагсаалтыг эх сурвалж гэж үзнэ.
 *
 * Queue нэрийг харьцуулахдаа том/жижиг үсэг, зураас, зайг тооцдоггүй тул
 * бичилт бага зэрэг өөрчлөгдсөн ч таарна.
 */
class CallProSeeder extends Seeder
{
    /**
     * Салбар → IVR товч + дотуур дугаарууд.
     *
     * CallPro нь IVR цэсэнд дарсан ТОВЧИЙГ queue нэр болгон илгээдэг: 70003931
     * дээр 1 дарвал queue_name="1" ирнэ. Бодит дуудлагаар баталсан (2026-09-23).
     */
    private const BRANCHES = [
        // Мэдээллийн ажилтан (оператор) — 0 дарахад түүн рүү холбогдоно.
        // Ганц хүн ажилладаг тул алдсан дуудлага нь өөр хэнд ч очих ёсгүй.
        'Оффис' => [
            'queues' => ['0'],
            'extensions' => ['504'],
        ],
        'Сансар' => [
            'queues' => ['1'],
            'extensions' => ['100', '500', '506', '508', '511'],
        ],
        'Хороолол' => [
            'queues' => ['2'],
            'extensions' => ['101', '501', '509', '512', '513'],
        ],
        'Цамбагарав' => [
            'queues' => ['3'],
            'extensions' => ['102', '502', '510'],
        ],
        'Яармаг' => [
            'queues' => ['4'],
            'extensions' => ['503', '505', '514', '515'],
        ],
    ];

    public function run(): void
    {
        $missing = [];

        foreach (self::BRANCHES as $name => $config) {
            $branch = Branch::where('name', $name)->first();

            if (! $branch) {
                $missing[] = $name;

                continue;
            }

            foreach ($config['queues'] as $queue) {
                CallQueue::updateOrCreate(
                    ['name' => $queue],
                    ['branch_id' => $branch->id, 'label' => $name, 'is_active' => true],
                );
            }

            foreach ($config['extensions'] as $extension) {
                CallExtension::updateOrCreate(
                    ['extension' => $extension],
                    ['branch_id' => $branch->id, 'label' => $name, 'is_active' => true],
                );
            }

            $this->command?->info("{$name}: ".count($config['extensions']).' дугаар, queue: '.implode(', ', $config['queues']));
        }

        if ($missing !== []) {
            $this->command?->warn('Салбар олдсонгүй, алгаслаа: '.implode(', ', $missing));
            $this->command?->warn('Тэдгээр салбарыг үүсгэсний дараа энэ seeder-ийг дахин ажиллуулна уу.');
        }
    }
}
