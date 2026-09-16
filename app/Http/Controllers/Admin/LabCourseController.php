<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HR\Position;
use App\Models\Lab\LabCategory;
use App\Models\Lab\LabCourse;
use App\Models\Lab\LabSection;
use App\Models\User;
use App\Services\AuditService;
use App\Services\Lab\TrainingAudience;
use App\Services\Lab\VideoUploadService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Админ тал — дотоод сургалт удирдах.
 *
 * Сургалт нь видео эсвэл файл гэсэн ХОЁР төрөлтэй бөгөөд тус бүр өөрийн
 * хуудастай. Хоёр хуудас ижил өгөгдөл, ижил үйлдлүүдийг хуваалцдаг тул
 * ялгаа нь зөвхөн шүүлт ба аль Inertia хуудсыг үзүүлэх вэ гэдэгт байна.
 */
class LabCourseController extends Controller
{
    public function __construct(protected VideoUploadService $videos) {}

    /** Видео сургалтууд. */
    public function index(): Response
    {
        return $this->page(LabCourse::KIND_VIDEO, 'admin/lab-training/index');
    }

    /** Файл (баримт) сургалтууд. */
    public function documents(): Response
    {
        return $this->page(LabCourse::KIND_DOCUMENT, 'admin/lab-training/documents');
    }

    /** Нэг төрлийн сургалтын жагсаалтыг бэлдэж хуудас руу дамжуулна. */
    protected function page(string $kind, string $component): Response
    {
        $audienceFor = static::audienceCounter();

        $courses = LabCourse::query()
            ->ofKind($kind)
            ->with(['category:id,name,color,icon', 'sections', 'positions:id,name'])
            ->with(['lessons' => fn ($q) => $q
                ->withCount([
                    'views as viewers_count'   => fn ($v) => $v->where('views_count', '>', 0),
                    'views as completed_count' => fn ($v) => $v->whereNotNull('completed_at'),
                    'comments',
                    'reactions',
                ])
                ->withAvg('views as avg_progress', 'progress_percent')])
            ->orderBy('order')
            ->orderBy('id')
            ->get()
            ->map(fn (LabCourse $c) => [
                'id'            => $c->id,
                'category_id'   => $c->lab_category_id,
                'category_name' => $c->category?->name,
                'category_color' => $c->category?->color,
                'category_icon' => $c->category?->icon,
                'sections'      => $c->sections->map(fn ($s) => [
                    'id'    => $s->id,
                    'title' => $s->title,
                    'order' => $s->order,
                ])->values(),
                'title'         => $c->title,
                'slug'          => $c->slug,
                'position_ids'  => $c->positions->pluck('id')->values(),
                'position_names' => $c->positions->pluck('name')->values(),
                // Албан тушаал сонгоогүй сургалт бүх ажилтанд нээлттэй тул
                // хамрах хүрээ нь сургалт бүрд өөр — гүйцэтгэлийн хувь эндээс бодогдоно.
                'audience'      => $audienceFor($c->positions->pluck('id')),
                'description'   => $c->description,
                'cover_url'     => $c->cover_url,
                'order'         => $c->order,
                'is_published'  => $c->is_published,
                'lessons_count' => $c->lessons->count(),
                'lessons'       => $c->lessons->map(fn ($l) => [
                    'id'               => $l->id,
                    'title'            => $l->title,
                    'description'      => $l->description,
                    'order'            => $l->order,
                    'section_id'       => $l->lab_section_id,
                    'kind'             => $l->kind,
                    // Баримт хичээлийн төлөв — хөрвүүлэлт явж байна уу, алдсан уу
                    'doc_status'       => $l->doc_status,
                    'doc_error'        => $l->doc_error,
                    'page_count'       => $l->page_count,
                    'doc_source_name'  => $l->doc_source_name,
                    'has_document'     => (bool) $l->doc_path,
                    'video_provider'   => $l->video_provider,
                    'video_ref'        => $l->video_ref,
                    'has_video'        => (bool) ($l->video_path ?: $l->video_ref),
                    'poster_url'       => $l->poster_url,
                    'duration_label'   => $l->duration_label,
                    'duration_seconds' => $l->duration_seconds,
                    'file_size'        => $l->file_size,
                    'attachments'      => $l->attachments ?? [],
                    'is_published'     => $l->is_published,
                    'is_required'      => $l->is_required,
                    'due_at'           => $l->due_at?->format('Y-m-d\TH:i'),
                    'is_overdue'       => $l->isOverdue(),
                    'viewers_count'    => $l->viewers_count,
                    'completed_count'  => $l->completed_count,
                    'comments_count'   => $l->comments_count,
                    'reactions_count'  => $l->reactions_count,
                    'avg_progress'     => (int) round((float) $l->avg_progress),
                ])->values(),
            ]);

        return Inertia::render($component, [
            'kind'        => $kind,
            'categories'  => LabCategory::orderBy('order')->orderBy('id')->get()
                ->map(fn (LabCategory $c) => [
                    'id'           => $c->id,
                    'name'         => $c->name,
                    'description'  => $c->description,
                    'color'        => $c->color,
                    'icon'         => $c->icon,
                    'is_active'    => $c->is_active,
                    // Шүүлтийн бөмбөлөг дээрх тоо нь ЭНЭ хуудсанд харагдах
                    // сургалтынх байх ёстой — нөгөө төрлийнхийг тоолвол
                    // хэрэглэгч дарахад хоосон илэрц гарна
                    'courses_count' => $c->courses()->where('kind', $kind)->count(),
                ]),
            'colors'      => LabCategory::COLORS,
            'icons'       => LabCategory::ICONS,
            'courses'     => $courses,
            'positions'   => Position::where('is_active', true)
                ->orderBy('department')->orderBy('name')
                ->get(['id', 'name', 'department']),
            'audience'    => static::audienceCount(),
            'maxChunkKb'  => VideoUploadService::MAX_CHUNK_KB,
        ]);
    }

    /**
     * Сургалт үзэх боломжтой ажилтнуудын query.
     *
     * Сургалт бүр өөрийн албан тушаалын жагсаалттай тул хамрах хүрээ нь
     * сургалтаас хамаарна — тодорхой сургалтынхыг TrainingAudience::forCourse()
     * гаргана. Энэ нь зөвхөн "нийт ажилтан" гэсэн дээд хязгаар.
     */
    public static function audienceQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return TrainingAudience::allEmployees();
    }

    /** Нийт идэвхтэй ажилтны тоо — гүйцэтгэлийн хувь бодоход хэрэгтэй. */
    public static function audienceCount(): int
    {
        return static::audienceQuery()->count();
    }

    /**
     * Албан тушаалын жагсаалтаар хамрах хүрээг тоолох хаалт.
     *
     * Ажилтнуудыг нэг л удаа татаж, дараа нь санах ойд тоолно — сургалт/хичээл
     * бүрт тусад нь COUNT явуулбал жагсаалт дээр олон арван query үүснэ.
     */
    public static function audienceCounter(): \Closure
    {
        $positionIds = TrainingAudience::allEmployees()
            ->with('employee:id,user_id,position_id')
            ->get()
            ->map(fn (User $u) => $u->employee?->position_id);

        return function ($allowed) use ($positionIds): int {
            $allowed = collect($allowed);

            return $allowed->isEmpty()
                ? $positionIds->count()
                : $positionIds->filter(fn ($id) => $id !== null && $allowed->contains($id))->count();
        };
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title'           => 'required|string|max:255',
            'description'     => 'nullable|string|max:5000',
            'cover'           => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'lab_category_id' => 'nullable|exists:lab_categories,id',
            'kind'            => 'required|in:video,document',
            'is_published'    => 'boolean',
            'position_ids'    => 'nullable|array',
            'position_ids.*'  => 'integer|exists:positions,id',
        ]);

        $course = LabCourse::create([
            'lab_category_id' => $data['lab_category_id'] ?? null,
            'kind'         => $data['kind'],
            'title'        => $data['title'],
            'description'  => $data['description'] ?? null,
            'cover_image'  => $request->hasFile('cover')
                ? $request->file('cover')->store('lab-training/covers', 'public')
                : null,
            'order'        => (int) LabCourse::max('order') + 1,
            'is_published' => $request->boolean('is_published'),
            'created_by'   => $request->user()->id,
        ]);

        // Хоосон бол бүх ажилтанд нээлттэй — sync([]) яг үүнийг илэрхийлнэ.
        $course->positions()->sync($data['position_ids'] ?? []);

        AuditService::log('created', $course, null, ['title' => $course->title], 'Дотоод сургалт нэмэв: '.$course->title);

        return back()->with('success', 'Сургалт үүслээ.');
    }

    public function update(Request $request, LabCourse $labCourse): RedirectResponse
    {
        // Төрөл нь засварт ОРОХГҮЙ: сургалт бүхэлдээ видео эсвэл файл байна.
        // Солих юм бол доторх хичээл бүрийн файл нь утгагүй болно — иймд
        // өөр төрөл рүү шилжүүлэх бол шинэ сургалт үүсгэх нь зөв.
        $data = $request->validate([
            'title'           => 'required|string|max:255',
            'description'     => 'nullable|string|max:5000',
            'cover'           => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'lab_category_id' => 'nullable|exists:lab_categories,id',
            'is_published'    => 'boolean',
            'position_ids'    => 'nullable|array',
            'position_ids.*'  => 'integer|exists:positions,id',
        ]);

        $old = $labCourse->only(['title', 'description', 'is_published']);

        if ($request->hasFile('cover')) {
            if ($labCourse->cover_image) {
                Storage::disk('public')->delete($labCourse->cover_image);
            }
            $labCourse->cover_image = $request->file('cover')->store('lab-training/covers', 'public');
        }

        $labCourse->fill([
            'lab_category_id' => $data['lab_category_id'] ?? null,
            'title'        => $data['title'],
            'description'  => $data['description'] ?? null,
            'is_published' => $request->boolean('is_published'),
        ])->save();

        $labCourse->positions()->sync($data['position_ids'] ?? []);

        AuditService::log('updated', $labCourse, $old, $labCourse->only(['title', 'description', 'is_published']), 'Дотоод сургалт зассан: '.$labCourse->title);

        return back()->with('success', 'Сургалт шинэчлэгдлээ.');
    }

    public function destroy(LabCourse $labCourse): RedirectResponse
    {
        $title = $labCourse->title;

        // Видео файл нь DB-д биш дискэн дээр байгаа тул cascade-д найдахгүй,
        // хичээл бүрийн файлыг гараар цэвэрлэнэ — эс тэгвээс "өнчин" файл үлдэнэ.
        DB::transaction(function () use ($labCourse) {
            foreach ($labCourse->lessons as $lesson) {
                $this->videos->deleteVideo($lesson->video_path);

                if ($lesson->poster_path) {
                    Storage::disk('public')->delete($lesson->poster_path);
                }

                foreach ($lesson->attachments ?? [] as $file) {
                    Storage::disk('public')->delete($file['path'] ?? '');
                }
            }

            if ($labCourse->cover_image) {
                Storage::disk('public')->delete($labCourse->cover_image);
            }

            $labCourse->delete();
        });

        AuditService::log('deleted', null, ['title' => $title], null, 'Дотоод сургалт устгав: '.$title);

        return back()->with('success', 'Сургалт устлаа.');
    }

    /** Сургалтуудын дарааллыг өөрчлөх. */
    public function reorder(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'integer|exists:lab_courses,id',
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['ids'] as $i => $id) {
                LabCourse::whereKey($id)->update(['order' => $i + 1]);
            }
        });

        return back();
    }

    /* ── Бүлэг (сургалт доторх хэсэг) ───────────────────────────────────── */

    public function storeSection(Request $request, LabCourse $labCourse): RedirectResponse
    {
        $data = $request->validate(['title' => 'required|string|max:150']);

        $labCourse->sections()->create([
            'title' => $data['title'],
            'order' => (int) $labCourse->sections()->max('order') + 1,
        ]);

        return back()->with('success', 'Бүлэг нэмэгдлээ.');
    }

    public function updateSection(Request $request, LabSection $section): RedirectResponse
    {
        $section->update($request->validate(['title' => 'required|string|max:150']));

        return back()->with('success', 'Бүлэг шинэчлэгдлээ.');
    }

    /** Бүлэг устгахад доторх хичээлүүд устахгүй — бүлэггүй болно. */
    public function destroySection(LabSection $section): RedirectResponse
    {
        $count = $section->lessons()->count();
        $section->delete();

        return back()->with('success', $count > 0
            ? "Бүлэг устлаа. {$count} хичээл бүлэггүй болов."
            : 'Бүлэг устлаа.');
    }

    public function reorderSections(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'integer|exists:lab_sections,id',
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['ids'] as $i => $id) {
                LabSection::whereKey($id)->update(['order' => $i + 1]);
            }
        });

        return back();
    }
}
