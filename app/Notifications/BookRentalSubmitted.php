<?php

namespace App\Notifications;

use App\Mail\BookRentalSubmittedMail;
use App\Models\HR\BookRental;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class BookRentalSubmitted extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly BookRental $rental) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (! empty($notifiable->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): BookRentalSubmittedMail
    {
        return (new BookRentalSubmittedMail($this->rental))->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        $emp = $this->rental->employee;
        $book = $this->rental->book;

        return [
            'type' => 'book_rental_submitted',
            'book_rental_id' => $this->rental->id,
            'employee_name' => $emp->full_name,
            'employee_number' => $emp->employee_number,
            'book_title' => $book->title,
            'book_author' => $book->author,
            'message' => "{$emp->full_name} номын түрээсийн хүсэлт илгээлээ",
        ];
    }
}
