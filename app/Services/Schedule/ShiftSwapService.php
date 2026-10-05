<?php

namespace App\Services\Schedule;

use App\Models\HR\Employee;
use App\Models\HR\Shift;
use App\Models\HR\ShiftSwapRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Ээлж шилжүүлэх/солилцох урсгал.
 *   Шилжүүлэх: хүсэгчийн ээлжийг хамт ажилтан авна.
 *   Солилцох:  хоёр ээлжийн эзнийг сольно.
 * HR батлах үед өөрчлөлт шууд нийтлэгдэнэ (тохиролцоо аль хэдийн хийгдсэн).
 */
final class ShiftSwapService
{
    public function request(Employee $requester, Shift $shift, Employee $target, ?Shift $targetShift, ?string $note): ShiftSwapRequest
    {
        if ($shift->employee_id !== $requester->id || $shift->status !== Shift::STATUS_PUBLISHED || ! $shift->isWork()) {
            throw ValidationException::withMessages(['shift_id' => 'Зөвхөн өөрийн нийтлэгдсэн ажлын ээлжийг шилжүүлнэ.']);
        }
        if ($shift->date->lt(today())) {
            throw ValidationException::withMessages(['shift_id' => 'Өнгөрсөн өдрийн ээлжийг шилжүүлэх боломжгүй.']);
        }
        if ($target->id === $requester->id || $target->status !== 'active') {
            throw ValidationException::withMessages(['target_employee_id' => 'Хамт ажилтнаа зөв сонгоно уу.']);
        }
        if ($targetShift && ($targetShift->employee_id !== $target->id || $targetShift->status !== Shift::STATUS_PUBLISHED
            || ! $targetShift->isWork() || $targetShift->date->lt(today()))) {
            throw ValidationException::withMessages(['target_shift_id' => 'Солилцох ээлж буруу байна.']);
        }
        if (ShiftSwapRequest::where('shift_id', $shift->id)->whereIn('status', [ShiftSwapRequest::PENDING_PEER, ShiftSwapRequest::PENDING_APPROVAL])->exists()) {
            throw ValidationException::withMessages(['shift_id' => 'Энэ ээлжид шийдэгдээгүй хүсэлт байна.']);
        }

        $swap = ShiftSwapRequest::create([
            'shift_id' => $shift->id,
            'requester_id' => $requester->id,
            'target_employee_id' => $target->id,
            'target_shift_id' => $targetShift?->id,
            'note' => $note ? mb_substr($note, 0, 500) : null,
            'status' => ShiftSwapRequest::PENDING_PEER,
        ]);

        ScheduleNotifier::swap($swap, 'requested');

        return $swap;
    }

    public function respond(ShiftSwapRequest $swap, Employee $target, bool $accept): void
    {
        if ($swap->target_employee_id !== $target->id || $swap->status !== ShiftSwapRequest::PENDING_PEER) {
            throw ValidationException::withMessages(['swap' => 'Энэ хүсэлтэд хариулах боломжгүй.']);
        }

        $swap->update([
            'status' => $accept ? ShiftSwapRequest::PENDING_APPROVAL : ShiftSwapRequest::REJECTED,
            'peer_responded_at' => now(),
        ]);

        ScheduleNotifier::swap($swap, $accept ? 'awaiting_approval' : 'peer_declined');
    }

    public function cancel(ShiftSwapRequest $swap, Employee $requester): void
    {
        if ($swap->requester_id !== $requester->id || ! $swap->isOpen()) {
            throw ValidationException::withMessages(['swap' => 'Энэ хүсэлтийг цуцлах боломжгүй.']);
        }

        $swap->update(['status' => ShiftSwapRequest::CANCELLED]);
    }

    public function decide(ShiftSwapRequest $swap, bool $approve, ?int $userId, ?string $reason = null): void
    {
        if ($swap->status !== ShiftSwapRequest::PENDING_APPROVAL) {
            throw ValidationException::withMessages(['swap' => 'Энэ хүсэлт шийдвэр хүлээгээгүй байна.']);
        }

        DB::transaction(function () use ($swap, $approve, $userId, $reason) {
            if ($approve) {
                $shift = Shift::lockForUpdate()->find($swap->shift_id);
                $targetShift = $swap->target_shift_id ? Shift::lockForUpdate()->find($swap->target_shift_id) : null;
                if (! $shift || ($swap->target_shift_id && ! $targetShift)) {
                    throw ValidationException::withMessages(['swap' => 'Ээлж өөрчлөгдсөн тул хүсэлтийг батлах боломжгүй.']);
                }

                // Нийтлэгдсэн мөрөнд хүлээгдэж буй ноорог байвал эзэн нь хамт шилжинэ.
                Shift::where('replaces_id', $shift->id)->update(['employee_id' => $swap->target_employee_id]);
                $shift->update(['employee_id' => $swap->target_employee_id, 'assigned_doctor_id' => null, 'source' => 'swap', 'updated_by' => $userId, 'published_at' => now()]);

                if ($targetShift) {
                    Shift::where('replaces_id', $targetShift->id)->update(['employee_id' => $swap->requester_id]);
                    $targetShift->update(['employee_id' => $swap->requester_id, 'assigned_doctor_id' => null, 'source' => 'swap', 'updated_by' => $userId, 'published_at' => now()]);
                }
            }

            $swap->update([
                'status' => $approve ? ShiftSwapRequest::APPROVED : ShiftSwapRequest::REJECTED,
                'decided_by' => $userId,
                'decided_at' => now(),
                'rejection_reason' => $approve ? null : ($reason ? mb_substr($reason, 0, 500) : null),
            ]);
        });

        ScheduleNotifier::swap($swap->fresh(), $approve ? 'approved' : 'rejected');
    }
}
