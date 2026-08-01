<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class JobApplicationSubmitTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'last_name' => 'Бат',
            'first_name' => 'Болд',
            'phone_mobile' => '99112233',
            'desired_position' => 'Эмч',
            'has_insurance' => false,
            'has_health_insurance' => false,
            'has_driving_license' => false,
            'has_car' => false,
            'is_married' => false,
        ], $overrides);
    }

    public function test_application_is_saved_with_desired_position(): void
    {
        $this->post('/job-application', $this->payload())
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame(
            'Эмч',
            JobApplication::where('phone_mobile', '99112233')->first()?->desired_position
        );
    }

    public function test_desired_position_is_required(): void
    {
        $this->post('/job-application', $this->payload(['desired_position' => '']))
            ->assertSessionHasErrors('desired_position');

        $this->assertSame(0, JobApplication::count());
    }

    public function test_duplicate_submit_within_a_minute_is_blocked(): void
    {
        $this->post('/job-application', $this->payload())
            ->assertSessionHas('success');

        $this->post('/job-application', $this->payload())
            ->assertSessionHas('error');

        $this->assertSame(1, JobApplication::count());
    }

    public function test_notification_failure_does_not_cause_500(): void
    {
        // Мэйл драйверыг зориуд эвдэж, notification шатанд exception үүсгэнэ
        config()->set('mail.default', 'smtp');
        config()->set('mail.mailers.smtp.host', 'invalid.host.local');
        config()->set('mail.mailers.smtp.port', 2525);
        config()->set('mail.mailers.smtp.timeout', 1);

        User::factory()->create([
            'role_id' => Role::firstOrCreate(['name' => 'admin'])->id,
        ]);

        $this->post('/job-application', $this->payload())
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame(1, JobApplication::count());
    }

    public function test_admin_notification_is_queued_not_sent_synchronously(): void
    {
        config()->set('queue.default', 'database');

        User::factory()->create([
            'role_id' => Role::firstOrCreate(['name' => 'admin'])->id,
        ]);

        $this->post('/job-application', $this->payload())
            ->assertSessionHas('success');

        // Хүсэлтийн дотор SMTP-руу яваагүй, queue-д тавигдсан байх ёстой
        $this->assertGreaterThan(0, DB::table('jobs')->count());
    }

    public function test_throttled_submit_returns_friendly_message_not_error_screen(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->withHeader('X-Inertia', 'true')
                ->post('/job-application', $this->payload(['phone_mobile' => '9911223'.$i]));
        }

        $this->withHeader('X-Inertia', 'true')
            ->post('/job-application', $this->payload(['phone_mobile' => '99887766']))
            ->assertRedirect()
            ->assertSessionHas('error');
    }
}
