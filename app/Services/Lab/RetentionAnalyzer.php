<?php

namespace App\Services\Lab;

use App\Models\Lab\LabLesson;
use App\Models\Lab\LabLessonView;
use Illuminate\Support\Collection;

/**
 * Үзэлтийн барих чадвар (retention) — хичээлийн аль хэсэгт хэдэн ажилтан
 * хүрсэн бэ.
 *
 * Шинэ өгөгдөл цуглуулахгүй. `lab_lesson_views.watched_buckets` дотор ажилтан
 * бүрийн зураглал ('0'/'1') аль хэдийн байгаа — түүнийг босоо тэнхлэгээр нь
 * нэгтгэвэл "энд хэдэн хүн байсан" гэсэн муруй гарч ирнэ. YouTube-ийн
 * audience retention график яг ийм зарчмаар ажилладаг.
 *
 * ХОЁР ТӨРӨЛД АЖИЛЛАНА:
 *   видео  → нэг нүд = 5 секунд, тэнхлэг нь цаг ("4:30")
 *   баримт → нэг нүд = нэг хуудас, тэнхлэг нь хуудасны дугаар
 * Хоёр тохиолдолд ижил асуултад хариулна: "хүмүүс хаана орхиж байна вэ".
 *
 * ЮУГ ХЭЛЖ ЧАДАХГҮЙ: зураглал нь хоёртын тул "хэдэн удаа дахин үзсэн"-ийг
 * мэдэхгүй. Тиймээс энд зөвхөн "хэдэн ажилтан хүрсэн" гэдгийг л ярина —
 * дахин үзэлтийг хэмжихийн тулд тоолуур нэмэх шаардлагатай болно.
 */
class RetentionAnalyzer
{
    /** Графикт хамгийн ихдээ хэдэн цэг зурах вэ (нарийн видеог шахна). */
    public const MAX_POINTS = 100;

    /** Уналт гэж тооцох хамгийн бага бууралт (хувиар). */
    public const CLIFF_DROP = 8;

    /**
     * Нэг хичээлийн retention муруй.
     *
     * @param  Collection<int, LabLessonView>  $views
     * @return array{
     *     available: bool,
     *     unit: string,
     *     span: int,
     *     starters: int,
     *     bucket_seconds: int,
     *     points: list<array{t: int, viewers: int, percent: int}>,
     *     avg_percent: int,
     *     finish_percent: int,
     *     cliffs: list<array{t: int, to: int, drop: int, percent: int}>,
     *     coldest: array{t: int, percent: int}|null,
     * }
     */
    public static function forLesson(LabLesson $lesson, Collection $views): array
    {
        // Нэг нүд юуг илэрхийлэх вэ: видеонд 5 секунд, баримтад нэг хуудас.
        // Хоёулаа ижил зураглал дээр суудаг тул муруй ижилхэн ажиллана —
        // ялгаа нь зөвхөн хэвтээ тэнхлэгийн шошго.
        $document = $lesson->isDocument();
        $total    = $lesson->unitCount();

        $maps = $views
            ->map(fn (LabLessonView $v) => (string) $v->watched_buckets)
            ->filter(fn (string $m) => str_contains($m, '1'))
            ->values();

        // Урт/хуудасны тоо мэдэгдэхгүй бол муруй зурах утгагүй
        if ($total <= 0 || $maps->isEmpty()) {
            return self::empty();
        }

        $span    = $document ? $total : (int) $lesson->duration_seconds;
        $counts  = self::columnCounts($maps, $total);
        $points  = self::downsample($counts, $maps->count(), $span, $total, $document);

        return [
            'available'      => true,
            'unit'           => $document ? 'page' : 'seconds',
            'span'           => $span,
            'starters'       => $maps->count(),
            'bucket_seconds' => LabLessonView::BUCKET_SECONDS,
            'points'         => $points,
            'avg_percent'    => self::average($points),
            // Төгсгөлийн цэг — "эхэлсэн хүмүүсийн хэд нь эцэст нь хүрсэн бэ"
            'finish_percent' => $points ? (int) end($points)['percent'] : 0,
            'cliffs'         => self::cliffs($points),
            'coldest'        => self::coldest($points),
        ];
    }

    /** Өгөгдөлгүй үеийн хоосон бүтэц — фронт талд нэг л хэлбэр ирнэ. */
    public static function empty(): array
    {
        return [
            'available'      => false,
            'unit'           => 'seconds',
            'span'           => 0,
            'starters'       => 0,
            'bucket_seconds' => LabLessonView::BUCKET_SECONDS,
            'points'         => [],
            'avg_percent'    => 0,
            'finish_percent' => 0,
            'cliffs'         => [],
            'coldest'        => null,
        ];
    }

    /**
     * Нүд бүрийг хэдэн ажилтан үзсэнийг тоолно.
     *
     * Зураглалын урт ажилтан тус бүрд өөр байж болно (видеоны урт хожим
     * өөрчлөгдсөн бол), тиймээс богино зураглалыг тэгээр нөхөж уншина.
     *
     * @param  Collection<int, string>  $maps
     * @return list<int>
     */
    protected static function columnCounts(Collection $maps, int $total): array
    {
        $counts = array_fill(0, $total, 0);

        foreach ($maps as $map) {
            $len = min(strlen($map), $total);

            for ($i = 0; $i < $len; $i++) {
                if ($map[$i] === '1') {
                    $counts[$i]++;
                }
            }
        }

        return $counts;
    }

    /**
     * Нүднүүдийг графикт багтаах хэмжээнд шахна.
     *
     * Бүлэг дотор ДУНДАЖ авна, дээд утга биш — дээд утга авбал ганц ажилтны
     * богино seek бүхэл бүлгийг "бүгд үзсэн" мэт харуулж, уналтыг нуих болно.
     *
     * @param  list<int>  $counts
     * @return list<array{t: int, viewers: int, percent: int}>
     */
    protected static function downsample(
        array $counts,
        int $starters,
        int $span,
        int $total,
        bool $document = false,
    ): array {
        $groups = min(self::MAX_POINTS, $total);
        $size   = (int) ceil($total / $groups);
        $points = [];

        for ($start = 0; $start < $total; $start += $size) {
            $slice = array_slice($counts, $start, $size);

            if ($slice === []) {
                continue;
            }

            $viewers = (int) round(array_sum($slice) / count($slice));

            $points[] = [
                // Видеонд бүлгийн эхлэх агшин ("4:30"), баримтад хуудасны
                // дугаар (1-ээс эхэлнэ — ажилтны нүдээр 0 дахь хуудас гэж үгүй)
                't'       => $document
                    ? min($span, $start + 1)
                    : min($span, $start * LabLessonView::BUCKET_SECONDS),
                'viewers' => $viewers,
                'percent' => $starters > 0 ? (int) round($viewers / $starters * 100) : 0,
            ];
        }

        return $points;
    }

    /** @param  list<array{t: int, viewers: int, percent: int}>  $points */
    protected static function average(array $points): int
    {
        if ($points === []) {
            return 0;
        }

        return (int) round(array_sum(array_column($points, 'percent')) / count($points));
    }

    /**
     * Уналтын цэгүүд — хоёр хөрш цэгийн хооронд үзэгч огцом цөөрсөн газар.
     *
     * Эдгээр нь "хүмүүс яг энд орхиж байна" гэсэн дохио: удаан оршил, ойлгомжгүй
     * тайлбар, эсвэл сонирхол алдагдсан хэсэг. Хамгийн хүчтэй гурвыг буцаана.
     *
     * @param  list<array{t: int, viewers: int, percent: int}>  $points
     * @return list<array{t: int, to: int, drop: int, percent: int}>
     */
    protected static function cliffs(array $points): array
    {
        $cliffs = [];

        for ($i = 1; $i < count($points); $i++) {
            $drop = $points[$i - 1]['percent'] - $points[$i]['percent'];

            if ($drop >= self::CLIFF_DROP) {
                $cliffs[] = [
                    't'       => $points[$i - 1]['t'],
                    'to'      => $points[$i]['t'],
                    'drop'    => $drop,
                    'percent' => $points[$i]['percent'],
                ];
            }
        }

        usort($cliffs, fn ($a, $b) => $b['drop'] <=> $a['drop']);

        return array_slice($cliffs, 0, 3);
    }

    /**
     * Хамгийн цөөн хүн үзсэн агшин.
     *
     * Ихэвчлэн төгсгөл байдаг ч, дунд хэсэгт гарвал тэр хэсгийг олноороо
     * алгасаж байна гэсэн үг — салгаж богиносгох нэр дэвшигч.
     *
     * @param  list<array{t: int, viewers: int, percent: int}>  $points
     */
    protected static function coldest(array $points): ?array
    {
        if ($points === []) {
            return null;
        }

        $min = $points[0];

        foreach ($points as $p) {
            if ($p['percent'] < $min['percent']) {
                $min = $p;
            }
        }

        return ['t' => $min['t'], 'percent' => $min['percent']];
    }
}
