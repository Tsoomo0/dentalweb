<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use App\Notifications\AdminActionNotification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Request;

class AuditService
{
    /** Бусад admin-руу мэдэгдэх write event-ууд. */
    protected const NOTIFY_EVENTS = [
        'created', 'updated', 'deleted',
        'status_changed', 'confirmed', 'rejected',
        'approved', 'finalized', 'reopened',
        'sent', 'paid',
    ];

    public static function log(
        string $event,
        ?Model $subject = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $description = null,
        bool $notify = true,
    ): void {
        $actor = Auth::guard('doctor')->check()
            ? Auth::guard('doctor')->user()
            : Auth::user();

        AuditLog::create([
            'event' => $event,
            'auditable_type' => $subject ? get_class($subject) : null,
            'auditable_id' => $subject?->id,
            'actor_type' => $actor ? class_basename($actor) : null,
            'actor_id' => $actor?->id,
            'actor_name' => $actor?->name,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => Request::ip(),
            'description' => $description,
        ]);

        // Email + database notification to OTHER admins (not the actor).
        if ($notify && $actor instanceof User && in_array($event, self::NOTIFY_EVENTS, true)) {
            try {
                $otherAdmins = User::query()
                    ->whereHas('role', fn ($q) => $q->where('name', 'admin'))
                    ->where('is_active', true)
                    ->where('id', '!=', $actor->id)
                    ->whereNotNull('email')
                    ->get();

                if ($otherAdmins->isNotEmpty()) {
                    Notification::send($otherAdmins, new AdminActionNotification(
                        event: $event,
                        description: $description ?? ($event.' — '.($subject ? class_basename($subject) : '')),
                        actorName: $actor->name ?? 'Тодорхойгүй',
                        subjectType: $subject ? class_basename($subject) : null,
                        subjectId: $subject?->id,
                    ));
                }
            } catch (\Throwable $e) {
                Log::warning('Admin action notification failed', ['err' => $e->getMessage()]);
            }
        }
    }
}
