<?php

namespace App\Services\Lab;

use App\Models\Lab\LabExam;
use App\Models\Lab\LabExamAnswer;
use App\Models\Lab\LabExamAttempt;
use App\Models\Lab\LabExamQuestion;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Шалгалт эхлүүлэх, хариулт үнэлэх логик.
 *
 * Аюулгүй байдлын гурван зарчим:
 *   1. Хугацааг СЕРВЕР талд expires_at дээр барина — browser-ийн цаг солиод
 *      хугацаа сунгах боломжгүй.
 *   2. Зөв хариулт хэзээ ч ажилтан руу илгээгдэхгүй, оноог зөвхөн сервер бодно.
 *   3. Асуулт/сонголтын холилтыг оролдлого эхлэхэд нэг удаа тогтоож
 *      question_order дээр хадгална — refresh дарахад дараалал өөрчлөгдөхгүй.
 */
class ExamGrader
{
    /** Хугацаа дууссаны дараа зөвшөөрөх нэмэлт хугацаа (сүлжээний саатал). */
    public const GRACE_SECONDS = 30;

    /**
     * Шинэ оролдлого эхлүүлнэ. Дуусаагүй оролдлого байвал түүнийг буцаана
     * (санамсаргүй refresh дарахад шинэ оролдлого зарцуулагдахгүй).
     */
    public function start(LabExam $exam, User $user): LabExamAttempt
    {
        $open = $exam->attempts()
            ->where('user_id', $user->id)
            ->where('status', LabExamAttempt::STATUS_IN_PROGRESS)
            ->latest('id')
            ->first();

        if ($open) {
            if ($open->isExpired()) {
                $this->submit($open, [], autoSubmitted: true);

                throw new RuntimeException('Өмнөх оролдлогын хугацаа дууссан тул автоматаар дүгнэгдлээ.');
            }

            return $open;
        }

        if (! $exam->isOpen()) {
            throw new RuntimeException('Энэ шалгалт одоогоор нээлттэй биш байна.');
        }

        $questions = $exam->questions()->with('options')->get();
        if ($questions->isEmpty()) {
            throw new RuntimeException('Энэ шалгалтад асуулт нэмэгдээгүй байна.');
        }

        $qIds = $exam->shuffle_questions
            ? $questions->pluck('id')->shuffle()->values()->all()
            : $questions->pluck('id')->values()->all();

        $optOrder = [];
        foreach ($questions as $q) {
            $ids = $q->options->pluck('id');
            $optOrder[$q->id] = ($exam->shuffle_options && $q->type !== LabExamQuestion::TYPE_TRUEFALSE)
                ? $ids->shuffle()->values()->all()
                : $ids->values()->all();
        }

        return DB::transaction(function () use ($exam, $user, $qIds, $optOrder) {
            // attempt_no нь зөвхөн дотоод дугаарлалт (unique индекс шаарддаг)
            $nextNo = (int) $exam->attempts()->where('user_id', $user->id)->max('attempt_no') + 1;

            return $exam->attempts()->create([
                'user_id'        => $user->id,
                'attempt_no'     => $nextNo,
                'started_at'     => now(),
                'expires_at'     => $exam->duration_minutes
                    ? now()->addMinutes($exam->duration_minutes)
                    : null,
                'max_score'      => $exam->max_score,
                'status'         => LabExamAttempt::STATUS_IN_PROGRESS,
                'question_order' => ['questions' => $qIds, 'options' => $optOrder],
            ]);
        });
    }

    /**
     * Хариултуудыг хүлээж авч дүгнэнэ.
     *
     * @param  array<int, array{option_ids?: array<int>, text?: string}>  $payload
     */
    public function submit(LabExamAttempt $attempt, array $payload, bool $autoSubmitted = false): LabExamAttempt
    {
        if ($attempt->status !== LabExamAttempt::STATUS_IN_PROGRESS) {
            throw new RuntimeException('Энэ оролдлого аль хэдийн дүгнэгдсэн байна.');
        }

        // Хугацаа хэтэрсэн бол шинэ хариултыг хүлээж авахгүй — хадгалагдсанаар нь дүгнэнэ
        $tooLate = $attempt->expires_at !== null
            && now()->greaterThan($attempt->expires_at->copy()->addSeconds(self::GRACE_SECONDS));

        if ($tooLate && ! $autoSubmitted) {
            $payload = [];
        }

        $exam      = $attempt->exam;
        $questions = $exam->questions()->with('options')->get();

        return DB::transaction(function () use ($attempt, $exam, $questions, $payload) {
            $score       = 0.0;
            $maxScore    = 0.0;
            $needsManual = false;

            foreach ($questions as $question) {
                $maxScore += $question->points;
                $given     = $payload[$question->id] ?? [];

                // Зөвхөн энэ асуултад харьяалагдах сонголтуудыг зөвшөөрнө
                $selected = array_values(array_filter(
                    array_map('intval', (array) ($given['option_ids'] ?? [])),
                    fn (int $id) => $question->options->contains('id', $id),
                ));
                $text = trim((string) ($given['text'] ?? ''));

                $result = $this->gradeQuestion($question, $selected, $text);

                if ($result['is_correct'] === null) {
                    $needsManual = true;
                }
                $score += $result['points'];

                LabExamAnswer::updateOrCreate(
                    [
                        'lab_exam_attempt_id'  => $attempt->id,
                        'lab_exam_question_id' => $question->id,
                    ],
                    [
                        'selected_option_ids' => $selected,
                        'text_answer'         => $text !== '' ? $text : null,
                        'is_correct'          => $result['is_correct'],
                        'points_awarded'      => $result['points'],
                    ],
                );
            }

            $percent = $maxScore > 0 ? (int) round($score / $maxScore * 100) : 0;

            $attempt->update([
                'submitted_at' => now(),
                'score'        => $score,
                'max_score'    => $maxScore,
                'percent'      => $percent,
                // Гараар үнэлэх асуулт байвал тэнцсэн эсэхийг одоохондоо шийдэхгүй
                'is_passed'    => ! $needsManual && $percent >= $exam->pass_percent,
                'status'       => $needsManual
                    ? LabExamAttempt::STATUS_SUBMITTED
                    : LabExamAttempt::STATUS_GRADED,
                'graded_at'    => $needsManual ? null : now(),
            ]);

            return $attempt->fresh();
        });
    }

    /**
     * Нэг асуултын үнэлгээ.
     *
     * @return array{points: float, is_correct: bool|null}
     */
    protected function gradeQuestion(LabExamQuestion $question, array $selected, string $text): array
    {
        // Задгай хариулт — админ гараар үнэлнэ
        if ($question->type === LabExamQuestion::TYPE_TEXT) {
            return ['points' => 0.0, 'is_correct' => null];
        }

        $correctIds = $question->options->where('is_correct', true)->pluck('id')->all();

        // Зөв хариулт тэмдэглээгүй асуулт — хэн нэгнийг шийтгэхгүй, админ шийднэ
        if ($correctIds === []) {
            return ['points' => 0.0, 'is_correct' => null];
        }

        // Нэг зөв хариулттай төрлүүд: яг нэгийг сонгосон бөгөөд зөв байх ёстой
        if (in_array($question->type, [LabExamQuestion::TYPE_SINGLE, LabExamQuestion::TYPE_TRUEFALSE], true)) {
            $ok = count($selected) === 1 && in_array($selected[0], $correctIds, true);

            return ['points' => $ok ? (float) $question->points : 0.0, 'is_correct' => $ok];
        }

        // Олон зөв хариулт — хэсэгчилсэн оноо:
        //   (зөв сонгосон - буруу сонгосон) / нийт зөв
        // Ингэснээр бүгдийг сонгож дүүрэн оноо авах арга ажиллахгүй.
        $hit   = count(array_intersect($selected, $correctIds));
        $miss  = count(array_diff($selected, $correctIds));
        $ratio = max(0.0, ($hit - $miss) / count($correctIds));

        return [
            'points'     => round($question->points * $ratio, 2),
            'is_correct' => $ratio >= 1.0,
        ];
    }

    /** Задгай асуултыг админ үнэлсний дараа нийт оноог дахин бодно. */
    public function recalculate(LabExamAttempt $attempt, ?User $grader = null): LabExamAttempt
    {
        $answers  = $attempt->answers()->get();
        $score    = (float) $answers->sum('points_awarded');
        $maxScore = (float) $attempt->exam->max_score;
        $percent  = $maxScore > 0 ? (int) round($score / $maxScore * 100) : 0;
        $pending  = $answers->contains(fn (LabExamAnswer $a) => $a->is_correct === null);

        $attempt->update([
            'score'     => $score,
            'max_score' => $maxScore,
            'percent'   => $percent,
            'is_passed' => ! $pending && $percent >= $attempt->exam->pass_percent,
            'status'    => $pending
                ? LabExamAttempt::STATUS_SUBMITTED
                : LabExamAttempt::STATUS_GRADED,
            'graded_by' => $grader?->id ?? $attempt->graded_by,
            'graded_at' => $pending ? null : now(),
        ]);

        return $attempt->fresh();
    }

    /**
     * Хугацаа дууссан ч илгээгээгүй оролдлогуудыг автоматаар дүгнэнэ
     * (таб хаагдсан, интернэт тасарсан гэх мэт).
     */
    public function autoSubmitExpired(): int
    {
        $count = 0;

        LabExamAttempt::where('status', LabExamAttempt::STATUS_IN_PROGRESS)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now()->subSeconds(self::GRACE_SECONDS))
            ->with('exam')
            ->chunkById(50, function ($attempts) use (&$count) {
                foreach ($attempts as $attempt) {
                    // Аль хэдийн хадгалагдсан хариултууд дээр нь үндэслэн дүгнэнэ
                    $saved = $attempt->answers()
                        ->get()
                        ->mapWithKeys(fn (LabExamAnswer $a) => [
                            $a->lab_exam_question_id => [
                                'option_ids' => $a->selected_option_ids ?? [],
                                'text'       => $a->text_answer ?? '',
                            ],
                        ])
                        ->all();

                    $this->submit($attempt, $saved, autoSubmitted: true);
                    $count++;
                }
            });

        return $count;
    }
}
