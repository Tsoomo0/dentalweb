<?php

namespace App\Console\Commands;

use App\Models\Lab\LabLesson;
use App\Models\Lab\LabLessonView;
use App\Models\Lab\LabTrainingReminder;
use App\Models\User;
use App\Notifications\LabLessonDeadline;
use App\Services\Lab\TrainingAudience;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

/**
 * Заавал үзэх хичээлийн хугацааны сануулга.
 *
 *   php artisan lab:training-reminders            → 3 хоногийн өмнө + хэтэрсэн
 *   php artisan lab:training-reminders --days=7   → 7 хоногийн өмнө сануулна
 *   php artisan lab:training-reminders --dry-run  → зөвхөн хэнд явахыг хэвлэнэ
 *
 * ЯАГААД ЭНЭ ХЭРЭГТЭЙ ВЭ: өмнө нь хугацаа хэтэрсэн эсэхийг зөвхөн админ
 * тайлангийн хуудсанд орж үзэж байж мэдэх байсан. Өөрөөр хэлбэл хяналт нь
 * админы санамжаас хамаарч байлаа. Одоо систем өөрөө ажилтныг сануулж,
 * админыг долоо хоногийн хураангуйгаар мэдээлнэ.
 *
 * ДАВХАРДАЛ: илгээсэн бүрээ `lab_training_reminders`-д бүртгэнэ. Хугацаа
 * (`due_at`) өөрчлөгдвөл шинэ мөчлөг гэж үзэж дахин илгээнэ — админ хугацааг
 * сунгасан бол ажилтан шинэ хугацааг мэдэх ёстой.
 */
class SendTrainingReminders extends Command
{
    protected $signature = 'lab:training-reminders {--days=3} {--dry-run}';

    protected $description = 'Заавал үзэх хичээлийн хугацааны сануулгыг ажилтнуудад илгээх';

    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $dry  = (bool) $this->option('dry-run');

        $lessons = LabLesson::query()
            ->where('is_published', true)
            ->where('is_required', true)
            ->whereNotNull('due_at')
            ->whereHas('course', fn ($q) => $q->where('is_published', true))
            ->with('course.positions:id')
            ->get();

        if ($lessons->isEmpty()) {
            $this->info('Хугацаатай заавал үзэх хичээл алга — сануулга илгээсэнгүй.');

            return self::SUCCESS;
        }

        $sent = 0;

        foreach ($lessons as $lesson) {
            $kind = $this->kindFor($lesson, $days);

            // Хугацаа хол байгаа хичээлд одоохондоо хийх зүйл алга
            if ($kind === null) {
                continue;
            }

            foreach ($this->pendingStaff($lesson) as $user) {
                if ($this->alreadySent($user, $lesson, $kind)) {
                    continue;
                }

                $this->line(sprintf(
                    '  %s → %s (%s)',
                    $user->name,
                    $lesson->title,
                    $kind === LabTrainingReminder::KIND_OVERDUE ? 'хэтэрсэн' : 'ойртсон',
                ));

                if (! $dry) {
                    $user->notify(new LabLessonDeadline($lesson, $kind));
                    $this->record($user, $lesson, $kind);
                }

                $sent++;
            }
        }

        $this->info($dry
            ? "Туршилтын горим: {$sent} сануулга илгээгдэх байсан."
            : "Илгээсэн сануулга: {$sent}");

        return self::SUCCESS;
    }

    /**
     * Энэ хичээлд одоо ямар сануулга тохирох вэ.
     *
     * null → хугацаа нь хол хэвээр, сануулах шаардлагагүй.
     */
    protected function kindFor(LabLesson $lesson, int $days): ?string
    {
        if ($lesson->due_at->isPast()) {
            return LabTrainingReminder::KIND_OVERDUE;
        }

        return $lesson->due_at->lessThanOrEqualTo(now()->addDays($days))
            ? LabTrainingReminder::KIND_DUE_SOON
            : null;
    }

    /**
     * Энэ хичээлийг үзэж дуусгаагүй, хамрах хүрээний ажилтнууд.
     *
     * @return Collection<int, User>
     */
    protected function pendingStaff(LabLesson $lesson): Collection
    {
        $done = LabLessonView::where('lab_lesson_id', $lesson->id)
            ->whereNotNull('completed_at')
            ->pluck('user_id');

        return TrainingAudience::forLesson($lesson)
            ->whereKeyNot($done)
            ->get();
    }

    /** Ижил хугацаагаар ижил төрлийн сануулга аль хэдийн явсан эсэх. */
    protected function alreadySent(User $user, LabLesson $lesson, string $kind): bool
    {
        return LabTrainingReminder::where('user_id', $user->id)
            ->where('lab_lesson_id', $lesson->id)
            ->where('kind', $kind)
            ->where('due_at', $lesson->due_at)
            ->exists();
    }

    protected function record(User $user, LabLesson $lesson, string $kind): void
    {
        LabTrainingReminder::firstOrCreate(
            [
                'user_id'       => $user->id,
                'lab_lesson_id' => $lesson->id,
                'kind'          => $kind,
                'due_at'        => $lesson->due_at,
            ],
            ['sent_at' => now()],
        );
    }
}
