<?php

namespace App\Console\Commands;

use App\Models\Social\SocialContact;
use App\Services\Social\GenderGuesser;
use Illuminate\Console\Command;

class GuessSocialGenders extends Command
{
    protected $signature = 'social:guess-genders {--all : Хүйс онооттойг ч дахин таамаглах}';

    protected $description = 'Social контактуудын хүйсийг нэрээр таамаглаж бөглөх (Meta өгдөггүй тул)';

    public function handle(GenderGuesser $guesser): int
    {
        $query = SocialContact::whereNotNull('name')->where('name', '!=', '');
        if (! $this->option('all')) {
            $query->whereNull('gender');
        }

        $contacts = $query->get(['id', 'name', 'gender']);
        $updated = 0;

        foreach ($contacts as $contact) {
            $guess = $guesser->guess($contact->name);
            if ($guess !== null && $guess !== $contact->gender) {
                $contact->gender = $guess;
                $contact->save();
                $updated++;
            }
        }

        $this->info("Шалгасан: {$contacts->count()}, шинэчилсэн: {$updated}");

        return self::SUCCESS;
    }
}
