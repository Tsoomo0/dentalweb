<?php

namespace App\Services\Attendance;

use App\Models\HR\AttendanceDeviceUser;
use App\Models\HR\Employee;
use Illuminate\Support\Collection;

/**
 * Төхөөрөмж дээрх хэрэглэгчийн нэрээр (Bilguun, B.Bilguun, Билгүүн …) ажилтныг САНАЛ болгоно.
 *
 * Салбаруудын төхөөрөмж дээр ажилчид системийн дугаараас өөр ID-тай бүртгэгдсэн тул
 * PIN-ээр таахгүй, зөвхөн нэрээр санал гаргаж HR баталгаажуулна. Төхөөрөмж ихэвчлэн
 * кирилл бичиж чаддаггүй тул хоёр талыг латин "араг" (skeleton) болгож харьцуулна:
 * Өлзий/Ulzii/Olzii, Энхжаргал/Enkhjargal, Цэцэг/Tsetseg гэх мэт ижил болно.
 *
 * Эргэлзээтэй үед (ижил нэртэй хоёр ажилтан, нэг ажилтанд хоёр PIN) санал гаргахгүй.
 */
class DeviceUserMatcher
{
    private const CYRILLIC = [
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e', 'ё' => 'yo',
        'ж' => 'j', 'з' => 'z', 'и' => 'i', 'й' => 'i', 'к' => 'k', 'л' => 'l', 'м' => 'm',
        'н' => 'n', 'о' => 'o', 'ө' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't',
        'у' => 'u', 'ү' => 'u', 'ф' => 'f', 'х' => 'h', 'ц' => 'ts', 'ч' => 'ch', 'ш' => 'sh',
        'щ' => 'sh', 'ъ' => '', 'ы' => 'i', 'ь' => 'i', 'э' => 'e', 'ю' => 'yu', 'я' => 'ya',
        'ö' => 'o', 'ü' => 'u',
    ];

    /**
     * @param  iterable<AttendanceDeviceUser>  $deviceUsers  тааруулаагүй мөрүүд (`device` ачаалсан)
     * @param  Collection<int, Employee>  $employees
     * @param  array<int, list<int>>  $mappedByDevice  төхөөрөмж бүр дээр аль хэдийн тааруулсан ажилтнууд
     * @return array<int, int> device_user_id => employee_id
     */
    public function suggest(iterable $deviceUsers, Collection $employees, array $mappedByDevice = []): array
    {
        $people = $employees->map(fn (Employee $e) => [
            'id' => $e->id,
            'branch_id' => $e->branch_id,
            'first' => $this->skeleton((string) $e->first_name),
            'last' => $this->skeleton((string) $e->last_name),
        ])->filter(fn ($p) => mb_strlen($p['first']) >= 2)->values();

        $suggestions = [];

        foreach ($deviceUsers as $deviceUser) {
            $taken = $mappedByDevice[$deviceUser->attendance_device_id] ?? [];
            $employeeId = $this->bestMatch((string) $deviceUser->name, $deviceUser->device?->branch_id, $people, $taken);

            if ($employeeId) {
                $suggestions[$deviceUser->id] = ['employee_id' => $employeeId, 'device_id' => $deviceUser->attendance_device_id];
            }
        }

        // Нэг төхөөрөмж дээр нэг ажилтныг хоёр PIN-д санал болгосон бол аль нь зөв гэдэг нь тодорхойгүй.
        $counts = collect($suggestions)->countBy(fn ($s) => $s['device_id'].'|'.$s['employee_id']);

        return collect($suggestions)
            ->filter(fn ($s) => $counts[$s['device_id'].'|'.$s['employee_id']] === 1)
            ->map(fn ($s) => $s['employee_id'])
            ->all();
    }

    /**
     * Кирилл/латин нэрийг харьцуулах хэлбэрт оруулна.
     */
    public function skeleton(string $name): string
    {
        $s = strtr(mb_strtolower($name), self::CYRILLIC);
        $s = preg_replace('/[^a-z]/', '', $s);

        $s = strtr($s, ['kh' => 'h', 'zh' => 'j', 'ye' => 'e', 'yo' => 'o', 'yu' => 'u', 'ya' => 'a']);
        $s = strtr($s, ['y' => 'i', 'w' => 'v', 'q' => 'k']);
        $s = str_replace('ts', 'c', $s);
        // ө/ү-г латинаар o ч, u ч гэж бичдэг (Өлзий → Ulzii / Olzii)
        $s = str_replace('o', 'u', $s);

        return preg_replace('/(.)\1+/', '$1', $s);
    }

    /**
     * @param  Collection<int, array{id: int, branch_id: ?int, first: string, last: string}>  $people
     * @param  list<int>  $taken
     */
    private function bestMatch(string $deviceName, ?int $branchId, Collection $people, array $taken): ?int
    {
        $tokens = array_values(array_filter(array_map(
            fn ($t) => $this->skeleton($t),
            preg_split('/[^\p{L}]+/u', $deviceName) ?: [],
        ), fn ($t) => $t !== ''));

        if ($tokens === []) {
            return null;
        }

        $whole = implode('', $tokens);
        $scores = [];

        foreach ($people as $p) {
            if (in_array($p['id'], $taken, true)) {
                continue;
            }

            $firstMatches = in_array($p['first'], $tokens, true) || $whole === $p['first'];
            $fullMatches = $p['last'] !== '' && in_array($whole, [$p['last'].$p['first'], $p['first'].$p['last']], true);

            if (! $firstMatches && ! $fullMatches) {
                continue;
            }

            $score = 1;
            foreach ($tokens as $token) {
                if ($p['last'] !== '' && $token === $p['last']) {
                    $score += 3; // овог бүтнээрээ
                } elseif (mb_strlen($token) === 1 && $p['last'] !== '' && str_starts_with($p['last'], $token)) {
                    $score += 2; // овгийн эхний үсэг (B.Bilguun)
                }
            }
            if ($fullMatches) {
                $score += 3;
            }
            if ($whole === $p['first']) {
                $score += 2; // "Bat-Erdene" нь "Бат"-аас илүү "Бат-Эрдэнэ"-д таарна
            }
            if ($branchId && $p['branch_id'] === $branchId) {
                $score += 1;
            }

            $scores[$p['id']] = $score;
        }

        if ($scores === []) {
            return null;
        }

        arsort($scores);
        $top = array_slice($scores, 0, 2, true);
        $ids = array_keys($top);

        // Тэнцүү оноотой хоёр хүн бол таахгүй
        if (count($top) === 2 && $top[$ids[0]] === $top[$ids[1]]) {
            return null;
        }

        return $ids[0];
    }
}
