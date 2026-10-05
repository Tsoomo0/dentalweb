<?php

namespace App\Models\HR;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendancePunch extends Model
{
    public const SOURCE_GPS = 'gps';

    public const SOURCE_PULL = 'pull';

    public const SOURCE_PUSH = 'push';

    public const SOURCE_USB = 'usb';

    /** HR гараар нэмсэн — хуруу дарахаа мартсан үед. note-д шалтгаан, created_by-д хэн. */
    public const SOURCE_MANUAL = 'manual';

    public const TYPE_IN = 0;

    public const TYPE_OUT = 1;

    protected $fillable = [
        'employee_id', 'attendance_device_id', 'device_user_pin', 'punched_at',
        'punch_type', 'verify_type', 'source', 'lat', 'lng', 'note', 'created_by',
    ];

    protected $casts = [
        'punched_at' => 'datetime',
        'punch_type' => 'integer',
        'verify_type' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(AttendanceDevice::class, 'attendance_device_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** GPS-ийн "Тарах" товч ба HR-ийн "тарсан" цаг — санаатай үйлдэл. */
    public function isExplicitOut(): bool
    {
        return $this->punch_type === self::TYPE_OUT
            && in_array($this->source, [self::SOURCE_GPS, self::SOURCE_MANUAL], true);
    }
}
