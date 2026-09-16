<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\ConvertLessonDocument;
use App\Models\Lab\LabCourse;
use App\Models\Lab\LabLesson;
use App\Notifications\LabLessonPublished;
use App\Services\AuditService;
use App\Services\Lab\DocumentService;
use App\Services\Lab\VideoUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Админ тал — видео хичээл нэмэх / засах.
 *
 * Видеог хэсэгчлэн (chunk) хүлээж авдаг тул php.ini-ийн 40MB лимит саад
 * болохгүй. Видеоны урт болон poster зургийг browser талд <video> + canvas
 * ашиглан гаргаж авч илгээдэг — сервер дээр ffmpeg шаардахгүй.
 */
class LabLessonController extends Controller
{
    public function __construct(
        protected VideoUploadService $videos,
        protected DocumentService $docs,
    ) {}

    /** Нэг chunk хүлээж авах. */
    public function uploadChunk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'upload_id' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9_-]+$/'],
            'index'     => 'required|integer|min:0|max:100000',
            'chunk'     => 'required|file|max:'.VideoUploadService::MAX_CHUNK_KB,
        ]);

        $this->videos->receiveChunk($data['upload_id'], (int) $data['index'], $request->file('chunk'));

        return response()->json(['ok' => true, 'index' => (int) $data['index']]);
    }

    /** Бүх chunk ирсний дараа нэгтгэж эцсийн диск рүү бичих. */
    public function uploadFinish(Request $request): JsonResponse
    {
        $data = $request->validate([
            'upload_id' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9_-]+$/'],
            'total'     => 'required|integer|min:1|max:100000',
            'filename'  => 'required|string|max:255',
        ]);

        try {
            $result = $this->videos->finalize($data['upload_id'], (int) $data['total'], $data['filename']);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($result);
    }

    /** Хагас дутуу байршуулалтыг цуцлах. */
    public function uploadCancel(Request $request): JsonResponse
    {
        $data = $request->validate([
            'upload_id' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9_-]+$/'],
        ]);

        $this->videos->discard($data['upload_id']);

        return response()->json(['ok' => true]);
    }

    /**
     * Хадгалагдсан хичээлийн видеог админд тоглуулах.
     *
     * Лаб талын stream нь зөвхөн нийтэлсэн хичээлийг гаргадаг. Админ нийтлэхийн
     * ӨМНӨ бичлэгээ шалгах хэрэгтэй тул энд is_published-ыг шаардахгүй.
     */
    public function stream(LabLesson $labLesson)
    {
        abort_unless((bool) $labLesson->video_path, 404);

        return $this->videos->streamResponse($labLesson->video_path);
    }

    /**
     * Сая байршуулсан, хараахан хадгалаагүй видеог тоглуулах.
     *
     * Формыг илгээхээс өмнө "зөв файл орсон уу, эхнээс нь тоглож байна уу"
     * гэдгийг шалгах боломж өгнө. Зам нь заавал байршуулалтын хавтсанд байх
     * ёстой — гаднаас дурын зам өгч бусад файл руу заахаас сэргийлнэ.
     */
    public function preview(Request $request)
    {
        $path = (string) $request->query('path', '');

        abort_unless($path !== '' && str_starts_with($path, 'lessons/') && ! str_contains($path, '..'), 404);

        return $this->videos->streamResponse($path);
    }

    /**
     * YouTube-ийн ямар ч хэлбэрийн холбоосоос video ID салгана.
     * Хэрэглэгч бүтэн URL эсвэл ID-г шууд наахад хоёулаа ажиллана.
     */
    public static function youtubeId(string $input): ?string
    {
        $input = trim($input);

        if (preg_match('~^[A-Za-z0-9_-]{11}$~', $input)) {
            return $input;
        }

        $patterns = [
            '~youtu\.be/([A-Za-z0-9_-]{11})~',
            '~youtube\.com/watch\?.*v=([A-Za-z0-9_-]{11})~',
            '~youtube\.com/embed/([A-Za-z0-9_-]{11})~',
            '~youtube\.com/shorts/([A-Za-z0-9_-]{11})~',
        ];

        foreach ($patterns as $re) {
            if (preg_match($re, $input, $m)) {
                return $m[1];
            }
        }

        return null;
    }

    /** Хичээлийн формын нийтлэг дүрэм. */
    protected function rules(): array
    {
        return [
            'lab_course_id'    => 'required|exists:lab_courses,id',
            'lab_section_id'   => 'nullable|exists:lab_sections,id',
            'title'            => 'required|string|max:255',
            'description'      => 'nullable|string|max:10000',
            // Видео хичээлд л эх сурвалж шаардана — баримт хичээлд утгагүй
            'video_provider'   => 'required_if:kind,video|in:local,youtube',
            'document'         => 'nullable|file|mimes:'.implode(',', DocumentService::ALLOWED_EXT)
                                  .'|max:'.(int) (DocumentService::MAX_BYTES / 1024),
            'video_path'       => 'nullable|string|max:255',
            'video_ref'        => 'nullable|string|max:255',
            'duration_seconds' => 'nullable|integer|min:0|max:86400',
            'file_size'        => 'nullable|integer|min:0',
            'checksum'         => 'nullable|string|size:64',
            'poster'           => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'attachments.*'    => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:10240',
            'is_published'     => 'boolean',
            'is_required'      => 'boolean',
            'due_at'           => 'nullable|date',
        ];
    }

    /**
     * Илгээсэн видеоны мэдээллийг шалгаж, хадгалах хэлбэрт хөрвүүлнэ.
     * Локал зам нь заавал байршуулсан хавтсанд байх ёстой — гаднаас дурын
     * зам оруулж бусад файл руу заахаас сэргийлнэ.
     */
    protected function videoFields(Request $request): array
    {
        if ($request->input('video_provider') === LabLesson::PROVIDER_YOUTUBE) {
            $id = static::youtubeId((string) $request->input('video_ref'));

            if (! $id) {
                abort(422, 'YouTube холбоос танигдсангүй.');
            }

            return [
                'video_provider' => LabLesson::PROVIDER_YOUTUBE,
                'video_ref'      => $id,
                'video_path'     => null,
                'checksum'       => null,
                'file_size'      => 0,
            ];
        }

        $path = (string) $request->input('video_path');

        if ($path === '') {
            return [];   // видеог өөрчлөөгүй — хуучин утга хэвээр
        }

        if (! str_starts_with($path, 'lessons/') || ! Storage::disk($this->videos->disk())->exists($path)) {
            abort(422, 'Байршуулсан видео олдсонгүй. Дахин оролдоно уу.');
        }

        return [
            'video_provider' => LabLesson::PROVIDER_LOCAL,
            'video_path'     => $path,
            'video_ref'      => null,
            'checksum'       => $request->input('checksum'),
            'file_size'      => (int) $request->input('file_size', 0),
        ];
    }

    /**
     * Хичээлийн төрлөөс хамааран эх сурвалжийн талбаруудыг бэлдэнэ.
     *
     * Видео бол өмнөх шигээ, баримт бол файлыг диск рүү тавьж метадатаг нь
     * буцаана. Файл ирээгүй бол ХООСОН массив буцаана — тэгснээр засварлах
     * үед файлаа солиогүй бол хуучин утга хэвээр үлдэнэ.
     */
    protected function sourceFields(Request $request): array
    {
        if ($request->input('kind') !== LabLesson::KIND_DOCUMENT) {
            return $this->videoFields($request);
        }

        if (! $request->hasFile('document')) {
            return [];
        }

        return $this->docs->store($request->file('document'));
    }

    /** Хөрвүүлэлт хүлээгдэж буй бол дараалалд явуулна. */
    protected function queueConversion(LabLesson $lesson): void
    {
        if ($lesson->doc_status === DocumentService::STATUS_PENDING) {
            ConvertLessonDocument::dispatch($lesson->id);
        }
    }

    /**
     * Төрөл солигдсоны дараа хэрэггүй болсон эх файлыг устгана.
     *
     * @param  array<int, string|null>  $oldDocs
     */
    protected function dropUnusedSource(LabLesson $lesson, string $oldKind, ?string $oldVideo, array $oldDocs): void
    {
        // Видео → баримт болсон: хуучин бичлэг хэнд ч хэрэггүй
        if ($oldKind === LabLesson::KIND_VIDEO && $lesson->isDocument()) {
            $this->videos->deleteVideo($oldVideo);

            $lesson->forceFill([
                'video_path'       => null,
                'video_ref'        => null,
                'checksum'         => null,
                'duration_seconds' => 0,
            ])->save();

            return;
        }

        // Баримт → видео болсон: хуучин PDF ба эх файл хэрэггүй
        if ($oldKind === LabLesson::KIND_DOCUMENT && ! $lesson->isDocument()) {
            foreach (array_filter($oldDocs) as $old) {
                Storage::disk($this->docs->disk())->delete($old);
            }

            $lesson->forceFill([
                'doc_path'        => null,
                'doc_source_path' => null,
                'doc_source_name' => null,
                'doc_status'      => null,
                'doc_error'       => null,
                'page_count'      => 0,
            ])->save();
        }
    }

    /** Админ баримтаа шалгах — нийтлээгүй хичээл ч нээгдэнэ. */
    public function document(LabLesson $labLesson)
    {
        abort_unless($labLesson->doc_path, 404);

        return $this->docs->streamResponse($labLesson->doc_path);
    }

    /** Хөрвүүлэлт бүтэлгүйтсэн баримтыг дахин оролдох. */
    public function reconvert(LabLesson $labLesson): RedirectResponse
    {
        abort_unless($labLesson->doc_source_path, 404);

        $labLesson->forceFill([
            'doc_status' => DocumentService::STATUS_PENDING,
            'doc_error'  => null,
        ])->save();

        ConvertLessonDocument::dispatch($labLesson->id);

        return back()->with('success', 'Хөрвүүлэлтийг дахин эхлүүллээ.');
    }

    /**
     * Хичээлийн төрлийг СУРГАЛТААС нь авна.
     *
     * Хичээл өөрөө төрлөө сонгодоггүй болсон: сургалт бүхэлдээ видео эсвэл
     * файл тул доторх хичээл өөр төрөлтэй байх боломжгүй. Формоос ирсэн утгад
     * найдвал хоёр хуудсыг хооронд нь холих замтай үлдэнэ — иймд серверт
     * дахин тогтооно.
     *
     * Шалгалтын дүрмүүд `kind`-ыг уншдаг тул request дээр ч бичиж өгнө.
     */
    protected function resolveKind(Request $request): string
    {
        $kind = LabCourse::whereKey($request->input('lab_course_id'))->value('kind')
            ?? LabLesson::KIND_VIDEO;

        $request->merge(['kind' => $kind]);

        return $kind;
    }

    public function store(Request $request): RedirectResponse
    {
        $kind = $this->resolveKind($request);
        $data = $request->validate($this->rules());

        $lesson = DB::transaction(function () use ($request, $data, $kind) {
            $nextOrder = (int) LabLesson::where('lab_course_id', $data['lab_course_id'])->max('order') + 1;

            return LabLesson::create(array_merge([
                'lab_course_id'    => $data['lab_course_id'],
                'lab_section_id'   => $data['lab_section_id'] ?? null,
                'title'            => $data['title'],
                'description'      => $data['description'] ?? null,
                'order'            => $nextOrder,
                'kind'             => $kind,
                'duration_seconds' => (int) ($data['duration_seconds'] ?? 0),
                'poster_path'      => $request->hasFile('poster')
                    ? $request->file('poster')->store('lab-training/posters', 'public')
                    : null,
                'attachments'      => $this->storeAttachments($request),
                'is_published'     => $request->boolean('is_published'),
                'published_at'     => $request->boolean('is_published') ? now() : null,
                'is_required'      => $request->boolean('is_required'),
                'due_at'           => $data['due_at'] ?? null,
                'created_by'       => $request->user()->id,
            ], $this->sourceFields($request)));
        });

        // Хөрвүүлэлт хэрэгтэй бол дараалалд явуулна — админ хүлээхгүй
        $this->queueConversion($lesson);

        AuditService::log('created', $lesson, null, ['title' => $lesson->title], 'Хичээл нэмэв: '.$lesson->title);

        if ($lesson->is_published) {
            $this->notifyLabStaff($lesson);
        }

        return back()->with('success', $lesson->doc_status === DocumentService::STATUS_PENDING
            ? 'Хичээл нэмэгдлээ. Баримтыг PDF болгож хөрвүүлж байна.'
            : 'Хичээл нэмэгдлээ.');
    }

    public function update(Request $request, LabLesson $labLesson): RedirectResponse
    {
        $kind = $this->resolveKind($request);
        $data = $request->validate($this->rules());

        $wasPublished = $labLesson->is_published;
        $old          = $labLesson->only(['title', 'description', 'is_published']);
        $oldVideo     = $labLesson->video_path;
        $oldPoster    = $labLesson->poster_path;

        $oldDocs  = [$labLesson->doc_path, $labLesson->doc_source_path];
        $oldKind  = $labLesson->kind;
        $fields   = $this->sourceFields($request);

        $labLesson->fill(array_merge([
            'lab_course_id'    => $data['lab_course_id'],
            'lab_section_id'   => $data['lab_section_id'] ?? null,
            'title'            => $data['title'],
            'kind'             => $kind,
            'description'      => $data['description'] ?? null,
            'duration_seconds' => (int) ($data['duration_seconds'] ?? $labLesson->duration_seconds),
            'is_published'     => $request->boolean('is_published'),
            'published_at'     => $request->boolean('is_published')
                ? ($labLesson->published_at ?? now())
                : null,
            'is_required'      => $request->boolean('is_required'),
            'due_at'           => $data['due_at'] ?? null,
        ], $fields));

        if ($request->hasFile('poster')) {
            $labLesson->poster_path = $request->file('poster')->store('lab-training/posters', 'public');
        }

        if ($new = $this->storeAttachments($request)) {
            $labLesson->attachments = array_merge($labLesson->attachments ?? [], $new);
        }

        $labLesson->save();

        $this->queueConversion($labLesson);

        // Видео солигдсон бол хуучныг дискнээс цэвэрлэнэ
        if ($oldVideo && ($fields['video_path'] ?? null) && $fields['video_path'] !== $oldVideo) {
            $this->videos->deleteVideo($oldVideo);
        }

        // Баримт солигдсон бол хуучин файлуудыг арилгана
        if (array_key_exists('doc_source_path', $fields)) {
            foreach (array_filter($oldDocs) as $old) {
                if ($old !== $labLesson->doc_path && $old !== $labLesson->doc_source_path) {
                    Storage::disk($this->docs->disk())->delete($old);
                }
            }
        }

        // Хичээлийн ТӨРӨЛ солигдвол хуучин төрлийн файл ашиглагдахаа болино.
        // Дискэн дээр үлдээвэл хэзээ ч хүрэхгүй файл хуримтлагдана — лабын
        // видеоны диск аль хэдийн шахуу тул энд шууд чөлөөлнө.
        if ($oldKind !== $labLesson->kind) {
            $this->dropUnusedSource($labLesson, $oldKind, $oldVideo, $oldDocs);
        }
        if ($request->hasFile('poster') && $oldPoster) {
            Storage::disk('public')->delete($oldPoster);
        }

        AuditService::log('updated', $labLesson, $old, $labLesson->only(['title', 'description', 'is_published']), 'Хичээл зассан: '.$labLesson->title);

        if (! $wasPublished && $labLesson->is_published) {
            $this->notifyLabStaff($labLesson);
        }

        return back()->with('success', 'Хичээл шинэчлэгдлээ.');
    }

    public function destroy(LabLesson $labLesson): RedirectResponse
    {
        $title   = $labLesson->title;
        $video   = $labLesson->video_path;
        $poster  = $labLesson->poster_path;
        $files   = $labLesson->attachments ?? [];

        $docs = clone $labLesson;

        $labLesson->delete();

        // DB-ээс устсаны дараа л файлыг арилгана — устгал бүтэлгүйтвэл
        // файл үлдсэн нь дээр, эсрэгээрээ бол видеогүй хичээл үлдэнэ.
        $this->videos->deleteVideo($video);
        $this->docs->delete($docs);

        if ($poster) {
            Storage::disk('public')->delete($poster);
        }
        foreach ($files as $f) {
            Storage::disk('public')->delete($f['path'] ?? '');
        }

        AuditService::log('deleted', null, ['title' => $title], null, 'Хичээл устгав: '.$title);

        return back()->with('success', 'Хичээл устлаа.');
    }

    /** Хичээлийн дарааллыг сургалт дотор өөрчлөх. */
    public function reorder(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'integer|exists:lab_lessons,id',
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['ids'] as $i => $id) {
                LabLesson::whereKey($id)->update(['order' => $i + 1]);
            }
        });

        return back();
    }

    /** Хавсралт файлыг устгах. */
    public function destroyAttachment(Request $request, LabLesson $labLesson): RedirectResponse
    {
        $path  = (string) $request->input('path');
        $files = $labLesson->attachments ?? [];

        $kept = array_values(array_filter($files, fn ($f) => ($f['path'] ?? null) !== $path));

        if (count($kept) !== count($files)) {
            Storage::disk('public')->delete($path);
            $labLesson->update(['attachments' => $kept]);
        }

        return back()->with('success', 'Хавсралт устлаа.');
    }

    /** Шинээр илгээсэн хавсралтуудыг хадгалж метадатаг буцаана. */
    protected function storeAttachments(Request $request): array
    {
        $out = [];

        foreach ((array) $request->file('attachments', []) as $file) {
            if (! $file) {
                continue;
            }

            $out[] = [
                'name' => $file->getClientOriginalName(),
                'path' => $file->store('lab-training/files', 'public'),
                'size' => $file->getSize(),
            ];
        }

        return $out;
    }

    /**
     * Шинэ хичээл нийтлэгдэхэд хамрах хүрээний ажилтнуудад мэдэгдэнэ.
     *
     * Хичээл нь сургалтынхаа албан тушаалын хязгаарлалтыг өвлөнө — сонгосон
     * албан тушаалд ороогүй ажилтан мэдэгдэл авахгүй.
     */
    protected function notifyLabStaff(LabLesson $lesson): void
    {
        $staff = \App\Services\Lab\TrainingAudience::forLesson($lesson)->get();

        if ($staff->isNotEmpty()) {
            Notification::send($staff, new LabLessonPublished($lesson));
        }
    }
}
