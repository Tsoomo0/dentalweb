<?php

namespace App\Console\Commands;

use App\Jobs\CallPro\ProcessCallEvent;
use App\Models\CallPro\CallEvent;
use App\Models\CallPro\CallQueue;
use Illuminate\Console\Command;

/**
 * Ганц алдсан дуудлага үүсгэнэ — дэлгэц дээрх сануулгын цонхыг турших.
 *
 *   php artisan calls:demo:one
 *   php artisan calls:demo:one 99001122
 *
 * `calls:demo --clear` эдгээрийг мөн цэвэрлэнэ (source = demo).
 */
class SeedOneDemoCall extends Command
{
    protected $signature = 'calls:demo:one {number? : Залгасан дугаар}';

    protected $description = 'Ганц алдсан дуудлага үүсгэж дэлгэцийн сануулгыг турших';

    public function handle(): int
    {
        $queue = CallQueue::whereNotNull('branch_id')->orderBy('id')->first();

        if (! $queue) {
            $this->error('Queue тохируулаагүй байна: php artisan db:seed --class=CallProSeeder');

            return self::FAILURE;
        }

        $number = (string) ($this->argument('number') ?: random_int(88000000, 99999999));

        $event = CallEvent::create([
            'event' => 'abandoned',
            'payload' => [
                'number' => $number,
                'queue_name' => $queue->name,
                'call_date' => now()->format('Y-m-d H:i:s'),
            ],
            'source' => 'demo',
            'ip' => '127.0.0.1',
            'received_at' => now(),
        ]);

        ProcessCallEvent::dispatchSync($event->id);

        $this->info("Алдсан дуудлага үүслээ: {$number} ({$queue->name})");

        return self::SUCCESS;
    }
}
