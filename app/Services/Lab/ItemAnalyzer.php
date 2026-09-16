<?php

namespace App\Services\Lab;

use App\Models\Lab\LabExam;
use App\Models\Lab\LabExamAnswer;
use App\Models\Lab\LabExamAttempt;
use App\Models\Lab\LabExamQuestion;
use Illuminate\Support\Collection;

/**
 * Асуултын чанарын шинжилгээ (item analysis).
 *
 * Шалгалтын үр дүн нь зөвхөн ажилтныг үнэлдэггүй — АСУУЛТЫГ ч үнэлдэг.
 * Хоёр тоо энэ ажлыг хийнэ:
 *
 *   Хүндрэл (p)      — хэдэн хувь нь зөв хариулсан бэ. Бүгд зөв бол асуулт
 *                      юу ч шалгахгүй, бүгд буруу бол хичээл дутуу эсвэл
 *                      асуулт өөрөө ойлгомжгүй.
 *   Ялгах чадвар (D) — шалгалтыг сайн өгсөн хүмүүс энэ асуултыг сайн
 *                      хариулж байна уу. Сөрөг гарвал асуулт ЭСРЭГЭЭР
 *                      ажиллаж байна: мэддэг хүн буруу, мэдэхгүй нь зөв
 *                      хариулж байна гэсэн үг — ихэвчлэн зөв хариултаа
 *                      буруу тэмдэглэсэн эсвэл хоёрдмол утгатай асуулт.
 *
 * Мөн сонголт бүрийг хэдэн хүн сонгосныг тоолно. Хэн ч сонгоогүй сонголт нь
 * "үхмэл" — байгаа ч ажиллахгүй, солих хэрэгтэй гэсэн үг.
 */
class ItemAnalyzer
{
    /** Ялгах чадвар бодоход шаардагдах хамгийн бага оролдлого. */
    public const MIN_ATTEMPTS_FOR_D = 8;

    /**
     * Хүндрэлийн дүгнэлт хийхэд шаардагдах хамгийн бага хариулт.
     *
     * Нэг хүн бүгдийг зөв хариулсан бол "бүх асуулт хэт хялбар" гэж дүгнэх нь
     * математикийн хувьд үнэн ч, практикт утгагүй. Ийм цөөн өгөгдөл дээр
     * шошго тавихаас татгалзаж, зөвхөн түүхий хувийг харуулна.
     */
    public const MIN_ANSWERS_FOR_FLAG = 3;

    /** Дээд/доод бүлгийн хувь — сурган хүмүүжүүлэх хэмжилзүйн сонгодог 27%. */
    public const GROUP_RATIO = 0.27;

    /** Хүндрэлийн ангилал. */
    public const LEVEL_EASY = 'easy';
    public const LEVEL_GOOD = 'good';
    public const LEVEL_HARD = 'hard';

    /** Асуултын төлөв — админд юу хийхийг шууд хэлнэ. */
    public const FLAG_OK        = 'ok';
    public const FLAG_TOO_EASY  = 'too_easy';    // бараг бүгд зөв — шалгах чанаргүй
    public const FLAG_TOO_HARD  = 'too_hard';    // бараг бүгд буруу — хичээл эсвэл асуулт дутуу
    public const FLAG_REVERSED  = 'reversed';    // сайн сурагч буруу хариулж байна
    public const FLAG_WEAK      = 'weak';        // ялгах чадвар сул

    /**
     * Шалгалтын бүх асуултын шинжилгээ.
     *
     * @param  Collection<int, LabExamAttempt>  $attempts  зөвхөн илгээгдсэн/үнэлэгдсэн
     * @return array{
     *     sample: int,
     *     reliable: bool,
     *     questions: list<array<string, mixed>>,
     * }
     */
    public static function forExam(LabExam $exam, Collection $attempts): array
    {
        $questions = $exam->questions()->with('options')->get();

        // Оролдлого бүрийн хариултыг асуултаар нь индекслэнэ
        $attempts = $attempts->filter(fn (LabExamAttempt $a) => in_array(
            $a->status,
            [LabExamAttempt::STATUS_SUBMITTED, LabExamAttempt::STATUS_GRADED],
            true,
        ))->values();

        $sample = $attempts->count();

        [$top, $bottom] = self::splitGroups($attempts);

        return [
            'sample'    => $sample,
            'reliable'  => $sample >= self::MIN_ATTEMPTS_FOR_D,
            'questions' => $questions
                ->map(fn (LabExamQuestion $q) => self::analyzeQuestion($q, $attempts, $top, $bottom))
                ->all(),
        ];
    }

    /**
     * Оролдлогуудыг оноогоор нь дээд ба доод бүлэгт хуваана.
     *
     * @param  Collection<int, LabExamAttempt>  $attempts
     * @return array{0: Collection<int, LabExamAttempt>, 1: Collection<int, LabExamAttempt>}
     */
    protected static function splitGroups(Collection $attempts): array
    {
        if ($attempts->count() < self::MIN_ATTEMPTS_FOR_D) {
            return [collect(), collect()];
        }

        $sorted = $attempts->sortByDesc('percent')->values();
        $size   = max(1, (int) round($sorted->count() * self::GROUP_RATIO));

        return [$sorted->take($size), $sorted->reverse()->take($size)];
    }

    /**
     * @param  Collection<int, LabExamAttempt>  $attempts
     * @param  Collection<int, LabExamAttempt>  $top
     * @param  Collection<int, LabExamAttempt>  $bottom
     * @return array<string, mixed>
     */
    protected static function analyzeQuestion(
        LabExamQuestion $q,
        Collection $attempts,
        Collection $top,
        Collection $bottom,
    ): array {
        $answers = self::answersFor($q->id, $attempts);

        $answered = $answers->count();
        $graded   = $answers->filter(fn (LabExamAnswer $a) => $a->is_correct !== null);
        $correct  = $graded->where('is_correct', true)->count();
        $pending  = $answered - $graded->count();

        $percent = $graded->isNotEmpty()
            ? (int) round($correct / $graded->count() * 100)
            : null;

        $discrimination = self::discrimination($q->id, $top, $bottom);
        $enough         = $graded->count() >= self::MIN_ANSWERS_FOR_FLAG;

        return [
            'id'             => $q->id,
            'body'           => $q->body,
            'type'           => $q->type,
            'type_label'     => LabExamQuestion::TYPES[$q->type] ?? $q->type,
            'points'         => (int) $q->points,
            'answered'       => $answered,
            'correct'        => $correct,
            'wrong'          => max(0, $graded->count() - $correct),
            'pending'        => $pending,
            'correct_percent' => $percent,
            'avg_points'     => $answered > 0
                ? round($answers->sum(fn (LabExamAnswer $a) => (float) $a->points_awarded) / $answered, 2)
                : 0.0,
            'level'          => self::level($percent),
            'discrimination' => $discrimination,
            'flag'           => $enough ? self::flag($percent, $discrimination) : self::FLAG_OK,
            'options'        => self::optionBreakdown($q, $answers, $enough),
            // Задгай хариултыг сонголтоор задлах боломжгүй — UI-д тайлбар болно
            'is_open'        => $q->type === LabExamQuestion::TYPE_TEXT,
        ];
    }

    /**
     * @param  Collection<int, LabExamAttempt>  $attempts
     * @return Collection<int, LabExamAnswer>
     */
    protected static function answersFor(int $questionId, Collection $attempts): Collection
    {
        return $attempts
            ->flatMap(fn (LabExamAttempt $a) => $a->answers)
            ->filter(fn (LabExamAnswer $ans) => $ans->lab_exam_question_id === $questionId)
            ->values();
    }

    /**
     * Ялгах чадвар: дээд бүлгийн зөв хувь хасах доод бүлгийн зөв хувь.
     *
     * @param  Collection<int, LabExamAttempt>  $top
     * @param  Collection<int, LabExamAttempt>  $bottom
     */
    protected static function discrimination(int $questionId, Collection $top, Collection $bottom): ?float
    {
        if ($top->isEmpty() || $bottom->isEmpty()) {
            return null;
        }

        $rate = function (Collection $group) use ($questionId): ?float {
            $answers = self::answersFor($questionId, $group)
                ->filter(fn (LabExamAnswer $a) => $a->is_correct !== null);

            if ($answers->isEmpty()) {
                return null;
            }

            return $answers->where('is_correct', true)->count() / $answers->count();
        };

        $high = $rate($top);
        $low  = $rate($bottom);

        if ($high === null || $low === null) {
            return null;
        }

        return round($high - $low, 2);
    }

    /** Хүндрэлийн ангилал — 80%-иас дээш хялбар, 40%-иас доош хүнд. */
    protected static function level(?int $percent): ?string
    {
        if ($percent === null) {
            return null;
        }

        return match (true) {
            $percent >= 80 => self::LEVEL_EASY,
            $percent >= 40 => self::LEVEL_GOOD,
            default        => self::LEVEL_HARD,
        };
    }

    /**
     * Асуулттай холбоотой анхаарах зүйл.
     *
     * Эрэмбэ нь чухал: эсрэгээр ажиллаж буй асуулт хамгийн ноцтой тул түүнийг
     * түрүүлж шалгана, дараа нь хэт хүнд, эцэст нь сул ялгах чадвар.
     */
    protected static function flag(?int $percent, ?float $d): string
    {
        if ($percent === null) {
            return self::FLAG_OK;
        }

        if ($d !== null && $d < 0) {
            return self::FLAG_REVERSED;
        }

        if ($percent < 25) {
            return self::FLAG_TOO_HARD;
        }

        if ($percent > 95) {
            return self::FLAG_TOO_EASY;
        }

        if ($d !== null && $d < 0.1) {
            return self::FLAG_WEAK;
        }

        return self::FLAG_OK;
    }

    /**
     * Сонголт бүрийг хэдэн хүн сонгосон бэ.
     *
     * @param  Collection<int, LabExamAnswer>  $answers
     * @param  bool  $enough  цөөн хариулт дээр "үхмэл сонголт" гэж дүгнэхгүй
     * @return list<array<string, mixed>>
     */
    protected static function optionBreakdown(LabExamQuestion $q, Collection $answers, bool $enough): array
    {
        if ($q->type === LabExamQuestion::TYPE_TEXT) {
            return [];
        }

        $picked = [];

        foreach ($answers as $answer) {
            foreach ((array) $answer->selected_option_ids as $id) {
                $picked[(int) $id] = ($picked[(int) $id] ?? 0) + 1;
            }
        }

        $total = max(1, $answers->count());

        return $q->options
            ->map(fn ($o) => [
                'id'         => $o->id,
                'body'       => $o->body,
                'is_correct' => (bool) $o->is_correct,
                'picked'     => $picked[$o->id] ?? 0,
                'percent'    => (int) round((($picked[$o->id] ?? 0) / $total) * 100),
                // Хэн ч сонгоогүй БУРУУ сонголт — сонголт болж ажиллахгүй байна
                'is_dead'    => $enough && ! $o->is_correct && ($picked[$o->id] ?? 0) === 0,
            ])
            ->values()
            ->all();
    }
}
