<?php

namespace App\Models\HR;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HrDocumentCategory extends Model
{
    protected $table = 'hr_document_categories';

    protected $fillable = ['name', 'color', 'order'];

    public function documents(): HasMany
    {
        return $this->hasMany(HrDocument::class, 'category_id');
    }
}
