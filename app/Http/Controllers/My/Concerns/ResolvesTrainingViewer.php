<?php

namespace App\Http\Controllers\My\Concerns;

use App\Http\Controllers\My\ProfileController;
use App\Models\HR\Employee;
use App\Models\Lab\LabCourse;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

/**
 * Дотоод сургалтыг үзэж буй хүнийг тодорхойлох.
 *
 * Ажилтны хэсэг нь хоёр guard-тай: ихэнх ажилтан `web`, эмч нар `doctor`.
 * Тиймээс Auth::id() дангаараа хангалтгүй — эмчийн хувьд хоосон байна.
 * Ажилтны картаар нь дамжуулан холбоотой хэрэглэгчийг олж, явц, сэтгэгдэл
 * зэргийг зөв нэр дээр бүртгэнэ.
 *
 * Мөн энэ нь сургалтын "хаалга": ажилтны картгүй хэрэглэгч (өвчтөн) орж
 * чадахгүй, харин админ бүх сургалтыг харна.
 *
 * ҮР ДҮНГ INSTANCE ДЭЭР CACHE ХИЙХГҮЙ. Laravel нь контроллерын instance-ыг
 * Route объект дээр хадгалдаг тул нэг процесс дотор олон хүсэлт нэг instance
 * ашиглаж болно (тест, Octane). Тэгвэл өмнөх хэрэглэгчийн ажилтан дараагийн
 * хүсэлтэд үлдэж, өөр хүний сургалт нээгдэх эрсдэлтэй.
 */
trait ResolvesTrainingViewer
{
    /** Нэвтэрсэн ажилтны карт (байхгүй бол null). */
    protected function employee(): ?Employee
    {
        return ProfileController::resolveEmployee();
    }

    /** Сургалтад хандах эрхтэй хэрэглэгч — эс тэгвээс 403. */
    protected function viewer(): User
    {
        $employee = $this->employee();
        $user     = Auth::user() ?? User::find($employee?->user_id);

        abort_unless($user && ($employee || $user->isAdmin()), 403);

        return $user;
    }

    /** Явц, сэтгэгдэл, тэмдэглэл бүртгэх хэрэглэгчийн дугаар. */
    protected function userId(): int
    {
        return (int) $this->viewer()->id;
    }

    /** Албан тушаалын дугаар — сургалтын хандалтын шүүлт үүн дээр тулгуурлана. */
    protected function positionId(): ?int
    {
        return $this->employee()?->position_id;
    }

    /** Уг сургалтыг үзэх эрхтэй эсэх (админ бүгдийг үзнэ). */
    protected function canSeeCourse(?LabCourse $course): bool
    {
        if ($this->viewer()->isAdmin()) {
            return true;
        }

        return (bool) $course?->isVisibleToPosition($this->positionId());
    }
}
