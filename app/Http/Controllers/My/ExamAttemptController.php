<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Http\Controllers\My\Concerns\ResolvesTrainingViewer;
use App\Models\Lab\LabExam;
use App\Models\Lab\LabExamAnswer;
use App\Models\Lab\LabExamAttempt;
use App\Models\Lab\LabExamQuestion;
use App\Services\Lab\ExamGrader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

/**
 * Ажилтны хэсэг — дотоод сургалтын шалгалт өгөх, үр дүнгээ харах.
 *
 * Шалгалт нь холбогдсон сургалтынхаа албан тушаалын хязгаарлалтыг өвлөнө.
 */
class ExamAttemptController extends Controller
{
    use ResolvesTrainingViewer;

    public function __construct(protected ExamGrader $grader) {}

    /** Уг шалгалт руу хандах эрхийг шалгана — эрхгүй бол 403. */
    protected function guardExam(LabExam $exam): void
    {
        abort_unless($exam->is_published, 404);

        // Шалгалт өөрөө албан тушаал сонгодоггүй — сургалтаасаа удамшина.
        // Аль алинд нь холбоогүй бол бүх ажилтанд нээлттэй.
        $course = $exam->course ?? $exam->lesson?->course;
        abort_unless($course === null ? (bool) $this->viewer() : $this->canSeeCourse($course), 403);
    }

    /**
     * Шалгалтын жагсаалт — тусдаа хуудас.
     *
     * Хугацаа нь болоогүй болон хаагдсаныг ч харуулна (төлөвөөр нь ялгаж),
     * ингэснээр ажилтан юу болж байгааг мэдэж байна. Нээлттэй нь эхэнд.
     */
    public function index(): Response
    {
        $userId = $this->userId();

        $exams = LabExam::available()
            ->forPosition($this->positionId())
            ->with(['course:id,title', 'lesson:id,title'])
            ->withCount('questions')
            ->get();

        // Оролдлогуудыг нэг удаа татаж шалгалт бүрээр бүлэглэнэ —
        // шалгалт тутамд query явуулахгүй.
        $attempts = LabExamAttempt::where('user_id', $userId)
            ->whereIn('lab_exam_id', $exams->pluck('id'))
            ->get()
            ->groupBy('lab_exam_id');

        $order = [LabExam::STATE_OPEN => 0, LabExam::STATE_UPCOMING => 1, LabExam::STATE_CLOSED => 2];

        $rows = $exams->map(function (LabExam $e) use ($attempts) {
            $mine = $attempts[$e->id] ?? collect();
            $best = $mine->sortByDesc('percent')->first();
            $last = $mine->sortByDesc('id')->first();

            return [
                'id'               => $e->id,
                'title'            => $e->title,
                'description'      => $e->description,
                'course_title'     => $e->course?->title,
                'lesson_id'        => $e->lab_lesson_id,
                'lesson_title'     => $e->lesson?->title,
                'questions_count'  => $e->questions_count,
                'duration_minutes' => $e->duration_minutes,
                'pass_percent'     => $e->pass_percent,
                'opens_at'         => $e->opens_at?->format('Y-m-d H:i'),
                'closes_at'        => $e->closes_at?->format('Y-m-d H:i'),
                'state'            => $e->state(),
                'is_open'          => $e->isOpen(),
                'best_percent'     => $best?->percent,
                'is_passed'        => (bool) $best?->is_passed,
                'status'           => $last?->status,
                'last_attempt_at'  => $last?->submitted_at?->format('Y-m-d H:i'),
                // Дуусаагүй оролдлого байвал шууд үргэлжлүүлэх холбоос өгнө
                'open_attempt_id'  => $mine->firstWhere('status', LabExamAttempt::STATUS_IN_PROGRESS)?->id,
            ];
        })
            ->sortBy(fn ($e) => [$order[$e['state']] ?? 3, $e['title']])
            ->values();

        return Inertia::render('my/training/exams', [
            'exams' => $rows,
            'stats' => [
                'total'   => $rows->count(),
                'open'    => $rows->where('state', LabExam::STATE_OPEN)->count(),
                'passed'  => $rows->where('is_passed', true)->count(),
                'pending' => $rows->where('status', LabExamAttempt::STATUS_SUBMITTED)->count(),
            ],
        ]);
    }

    /** Шалгалтын танилцуулга — дүрэм, үлдсэн оролдлого, өмнөх дүн. */
    public function show(LabExam $exam): Response
    {
        $this->guardExam($exam);

        $userId = $this->userId();
        $exam->load('course:id,title', 'lesson:id,title');

        $attempts = $exam->attempts()
            ->where('user_id', $userId)
            ->orderByDesc('id')
            ->get()
            ->map(fn (LabExamAttempt $a) => [
                'id'           => $a->id,
                'submitted_at' => $a->submitted_at?->format('Y-m-d H:i'),
                'score'        => (float) $a->score,
                'max_score'    => (float) $a->max_score,
                'percent'      => $a->percent,
                'is_passed'    => $a->is_passed,
                'status'       => $a->status,
            ]);

        $open = $exam->attempts()
            ->where('user_id', $userId)
            ->where('status', LabExamAttempt::STATUS_IN_PROGRESS)
            ->first();

        return Inertia::render('my/training/exam', [
            'exam' => [
                'id'               => $exam->id,
                'title'            => $exam->title,
                'description'      => $exam->description,
                'course_title'     => $exam->course?->title,
                'lesson_id'        => $exam->lab_lesson_id,
                'lesson_title'     => $exam->lesson?->title,
                'duration_minutes' => $exam->duration_minutes,
                'pass_percent'     => $exam->pass_percent,
                'questions_count'  => $exam->questions()->count(),
                'max_score'        => $exam->max_score,
                'opens_at'         => $exam->opens_at?->format('Y-m-d H:i'),
                'closes_at'        => $exam->closes_at?->format('Y-m-d H:i'),
                'state'            => $exam->state(),
                'is_open'          => $exam->isOpen(),
            ],
            'attempts'      => $attempts,
            'openAttemptId' => $open?->id,
        ]);
    }

    /** Шалгалт эхлүүлэх. */
    public function start(LabExam $exam): RedirectResponse
    {
        $this->guardExam($exam);

        try {
            $attempt = $this->grader->start($exam, $this->viewer());
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('my.training.exams.take', [$exam, $attempt]);
    }

    /**
     * Шалгалт өгөх дэлгэц.
     *
     * Асуулт, сонголтын дараалал нь оролдлого эхлэхэд тогтоогдсон
     * question_order-оос уншигдана — refresh дарахад дараалал өөрчлөгдөхгүй.
     * Зөв хариулт энэ payload-д ОРОХГҮЙ.
     */
    public function take(LabExam $exam, LabExamAttempt $attempt): Response|RedirectResponse
    {
        $this->authorizeAttempt($exam, $attempt);

        if ($attempt->status !== LabExamAttempt::STATUS_IN_PROGRESS) {
            return redirect()->route('my.training.exams.result', [$exam, $attempt]);
        }

        // Хугацаа нь дууссан бол шууд дүгнэж үр дүн рүү нь оруулна
        if ($attempt->isExpired()) {
            $this->grader->submit($attempt, $this->savedAnswers($attempt), autoSubmitted: true);

            return redirect()->route('my.training.exams.result', [$exam, $attempt])
                ->with('error', 'Шалгалтын хугацаа дууссан тул автоматаар илгээгдлээ.');
        }

        $order    = $attempt->question_order ?? [];
        $optOrder = $order['options'] ?? [];

        $questions = $exam->questions()->with('options')->get()->keyBy('id');
        $sorted    = collect($order['questions'] ?? $questions->keys()->all())
            ->map(fn ($id) => $questions[$id] ?? null)
            ->filter()
            ->values();

        $saved = $attempt->answers()->get()->keyBy('lab_exam_question_id');

        return Inertia::render('my/training/exam-take', [
            'exam' => [
                'id'               => $exam->id,
                'title'            => $exam->title,
                'pass_percent'     => $exam->pass_percent,
                // Тоолуурын бөгжийг дүүргэхэд нийт хугацаа хэрэгтэй
                'duration_minutes' => $exam->duration_minutes,
            ],
            'attempt' => [
                'id'           => $attempt->id,
                'seconds_left' => $attempt->secondsLeft(),
            ],
            'questions' => $sorted->map(function (LabExamQuestion $q) use ($optOrder, $saved) {
                $ids     = $optOrder[$q->id] ?? $q->options->pluck('id')->all();
                $byId    = $q->options->keyBy('id');
                $answer  = $saved[$q->id] ?? null;

                return [
                    'id'         => $q->id,
                    'type'       => $q->type,
                    'body'       => $q->body,
                    'points'     => $q->points,
                    'image_url'  => $q->image_url,
                    'options'    => collect($ids)
                        ->map(fn ($id) => $byId[$id] ?? null)
                        ->filter()
                        ->map(fn ($o) => ['id' => $o->id, 'body' => $o->body])
                        ->values(),
                    'selected'   => $answer?->selected_option_ids ?? [],
                    'text'       => $answer?->text_answer ?? '',
                ];
            })->values(),
        ]);
    }

    /**
     * Нэг асуултын хариултыг шууд хадгална (autosave).
     * Ингэснээр browser унтарсан ч өгсөн хариулт алдагдахгүй.
     */
    public function saveAnswer(Request $request, LabExamAttempt $attempt): JsonResponse
    {
        abort_unless($attempt->user_id === $this->userId(), 403);

        if ($attempt->status !== LabExamAttempt::STATUS_IN_PROGRESS || $attempt->isExpired()) {
            return response()->json(['ok' => false, 'expired' => true], 409);
        }

        $data = $request->validate([
            'question_id'  => 'required|integer',
            'option_ids'   => 'array',
            'option_ids.*' => 'integer',
            'text'         => 'nullable|string|max:5000',
        ]);

        $question = $attempt->exam->questions()->with('options')->find($data['question_id']);
        abort_if(! $question, 404);

        // Зөвхөн энэ асуултад харьяалагдах сонголтыг хүлээж авна
        $selected = array_values(array_filter(
            array_map('intval', $data['option_ids'] ?? []),
            fn (int $id) => $question->options->contains('id', $id),
        ));

        LabExamAnswer::updateOrCreate(
            [
                'lab_exam_attempt_id'  => $attempt->id,
                'lab_exam_question_id' => $question->id,
            ],
            [
                'selected_option_ids' => $selected,
                'text_answer'         => trim((string) ($data['text'] ?? '')) ?: null,
            ],
        );

        return response()->json(['ok' => true]);
    }

    /** Шалгалтыг илгээж дүгнүүлэх. */
    public function submit(Request $request, LabExam $exam, LabExamAttempt $attempt): RedirectResponse
    {
        $this->authorizeAttempt($exam, $attempt);

        $payload = $request->input('answers');
        $payload = is_array($payload) ? $payload : $this->savedAnswers($attempt);

        try {
            $this->grader->submit($attempt, $payload);
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('my.training.exams.result', [$exam, $attempt]);
    }

    /**
     * Үр дүн. Зөв хариултыг зөвхөн шалгалтын тохиргоо зөвшөөрсөн үед л
     * (after_submit / after_pass) илгээнэ.
     */
    public function result(LabExam $exam, LabExamAttempt $attempt): Response
    {
        $this->authorizeAttempt($exam, $attempt);

        $reveal    = $exam->revealsAnswersFor($attempt);
        $questions = $exam->questions()->with('options')->get();
        $answers   = $attempt->answers()->get()->keyBy('lab_exam_question_id');

        $order = collect($attempt->question_order['questions'] ?? $questions->pluck('id')->all());
        $byId  = $questions->keyBy('id');

        return Inertia::render('my/training/exam-result', [
            'exam' => [
                'id'           => $exam->id,
                'title'        => $exam->title,
                'pass_percent' => $exam->pass_percent,
                'lesson_id'    => $exam->lab_lesson_id,
            ],
            'attempt' => [
                'id'           => $attempt->id,
                'submitted_at' => $attempt->submitted_at?->format('Y-m-d H:i'),
                'score'        => (float) $attempt->score,
                'max_score'    => (float) $attempt->max_score,
                'percent'      => $attempt->percent,
                'is_passed'    => $attempt->is_passed,
                'status'       => $attempt->status,
            ],
            'reveal'    => $reveal,
            'questions' => $order
                ->map(fn ($id) => $byId[$id] ?? null)
                ->filter()
                ->map(function (LabExamQuestion $q) use ($answers, $reveal) {
                    $a = $answers[$q->id] ?? null;

                    return [
                        'id'          => $q->id,
                        'type'        => $q->type,
                        'body'        => $q->body,
                        'points'      => $q->points,
                        'awarded'     => (float) ($a?->points_awarded ?? 0),
                        'is_correct'  => $a?->is_correct,
                        'feedback'    => $a?->feedback,
                        'text'        => $a?->text_answer,
                        'selected'    => $a?->selected_option_ids ?? [],
                        'explanation' => $reveal ? $q->explanation : null,
                        'options'     => $q->options->map(fn ($o) => array_filter([
                            'id'         => $o->id,
                            'body'       => $o->body,
                            'is_correct' => $reveal ? $o->is_correct : null,
                        ], fn ($v) => $v !== null))->values(),
                    ];
                })
                ->values(),
        ]);
    }

    /** Хадгалагдсан хариултуудыг дүгнэлтийн формат руу хөрвүүлнэ. */
    protected function savedAnswers(LabExamAttempt $attempt): array
    {
        return $attempt->answers()->get()
            ->mapWithKeys(fn (LabExamAnswer $a) => [
                $a->lab_exam_question_id => [
                    'option_ids' => $a->selected_option_ids ?? [],
                    'text'       => $a->text_answer ?? '',
                ],
            ])
            ->all();
    }

    /** Оролдлого нь энэ шалгалтынх бөгөөд өөрийнх эсэхийг шалгана. */
    protected function authorizeAttempt(LabExam $exam, LabExamAttempt $attempt): void
    {
        abort_unless($attempt->lab_exam_id === $exam->id, 404);
        abort_unless($attempt->user_id === $this->userId(), 403);
        $this->guardExam($exam);
    }
}
