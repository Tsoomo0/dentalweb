<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Doctor;
use App\Models\HR\Employee;
use App\Models\HR\Position;
use App\Models\LabOrder;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class LabPortalTestSeeder extends Seeder
{
    /**
     * Лаб порталыг тестлэх демо өгөгдөл:
     *  - "Шүдний техникч" албан тушаалыг lab портал болгох
     *  - Хэдэн лаб ажилтан
     *  - "Кутикул лаб" захиалгууд (олон нугалагч/өнгөлөгчтэй)
     */
    public function run(): void
    {
        // 1) Лаб портал албан тушаал
        $position = Position::firstOrCreate(['name' => 'Шүдний техникч'], ['portal' => 'lab']);
        if ($position->portal !== 'lab') {
            $position->update(['portal' => 'lab']);
        }

        $branches = Branch::orderBy('id')->get();
        $mainBranch = $branches->first();

        // 2) Лаб ажилтнууд
        $techs = [
            ['Ням', 'Ганбаатар'],
            ['Дулам', 'Оюунбилэг'],
            ['Бат', 'Тэмүүжин'],
            ['Сэр', 'Энхжаргал'],
        ];
        $labEmployees = collect($techs)->map(function ($t, $i) use ($position, $branches) {
            return Employee::firstOrCreate(
                ['employee_number' => 'LAB-'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT)],
                [
                    'last_name'   => $t[0],
                    'first_name'  => $t[1],
                    'position_id' => $position->id,
                    'branch_id'   => $branches[$i % max(1, $branches->count())]->id ?? null,
                    'status'      => 'active',
                    'hired_date'  => Carbon::create(2025, 1, 15),
                ]
            );
        });

        // 3) Кутикул лаб захиалгууд
        $doctors = Doctor::orderBy('id')->get();
        $user    = User::orderBy('id')->first();
        $works   = ['Металл керамик бүрээс', 'Циркон бүрээс', 'Бүрэн шүдэлбэр', 'Гүүр (3 нэгж)', 'Винир', 'Онлей'];
        $lastNames  = ['Батсайхан', 'Гантулга', 'Дэлгэрмаа', 'Цэвэлмаа', 'Однобаяр', 'Мөнхзул'];
        $firstNames = ['Тэмүүлэн', 'Ануужин', 'Билгүүн', 'Хулан', 'Тэнгис', 'Оюунаа'];
        $today = Carbon::create(2026, 7, 8);

        $created = 0;
        foreach ($branches as $bi => $branch) {
            for ($i = 0; $i < 6; $i++) {
                $seq = $bi * 10 + $i;
                $orderDate = $today->copy()->subDays(($seq * 2) % 30);

                $order = LabOrder::create([
                    'order_date'         => $orderDate->toDateString(),
                    'sent_to_lab_date'   => $orderDate->copy()->addDay()->toDateString(),
                    'lab_name'           => 'Кутикул лаб',
                    'patient_last_name'  => $lastNames[$seq % count($lastNames)],
                    'patient_first_name' => $firstNames[$seq % count($firstNames)],
                    'patient_phone'      => '88'.str_pad((string) (200000 + $seq * 91), 6, '0', STR_PAD_LEFT),
                    'branch_id'          => $branch->id,
                    'doctor_id'          => $doctors->isNotEmpty() ? $doctors[$seq % $doctors->count()]->id : null,
                    'work_description'   => $works[$seq % count($works)],
                    'amount_due'         => (15 + ($seq % 20)) * 10000,
                    'amount_paid'        => 0,
                    'created_by'         => $user?->id,
                ]);

                // Зарим захиалгад олон нугалагч / өнгөлөгч оноох (тест)
                if ($labEmployees->isNotEmpty()) {
                    if ($i % 3 === 1) {
                        // 2 нугалагч + 1 өнгөлөгч
                        $order->benders()->sync($labEmployees->slice(0, 2)->pluck('id')->all());
                        $order->polishers()->sync([$labEmployees->last()->id]);
                        $order->update(['lab_ready_date' => $orderDate->copy()->addDays(4)->toDateString()]);
                    } elseif ($i % 3 === 2) {
                        // 1 нугалагч + 2 өнгөлөгч
                        $order->benders()->sync([$labEmployees->first()->id]);
                        $order->polishers()->sync($labEmployees->slice(1, 2)->pluck('id')->all());
                    }
                    // i % 3 === 0 → хоосон (ажилтан оноогоогүй)
                }
                $created++;
            }
        }

        $this->command?->info("LabPortalTestSeeder: {$created} 'Кутикул лаб' захиалга, {$labEmployees->count()} лаб ажилтан бэлдлээ.");
    }
}
