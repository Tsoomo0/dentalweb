<?php

namespace App\Services\Lab;

use App\Models\Lab\LabLesson;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Smalot\PdfParser\Parser as PdfParser;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;

/**
 * Баримт хичээлийн файлыг хүлээн авах, PDF болгох, хуудсыг нь тоолох.
 *
 * АЖИЛЛАХ ЗАМНАЛ:
 *   PDF байршуулсан    → шууд ready, хуудсыг нь тоолоод дуусав
 *   PPT/DOCX байршуулсан → анхны файлыг хадгална, төлөв pending,
 *                          дараа нь LibreOffice PDF болгоно → ready
 *
 * АНХНЫ ФАЙЛЫГ ХЭЗЭЭ Ч УСТГАХГҮЙ. Хөрвүүлэлт нь эх хувилбарын бүх зүйлийг
 * (анимаци, тэмдэглэл, тусгай фонт) хадгалж чаддаггүй. Ажилтан эх файлыг
 * татаж авах эрхтэй байх ёстой бөгөөд хөрвүүлэлт бүтэлгүйтвэл дахин
 * оролдох боломж үлдэнэ.
 */
class DocumentService
{
    /** Байршуулж болох өргөтгөлүүд. */
    public const ALLOWED_EXT = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'odp', 'odt'];

    /** Хөрвүүлэх шаардлагагүй — шууд үзүүлнэ. */
    public const NATIVE_EXT = ['pdf'];

    public const MAX_BYTES = 200 * 1024 * 1024;   // 200 MB

    public const STATUS_PENDING = 'pending';
    public const STATUS_READY   = 'ready';
    public const STATUS_FAILED  = 'failed';

    public function disk(): string
    {
        return config('filesystems.lab_doc_disk', 'lab_doc');
    }

    /**
     * Байршуулсан файлыг диск рүү тавьж, хичээлд бичих талбаруудыг буцаана.
     *
     * Хөрвүүлэлтийг ЭНД хийхгүй — дараалалд шилжүүлнэ. Админ 40MB-ийн илтгэл
     * хөрвүүлэхийг хүлээж хуудас царайчилж суух ёсгүй.
     *
     * @return array<string, mixed>
     */
    public function store(UploadedFile $file): array
    {
        $ext  = strtolower($file->getClientOriginalExtension());
        $name = $file->getClientOriginalName();
        $stem = 'documents/'.Str::uuid()->toString();

        $sourcePath = $stem.'-source.'.$ext;
        Storage::disk($this->disk())->put($sourcePath, $file->get());

        // PDF бол хөрвүүлэх шаардлагагүй — эх файл өөрөө үзүүлэх файл болно
        if (in_array($ext, self::NATIVE_EXT, true)) {
            return [
                'doc_path'        => $sourcePath,
                'doc_source_path' => $sourcePath,
                'doc_source_name' => $name,
                'doc_status'      => self::STATUS_READY,
                'doc_error'       => null,
                'page_count'      => $this->countPages($sourcePath),
                'file_size'       => $file->getSize(),
            ];
        }

        return [
            'doc_path'        => null,
            'doc_source_path' => $sourcePath,
            'doc_source_name' => $name,
            'doc_status'      => self::STATUS_PENDING,
            'doc_error'       => null,
            'page_count'      => 0,
            'file_size'       => $file->getSize(),
        ];
    }

    /**
     * Анхны файлыг PDF болгож хөрвүүлнэ.
     *
     * LibreOffice нь зөвхөн жинхэнэ файлын систем дээр ажилладаг тул диск
     * ямар ч драйвертай байсан (S3/R2 ч гэсэн) файлыг түр хавтас руу буулгаж
     * ажиллуулна. Дуусмагц түр файлуудыг цэвэрлэнэ.
     */
    public function convert(LabLesson $lesson): bool
    {
        $binary = $this->binary();

        if (! $binary) {
            return $this->fail($lesson, 'LibreOffice тохируулаагүй байна. .env дэх LIBREOFFICE_PATH-ыг бөглөх эсвэл файлыг PDF болгож байршуулна уу.');
        }

        if (! $lesson->doc_source_path || ! Storage::disk($this->disk())->exists($lesson->doc_source_path)) {
            return $this->fail($lesson, 'Хөрвүүлэх эх файл олдсонгүй.');
        }

        $work = storage_path('app/lab-convert/'.Str::uuid());

        if (! is_dir($work)) {
            mkdir($work, 0775, true);
        }

        $localSource = $work.DIRECTORY_SEPARATOR.basename($lesson->doc_source_path);

        try {
            file_put_contents($localSource, Storage::disk($this->disk())->get($lesson->doc_source_path));

            $process = new Process([
                $binary,
                '--headless',
                '--norestore',
                // Хэрэглэгчийн профайлыг тусгаарлана — эс тэгвээс сервер дээр
                // LibreOffice аль хэдийн ажиллаж байвал энэ дуудлага чимээгүй
                // бүтэлгүйтдэг.
                '-env:UserInstallation=file:///'.str_replace('\\', '/', $work).'/profile',
                '--convert-to', 'pdf',
                '--outdir', $work,
                $localSource,
            ]);

            $process->setTimeout((float) config('services.libreoffice.timeout', 180));
            $process->run();

            $produced = preg_replace('/\.[^.]+$/', '.pdf', $localSource);

            if (! is_file($produced)) {
                return $this->fail($lesson, trim($process->getErrorOutput()) ?: 'Хөрвүүлэлт үр дүн үүсгэсэнгүй.');
            }

            $pdfPath = preg_replace('/-source\.[^.]+$/', '.pdf', $lesson->doc_source_path);
            Storage::disk($this->disk())->put($pdfPath, file_get_contents($produced));

            $lesson->forceFill([
                'doc_path'   => $pdfPath,
                'doc_status' => self::STATUS_READY,
                'doc_error'  => null,
                'page_count' => $this->countPages($pdfPath),
            ])->save();

            return true;
        } catch (ProcessTimedOutException) {
            return $this->fail($lesson, 'Хөрвүүлэлт хугацаа хэтэрлээ. Файл хэт том эсвэл нарийн байж магадгүй.');
        } catch (\Throwable $e) {
            Log::error('Хичээлийн баримт хөрвүүлэхэд алдаа', ['lesson' => $lesson->id, 'error' => $e->getMessage()]);

            return $this->fail($lesson, 'Хөрвүүлэхэд алдаа гарлаа: '.$e->getMessage());
        } finally {
            $this->rmdir($work);
        }
    }

    /** Хичээлийг алдаатай гэж тэмдэглээд false буцаана. */
    protected function fail(LabLesson $lesson, string $message): bool
    {
        $lesson->forceFill([
            'doc_status' => self::STATUS_FAILED,
            'doc_error'  => Str::limit($message, 250),
        ])->save();

        return false;
    }

    /**
     * PDF-ийн хуудасны тоо.
     *
     * Явцыг хуудсаар хэмждэг тул энэ тоо БУРУУ бол ажилтан хэзээ ч 100%
     * хүрэхгүй, эсвэл эсрэгээрээ эхний хуудсанд дуусгасан болно. Тиймээс
     * задлагч алдвал 0 буцааж, дуудсан тал нь мэдэж байх ёстой.
     */
    public function countPages(string $path): int
    {
        try {
            $pdf = (new PdfParser)->parseContent(Storage::disk($this->disk())->get($path));

            return max(0, count($pdf->getPages()));
        } catch (\Throwable $e) {
            Log::warning('PDF хуудас тоолж чадсангүй', ['path' => $path, 'error' => $e->getMessage()]);

            return 0;
        }
    }

    /** Ажилтанд PDF-ийг дамжуулах хариу. */
    public function streamResponse(string $path, bool $download = false, ?string $name = null): Response
    {
        $disk = Storage::disk($this->disk());

        abort_unless($disk->exists($path), 404);

        $headers = [
            'Content-Type'        => $download ? 'application/octet-stream' : 'application/pdf',
            // Баримт хичээл нь дотоод материал — прокси/CDN хадгалах ёсгүй
            'Cache-Control'       => 'private, max-age=0, no-store',
            'Content-Disposition' => ($download ? 'attachment' : 'inline')
                .'; filename="'.addslashes($name ?: basename($path)).'"',
        ];

        return response()->stream(fn () => print $disk->get($path), 200, $headers);
    }

    /** Тохируулсан LibreOffice-ийн зам, олдохгүй бол null. */
    public function binary(): ?string
    {
        $path = (string) config('services.libreoffice.path');

        if ($path !== '' && is_file($path)) {
            return $path;
        }

        // Тохируулаагүй бол түгээмэл байрлалуудаас хайна — ингэснээр ихэнх
        // тохиолдолд .env хөндөхгүйгээр шууд ажиллана.
        foreach ([
            'C:\Program Files\LibreOffice\program\soffice.exe',
            'C:\Program Files (x86)\LibreOffice\program\soffice.exe',
            '/usr/bin/soffice',
            '/usr/bin/libreoffice',
            '/opt/libreoffice/program/soffice',
        ] as $candidate) {
            if (is_file($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    /** Хичээлийн бүх баримт файлыг устгана. */
    public function delete(LabLesson $lesson): void
    {
        $disk = Storage::disk($this->disk());

        foreach (array_filter([$lesson->doc_path, $lesson->doc_source_path]) as $path) {
            $disk->delete($path);
        }
    }

    /** Түр хавтсыг агуулгатай нь цэвэрлэнэ. */
    protected function rmdir(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }

        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );

        foreach ($items as $item) {
            $item->isDir() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
        }

        @rmdir($dir);
    }
}
