<?php

namespace App\Services\Lab;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Том видеог хэсэгчлэн (chunk) хүлээж авах үйлчилгээ.
 *
 * PHP-ийн upload_max_filesize / post_max_size (энэ сервер дээр 40MB) нь нэг
 * хүсэлтээр илгээх хэмжээг хязгаарладаг. Browser талд файлыг 4MB-аар зүсэж
 * дараалан илгээх тул php.ini-г огт өөрчлөхгүйгээр 2GB видео байршуулна.
 * Сүлжээ тасарвал зөвхөн дутуу chunk-уудыг дахин илгээхэд хангалттай.
 *
 * Нэгтгэсэн файлыг `filesystems.lab_video_disk` диск рүү STREAM-ээр бичнэ —
 * ингэснээр локал дискнээс Cloudflare R2 / S3 руу шилжихэд энэ код хэвээр
 * ажиллана (writeStream нь s3 дээр multipart upload болно).
 */
class VideoUploadService
{
    /** Нэг видеоны дээд хэмжээ (байт). */
    public const MAX_BYTES = 2 * 1024 * 1024 * 1024;   // 2 GB

    /** Нэг chunk-ийн дээд хэмжээ (KB) — validation-д ашиглана. */
    public const MAX_CHUNK_KB = 8192;                  // 8 MB

    /** Зөвшөөрөгдөх өргөтгөлүүд. */
    public const ALLOWED_EXT = ['mp4', 'webm', 'mov', 'm4v'];

    /** Дуусаагүй upload-ыг хэдэн цагийн дараа хогийн саванд тооцох. */
    public const STALE_HOURS = 24;

    /** Нэг chunk-ийг түр хавтас руу хадгална. */
    public function receiveChunk(string $uploadId, int $index, UploadedFile $chunk): void
    {
        $dir = $this->chunkDir($uploadId);
        File::ensureDirectoryExists($dir);

        // Дугаарыг тэгээр гүйцээснээр нэгтгэхэд дараалал баталгаатай
        $chunk->move($dir, sprintf('%06d.part', $index));
    }

    /**
     * Бүх chunk-ийг нэгтгэж эцсийн диск рүү бичнэ.
     *
     * @return array{path:string, size:int, checksum:string}
     */
    public function finalize(string $uploadId, int $total, string $originalName): array
    {
        $dir = $this->chunkDir($uploadId);

        if (! is_dir($dir)) {
            throw new RuntimeException('Байршуулсан хэсгүүд олдсонгүй. Дахин оролдоно уу.');
        }

        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        if (! in_array($ext, self::ALLOWED_EXT, true)) {
            $this->discard($uploadId);
            throw new RuntimeException('Зөвшөөрөгдөөгүй файлын төрөл: .'.$ext);
        }

        // 1) Түр файл руу нэгтгэнэ, зэрэгцээд sha256 бодно
        $tmpPath = $dir.DIRECTORY_SEPARATOR.'merged.tmp';
        $out     = fopen($tmpPath, 'wb');
        $hash    = hash_init('sha256');
        $size    = 0;

        try {
            for ($i = 0; $i < $total; $i++) {
                $part = $dir.DIRECTORY_SEPARATOR.sprintf('%06d.part', $i);

                if (! is_file($part)) {
                    throw new RuntimeException("Файлын {$i}-р хэсэг дутуу байна. Дахин байршуулна уу.");
                }

                $in = fopen($part, 'rb');
                while (! feof($in)) {
                    $buffer = fread($in, 1024 * 1024);
                    if ($buffer === false || $buffer === '') {
                        break;
                    }
                    $size += strlen($buffer);
                    if ($size > self::MAX_BYTES) {
                        fclose($in);
                        throw new RuntimeException('Видео 2GB-аас хэтэрсэн байна.');
                    }
                    hash_update($hash, $buffer);
                    fwrite($out, $buffer);
                }
                fclose($in);
            }
        } finally {
            fclose($out);
        }

        // 2) Эцсийн диск рүү stream-ээр зөөнө (санах ойд бүтнээр нь ачаалахгүй)
        $target = 'lessons/'.date('Y/m').'/'.Str::uuid().'.'.$ext;
        $stream = fopen($tmpPath, 'rb');

        try {
            Storage::disk($this->disk())->writeStream($target, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
            $this->discard($uploadId);
        }

        return [
            'path'     => $target,
            'size'     => $size,
            'checksum' => hash_final($hash),
        ];
    }

    /** Түр хавтсыг устгана (амжилттай дууссан эсвэл цуцалсан үед). */
    public function discard(string $uploadId): void
    {
        $dir = $this->chunkDir($uploadId);

        if (is_dir($dir)) {
            File::deleteDirectory($dir);
        }
    }

    /** Хугацаа хэтэрсэн дуусаагүй upload-уудыг цэвэрлэнэ. */
    public function purgeStale(): int
    {
        $root = storage_path('app/chunks');

        if (! is_dir($root)) {
            return 0;
        }

        $cutoff  = now()->subHours(self::STALE_HOURS)->getTimestamp();
        $removed = 0;

        foreach (File::directories($root) as $dir) {
            if (filemtime($dir) < $cutoff) {
                File::deleteDirectory($dir);
                $removed++;
            }
        }

        return $removed;
    }

    /**
     * Видеог тоглуулах HTTP хариу үүсгэнэ.
     *
     * Локал дискний файлыг Range дэмжсэн байдлаар шууд буцаана, үүлэн
     * хадгалалт (R2 / S3) дээр бол түр хугацааны линк рүү шилжүүлнэ.
     * Хэн үзэх эрхтэйг дуудагч тал шийднэ — энд зөвхөн файлыг гаргана.
     */
    public function streamResponse(string $path): Response|RedirectResponse
    {
        $diskName = $this->disk();
        $disk     = Storage::disk($diskName);

        abort_unless($disk->exists($path), 404);

        if (config("filesystems.disks.{$diskName}.driver") === 's3') {
            return redirect()->away($disk->temporaryUrl($path, now()->addHours(2)));
        }

        $mime = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'webm'  => 'video/webm',
            'mov'   => 'video/quicktime',
            default => 'video/mp4',
        };

        return response()->file($disk->path($path), [
            'Content-Type'  => $mime,
            'Accept-Ranges' => 'bytes',
            'Cache-Control' => 'private, max-age=0, no-store',
        ]);
    }

    /** Хичээлийн видео файлыг дискнээс устгана. */
    public function deleteVideo(?string $path): void
    {
        if ($path) {
            Storage::disk($this->disk())->delete($path);
        }
    }

    public function disk(): string
    {
        return config('filesystems.lab_video_disk', 'lab_video');
    }

    /**
     * Түр хавтсын зам. upload_id-г заавал цэвэрлэнэ — эс тэгвээс "../.."
     * агуулсан утга файлын системд гарч болзошгүй.
     */
    protected function chunkDir(string $uploadId): string
    {
        $safe = preg_replace('/[^A-Za-z0-9_-]/', '', $uploadId);

        if ($safe === '' || strlen($safe) > 64) {
            throw new RuntimeException('Буруу upload ID.');
        }

        return storage_path('app/chunks'.DIRECTORY_SEPARATOR.$safe);
    }
}
