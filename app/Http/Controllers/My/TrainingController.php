<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Http\Controllers\My\Concerns\ResolvesTrainingViewer;
use App\Models\Lab\LabCategory;
use App\Models\Lab\LabCourse;
use App\Models\Lab\LabExam;
use App\Models\Lab\LabExamAttempt;
use App\Models\Lab\LabLesson;
use App\Models\Lab\LabLessonComment;
use App\Models\Lab\LabLessonNote;
use App\Models\Lab\LabLessonView;
use App\Models\Lab\LabReaction;
use App\Services\Lab\DocumentService;
use App\Services\Lab\VideoUploadService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Ажилтны хэсэг — дотоод сургалтын видео хичээл үзэх, сэтгэгдэл бичих,
 * reaction дарах.
 *
 * Сургалт бүр албан тушаалын жагсаалттай: админ тэнд сонгосон албан тушаалтай
 * ажилтан л уг сургалтыг харна. Албан тушаал сонгоогүй сургалт бүгдэд
 * нээлттэй. Шүүлт нь ЗӨВХӨН жагсаалт дээр биш, хичээл/видео нээх бүх цэг дээр
 * давтагдана — эс тэгвээс шууд линкээр тойрч орно.
 */
class TrainingController extends Controller
{
    use ResolvesTrainingViewer;

    /** Уг хичээл рүү хандах эрхийг шалгана — эрхгүй бол 403. */
    protected function guardLesson(?LabLesson $lesson): void
    {
        abort_unless($lesson?->is_published, 404);
        abort_unless($this->canSeeCourse($lesson->course), 403);
    }

    /** Видео сургалтууд, өөрийн явцын хамт. */
    public function index(): Response
    {
        return $this->catalogue(LabCourse::KIND_VIDEO, 'my/training/index');
    }

    /** Файл (баримт) сургалтууд. */
    public function documents(): Response
    {
        return $this->catalogue(LabCourse::KIND_DOCUMENT, 'my/training/documents');
    }

    /**
     * Нэг төрлийн сургалтын каталог.
     *
     * Видео ба файл сургалт тусдаа хуудастай ч ажилтны хувьд яг ижил зүйлийг
     * хардаг: юу үзэх ёстой, хаана нь хүрсэн, юу нь хоцорсон. Тиймээс өгөгдөл
     * нь нэг, зөвхөн шүүлт ба дүрслэл нь өөр.
     */
    protected function catalogue(string $kind, string $component): Response
    {
        $userId     = $this->userId();
        $positionId = $this->positionId();

        $courses = LabCourse::where('is_published', true)
            ->ofKind($kind)
            ->forPosition($positionId)
            ->with([
                'category:id,name,color,icon,order',
                'sections',
                'lessons' => fn ($q) => $q->where('is_published', true),
            ])
            ->orderBy('order')
            ->orderBy('id')
            ->get();

        $progress = LabLessonView::where('user_id', $userId)
            ->pluck('progress_percent', 'lab_lesson_id');

        $completed = LabLessonView::where('user_id', $userId)
            ->whereNotNull('completed_at')
            ->pluck('lab_lesson_id')
            ->flip();

        $data = $courses->map(function (LabCourse $c) use ($progress, $completed) {
            $lessons = $c->lessons->map(fn (LabLesson $l) => [
                'id'             => $l->id,
                'section_id'     => $l->lab_section_id,
                'title'          => $l->title,
                'description'    => $l->description,
                'poster_url'     => $l->poster_url,
                'duration_label' => $l->duration_label,
                'page_count'     => (int) $l->page_count,
                'file_size'      => (int) $l->file_size,
                'doc_source_name' => $l->doc_source_name,
                'progress'       => (int) ($progress[$l->id] ?? 0),
                'is_completed'   => $completed->has($l->id),
                'is_required'    => $l->is_required,
                'due_at'         => $l->due_at?->format('Y-m-d'),
                // Заавал үзэх ёстой атлаа хугацаа нь дууссан, дуусгаагүй
                'is_overdue'     => $l->isOverdue() && ! $completed->has($l->id),
            ])->values();

            // Хичээлүүдийг бүлгээр нь бүлэглэнэ. Бүлэггүй нь эхэнд "нэргүй"
            // бүлэг болж харагдана — ингэснээр бүтэц үргэлж жигд байна.
            $byId  = $c->sections->keyBy('id');
            $groups = $lessons
                ->groupBy(fn ($l) => $l['section_id'] ?? 0)
                ->map(fn ($items, $sectionId) => [
                    'id'      => (int) $sectionId,
                    'title'   => $byId[$sectionId]->title ?? null,
                    'order'   => $byId[$sectionId]->order ?? -1,
                    'lessons' => $items->values(),
                ])
                ->sortBy('order')
                ->values();

            return [
                'id'             => $c->id,
                'title'          => $c->title,
                'description'    => $c->description,
                'cover_url'      => $c->cover_url,
                // Нүүр зураггүй сургалтад эхний хичээлийнхийг ашиглана —
                // каталог дээр хоосон дөрвөлжин үлдэхгүй
                'poster_url'     => $c->cover_url ?: $c->lessons->firstWhere('poster_url', '!=', null)?->poster_url,
                'category_id'    => $c->lab_category_id,
                'duration_min'   => (int) round($c->lessons->sum('duration_seconds') / 60),
                'page_total'     => (int) $c->lessons->sum('page_count'),
                'required'       => $lessons->where('is_required', true)->where('is_completed', false)->count(),
                'overdue'        => $lessons->where('is_overdue', true)->count(),
                'lessons'        => $lessons,
                'sections'       => $groups,
                'done'           => $lessons->where('is_completed', true)->count(),
                'total'          => $lessons->count(),
            ];
        });

        // Шалгалт нь тусдаа хуудастай — энд зөвхөн товч тоо (баннерт).
        $allExams = LabExam::available()->forPosition($positionId)->get();

        $passedExamIds = LabExamAttempt::where('user_id', $userId)
            ->where('is_passed', true)
            ->whereIn('lab_exam_id', $allExams->pluck('id'))
            ->pluck('lab_exam_id')
            ->unique();

        $examStats = [
            'total' => $allExams->count(),
            'open'  => $allExams->filter(fn (LabExam $e) => $e->isOpen())->count(),
            'todo'  => $allExams
                ->filter(fn (LabExam $e) => $e->isOpen() && ! $passedExamIds->contains($e->id))
                ->count(),
        ];

        // "Үргэлжлүүлэх" — сүүлд үзсэн, дуусгаагүй хичээл
        // Албан тушаал нь өөрчлөгдсөн ажилтанд хуучин сургалт "үргэлжлүүлэх"
        // болж гарч ирэх ёсгүй — иймд энд ч мөн шүүнэ.
        // Энэ хуудсанд нөгөө төрлийн хичээл "үргэлжлүүлэх" болж гарч ирвэл
        // дарахад огт өөр дүрслэл рүү үсэрнэ — иймд төрлөөр нь ч шүүнэ.
        $resume = LabLessonView::where('user_id', $userId)
            ->whereNull('completed_at')
            ->where('progress_percent', '>', 0)
            ->whereHas('lesson', fn ($q) => $q
                ->where('is_published', true)
                ->where('kind', $kind)
                ->forPosition($positionId))
            ->with('lesson.course:id,title')
            ->latest('last_viewed_at')
            ->first();

        // Ангилалаар бүлэглэнэ. Ангилалгүй сургалтууд төгсгөлд "Бусад" болж
        // орно — админ ангилал тавиагүй ч каталог эмх цэгцтэй хэвээр байна.
        $categories = LabCategory::where('is_active', true)
            ->orderBy('order')->orderBy('id')
            ->get()
            ->map(fn (LabCategory $cat) => [
                'id'      => $cat->id,
                'name'    => $cat->name,
                'description' => $cat->description,
                'color'   => $cat->color,
                'icon'    => $cat->icon,
                'courses' => $data->where('category_id', $cat->id)->values(),
            ])
            ->filter(fn ($c) => count($c['courses']) > 0)
            ->values();

        $uncategorised = $data->filter(fn ($c) => $c['category_id'] === null)->values();

        if ($uncategorised->isNotEmpty()) {
            $categories->push([
                'id'      => 0,
                'name'    => 'Бусад',
                'description' => null,
                'color'   => 'slate',
                'icon'    => 'folder',
                'courses' => $uncategorised,
            ]);
        }

        return Inertia::render($component, [
            'kind'       => $kind,
            'categories' => $categories,
            'courses' => $data,
            'examStats' => $examStats,
            'resume'  => $resume ? [
                'lesson_id'    => $resume->lab_lesson_id,
                'title'        => $resume->lesson->title,
                'course_title' => $resume->lesson->course?->title,
                'poster_url'   => $resume->lesson->poster_url,
                'progress'     => $resume->progress_percent,
                'left_label'   => $this->remainingLabel($resume),
            ] : null,
            'stats'   => [
                'total'     => $data->sum('total'),
                'done'      => $data->sum('done'),
                'required'  => $data->sum(fn ($c) => collect($c['lessons'])->where('is_required', true)->count()),
                'overdue'   => $data->sum(fn ($c) => collect($c['lessons'])->where('is_overdue', true)->count()),
                // Зөвхөн энэ хуудасны төрлийн хичээлээр — файлын хуудсан дээр
                // видео үзсэн минут гарч ирвэл ойлгомжгүй
                'watch_min' => (int) round(
                    LabLessonView::where('user_id', $userId)
                        ->whereHas('lesson', fn ($q) => $q->where('kind', $kind))
                        ->sum('watched_seconds') / 60
                ),
            ],
        ]);
    }

    /** Хичээлийн тоглуулагч, сэтгэгдэл, reaction. */
    public function show(LabLesson $lesson): Response
    {
        $lesson->load('course');
        $this->guardLesson($lesson);

        $userId = $this->userId();

        $siblings = $lesson->course->lessons()
            ->where('is_published', true)
            ->get(['id', 'title', 'order', 'duration_seconds', 'is_required', 'lab_section_id']);

        $index = $siblings->search(fn ($l) => $l->id === $lesson->id);

        // Хажуугийн жагсаалтад өөрийн явцыг харуулна
        $progress = LabLessonView::where('user_id', $userId)
            ->whereIn('lab_lesson_id', $siblings->pluck('id'))
            ->pluck('progress_percent', 'lab_lesson_id');

        $completed = LabLessonView::where('user_id', $userId)
            ->whereIn('lab_lesson_id', $siblings->pluck('id'))
            ->whereNotNull('completed_at')
            ->pluck('lab_lesson_id')
            ->flip();

        $view = LabLessonView::firstOrNew([
            'lab_lesson_id' => $lesson->id,
            'user_id'       => $userId,
        ]);

        return Inertia::render('my/training/lesson', [
            'lesson' => [
                'id'               => $lesson->id,
                'title'            => $lesson->title,
                'description'      => $lesson->description,
                'duration_seconds' => $lesson->duration_seconds,
                'duration_label'   => $lesson->duration_label,
                'poster_url'       => $lesson->poster_url,
                'kind'             => $lesson->kind,
                'playback'         => $lesson->isDocument() ? null : $lesson->playbackSource(),
                // Баримт хичээлийн уншигчид хэрэгтэй бүх зүйл нэг дор
                'document'         => $lesson->isDocument() ? [
                    'status'      => $lesson->doc_status,
                    'error'       => $lesson->doc_error,
                    'page_count'  => (int) $lesson->page_count,
                    'url'         => $lesson->isDocumentReady()
                        ? route('my.training.document', $lesson)
                        : null,
                    // Эх файл нь PDF биш байсан бол түүнийг ч татаж болно
                    'source_name' => $lesson->doc_source_name,
                    'source_url'  => $lesson->doc_source_path && $lesson->doc_source_path !== $lesson->doc_path
                        ? route('my.training.document.source', $lesson)
                        : null,
                ] : null,
                'attachments'      => collect($lesson->attachments ?? [])->map(fn ($f) => [
                    'name' => $f['name'] ?? 'файл',
                    'url'  => Storage::url($f['path'] ?? ''),
                    'size' => $f['size'] ?? 0,
                ])->values(),
                'is_required'      => $lesson->is_required,
                'due_at'           => $lesson->due_at?->format('Y-m-d H:i'),
                'is_overdue'       => $lesson->isOverdue(),
            ],
            'course' => [
                'id'      => $lesson->course->id,
                'title'   => $lesson->course->title,
                'lessons' => $siblings->map(fn ($l) => [
                    'id'          => $l->id,
                    'section_id'  => $l->lab_section_id,
                    'title'       => $l->title,
                    'duration'    => $l->duration_label,
                    'is_required' => $l->is_required,
                    'progress'    => (int) ($progress[$l->id] ?? 0),
                    'completed'   => $completed->has($l->id),
                ])->values(),
                // Хажуугийн хөтөлбөрийг бүлгээр нь харуулахад ашиглана
                'sections' => $lesson->course->sections->map(fn ($s) => [
                    'id'    => $s->id,
                    'title' => $s->title,
                    'order' => $s->order,
                ])->values(),
            ],
            'prev'     => $index > 0 ? $siblings[$index - 1]->only('id', 'title') : null,
            'next'     => $index !== false && $index < $siblings->count() - 1
                ? $siblings[$index + 1]->only('id', 'title')
                : null,
            'progress' => [
                'last_position' => $view->last_position ?? 0,
                'percent'       => $view->progress_percent ?? 0,
                'completed'     => $view->completed_at !== null,
                // Баримт хичээлд: аль хуудсыг аль хэдийн уншсан бэ. Ингэснээр
                // ажилтан завсарлаад буцаж ирэхэд явц нь тэглэгдэхгүй.
                'seen_pages'    => $lesson->isDocument()
                    ? $this->seenPages($view->watched_buckets)
                    : [],
            ],
            'notes'          => $lesson->notes()
                ->where('user_id', $userId)
                ->orderBy('position_seconds')
                ->get()
                ->map(fn (LabLessonNote $n) => [
                    'id'       => $n->id,
                    'position' => $n->position_seconds,
                    'stamp'    => $n->stamp,
                    'body'     => $n->body,
                ])
                ->values(),
            'comments'       => $this->commentTree($lesson, $userId),
            'reactionTypes'  => LabReaction::TYPES,
            'reactions'      => $this->reactionSummary($lesson, $userId),
            'exams'          => $lesson->exams()->available()->forPosition($this->positionId())->get()
                ->map(fn (LabExam $e) => [
                    'id'      => $e->id,
                    'title'   => $e->title,
                    'state'   => $e->state(),
                    'is_open' => $e->isOpen(),
                ])
                ->values(),
        ]);
    }

    /**
     * Видеог дамжуулах.
     *
     * Файл нь private диск дээр байдаг тул зөвхөн энэ route-аар, нэвтэрсэн лаб
     * ажилтанд л хүрнэ. BinaryFileResponse нь Range header-ийг өөрөө
     * боловсруулдаг тул түрүүлж/ухраах (seek) хэвийн ажиллана.
     *
     * nginx дээр байршуулах үед X-Accel-Redirect ашиглавал PHP процесс
     * дамжуулалтын турш эзлэгдэхгүй — том файл дээр мэдэгдэхүйц хөнгөвчилнө.
     */
    public function stream(LabLesson $lesson, VideoUploadService $videos)
    {
        $this->guardLesson($lesson);
        abort_unless($lesson->video_path, 404);

        return $videos->streamResponse($lesson->video_path);
    }

    /**
     * Үзэлтийн явцыг бүртгэх (тоглуулагчаас 15 секунд тутам ирнэ).
     *
     * Явцыг "хэдэн секунд сууснаар" биш, "видеоны аль хэсгийг үзсэнээр"
     * хэмжинэ. Тоглуулагч 5 секундын нүдний дугаарыг илгээж, сервер тэдгээрийг
     * зураглал дээр тэмдэглэнэ. Ингэснээр:
     *   - бутархай секунд таслагдаж алдагдахгүй тул бүтэн үзвэл яг 100% болно
     *   - нэг хэсгийг дахин үзэхэд давхар тоологдохгүй
     *   - төгсгөл рүү чирэхэд зөвхөн тэр нүд тэмдэглэгдэнэ
     *
     * Хуурамч утга илгээхээс сэргийлж нэг ping-д хүлээж авах шинэ нүдний тоог
     * сүүлийн ping-ээс хойш бодитоор өнгөрсөн хугацаагаар хязгаарлана.
     */
    public function progress(Request $request, LabLesson $lesson)
    {
        $this->guardLesson($lesson);

        $data = $request->validate([
            'position'  => 'required|integer|min:0|max:86400',
            'delta'     => 'required|integer|min:0|max:3600',
            'buckets'   => 'sometimes|array|max:3000',
            'buckets.*' => 'integer|min:0|max:100000',
            'duration'  => 'nullable|integer|min:0|max:86400',
            'opened'    => 'boolean',
        ]);

        // YouTube хичээлийн уртыг админ оруулдаггүй — тоглуулагч мэдэхэд нь
        // нэг удаа бүртгэж авна. Үүнгүйгээр хувь бодох боломжгүй.
        if ($lesson->duration_seconds <= 0 && (int) ($data['duration'] ?? 0) > 0) {
            $lesson->forceFill(['duration_seconds' => (int) $data['duration']])->save();
        }

        $view = LabLessonView::firstOrNew([
            'lab_lesson_id' => $lesson->id,
            'user_id'       => $this->userId(),
        ]);

        $now     = now();
        $elapsed = $view->last_viewed_at
            ? (int) abs($view->last_viewed_at->diffInSeconds($now))
            : (int) $data['delta'];

        $view->views_count     = ($view->views_count ?? 0) + ($request->boolean('opened') ? 1 : 0);
        $view->last_position   = (int) $data['position'];
        $view->first_viewed_at ??= $now;

        // Бодит суусан хугацаа — тайланд "хэр их цаг зарцуулсан"-ыг харуулна
        $view->watched_seconds = ($view->watched_seconds ?? 0)
            + max(0, min((int) $data['delta'], $elapsed + 5));

        $duration = (int) $lesson->duration_seconds;

        if ($duration > 0) {
            $total = LabLessonView::bucketCount($duration);

            // 2 дахин хурдтай үзэхийг зөвшөөрч, түүнээс илүүг таслана
            $maxNew  = (int) ceil((($elapsed + 5) * 2) / LabLessonView::BUCKET_SECONDS) + 2;
            $buckets = array_slice(array_unique($data['buckets'] ?? []), 0, $maxNew);

            $view->watched_buckets  = LabLessonView::mergeBuckets($view->watched_buckets, $buckets, $total);
            $view->progress_percent = min(100, (int) round(
                LabLessonView::seenCount($view->watched_buckets) / $total * 100,
            ));

            if ($view->progress_percent >= LabLessonView::COMPLETE_AT && ! $view->completed_at) {
                $view->completed_at = $now;
            }
        }

        $view->last_viewed_at = $now;
        $view->save();

        return response()->json([
            'percent'   => $view->progress_percent,
            'completed' => $view->completed_at !== null,
        ]);
    }

    /**
     * Баримт хичээлийн PDF-ийг дамжуулах.
     *
     * Видеотой яг адил: файл нь private диск дээр, зөвхөн энэ route-аар,
     * зөвхөн эрхтэй ажилтанд хүрнэ. Шууд URL-аар татах боломжгүй.
     */
    public function document(LabLesson $lesson, DocumentService $docs)
    {
        $this->guardLesson($lesson);
        abort_unless($lesson->isDocumentReady(), 404);

        return $docs->streamResponse($lesson->doc_path);
    }

    /** Анхны файлыг (PPT/DOCX) татаж авах. */
    public function documentSource(LabLesson $lesson, DocumentService $docs)
    {
        $this->guardLesson($lesson);
        abort_unless($lesson->isDocument() && $lesson->doc_source_path, 404);

        return $docs->streamResponse(
            $lesson->doc_source_path,
            download: true,
            name: $lesson->doc_source_name ?: 'document',
        );
    }

    /**
     * Уншсан хуудсуудыг бүртгэх.
     *
     * Видеоны 5 секундын нүдтэй ЯГ ижил зураглал ашиглана — зөвхөн нэг нүд
     * нь нэг хуудас. Тиймээс тайлан, retention муруй, хувийн хэрэг, сануулга
     * бүгд ямар ч өөрчлөлтгүйгээр баримт хичээл дээр ажиллана.
     *
     * Хуудсыг ЗӨВХӨН дэлгэц дээр бодитоор харагдсан үед л уншигч илгээнэ
     * (IntersectionObserver). Тиймээс төгсгөл рүү шууд гүйлгэвэл дундах
     * хуудсууд тоологдохгүй.
     */
    public function pages(Request $request, LabLesson $lesson)
    {
        $this->guardLesson($lesson);
        abort_unless($lesson->isDocumentReady(), 404);

        $data = $request->validate([
            'pages'   => 'required|array|max:2000',
            'pages.*' => 'integer|min:0|max:5000',
            'opened'  => 'boolean',
            'last'    => 'nullable|integer|min:0|max:5000',
        ]);

        $view = LabLessonView::firstOrNew([
            'lab_lesson_id' => $lesson->id,
            'user_id'       => $this->userId(),
        ]);

        $now   = now();
        $total = $lesson->unitCount();

        // Хуудас нээхэд зарцуулсан хугацаа — тайланд "хэр их цаг зарцуулсан"
        $elapsed = $view->last_viewed_at
            ? (int) abs($view->last_viewed_at->diffInSeconds($now))
            : 0;

        $view->views_count     = ($view->views_count ?? 0) + ($request->boolean('opened') ? 1 : 0);
        $view->first_viewed_at ??= $now;
        // Нэг ping-ийн хооронд 5 минутаас илүү тоохгүй — таб нээлттэй мартвал
        // цаг хиймлээр хуримтлагдахаас сэргийлнэ
        $view->watched_seconds = ($view->watched_seconds ?? 0) + min($elapsed, 300);
        $view->last_position   = (int) ($data['last'] ?? $view->last_position ?? 0);

        $view->watched_buckets  = LabLessonView::mergeBuckets($view->watched_buckets, $data['pages'], $total);
        $view->progress_percent = $total > 0
            ? min(100, (int) round(LabLessonView::seenCount($view->watched_buckets) / $total * 100))
            : 0;

        $view->last_viewed_at = $now;
        $view->save();

        return response()->json([
            'percent'    => $view->progress_percent,
            'completed'  => $view->completed_at !== null,
            // Батлах товч нээгдэх эсэх — сүүлийн хуудас уншигдсан үед л
            'can_finish' => $this->reachedLastPage($view->watched_buckets, $total),
        ]);
    }

    /**
     * Баримт хичээлийг "үзэж дууслаа" гэж баталгаажуулах.
     *
     * Видео нь 90% хүрэхэд ӨӨРӨӨ дуусгасан болдог. Баримт нь тийм биш —
     * ажилтан өөрөө дарж баталгаажуулна. Гэхдээ СҮҮЛИЙН ХУУДСЫГ нээгээгүй
     * байхад дарж болохгүй: эс тэгвээс эхний хуудсыг хараад л "уншсан" гэж
     * тэмдэглээд өнгөрөх боломжтой болно.
     *
     * Шалгалт нь сервер талд — фронтын товчийг идэвхгүй болгосон нь
     * хамгаалалт биш, зөвхөн тайлбар.
     */
    public function complete(LabLesson $lesson): RedirectResponse
    {
        $this->guardLesson($lesson);
        abort_unless($lesson->isDocumentReady(), 404);

        $view = LabLessonView::firstOrNew([
            'lab_lesson_id' => $lesson->id,
            'user_id'       => $this->userId(),
        ]);

        $total = $lesson->unitCount();

        if (! $this->reachedLastPage($view->watched_buckets, $total)) {
            return back()->with('error', 'Эхлээд бүх хуудсыг, ялангуяа сүүлийн хуудсыг үзнэ үү.');
        }

        if (! $view->completed_at) {
            $view->completed_at   = now();
            $view->last_viewed_at = now();
            $view->first_viewed_at ??= now();
            $view->save();
        }

        return back()->with('success', 'Хичээлийг үзэж дууссан гэж тэмдэглэлээ.');
    }

    /** Зураглалын СҮҮЛИЙН нүд тэмдэглэгдсэн эсэх. */
    protected function reachedLastPage(?string $map, int $total): bool
    {
        return $total > 0
            && strlen((string) $map) >= $total
            && $map[$total - 1] === '1';
    }

    /**
     * Зураглалаас үзсэн хуудсын дугааруудыг гаргана.
     *
     * @return list<int>
     */
    protected function seenPages(?string $map): array
    {
        $out = [];

        for ($i = 0; $i < strlen((string) $map); $i++) {
            if ($map[$i] === '1') {
                $out[] = $i;
            }
        }

        return $out;
    }

    public function storeComment(Request $request, LabLesson $lesson): RedirectResponse
    {
        $this->guardLesson($lesson);

        $data = $request->validate([
            'body'      => 'required|string|max:2000',
            'parent_id' => 'nullable|exists:lab_lesson_comments,id',
        ]);

        // Хариултын хариулт үүсгэхгүй — нэг шатлалтай байлгана
        $parentId = null;
        if (! empty($data['parent_id'])) {
            $parent = LabLessonComment::find($data['parent_id']);

            if ($parent && $parent->lab_lesson_id === $lesson->id) {
                $parentId = $parent->parent_id ?? $parent->id;
            }
        }

        $lesson->comments()->create([
            'user_id'   => $this->userId(),
            'parent_id' => $parentId,
            'body'      => $data['body'],
        ]);

        return back()->with('success', 'Сэтгэгдэл нэмэгдлээ.');
    }

    /** Зөвхөн өөрийн сэтгэгдлийг устгана. */
    public function destroyComment(LabLessonComment $comment): RedirectResponse
    {
        abort_unless($comment->user_id === $this->userId(), 403);

        $comment->delete();

        return back()->with('success', 'Сэтгэгдэл устлаа.');
    }

    /**
     * Хичээл эсвэл сэтгэгдэл дээр reaction дарах.
     * Ижил төрлийг дахин дарвал цуцлагдана, өөр төрөл дарвал солигдоно.
     */
    public function react(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'target' => 'required|in:lesson,comment',
            'id'     => 'required|integer',
            'type'   => 'required|in:'.implode(',', array_keys(LabReaction::TYPES)),
        ]);

        $model = $data['target'] === 'lesson'
            ? LabLesson::where('is_published', true)->findOrFail($data['id'])
            : LabLessonComment::findOrFail($data['id']);

        // Reaction нь хичээл дээр л байдаг тул эрхийг хичээлээр нь шалгана.
        $this->guardLesson($model instanceof LabLesson ? $model : $model->lesson);

        $existing = $model->reactions()->where('user_id', $this->userId())->first();

        if ($existing && $existing->type === $data['type']) {
            $existing->delete();
        } elseif ($existing) {
            $existing->update(['type' => $data['type']]);
        } else {
            $model->reactions()->create([
                'user_id' => $this->userId(),
                'type'    => $data['type'],
            ]);
        }

        return back();
    }

    /** Сэтгэгдлийг нэг шатлалтай мод болгож бэлдэнэ. */
    protected function commentTree(LabLesson $lesson, int $userId): array
    {
        $all = $lesson->comments()
            ->with(['user:id,name', 'reactions'])
            ->where(fn ($q) => $q->where('is_hidden', false)->orWhere('user_id', $userId))
            ->orderByDesc('is_pinned')
            ->oldest('id')
            ->get();

        $map = fn (LabLessonComment $c) => [
            'id'         => $c->id,
            'body'       => $c->body,
            'user_name'  => $c->user?->name ?? '—',
            'is_mine'    => $c->user_id === $userId,
            'is_pinned'  => $c->is_pinned,
            'is_hidden'  => $c->is_hidden,
            'created_at' => $c->created_at?->format('Y-m-d H:i'),
            'reactions'  => $c->reactions->groupBy('type')->map->count(),
            'my_reaction' => $c->reactions->firstWhere('user_id', $userId)?->type,
        ];

        $replies = $all->whereNotNull('parent_id')->groupBy('parent_id');

        return $all->whereNull('parent_id')
            ->map(fn (LabLessonComment $c) => array_merge($map($c), [
                'replies' => ($replies[$c->id] ?? collect())->map($map)->values()->all(),
            ]))
            ->values()
            ->all();
    }

    /** Хичээлийн reaction-ы тоо болон өөрийн сонголт. */
    protected function reactionSummary(LabLesson $lesson, int $userId): array
    {
        $reactions = $lesson->reactions()->get(['type', 'user_id']);

        return [
            'counts' => $reactions->groupBy('type')->map->count(),
            'mine'   => $reactions->firstWhere('user_id', $userId)?->type,
        ];
    }

    /** Цагтай тэмдэглэл нэмэх — видеоны тухайн агшинд холбогдоно. */
    public function storeNote(Request $request, LabLesson $lesson): RedirectResponse
    {
        $this->guardLesson($lesson);

        $data = $request->validate([
            'position_seconds' => 'required|integer|min:0|max:86400',
            'body'             => 'required|string|max:2000',
        ]);

        $lesson->notes()->create([
            'user_id'          => $this->userId(),
            'position_seconds' => $data['position_seconds'],
            'body'             => $data['body'],
        ]);

        return back()->with('success', 'Тэмдэглэл хадгалагдлаа.');
    }

    public function updateNote(Request $request, LabLessonNote $note): RedirectResponse
    {
        abort_unless($note->user_id === $this->userId(), 403);

        $note->update($request->validate(['body' => 'required|string|max:2000']));

        return back()->with('success', 'Тэмдэглэл шинэчлэгдлээ.');
    }

    public function destroyNote(LabLessonNote $note): RedirectResponse
    {
        abort_unless($note->user_id === $this->userId(), 403);

        $note->delete();

        return back()->with('success', 'Тэмдэглэл устлаа.');
    }

    /** "Үлдсэн 4 мин" гэх мэт товч тэмдэглэгээ. */
    protected function remainingLabel(LabLessonView $view): string
    {
        $duration = (int) ($view->lesson->duration_seconds ?? 0);

        if ($duration <= 0) {
            return '';
        }

        $left = max(0, $duration - $view->last_position);

        return $left >= 60
            ? 'Үлдсэн '.(int) ceil($left / 60).' мин'
            : 'Үлдсэн '.$left.' сек';
    }

    /**
     * Нэг сургалтын хуудас — бүлэг тус бүрээр хичээлүүдийг харуулна.
     *
     * Каталог дээр сургалт нь карт хэлбэрээр харагдаж, дарахад энэ хуудас
     * нээгдэнэ. Ингэснээр олон хичээлтэй сургалт ч эмх цэгцтэй байна.
     */
    public function course(LabCourse $course): Response
    {
        abort_unless($course->is_published, 404);
        abort_unless($this->canSeeCourse($course), 403);

        $userId = $this->userId();
        $course->load(['category:id,name,color,icon', 'sections']);

        $lessons = $course->lessons()->where('is_published', true)->get();

        $progress = LabLessonView::where('user_id', $userId)
            ->whereIn('lab_lesson_id', $lessons->pluck('id'))
            ->pluck('progress_percent', 'lab_lesson_id');

        $completed = LabLessonView::where('user_id', $userId)
            ->whereIn('lab_lesson_id', $lessons->pluck('id'))
            ->whereNotNull('completed_at')
            ->pluck('lab_lesson_id')
            ->flip();

        $mapped = $lessons->map(fn (LabLesson $l) => [
            'id'             => $l->id,
            'section_id'     => $l->lab_section_id,
            'title'          => $l->title,
            'description'    => $l->description,
            'poster_url'     => $l->poster_url,
            'duration_label' => $l->duration_label,
            // Баримт сургалтад хуудсаар нь дүрслэх тул төрөл, хуудасны тоо хэрэгтэй
            'kind'           => $l->kind,
            'page_count'     => (int) $l->page_count,
            'progress'       => (int) ($progress[$l->id] ?? 0),
            'is_completed'   => $completed->has($l->id),
            'is_required'    => $l->is_required,
            'due_at'         => $l->due_at?->format('Y-m-d'),
            'is_overdue'     => $l->isOverdue() && ! $completed->has($l->id),
        ]);

        $byId = $course->sections->keyBy('id');

        $sections = $mapped
            ->groupBy(fn ($l) => $l['section_id'] ?? 0)
            ->map(fn ($items, $sectionId) => [
                'id'      => (int) $sectionId,
                'title'   => $byId[$sectionId]->title ?? null,
                'order'   => $byId[$sectionId]->order ?? -1,
                'lessons' => $items->values(),
            ])
            ->sortBy('order')
            ->values();

        // Үргэлжлүүлэх — энэ сургалт дотор сүүлд үзсэн дуусаагүй хичээл
        $resume = LabLessonView::where('user_id', $userId)
            ->whereIn('lab_lesson_id', $lessons->pluck('id'))
            ->whereNull('completed_at')
            ->where('progress_percent', '>', 0)
            ->latest('last_viewed_at')
            ->first();

        return Inertia::render('my/training/course', [
            'course' => [
                'id'            => $course->id,
                'kind'          => $course->kind,
                'title'         => $course->title,
                'description'   => $course->description,
                'cover_url'     => $course->cover_url,
                'category_name' => $course->category?->name,
                'category_color' => $course->category?->color ?? 'slate',
                'category_icon' => $course->category?->icon ?? 'folder',
                'total'         => $mapped->count(),
                'done'          => $mapped->where('is_completed', true)->count(),
                'duration_min'  => (int) round($lessons->sum('duration_seconds') / 60),
            ],
            'sections'   => $sections,
            'resumeId'   => $resume?->lab_lesson_id
                ?? $mapped->firstWhere('is_completed', false)['id']
                ?? null,
            'exams'      => $course->exams()->available()->forPosition($this->positionId())->get()
                ->map(fn (LabExam $e) => [
                    'id'      => $e->id,
                    'title'   => $e->title,
                    'state'   => $e->state(),
                    'is_open' => $e->isOpen(),
                ])
                ->values(),
        ]);
    }
}
