<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditService
{
    public static function log(
        string  $event,
        ?Model  $subject    = null,
        ?array  $oldValues  = null,
        ?array  $newValues  = null,
        ?string $description = null
    ): void {
        $actor = Auth::guard('doctor')->check()
            ? Auth::guard('doctor')->user()
            : Auth::user();

        AuditLog::create([
            'event'          => $event,
            'auditable_type' => $subject ? get_class($subject) : null,
            'auditable_id'   => $subject?->id,
            'actor_type'     => $actor ? class_basename($actor) : null,
            'actor_id'       => $actor?->id,
            'actor_name'     => $actor?->name,
            'old_values'     => $oldValues,
            'new_values'     => $newValues,
            'ip_address'     => Request::ip(),
            'description'    => $description,
        ]);
    }
}
