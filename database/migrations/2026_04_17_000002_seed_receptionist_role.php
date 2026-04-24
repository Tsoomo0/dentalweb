<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // receptionist role бүртгэгдээгүй бол нэмнэ
        if (!DB::table('roles')->where('name', 'receptionist')->exists()) {
            DB::table('roles')->insert([
                'name'       => 'receptionist',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        // user role устгах
        DB::table('roles')->where('name', 'user')->delete();
    }

    public function down(): void
    {
        DB::table('roles')->where('name', 'receptionist')->delete();
    }
};
