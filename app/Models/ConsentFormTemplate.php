<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConsentFormTemplate extends Model
{
    protected $fillable = [
        'code',
        'category',
        'title',
        'content',
        'requires_guardian',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'requires_guardian' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function signedForms(): HasMany
    {
        return $this->hasMany(PatientConsentForm::class, 'template_id');
    }

    public static function categories(): array
    {
        return [
            'treat' => 'Treat - Ерөнхий эмчилгээ',
            'endo' => 'Endo - Сувгийн эмчилгээ',
            'ortho' => 'Ortho - Зэр засал',
            'perio' => 'Perio - Буйлны эмчилгээ',
            'prostho' => 'Prostho - Протез',
            'surg' => 'Surg - Мэс засал',
            'prevent' => 'Prevent - Урьдчилан сэргийлэх',
        ];
    }
}
