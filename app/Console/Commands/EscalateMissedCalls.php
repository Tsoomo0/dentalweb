<?php

namespace App\Console\Commands;

use App\Models\CallPro\Call;
use App\Models\User;
use App\Notifications\MissedCallEscalated;
use App\Services\CallPro\CallSettings;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

/**
 * SLA хяналт — тогтоосон хугацаанд баригдаагүй алдсан дуудлагыг удирдлагад
 * давхар мэдэгдэнэ.
 *
 * Ресепшн мэдэгдлээ хараагүй, эсвэл завгүй байж мартсан тохиолдолд дуудлага
 * чимээгүй алга болохоос сэргийлнэ. Нэг дуудлагад НЭГ л удаа мэдэгдэнэ
 * (escalated_at), эс бөгөөс 5 минут тутам давтагдана.
 */
class EscalateMissedCalls extends Command
{
    protected $signature = 'calls:escalate';

    protected $description = 'SLA хугацаанд баригдаагүй алдсан дуудлагыг удирдлагад мэдэгдэх';

    public function handle(): int
    {
        // Ажлын цагаас гадуур хэн ч эргэж залгах боломжгүй тул сэрэмжлүүлэхгүй.
        if (! CallSettings::isWorkingTime()) {
            $this->info('Ажлын цаг биш — алгаслаа.');

            return self::SUCCESS;
        }

        $sla = CallSettings::slaMinutes();
        $cutoff = now()->subMinutes($sla);

        $calls = Call::with('branch:id,name')
            ->unhandledMissed()
            ->where('is_after_hours', false)
            ->whereNull('escalated_at')
            ->where('started_at', '<=', $cutoff)
            // Хэт эртний бүртгэл (жишээ нь түүхэн дата) сэрэмжлүүлэг үүсгэхгүй.
            ->where('started_at', '>=', now()->subDay())
            ->get();

        if ($calls->isEmpty()) {
            $this->info('SLA хэтэрсэн дуудлага алга.');

            return self::SUCCESS;
        }

        $admins = User::whereHas('role', fn ($q) => $q->where('name', 'admin'))->get();

        if ($admins->isEmpty()) {
            $this->warn('Админ хэрэглэгч олдсонгүй.');

            return self::SUCCESS;
        }

        foreach ($calls as $call) {
            $waited = (int) $call->started_at->diffInMinutes(now());

            Notification::send($admins, new MissedCallEscalated(
                callId: $call->id,
                number: (string) $call->number,
                branchName: $call->branch?->name,
                calledAt: $call->started_at->format('Y-m-d H:i'),
                waitedMinutes: $waited,
            ));

            $call->forceFill(['escalated_at' => now()])->save();
        }

        $this->info("{$calls->count()} дуудлага SLA ({$sla} мин) хэтэрсэн — удирдлагад мэдэгдлээ.");

        return self::SUCCESS;
    }
}
