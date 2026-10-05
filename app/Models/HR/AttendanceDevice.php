<?php

namespace App\Models\HR;

use App\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class AttendanceDevice extends Model
{
    public const TYPE_PULL = 'pull';

    public const TYPE_PUSH = 'push';

    /** Сүүлд холбогдсоноос хойш ийм хугацаа өнгөрвөл "холбогдоогүй" гэж үзнэ. */
    public const ONLINE_WINDOW_MINUTES = 15;

    /** Санах ой энэ хувиас дээш дүүрвэл HR-д анхааруулна. */
    public const STORAGE_WARN_PERCENT = 80;

    protected $fillable = [
        'name', 'branch_id', 'connection_type', 'serial_number', 'model', 'firmware',
        'ip_address', 'port', 'comm_key', 'push_stamp', 'is_active',
        'last_seen_at', 'offline_notified_at', 'last_ip', 'last_punch_at', 'clock_drift_seconds',
        'records_count', 'records_capacity', 'notes',
    ];

    protected $hidden = ['api_token_hash'];

    protected $casts = [
        'is_active' => 'boolean',
        'port' => 'integer',
        'comm_key' => 'integer',
        'last_seen_at' => 'datetime',
        'offline_notified_at' => 'datetime',
        'last_punch_at' => 'datetime',
        'clock_drift_seconds' => 'integer',
        'records_count' => 'integer',
        'records_capacity' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(AttendanceDeviceUser::class);
    }

    public function punches(): HasMany
    {
        return $this->hasMany(AttendancePunch::class);
    }

    public function isPull(): bool
    {
        return $this->connection_type === self::TYPE_PULL;
    }

    /** Санах ойн дүүргэлтийн хувь — багтаамж мэдэгдэхгүй бол null. */
    public function storagePercent(): ?int
    {
        if (! $this->records_capacity || $this->records_count === null) {
            return null;
        }

        return (int) min(100, round($this->records_count / $this->records_capacity * 100));
    }

    public function isOnline(): bool
    {
        return $this->last_seen_at !== null
            && $this->last_seen_at->gt(now()->subMinutes(self::ONLINE_WINDOW_MINUTES));
    }

    /**
     * Агентын шинэ токен үүсгээд hash-ийг хадгална. Эх токеныг буцаана —
     * дахин харах боломжгүй тул HR-д нэг удаа харуулна.
     */
    public function issueApiToken(): string
    {
        $token = 'att_'.Str::random(48);

        $this->forceFill(['api_token_hash' => hash('sha256', $token)])->save();

        return $token;
    }

    public static function findByApiToken(string $token): ?self
    {
        if ($token === '') {
            return null;
        }

        return static::where('api_token_hash', hash('sha256', $token))->first();
    }
}
