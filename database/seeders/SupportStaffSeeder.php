<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\HR\Employee;
use App\Models\HR\Position;
use Illuminate\Database\Seeder;

class SupportStaffSeeder extends Seeder
{
    /**
     * Салбар бүрд — Рентген техникч / Ариутгалын сувилагч / Ресепшн
     * албан тушаал тус бүрт 2 ажилтан нэмнэ.
     */
    public function run(): void
    {
        // Албан тушаал баталгаажуулах (байхгүй бол үүсгэнэ)
        $positions = [
            'Рентген техникч'      => ['portal' => null,        'department' => 'Оношилгоо'],
            'Ариутгалын сувилагч'  => ['portal' => null,        'department' => 'Эмчилгээ'],
            'Ресепшн'              => ['portal' => 'reception',  'department' => 'Үйлчилгээ'],
            'Үйлчлэгч'             => ['portal' => null,         'department' => 'Үйлчилгээ'],
            'Шүдний техникч'       => ['portal' => null,         'department' => 'Лаборатори'],
        ];

        // Албан тушаал бүрийн нэрсийн сан (салбар бүрд 2, нийт 4 нэр)
        $names = [
            'Рентген техникч' => [
                ['Батболд',    'Ганзориг',    'male'],
                ['Дорж',       'Сүхбат',      'male'],
                ['Цэрэндорж',  'Отгонбаяр',   'male'],
                ['Лхагвасүрэн','Мөнхтөр',     'male'],
            ],
            'Ариутгалын сувилагч' => [
                ['Наранцэцэг', 'Одгэрэл',     'female'],
                ['Оюунчимэг',  'Сарантуяа',   'female'],
                ['Батцэцэг',   'Энхжаргал',   'female'],
                ['Дэлгэрмаа',  'Хонгорзул',   'female'],
            ],
            'Ресепшн' => [
                ['Мөнхзул',    'Ариунаа',     'female'],
                ['Солонго',    'Нандинцэцэг', 'female'],
                ['Уранчимэг',  'Болормаа',    'female'],
                ['Гэрэлмаа',   'Тэмүүлэн',    'female'],
            ],
            'Үйлчлэгч' => [
                ['Цэрэнханд',  'Долгор',      'female'],
                ['Пүрэвсүрэн', 'Мядаг',       'female'],
                ['Норжмаа',    'Цэвэлмаа',    'female'],
                ['Ханддулам',  'Оюунбилэг',   'female'],
            ],
            'Шүдний техникч' => [
                ['Ганбаатар',  'Түмэнжаргал', 'male'],
                ['Батжаргал',  'Энхболд',     'male'],
                ['Дашням',     'Мөнхбат',     'male'],
                ['Очирбат',    'Ганхуяг',     'male'],
            ],
        ];

        $branches = Branch::where('is_active', true)->orderBy('id')->get();
        $created = 0;

        foreach ($positions as $posName => $posMeta) {
            $position = Position::firstOrCreate(
                ['name' => $posName],
                ['portal' => $posMeta['portal'], 'department' => $posMeta['department'], 'is_active' => true],
            );

            foreach ($branches as $bIdx => $branch) {
                for ($slot = 0; $slot < 2; $slot++) {
                    $nameIdx = $bIdx * 2 + $slot;
                    [$last, $first, $gender] = $names[$posName][$nameIdx % count($names[$posName])];

                    // Дахин ажиллуулахад давхцахгүй байх түлхүүр
                    $regNo = sprintf('SUP-%d-%d-%d', $position->id, $branch->id, $slot);

                    $emp = Employee::firstOrCreate(
                        ['register_number' => $regNo],
                        [
                            'last_name'   => $last,
                            'first_name'  => $first,
                            'gender'      => $gender,
                            'branch_id'   => $branch->id,
                            'position_id' => $position->id,
                            'status'      => 'active',
                            'hired_date'  => '2026-01-15',
                            'phone'       => '9500'.str_pad((string) ($position->id * 100 + $branch->id * 10 + $slot), 4, '0', STR_PAD_LEFT),
                        ],
                    );

                    if ($emp->wasRecentlyCreated) {
                        $created++;
                    }
                }
            }
        }

        $this->command?->info("Туслах ажилтан нэмэгдлээ: {$created} шинэ (нийт зорилтот 12).");
    }
}
