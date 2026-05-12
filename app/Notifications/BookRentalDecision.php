<?php

namespace App\Notifications;

use App\Mail\BookRentalDecisionMail;
use App\Models\HR\BookRental;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class BookRentalDecision extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;
    public function __construct(public readonly BookRental $rental) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (!empty($notifiable->email)) {
            $channels[] = 'mail';
        }
        return $channels;
    }

    public function toMail(object $notifiable): BookRentalDecisionMail
    {
        return (new BookRentalDecisionMail($this->rental))->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        $book = $this->rental->book;
        return [
            'type'            => 'book_rental_decision',
            'book_rental_id'  => $this->rental->id,
            'book_title'      => $book->title,
            'book_author'     => $book->author,
            'status'          => $this->rental->status,
            'rejection_reason'=> $this->rental->rejection_reason,
            'message'         => $this->rental->status === 'approved'
                ? "'{$book->title}' номын түрээс зөвшөөрөгдлөө"
                : "'{$book->title}' номын түрээс цуцлагдлаа",
        ];
    }
}
