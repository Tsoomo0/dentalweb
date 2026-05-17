<?php

namespace App\Models\HR;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Book extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'book_category_id', 'title', 'author', 'isbn',
        'cover_image', 'total_copies', 'description',
    ];

    protected $casts = [
        'total_copies' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(BookCategory::class, 'book_category_id');
    }

    public function rentals(): HasMany
    {
        return $this->hasMany(BookRental::class);
    }

    public function activeRentals(): HasMany
    {
        return $this->hasMany(BookRental::class)
            ->where('status', 'approved')
            ->whereNull('returned_at');
    }

    public function getCoverUrlAttribute(): ?string
    {
        return $this->cover_image ? asset('storage/'.$this->cover_image) : null;
    }

    public function getAvailableCopiesAttribute(): int
    {
        $rented = $this->activeRentals()->count();

        return max(0, $this->total_copies - $rented);
    }
}
