<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $this->actingAs(User::factory()->create());

        // App нь user role-н дагуу /admin, /hr, /reception, /my эсвэл /patient рүү redirect хийдэг
        // тул /dashboard өөрөө assertion-д шаардлагагүй
        $this->get('/dashboard')->assertRedirect();
    }
}
