<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Гэрээ, ажлын байрны тодорхойлолтод орлуулагдах компанийн албан ёсны
     * мэдээллийг тохиргоо болгож нэмнэ — гэрээ бүрт гараар бичихээс сэргийлнэ.
     */
    private array $settings = [
        [
            'key' => 'company_legal_name',
            'value' => '“Кутикул” ХХК',
            'group' => 'general',
            'label' => 'Компанийн албан ёсны нэр',
            'description' => 'Хөдөлмөрийн гэрээ, ажлын байрны тодорхойлолтод орлуулагдана',
            'type' => 'string',
            'is_sensitive' => false,
        ],
        [
            'key' => 'director_name',
            'value' => 'Ж. Оюунбилэг',
            'group' => 'general',
            'label' => 'Захирлын нэр',
            'description' => 'Гэрээнд ажил олгогчийг төлөөлж гарын үсэг зурах хүн',
            'type' => 'string',
            'is_sensitive' => false,
        ],
        [
            'key' => 'director_position',
            'value' => 'Гүйцэтгэх захирал',
            'group' => 'general',
            'label' => 'Захирлын албан тушаал',
            'description' => 'Гэрээний гарын үсгийн хэсэгт харагдана',
            'type' => 'string',
            'is_sensitive' => false,
        ],
        [
            'key' => 'company_lawyer_name',
            'value' => 'Б. Дөлгөөн',
            'group' => 'general',
            'label' => 'Хуулийн зөвлөхийн нэр',
            'description' => 'Ажлын байрны тодорхойлолт боловсруулсан хүн',
            'type' => 'string',
            'is_sensitive' => false,
        ],
    ];

    public function up(): void
    {
        foreach ($this->settings as $setting) {
            Setting::updateOrCreate(['key' => $setting['key']], $setting);
        }
        Setting::clearCache();
    }

    public function down(): void
    {
        Setting::whereIn('key', array_column($this->settings, 'key'))->delete();
        Setting::clearCache();
    }
};
