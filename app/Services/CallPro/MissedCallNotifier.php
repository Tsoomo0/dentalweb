<?php

namespace App\Services\CallPro;

use App\Models\CallPro\Call;
use App\Models\CallPro\CallExtension;
use App\Models\User;
use App\Notifications\MissedCall;
use App\Services\Chat\PushService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Алдсан дуудлага гармагц ресепшнд мэдэгдэнэ — database notification (хонх)
 * болон web push (таб хаалттай ч очно) хоёр сувгаар.
 */
class MissedCallNotifier
{
    /** Үүнээс хуучин дуудлагад мэдэгдэл өгөхгүй (түүхэн дата оруулахаас хамгаална). */
    private const MAX_AGE_MINUTES = 60;

    public function __construct(private readonly PushService $push) {}

    /**
     * @param  bool  $branchOnly  Салбар нь ХОЖИМ тодорхойлогдсон тохиолдол.
     *                            Админ мэдэгдлээ аль хэдийн авсан тул зөвхөн
     *                            тухайн салбарын ажилтнууд руу дахин илгээнэ.
     */
    public function notify(Call $call, bool $branchOnly = false): void
    {
        if (! $this->shouldNotify($call, $branchOnly)) {
            return;
        }

        $call->loadMissing('branch');

        // Ижил дугаараас өнөөдөр хэдэн удаа алдсаныг тоолно — давтан залгаж
        // байгаа хүн хамгийн их анхаарал шаардана.
        $repeat = Call::where('number_norm', $call->number_norm)
            ->where('is_missed', true)
            ->whereDate('started_at', $call->started_at?->toDateString() ?? now()->toDateString())
            ->count();

        $notif = new MissedCall(
            callId: $call->id,
            number: (string) $call->number,
            branchName: $call->branch?->name,
            queueName: $call->queue_name,
            calledAt: $call->started_at?->format('Y-m-d H:i'),
            repeatCount: max(1, $repeat),
        );

        $recipients = $branchOnly && $call->branch_id !== null
            ? $this->branchStaff($call->branch_id)
            : $this->recipients($call);

        if ($recipients->isNotEmpty()) {
            Notification::send($recipients, $notif);
            $this->sendPush($recipients, $call, $repeat);
        }

        $call->forceFill(['missed_notified_at' => now()])->save();
    }

    private function shouldNotify(Call $call, bool $branchOnly = false): bool
    {
        if (! $call->is_missed) {
            return false;
        }

        // Хоёр дахь удаагаа мэдэгдэхийг зөвхөн салбар шинээр тодорхойлогдсон
        // үед зөвшөөрнө — өөр тохиолдолд нэг дуудлага давхар сэрэмжлүүлнэ.
        if (! $branchOnly && $call->missed_notified_at !== null) {
            return false;
        }

        // Спам дугаараас ирсэн дуудлага хэнийг ч сэрээх ёсгүй.
        if ($call->is_spam) {
            return false;
        }

        // Ажлын цагаас гадуур хэн ч ажлын байран дээр байхгүй. Мэдэгдэл нь
        // шөнө дунд ажилтныг сэрээхээс өөр үр дүнгүй тул анхдагчаар өгөхгүй —
        // өглөөний тайланд орно. Тохиргооноос асаах боломжтой.
        if ($call->is_after_hours && ! CallSettings::notifyAfterHours()) {
            return false;
        }

        // Түүхэн дата оруулах үед мянга мянган мэдэгдэл үүсэхээс сэргийлнэ.
        // Зөвхөн backfill-ийг хаана: «realtime биш бүхнийг хаах» гэвэл
        // туршилтын дата ч мэдэгдэлгүй болж, системийг бодитоор шалгах
        // боломжгүй болно.
        if ($call->source === 'backfill') {
            return false;
        }

        return $call->started_at === null
            || $call->started_at->gt(now()->subMinutes(self::MAX_AGE_MINUTES));
    }

    /**
     * Админ бүх дуудлагыг, ресепшн зөвхөн ӨӨРИЙН салбарынхыг авна.
     *
     * Салбар нь тодорхойгүй бол (мэдээллийн дугаар, IVR дээр товч дарахаас
     * өмнө таслагдсан, эсвэл queue бүртгэгдээгүй) мэдэгдэл ЗӨВХӨН АДМИН руу
     * очно. Бүх салбар руу цацвал 4 салбарын ресепшн нэг дуудлагыг харж,
     * хэн нь ч өөрийнх биш гэж бодоод орхих эрсдэлтэй. Админ хараад
     * зохих салбарт нь хуваарилах нь тодорхой хариуцлагатай.
     */
    private function recipients(Call $call)
    {
        $admins = User::whereHas('role', fn ($q) => $q->where('name', 'admin'))->get();

        if ($call->branch_id === null) {
            return $admins;
        }

        return $admins->merge($this->branchStaff($call->branch_id))->unique('id');
    }

    /**
     * Тухайн салбарын дуудлага барьдаг ажилтнууд.
     *
     * Эх сурвалж нь ДОТУУР ДУГААР: утас нь гар дор байгаа хүн л дуудлагыг
     * барьж чадна. `users.branch_id` нь ажлын байрны бүртгэл болохоос аль
     * утсыг хэн хариуцдагийг хэлдэггүй.
     *
     * Нэг ч дугаар холбоогүй салбарт (тохиргоо дутуу) ресепшний ажилтнууд руу
     * буцаж шилжинэ — мэдэгдэл хэнд ч хүрэхгүй чимээгүй өнгөрөхөөс бүдүүвч
     * хаяглалт хамаагүй дээр.
     */
    private function branchStaff(int $branchId)
    {
        $userIds = CallExtension::where('branch_id', $branchId)
            ->where('is_active', true)
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->unique();

        if ($userIds->isNotEmpty()) {
            return User::whereIn('id', $userIds)->get();
        }

        return User::whereHas('role', fn ($q) => $q->where('name', 'receptionist'))
            ->where('branch_id', $branchId)
            ->get();
    }

    private function sendPush($recipients, Call $call, int $repeat): void
    {
        $who = $call->number;
        $body = $repeat > 1
            ? "{$who} — өнөөдөр {$repeat} дахь удаагаа залгаж байна"
            : "{$who} руу эргэж холбогдоно уу";

        $payload = [
            'title' => '📞 Алдсан дуудлага',
            'body' => $body,
            'icon' => '/img/icon-192.png',
            'badge' => '/img/icon-192.png',
            // Нэг дуудлагын мэдэгдэл давхарлахгүй.
            'tag' => 'missed-call-'.$call->id,
            'data' => ['call_id' => $call->id, 'url' => '/reception/calls?missed=1'],
        ];

        foreach ($recipients as $user) {
            try {
                $this->push->sendToUser($user->id, $payload);
            } catch (\Throwable $e) {
                Log::warning('missed call push failed', ['user' => $user->id, 'err' => $e->getMessage()]);
            }
        }
    }
}
