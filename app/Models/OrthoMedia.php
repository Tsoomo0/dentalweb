<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class OrthoMedia extends Model
{
    protected $fillable = ['patient_id', 'type', 'file_path', 'file_name', 'mime_type', 'file_size', 'note'];

    protected $appends = ['url'];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function getUrlAttribute(): string
    {
        return Storage::url($this->file_path);
    }
}
