<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Дотуур дугаарт гараар бичсэн тэмдэглэгээ нэмнэ.
 *
 * Бүх дугаар тодорхой нэг хүнийх байдаггүй: ресепшний ширээн дээрх суурин
 * утсыг хэд хэдэн ажилтан ээлжлэн авдаг тул нэг хэрэглэгчид холбох нь буруу.
 * Өмнө нь ийм дугаарын «Ажилтан» багана хоосон үлдэж, админ тэр нь тохиргоо
 * дутуу юу, эсвэл зориуд хоосон юу гэдгийг ялгаж чаддаггүй байв.
 *
 * `user_id` ба `staff_name` хоёр нь ХАРИЛЦАН УСТГАНА: дугаар нэг бол
 * тодорхой хүнийх, эс бөгөөс нийтийн. Хоёуланг нь зэрэг бөглөвөл алдсан
 * дуудлага хэнд очихыг тодорхойлоход зөрчил үүснэ.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('call_extensions', function (Blueprint $table) {
            $table->string('staff_name', 100)->nullable()->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('call_extensions', function (Blueprint $table) {
            $table->dropColumn('staff_name');
        });
    }
};
