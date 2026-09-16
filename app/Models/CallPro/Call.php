<?php

namespace App\Models\CallPro;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Call extends Model
{
    /** Шийдвэрлэсэн байдлын сонголтууд — тайлан гаргах боломжтой байхын тулд тогтмол. */
    public const RESOLUTIONS = [
        'called_back' => 'Эргэж холбогдсон',
        'appointment_made' => 'Цаг өгсөн',
        'resolved' => 'Асуудал шийдвэрлэсэн',
        'no_answer' => 'Залгасан боловч авахгүй байна',
        'wrong_number' => 'Буруу дугаар',
        'spam' => 'Хамааралгүй / зар',
    ];

    protected $fillable = [
        'unique_id', 'number', 'number_norm', 'business_number', 'caller_name', 'direction',
        'call_status', 'queue_name', 'agent', 'branch_id', 'user_id',
        'started_at', 'answered_at', 'ended_at', 'duration', 'talk_time', 'hold_time',
        'call_record', 'is_missed', 'is_after_hours', 'is_spam', 'missed_notified_at',
        'escalated_at', 'handled_at', 'handled_by', 'resolution',
        'resolution_note', 'source',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'answered_at' => 'datetime',
        'ended_at' => 'datetime',
        'handled_at' => 'datetime',
        'missed_notified_at' => 'datetime',
        'is_missed' => 'boolean',
        'is_after_hours' => 'boolean',
        'is_spam' => 'boolean',
        'escalated_at' => 'datetime',
        'duration' => 'integer',
        'talk_time' => 'integer',
        'hold_time' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /** Дуудлагад хариулсан ажилтан (extension-аар тодорхойлогдсон бол). */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    public function events(): HasMany
    {
        return $this->hasMany(CallEvent::class);
    }

    /** Алдсан бөгөөд хараахан шийдэгдээгүй. Спамыг тооцохгүй. */
    public function scopeUnhandledMissed(Builder $q): Builder
    {
        return $q->where('is_missed', true)
            ->where('is_spam', false)
            ->whereNull('handled_at');
    }

    /** Ресепшн зөвхөн өөрийн салбарынхаа дуудлагыг харна. */
    public function scopeForBranch(Builder $q, ?int $branchId): Builder
    {
        return $branchId ? $q->where('branch_id', $branchId) : $q;
    }

    public function getResolutionLabelAttribute(): ?string
    {
        return $this->resolution ? (self::RESOLUTIONS[$this->resolution] ?? $this->resolution) : null;
    }

    public function isHandled(): bool
    {
        return $this->handled_at !== null;
    }

    public function hasRecording(): bool
    {
        return filled($this->call_record);
    }
}
