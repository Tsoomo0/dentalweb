<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Doctor;
use App\Models\LabOrder;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class LabOrderTestSeeder extends Seeder
{
    /**
     * Таб + хуудаслалт (10/хуудас) харуулах туршилтын лаб бүртгэлүүд.
     * Салбар бүрд 10-аас олон бичлэг үүсгэнэ.
     */
    public function run(): void
    {
        $branches = Branch::orderBy('id')->get();
        $doctors  = Doctor::orderBy('id')->get();
        $user     = User::orderBy('id')->first();

        if ($branches->isEmpty()) {
            $this->command?->warn('Салбар алга — LabOrderTestSeeder алгасав.');
            return;
        }

        $labs = ['Дента Лаб', 'Крон Лаб', 'Мон Дент Лаб', 'Смайл Техник', 'Про Дент'];
        $lastNames  = ['Батболд', 'Ганбат', 'Дорж', 'Цэрэн', 'Отгон', 'Пүрэв', 'Мөнх', 'Наран', 'Сүх', 'Эрдэнэ', 'Баяр', 'Түмэн'];
        $firstNames = ['Болормаа', 'Тэмүүлэн', 'Ануужин', 'Билгүүн', 'Хулан', 'Тэнгис', 'Оюунаа', 'Дэлгэр', 'Сарнai', 'Мэндбаяр', 'Ундрах', 'Золбоо'];
        $works = [
            'Металл керамик бүрээс', 'Циркон бүрээс', 'Бүрэн шүдэлбэр', 'Хэсэгчилсэн шүдэлбэр',
            'Онлей', 'Винир', 'Гүүр (3 нэгж)', 'Штифт бэхэлгээ', 'Түр бүрээс', 'Имплант бүтэц',
        ];
        $methods = ['cash', 'card', 'mobile', 'storepay'];

        // Салбар бүрд хэдэн бичлэг үүсгэх (2 салбар бол 14 + 12 = 26)
        $counts = [14, 12, 11, 11, 11];
        $today  = Carbon::create(2026, 7, 8);

        $created = 0;

        foreach ($branches as $bi => $branch) {
            $n = $counts[$bi] ?? 11;

            for ($i = 0; $i < $n; $i++) {
                $seq  = $bi * 100 + $i; // давхцахгүй тоо
                $orderDate = $today->copy()->subDays(($seq * 3) % 60);

                $amountDue = (10 + (($seq * 7) % 40)) * 10000;        // 100k–490k
                $discount  = [0, 0, 0, 5, 10, 15][$seq % 6];
                $effective = (int) round($amountDue * (100 - $discount) / 100);

                // Шат: 0=захиалсан ... 5=дууссан
                $stageLevel = $seq % 6;

                $sentDate    = $stageLevel >= 1 ? $orderDate->copy()->addDays(1) : null;
                $labReady    = $stageLevel >= 2 ? $orderDate->copy()->addDays(4) : null;
                $arrived     = $stageLevel >= 3 ? $orderDate->copy()->addDays(5) : null;
                $pickup      = $stageLevel >= 4 ? $orderDate->copy()->addDays(6) : null;
                $isCompleted = $stageLevel >= 5;

                // Төлбөр: зарим нь дутуу, зарим бүрэн
                $paid = match ($seq % 3) {
                    0 => $effective,                       // бүрэн
                    1 => (int) round($effective * 0.5),    // хагас дутуу
                    default => 0,                          // огт төлөөгүй
                };

                $hasFinalReceipt = $isCompleted && $paid >= $effective;

                LabOrder::create([
                    'order_date'         => $orderDate->toDateString(),
                    'sent_to_lab_date'   => $sentDate?->toDateString(),
                    'lab_name'           => $labs[$seq % count($labs)],
                    'patient_last_name'  => $lastNames[$seq % count($lastNames)],
                    'patient_first_name' => $firstNames[$seq % count($firstNames)],
                    'patient_phone'      => '99' . str_pad((string) (100000 + $seq * 137), 6, '0', STR_PAD_LEFT),
                    'branch_id'          => $branch->id,
                    'doctor_id'          => $doctors->isNotEmpty() ? $doctors[$seq % $doctors->count()]->id : null,
                    'work_description'   => $works[$seq % count($works)],
                    'amount_due'         => $amountDue,
                    'discount_percent'   => $discount,
                    'amount_paid'        => $paid,
                    'lab_ready_date'     => $labReady?->toDateString(),
                    'arrived_date'       => $arrived?->toDateString(),
                    'pickup_date'        => $pickup?->toDateString(),
                    'is_completed'       => $isCompleted,
                    'completed_at'       => $isCompleted ? $pickup?->copy()->addDay() : null,
                    'final_payment_receipt' => $hasFinalReceipt ? 'BR-' . (10240 + $seq) : null,
                    'final_payment_method'  => $hasFinalReceipt ? $methods[$seq % count($methods)] : null,
                    'final_payment_at'      => $hasFinalReceipt ? $pickup?->copy()->addDay() : null,
                    'notes'              => $seq % 4 === 0 ? 'Өнгө сонголт A2. Яаралтай.' : null,
                    'created_by'         => $user?->id,
                ]);
                $created++;
            }
        }

        $this->command?->info("LabOrderTestSeeder: {$created} лаб бүртгэл үүсгэлээ ({$branches->count()} салбар).");
    }
}
