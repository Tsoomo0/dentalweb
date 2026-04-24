<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [

            // ── Ерөнхий тохиргоо ────────────────────────────────────────────
            [
                'key'         => 'site_name',
                'value'       => 'Cuticul Dental Clinic',
                'group'       => 'general',
                'label'       => 'Вэбсайтын нэр',
                'description' => 'Хөтчийн таб болон email-д харагдана',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'site_tagline',
                'value'       => 'Таны инээмсэглэлийн найдвартай эмнэлэг',
                'group'       => 'general',
                'label'       => 'Слоган',
                'description' => 'Нүүр хуудаст харагдах богино слоган',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'contact_phone',
                'value'       => '+976 7777-8888',
                'group'       => 'general',
                'label'       => 'Холбоо барих утас',
                'description' => 'Нийтэд харагдах утасны дугаар',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'contact_email',
                'value'       => 'info@cuticul.mn',
                'group'       => 'general',
                'label'       => 'Холбоо барих имэйл',
                'description' => 'Нийтэд харагдах имэйл хаяг',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'address',
                'value'       => 'Улаанбаатар хот, Сүхбаатар дүүрэг',
                'group'       => 'general',
                'label'       => 'Хаяг',
                'description' => 'Эмнэлгийн хаяг',
                'type'        => 'text',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'working_hours',
                'value'       => 'Даваа–Баасан: 09:00–18:00, Бямба: 09:00–14:00',
                'group'       => 'general',
                'label'       => 'Ажлын цаг',
                'description' => 'Нийтэд харагдах ажлын цагийн мэдээлэл',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'facebook_url',
                'value'       => '',
                'group'       => 'general',
                'label'       => 'Facebook хаяг',
                'description' => 'https://facebook.com/...',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'instagram_url',
                'value'       => '',
                'group'       => 'general',
                'label'       => 'Instagram хаяг',
                'description' => 'https://instagram.com/...',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],

            // ── Төлбөрийн тохиргоо ──────────────────────────────────────────
            [
                'key'         => 'online_consultation_fee',
                'value'       => '50000',
                'group'       => 'payment',
                'label'       => 'Онлайн зөвлөгөөний хураамж (₮)',
                'description' => 'Цаг захиалахад тооцох үнэ',
                'type'        => 'integer',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'qpay_base_url',
                'value'       => env('QPAY_BASE_URL', 'https://sandbox-merchant.qpay.mn/v2'),
                'group'       => 'payment',
                'label'       => 'QPay Base URL',
                'description' => 'Sandbox: https://sandbox-merchant.qpay.mn/v2 | Live: https://merchant.qpay.mn/v2',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'qpay_username',
                'value'       => env('QPAY_USERNAME', 'TEST_MERCHANT'),
                'group'       => 'payment',
                'label'       => 'QPay Нэвтрэх нэр',
                'description' => 'QPay merchant username',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'qpay_password',
                'value'       => env('QPAY_PASSWORD', ''),
                'group'       => 'payment',
                'label'       => 'QPay Нууц үг',
                'description' => 'QPay merchant password — хадгалахад шифрлэгдэнэ',
                'type'        => 'password',
                'is_sensitive'=> true,
            ],
            [
                'key'         => 'qpay_invoice_code',
                'value'       => env('QPAY_INVOICE_CODE', 'TEST_INVOICE'),
                'group'       => 'payment',
                'label'       => 'QPay Invoice Code',
                'description' => 'QPay invoice_code утга',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'qpay_test_mode',
                'value'       => '1',
                'group'       => 'payment',
                'label'       => 'QPay Test горим',
                'description' => 'Идэвхтэй бол sandbox URL ашиглана',
                'type'        => 'boolean',
                'is_sensitive'=> false,
            ],

            // ── Имэйл тохиргоо ──────────────────────────────────────────────
            [
                'key'         => 'mail_from_name',
                'value'       => 'Cuticul Dental',
                'group'       => 'email',
                'label'       => 'Илгээгчийн нэр',
                'description' => 'Имэйлд харагдах нэр',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'mail_from_address',
                'value'       => 'noreply@cuticul.mn',
                'group'       => 'email',
                'label'       => 'Илгээгчийн имэйл',
                'description' => 'Системийн имэйлийн From хаяг',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'mail_notify_admin',
                'value'       => 'admin@cuticul.mn',
                'group'       => 'email',
                'label'       => 'Админ мэдэгдэл имэйл',
                'description' => 'Шинэ захиалга гарахад мэдэгдэл очих имэйл',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'send_patient_confirmation',
                'value'       => '1',
                'group'       => 'email',
                'label'       => 'Үйлчлүүлэгчид баталгаажуулах имэйл явуулах',
                'description' => 'Захиалга баталгаажихад үйлчлүүлэгчид имэйл явуулна',
                'type'        => 'boolean',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'send_doctor_notification',
                'value'       => '1',
                'group'       => 'email',
                'label'       => 'Эмчид мэдэгдэл явуулах',
                'description' => 'Захиалга хийгдэхэд эмчид имэйл явуулна',
                'type'        => 'boolean',
                'is_sensitive'=> false,
            ],

            // ── Брэнд (лого, favicon) ───────────────────────────────────────
            [
                'key'         => 'site_logo',
                'value'       => '',
                'group'       => 'branding',
                'label'       => 'Вэбсайтын лого',
                'description' => 'Навигац болон имэйлд харагдах лого (PNG, SVG, WEBP — 2MB хүртэл)',
                'type'        => 'image',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'site_favicon',
                'value'       => '',
                'group'       => 'branding',
                'label'       => 'Favicon',
                'description' => 'Хөтчийн таб дахь дүрс (ICO, PNG — 512KB хүртэл, 32×32 px)',
                'type'        => 'image',
                'is_sensitive'=> false,
            ],

            // ── Системийн тохиргоо ───────────────────────────────────────────
            [
                'key'         => 'timezone',
                'value'       => 'Asia/Ulaanbaatar',
                'group'       => 'system',
                'label'       => 'Цагийн бүс',
                'description' => 'Системийн цагийн бүс (Asia/Ulaanbaatar)',
                'type'        => 'string',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'booking_enabled',
                'value'       => '1',
                'group'       => 'system',
                'label'       => 'Онлайн цаг захиалга идэвхтэй',
                'description' => 'Идэвхгүй болговол нийтийн хэрэглэгч захиалга хийж чадахгүй',
                'type'        => 'boolean',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'maintenance_mode',
                'value'       => '0',
                'group'       => 'system',
                'label'       => 'Засвар үйлчилгээний горим',
                'description' => 'Идэвхтэй бол нийтийн хуудас хаагдана',
                'type'        => 'boolean',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'appointment_advance_days',
                'value'       => '30',
                'group'       => 'system',
                'label'       => 'Цаг захиалгын урьдчилсан хугацаа (хоног)',
                'description' => 'Хэдэн хоногийн дараагийн цаг захиалахыг зөвшөөрөх',
                'type'        => 'integer',
                'is_sensitive'=> false,
            ],
            [
                'key'         => 'google_meet_auto',
                'value'       => '1',
                'group'       => 'system',
                'label'       => 'Google Meet автоматаар үүсгэх',
                'description' => 'Төлбөр төлөгдсөний дараа Meet линк автоматаар үүснэ',
                'type'        => 'boolean',
                'is_sensitive'=> false,
            ],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }
}
