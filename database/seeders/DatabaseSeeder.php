<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            AdminSeeder::class,
            BotFlowSeeder::class,
            ConsentFormTemplateSeeder::class,
            LabOrderTestSeeder::class,
            LabPortalTestSeeder::class,
            SampleDataSeeder::class,
            SettingSeeder::class,
            SocialAiFaqSeeder::class,
            SocialTestFlowSeeder::class,
            SupportStaffSeeder::class,
        ]);
    }
}
