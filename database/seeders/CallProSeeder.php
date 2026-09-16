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
 * "Khan-Uul", "khanuul", "Khan Uul" бүгд ижил утгатай.
 */
class CallProSeeder extends Seeder
{
    /**
     * Салбар → CallPro queue нэрс + дотуур дугаарууд.
     *
     * Queue нь дүүргийн нэрээр нэрлэгдсэн байдаг (CallPro console → History →
     * Queue). Алдсан дуудлага зөвхөн энэ нэрээр салбартаа хуваарилагдана.
     */
    private const BRANCHES = [
        'Сансар' => [
            'queues' => ['Bayanzurkh'],
            'extensions' => ['100', '500', '506', '508', '511'],
        ],
        'Хороолол' => [
            'queues' => ['Bayangol'],
            'extensions' => ['101', '501', '509', '512', '513'],
        ],
        'Цамбагарав' => [
            'queues' => ['Songinokhairkhan'],
            'extensions' => ['102', '502', '510'],
        ],
        'Яармаг' => [
            'queues' => ['Khan-Uul'],
            'extensions' => ['503', '505', '514', '515'],
        ],
    ];

    /**
     * Аль ч салбарт харьяалагдахгүй дугаар, queue.
     *
     * Мэдээллийн ажилтанд бүх салбарын үйлчлүүлэгч холбогддог тул нэг салбарт
     * хамааруулах боломжгүй. branch_id хоосон үлдэх бөгөөд эндээс алдсан
     * дуудлага гарвал зөвхөн АДМИН мэдэгдэл авч, зохих салбарт хуваарилна.
     */
    private const SHARED_EXTENSIONS = [
        '504' => 'Мэдээлэл авах',
    ];

    private const SHARED_QUEUES = [
        'Medeelel avah' => 'Мэдээлэл авах',
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

        foreach (self::SHARED_EXTENSIONS as $extension => $label) {
            CallExtension::updateOrCreate(
                ['extension' => $extension],
                ['branch_id' => null, 'label' => $label, 'is_active' => true],
            );

            $this->command?->info("Дугаар {$extension}: {$label} (салбаргүй — зөвхөн админд)");
        }

        foreach (self::SHARED_QUEUES as $queue => $label) {
            CallQueue::updateOrCreate(
                ['name' => $queue],
                ['branch_id' => null, 'label' => $label, 'is_active' => true],
            );

            $this->command?->info("Queue {$queue}: {$label} (салбаргүй)");
        }

        if ($missing !== []) {
            $this->command?->warn('Салбар олдсонгүй, алгаслаа: '.implode(', ', $missing));
            $this->command?->warn('Тэдгээр салбарыг үүсгэсний дараа энэ seeder-ийг дахин ажиллуулна уу.');
        }
    }
}
