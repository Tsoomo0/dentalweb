<?php

namespace App\Providers;

use App\Models\Setting;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        try {
            if (Schema::hasTable('settings')) {
                $tz = Setting::where('key', 'timezone')->value('value');
                if ($tz) {
                    config(['app.timezone' => $tz]);
                    date_default_timezone_set($tz);
                }
            }
        } catch (\Throwable) {
            // DB холбогдоогүй үед (migrate хийхэд) тойрно
        }
    }
}
