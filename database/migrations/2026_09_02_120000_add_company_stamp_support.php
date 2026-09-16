<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hr_employee_documents', function (Blueprint $table) {
            // Гарын үсэг зурах үеийн тамганы хуулбар — дараа компанийн тамга
            // солигдсон ч баталгаажсан гэрээ өөрчлөгдөхгүй байхаар хувилж хадгална.
            $table->longText('employer_stamp')->nullable()->after('employer_signed_at');
        });

        Setting::updateOrCreate(['key' => 'company_stamp_path'], [
            'value' => null,
            'group' => 'general',
            'label' => 'Байгууллагын тамга',
            'description' => 'Гэрээнд дарагдах тамганы зураг — HR → Гэрээ / АБТ хэсгээс оруулна',
            'type' => 'image',
            'is_sensitive' => false,
        ]);
        Setting::clearCache();
    }

    public function down(): void
    {
        Schema::table('hr_employee_documents', function (Blueprint $table) {
            $table->dropColumn('employer_stamp');
        });

        Setting::where('key', 'company_stamp_path')->delete();
        Setting::clearCache();
    }
};
