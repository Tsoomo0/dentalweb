<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lab\LabCourse;
use App\Models\Lab\LabExam;
use App\Models\Lab\LabExamAttempt;
use App\Models\Lab\LabExamQuestion;
use App\Notifications\LabExamGraded;
use App\Notifications\LabExamPublished;
use App\Services\AuditService;
use App\Services\Lab\ExamGrader;
use App\Services\Lab\ItemAnalyzer;
use App\Services\Lab\TrainingAudience;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Админ тал — шалгалт үүсгэх, үр дүн харах, задгай хариулт үнэлэх. */
class LabExamController extends Controller
{
    public function __construct(protected ExamGrader $grader) {}

    public function index(): Response
    {
        $audienceFor = LabCourseController::audienceCounter();

        $exams = LabExam::with(['course:id,title', 'course.positions:id', 'lesson:id,title', 'lesson.course.positions:id'])
            ->withCount([
                'questions',
                'attempts',
                'attempts as passed_count'  => fn ($q) => $q->where('is_passed', true),
                'attempts as pending_count' => fn ($q) => $q->where('status', LabExamAttempt::STATUS_SUBMITTED),
            ])
            ->latest('id')
            ->get()
            ->map(fn (LabExam $e) => [
                'id'                => $e->id,
                'title'             => $e->title,
                'description'       => $e->description,
                'course_id'         => $e->lab_course_id,
                'course_title'      => $e->course?->title,
                'lesson_id'         => $e->lab_lesson_id,
                'lesson_title'      => $e->lesson?->title,
                'duration_minutes'  => $e->duration_minutes,
                'pass_percent'      => $e->pass_percent,
                'shuffle_questions' => $e->shuffle_questions,
                'shuffle_options'   => $e->shuffle_options,
                'show_answers'      => $e->show_answers,
                'opens_at'          => $e->opens_at?->format('Y-m-d\TH:i'),
                'closes_at'         => $e->closes_at?->format('Y-m-d\TH:i'),
                'is_published'      => $e->is_published,
                'state'             => $e->state(),
                'is_open'           => $e->isOpen(),
                'questions_count'   => $e->questions_count,
                'attempts_count'    => $e->attempts_count,
                'passed_count'      => $e->passed_count,
                'pending_count'     => $e->pending_count,
                'max_score'         => $e->max_score,
                // Хамрах хүрээ нь холбогдсон сургалтын албан тушаалаас удамшина.
                // Сургалтгүй бие даасан шалгалт бүх ажилтанд нээлттэй.
                'audience'          => $audienceFor(
                    ($e->course ?? $e->lesson?->course)?->positions->pluck('id') ?? collect()
                ),
            ]);

        return Inertia::render('admin/lab-training/exams', [
            'exams'    => $exams,
            'audience' => LabCourseController::audienceCount(),
        ]);
    }

    /* ── Шалгалт бэлдэх хуудас ────────────────────────────── */

    public function create(): Response
    {
        return Inertia::render('admin/lab-training/exam-form', [
            'exam'          => null,
            'locked'        => false,
            'courses'       => $this->courseOptions(),
            'questionTypes' => LabExamQuestion::TYPES,
        ]);
    }

    public function edit(LabExam $labExam): Response
    {
        $labExam->load('questions.options');

        return Inertia::render('admin/lab-training/exam-form', [
            'exam' => [
                'id'                => $labExam->id,
                'title'             => $labExam->title,
                'description'       => $labExam->description,
                'course_id'         => $labExam->lab_course_id,
                'lesson_id'         => $labExam->lab_lesson_id,
                'duration_minutes'  => $labExam->duration_minutes,
                'pass_percent'      => $labExam->pass_percent,
                'shuffle_questions' => $labExam->shuffle_questions,
                'shuffle_options'   => $labExam->shuffle_options,
                'show_answers'      => $labExam->show_answers,
                'opens_at'          => $labExam->opens_at?->format('Y-m-d\TH:i'),
                'closes_at'         => $labExam->closes_at?->format('Y-m-d\TH:i'),
                'is_published'      => $labExam->is_published,
                'attempts_count'    => $labExam->attempts()->count(),
                'questions'         => $labExam->questions->map(fn ($q) => [
                    'type'        => $q->type,
                    'body'        => $q->body,
                    'points'      => $q->points,
                    'explanation' => $q->explanation ?? '',
                    'image_url'   => $q->image_url,
                    'options'     => $q->options->map(fn ($o) => [
                        'body'       => $o->body,
                        'is_correct' => (bool) $o->is_correct,
                    ])->values(),
                ])->values(),
            ],
            // Оролдлого гарсан бол асуулт цаашид түгжигдэнэ
            'locked'        => $labExam->attempts()->exists(),
            'courses'       => $this->courseOptions(),
            'questionTypes' => LabExamQuestion::TYPES,
        ]);
    }

    /** Формын сургалт/хичээлийн сонголтууд. */
    protected function courseOptions(): \Illuminate\Support\Collection
    {
        return LabCourse::with('lessons:id,lab_course_id,title')
            ->orderBy('order')
            ->get(['id', 'title'])
            ->map(fn ($c) => [
                'id'      => $c->id,
                'title'   => $c->title,
                'lessons' => $c->lessons->map(fn ($l) => ['id' => $l->id, 'title' => $l->title])->values(),
            ]);
    }

    /** Шалгалтын үндсэн талбаруудын дүрэм. */
    protected function rules(): array
    {
        return [
            'lab_course_id'     => 'nullable|exists:lab_courses,id',
            'lab_lesson_id'     => 'nullable|exists:lab_lessons,id',
            'title'             => 'required|string|max:255',
            'description'       => 'nullable|string|max:5000',
            'duration_minutes'  => 'nullable|integer|min:1|max:600',
            'pass_percent'      => 'required|integer|min:1|max:100',
            'shuffle_questions' => 'boolean',
            'shuffle_options'   => 'boolean',
            'show_answers'      => 'required|in:never,after_submit,after_pass',
            'opens_at'          => 'nullable|date',
            'closes_at'         => 'nullable|date|after:opens_at',
            'is_published'      => 'boolean',
            'questions'         => 'required|string',
        ];
    }

    /**
     * questions нь JSON мөр хэлбэрээр ирнэ (зургийн файлтай хамт multipart-аар
     * илгээхийн тулд). Энд задалж бүтцийг нь шалгана.
     */
    protected function parseQuestions(Request $request): array
    {
        $questions = json_decode((string) $request->input('questions'), true);

        if (! is_array($questions) || $questions === []) {
            throw ValidationException::withMessages(['questions' => 'Дор хаяж нэг асуулт нэмнэ үү.']);
        }

        foreach ($questions as $i => $q) {
            $type = $q['type'] ?? '';
            $no   = $i + 1;

            if (! array_key_exists($type, LabExamQuestion::TYPES)) {
                throw ValidationException::withMessages(['questions' => "{$no}-р асуултын төрөл буруу байна."]);
            }
            if (trim((string) ($q['body'] ?? '')) === '') {
                throw ValidationException::withMessages(['questions' => "{$no}-р асуултын текст хоосон байна."]);
            }

            if ($type === LabExamQuestion::TYPE_TEXT) {
                continue;
            }

            $options = array_values(array_filter(
                (array) ($q['options'] ?? []),
                fn ($o) => trim((string) ($o['body'] ?? '')) !== '',
            ));

            if (count($options) < 2) {
                throw ValidationException::withMessages(['questions' => "{$no}-р асуултад дор хаяж 2 сонголт хэрэгтэй."]);
            }

            $correct = array_filter($options, fn ($o) => ! empty($o['is_correct']));

            if ($correct === []) {
                throw ValidationException::withMessages(['questions' => "{$no}-р асуултын зөв хариултыг тэмдэглэнэ үү."]);
            }
            if ($type !== LabExamQuestion::TYPE_MULTIPLE && count($correct) > 1) {
                throw ValidationException::withMessages(['questions' => "{$no}-р асуулт зөвхөн нэг зөв хариулттай байх ёстой."]);
            }

            $questions[$i]['options'] = $options;
        }

        return $questions;
    }

    public function store(Request $request): RedirectResponse
    {
        $data      = $request->validate($this->rules());
        $questions = $this->parseQuestions($request);

        $exam = DB::transaction(function () use ($request, $data, $questions) {
            $exam = LabExam::create(array_merge(
                collect($data)->except('questions')->all(),
                [
                    'shuffle_questions' => $request->boolean('shuffle_questions'),
                    'shuffle_options'   => $request->boolean('shuffle_options'),
                    'is_published'      => $request->boolean('is_published'),
                    'created_by'        => $request->user()->id,
                ],
            ));

            $this->syncQuestions($exam, $questions, $request);

            return $exam;
        });

        AuditService::log('created', $exam, null, ['title' => $exam->title], 'Лаб шалгалт үүсгэв: '.$exam->title);

        if ($exam->is_published) {
            $this->notifyLabStaff($exam);
        }

        return redirect()
            ->route('admin.lab-training.exams.index')
            ->with('success', 'Шалгалт үүслээ.');
    }

    public function update(Request $request, LabExam $labExam): RedirectResponse
    {
        $data      = $request->validate($this->rules());
        $questions = $this->parseQuestions($request);

        // Аль хэдийн өгсөн хүн байвал асуултыг өөрчлөх нь өмнөх оноог утгагүй
        // болгоно — тиймээс зөвхөн тохиргоог засахыг зөвшөөрнө.
        if ($labExam->attempts()->exists() && $this->questionsChanged($labExam, $questions)) {
            throw ValidationException::withMessages([
                'questions' => 'Энэ шалгалтыг аль хэдийн өгсөн хүн байна. Асуултыг өөрчлөх бол шинэ шалгалт үүсгэнэ үү.',
            ]);
        }

        $was = $labExam->is_published;
        $old = $labExam->only(['title', 'pass_percent', 'is_published']);

        DB::transaction(function () use ($request, $labExam, $data, $questions) {
            $labExam->update(array_merge(
                collect($data)->except('questions')->all(),
                [
                    'shuffle_questions' => $request->boolean('shuffle_questions'),
                    'shuffle_options'   => $request->boolean('shuffle_options'),
                    'is_published'      => $request->boolean('is_published'),
                ],
            ));

            if (! $labExam->attempts()->exists()) {
                $this->syncQuestions($labExam, $questions, $request);
            }
        });

        AuditService::log('updated', $labExam, $old, $labExam->only(['title', 'pass_percent', 'is_published']), 'Лаб шалгалт зассан: '.$labExam->title);

        if (! $was && $labExam->fresh()->is_published) {
            $this->notifyLabStaff($labExam);
        }

        return redirect()
            ->route('admin.lab-training.exams.index')
            ->with('success', 'Шалгалт шинэчлэгдлээ.');
    }

    public function destroy(LabExam $labExam): RedirectResponse
    {
        $title = $labExam->title;

        foreach ($labExam->questions as $q) {
            if ($q->image_path) {
                Storage::disk('public')->delete($q->image_path);
            }
        }

        $labExam->delete();

        AuditService::log('deleted', null, ['title' => $title], null, 'Лаб шалгалт устгав: '.$title);

        return back()->with('success', 'Шалгалт устлаа.');
    }

    /** Асуулт/сонголт өөрчлөгдсөн эсэхийг харьцуулна. */
    protected function questionsChanged(LabExam $exam, array $incoming): bool
    {
        $current = $exam->questions()->with('options')->get()
            ->map(fn ($q) => [
                'type'    => $q->type,
                'body'    => trim($q->body),
                'points'  => (int) $q->points,
                'options' => $q->options->map(fn ($o) => [
                    'body'       => trim($o->body),
                    'is_correct' => (bool) $o->is_correct,
                ])->values()->all(),
            ])->values()->all();

        $next = collect($incoming)->map(fn ($q) => [
            'type'    => $q['type'],
            'body'    => trim((string) $q['body']),
            'points'  => (int) ($q['points'] ?? 1),
            'options' => collect($q['options'] ?? [])->map(fn ($o) => [
                'body'       => trim((string) $o['body']),
                'is_correct' => (bool) ($o['is_correct'] ?? false),
            ])->values()->all(),
        ])->values()->all();

        return $current !== $next;
    }

    /** Асуулт болон сонголтуудыг бүрэн шинэчилнэ (хуучныг устгаад шинээр бичнэ). */
    protected function syncQuestions(LabExam $exam, array $questions, Request $request): void
    {
        foreach ($exam->questions as $old) {
            if ($old->image_path) {
                Storage::disk('public')->delete($old->image_path);
            }
        }
        $exam->questions()->delete();

        $images = (array) $request->file('question_images', []);

        foreach ($questions as $i => $q) {
            $image = $images[$i] ?? null;

            $question = $exam->questions()->create([
                'type'        => $q['type'],
                'body'        => trim((string) $q['body']),
                'points'      => max(1, (int) ($q['points'] ?? 1)),
                'order'       => $i + 1,
                'explanation' => trim((string) ($q['explanation'] ?? '')) ?: null,
                'image_path'  => $image ? $image->store('lab-training/questions', 'public') : null,
            ]);

            if ($q['type'] === LabExamQuestion::TYPE_TEXT) {
                continue;
            }

            foreach ($q['options'] as $j => $o) {
                $question->options()->create([
                    'body'       => trim((string) $o['body']),
                    'is_correct' => (bool) ($o['is_correct'] ?? false),
                    'order'      => $j + 1,
                ]);
            }
        }
    }

    /**
     * Шалгалт нээгдэхэд хамрах хүрээний ажилтнуудад мэдэгдэнэ.
     *
     * Зөвхөн уг шалгалтыг үзэх эрхтэй албан тушаалтнууд мэдэгдэл авна — эс
     * тэгвээс харах эрхгүй хүн дарахад 403 руу орно.
     */
    protected function notifyLabStaff(LabExam $exam): void
    {
        $staff = TrainingAudience::forExam($exam)->get();

        if ($staff->isNotEmpty()) {
            Notification::send($staff, new LabExamPublished($exam));
        }
    }

    /** Нэг шалгалтын бүх оролдлого, үр дүн. */
    public function results(LabExam $labExam): Response
    {
        $labExam->load(['course:id,title', 'lesson:id,title']);

        $questions = $labExam->questions()->with('options')->get()
            ->map(fn ($q) => [
                'id'          => $q->id,
                'type'        => $q->type,
                'type_label'  => LabExamQuestion::TYPES[$q->type] ?? $q->type,
                'body'        => $q->body,
                'points'      => $q->points,
                'explanation' => $q->explanation,
                'image_url'   => $q->image_url,
                'options'     => $q->options->map(fn ($o) => [
                    'id'         => $o->id,
                    'body'       => $o->body,
                    'is_correct' => $o->is_correct,   // админд зөв хариулт харагдана
                ])->values(),
            ]);

        $records = $labExam->attempts()
            ->with(['user:id,name', 'answers'])
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->get();

        $attempts = $records
            ->map(fn (LabExamAttempt $a) => [
                'id'           => $a->id,
                'user_name'    => $a->user?->name ?? '—',
                'started_at'   => $a->started_at?->format('Y-m-d H:i'),
                'submitted_at' => $a->submitted_at?->format('Y-m-d H:i'),
                'score'        => (float) $a->score,
                'max_score'    => (float) $a->max_score,
                'percent'      => $a->percent,
                'is_passed'    => $a->is_passed,
                'status'       => $a->status,
                'answers'      => $a->answers->map(fn ($ans) => [
                    'id'          => $ans->id,
                    'question_id' => $ans->lab_exam_question_id,
                    'selected'    => $ans->selected_option_ids ?? [],
                    'text'        => $ans->text_answer,
                    'is_correct'  => $ans->is_correct,
                    'points'      => (float) $ans->points_awarded,
                    'feedback'    => $ans->feedback,
                ])->values(),
            ]);

        return Inertia::render('admin/lab-training/exam-results', [
            'exam' => [
                'id'           => $labExam->id,
                'title'        => $labExam->title,
                'course_title' => $labExam->course?->title,
                'lesson_title' => $labExam->lesson?->title,
                'pass_percent' => $labExam->pass_percent,
                'max_score'    => $labExam->max_score,
            ],
            'questions' => $questions,
            'attempts'  => $attempts,

            // Асуулт бүрийн чанарын шинжилгээ — хүндрэл, ялгах чадвар,
            // сонголт бүрийг хэдэн хүн сонгосон. Шинэ өгөгдөл цуглуулаагүй,
            // өгсөн хариултуудаас бодогдоно.
            'analysis'  => ItemAnalyzer::forExam($labExam, $records),
        ]);
    }

    /** Задгай хариултыг гараар үнэлэх. */
    public function gradeAnswer(Request $request, \App\Models\Lab\LabExamAnswer $answer): RedirectResponse
    {
        $max = (int) $answer->question->points;

        $data = $request->validate([
            'points'   => 'required|numeric|min:0|max:'.$max,
            'feedback' => 'nullable|string|max:2000',
        ]);

        $answer->update([
            'points_awarded' => $data['points'],
            'is_correct'     => (float) $data['points'] >= $max,
            'feedback'       => $data['feedback'] ?? null,
        ]);

        $attempt = $this->grader->recalculate($answer->attempt, $request->user());

        // Бүх асуулт үнэлэгдэж дуусмагц ажилтанд мэдэгдэнэ
        if ($attempt->status === LabExamAttempt::STATUS_GRADED && $attempt->user) {
            $attempt->user->notify(new LabExamGraded($attempt));
        }

        return back()->with('success', 'Үнэлгээ хадгалагдлаа.');
    }
}
