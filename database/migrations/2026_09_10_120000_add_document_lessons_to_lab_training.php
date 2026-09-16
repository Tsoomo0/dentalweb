<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Хичээлийг видеогоор хязгаарлахаа болино — баримт (PDF/PPT/DOCX) ч хичээл
 * болно.
 *
 * ЯАГААД: нэг видео хичээл бэлдэхэд хэдэн цаг зарцуулагддаг тул сургалтын
 * сан удаан ургаж байлаа. Лабд аль хэдийн бичигдсэн заавар, үзүүлэлт,
 * илтгэл олон бий — тэдгээрийг өнөөдөр л хичээл болгож болно.
 *
 * ХАДГАЛАХ ЗАРЧИМ: видеотой яг адилхан — файл нь DB-д ОРОХГҮЙ, private диск
 * дээр байрлаж зөвхөн эрхтэй ажилтанд stream хийгдэнэ.
 *
 * ХӨРВҮҮЛЭЛТ: браузер PPT/DOCX-ийг нээж чаддаггүй тул сервер тэдгээрийг
 * PDF болгож хөрвүүлнэ (LibreOffice). Анхны файлыг ХАДГАЛСААР үлдэнэ —
 * ажилтан эх хувилбарыг татаж авч болно, мөн хөрвүүлэлт бүтэлгүйтвэл
 * дахин оролдох боломжтой.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_lessons', function (Blueprint $table) {
            // video | document — тоглуулагч эсвэл уншигчийн аль нь ажиллахыг заана
            $table->string('kind', 20)->default('video')->after('order');

            // Үзүүлэх PDF (эх файл PDF байсан бол мөн энэ)
            $table->string('doc_path')->nullable()->after('poster_path');

            // Анхны байршуулсан файл — PPT/DOCX бол хөрвүүлэхээс өмнөх хувилбар
            $table->string('doc_source_path')->nullable()->after('doc_path');
            $table->string('doc_source_name')->nullable()->after('doc_source_path');

            // pending → хөрвүүлж байна | ready → үзэхэд бэлэн | failed → алдаа
            $table->string('doc_status', 20)->nullable()->after('doc_source_name');
            $table->string('doc_error')->nullable()->after('doc_status');

            // Явц бодоход хэрэглэнэ: видеонд секунд юу бол баримтад хуудас
            $table->unsignedSmallInteger('page_count')->default(0)->after('doc_error');

            $table->index('kind');
        });
    }

    public function down(): void
    {
        Schema::table('lab_lessons', function (Blueprint $table) {
            $table->dropIndex(['kind']);
            $table->dropColumn([
                'kind', 'doc_path', 'doc_source_path', 'doc_source_name',
                'doc_status', 'doc_error', 'page_count',
            ]);
        });
    }
};
