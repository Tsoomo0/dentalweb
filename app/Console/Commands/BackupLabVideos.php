<?php

namespace App\Console\Commands;

use App\Models\Lab\LabLesson;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/**
 * Сургалтын видеог өөр байршил руу хуулж нөөцлөх.
 *
 * Локал диск дээр видео хадгалах нь үнэгүй ч ганц хатуу диск унавал бүх
 * хичээл алга болно. Энэ команд нь видео бүрийг зорилтот хавтас руу хуулаад
 * DB дэх sha256-тай нь тулган шалгана — файл гэмтсэн эсэхийг шууд илрүүлнэ.
 *
 * Жишээ (гадаад диск рүү):
 *   php artisan lab:backup-videos --to=D:/backup/lab-videos
 */
class BackupLabVideos extends Command
{
    protected $signature = 'lab:backup-videos
                            {--to= : Нөөц хадгалах хавтас (заагаагүй бол storage/app/backups/lab-videos)}
                            {--verify : Зөвхөн шалгана, хуулахгүй}';

    protected $description = 'Лабын сургалтын видеог нөөцлөж бүрэн бүтэн байдлыг шалгах';

    public function handle(): int
    {
        $disk   = Storage::disk(config('filesystems.lab_video_disk', 'lab_video'));
        $target = rtrim($this->option('to') ?: storage_path('app/backups/lab-videos'), '/'.DIRECTORY_SEPARATOR);
        $verify = (bool) $this->option('verify');

        if (! $verify) {
            File::ensureDirectoryExists($target);
        }

        $lessons = LabLesson::whereNotNull('video_path')->get();

        if ($lessons->isEmpty()) {
            $this->info('Нөөцлөх видео алга.');

            return self::SUCCESS;
        }

        $copied = $skipped = $failed = 0;

        foreach ($lessons as $lesson) {
            if (! $disk->exists($lesson->video_path)) {
                $this->error("ДУТУУ: {$lesson->title} — {$lesson->video_path}");
                $failed++;
                continue;
            }

            $source = $disk->path($lesson->video_path);
            $dest   = $target.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $lesson->video_path);

            // Хуулбар аль хэдийн байгаа бөгөөд хэмжээ нь таарч байвал алгасна
            if (is_file($dest) && filesize($dest) === filesize($source)) {
                $skipped++;
            } elseif ($verify) {
                $this->warn("НӨӨЦЛӨӨГҮЙ: {$lesson->title}");
                $failed++;
                continue;
            } else {
                File::ensureDirectoryExists(dirname($dest));
                File::copy($source, $dest);
                $copied++;
            }

            // Хадгалагдсан sha256-тай тулгаж гэмтсэн эсэхийг шалгана
            if ($lesson->checksum && hash_file('sha256', $source) !== $lesson->checksum) {
                $this->error("ГЭМТСЭН: {$lesson->title} — checksum таарахгүй байна");
                $failed++;
            }
        }

        $this->newLine();
        $this->info("Хуулсан: {$copied}   Алгассан: {$skipped}   Алдаатай: {$failed}");
        $this->line('Байршил: '.$target);

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
