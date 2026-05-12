<?php

namespace App\Models\HR;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookCategory extends Model
{
    protected $fillable = ['name', 'color'];

    public function books(): HasMany
    {
        return $this->hasMany(Book::class);
    }
}
