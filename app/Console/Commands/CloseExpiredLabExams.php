<?php

namespace App\Console\Commands;

use App\Services\Lab\ExamGrader;
use App\Services\Lab\VideoUploadService;
use Illuminate\Console\Command;

/**
 * Хугацаа нь дууссан ч илгээгээгүй шалгалтын оролдлогуудыг автоматаар дүгнэнэ.
 *
 * Ажилтан таб хаах, интернэт тасрах, компьютер унтарах зэрэг тохиолдолд
 * оролдлого "in_progress" төлөвт үүрд үлдэхээс сэргийлнэ. Хадгалагдсан
 * (autosave хийгдсэн) хариултууд дээр нь үндэслэн оноо тавина.
 *
 * Зэрэгцээд дуусаагүй видео байршуулалтын түр файлуудыг цэвэрлэнэ.
 */
class CloseExpiredLabExams extends Command
{
    protected $signature = 'lab:close-expired-exams';

    protected $description = 'Хугацаа дууссан шалгалтыг дүгнэж, түр файлуудыг цэвэрлэх';

    public function handle(ExamGrader $grader, VideoUploadService $videos): int
    {
        $closed = $grader->autoSubmitExpired();
        $purged = $videos->purgeStale();

        $this->info("Автоматаар дүгнэсэн оролдлого: {$closed}");
        $this->info("Цэвэрлэсэн дуусаагүй байршуулалт: {$purged}");

        return self::SUCCESS;
    }
}
