<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $query = AuditLog::orderByDesc('created_at');

        if ($request->filled('event'))      $query->where('event', $request->event);
        if ($request->filled('actor_name')) $query->where('actor_name', 'like', '%' . $request->actor_name . '%');
        if ($request->filled('date'))       $query->whereDate('created_at', $request->date);

        $logs = $query->paginate(50)->through(fn($l) => [
            'id'             => $l->id,
            'event'          => $l->event,
            'auditable_type' => $l->auditable_type ? class_basename($l->auditable_type) : null,
            'auditable_id'   => $l->auditable_id,
            'actor_name'     => $l->actor_name ?? 'Систем',
            'actor_type'     => $l->actor_type,
            'old_values'     => $l->old_values,
            'new_values'     => $l->new_values,
            'ip_address'     => $l->ip_address,
            'description'    => $l->description,
            'created_at'     => $l->created_at->format('Y.m.d H:i:s'),
        ]);

        return Inertia::render('admin/audit-logs/index', [
            'logs'    => $logs,
            'filters' => $request->only('event', 'actor_name', 'date'),
            'events'  => ['created', 'updated', 'deleted', 'status_changed', 'login'],
        ]);
    }
}
