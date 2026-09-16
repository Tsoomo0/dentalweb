<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CallPro console-ийн History дэлгэцээс илэрсэн хоёр талбар.
 *
 * 1. business_number — үйлчлүүлэгчийн залгасан эмнэлгийн дугаар (70003931).
 *    Бүх салбар НЭГ ижил дугаартай тул салбар ялгахад ашиглах боломжгүй;
 *    зөвхөн лавлагааны зорилгоор хадгална. (Ирээдүйд салбар бүр өөр дугаартай
 *    болбол энэ баганаас салбар тодорхойлох боломж нээгдэнэ.)
 *
 * 2. talk_time — яг ярьсан хугацаа. `duration` нь хонх дуугарсан, хүлээсэн
 *    хугацааг агуулдаг (console дээр 02:22 vs 01:05 гэж тусад нь харагдсан)
 *    тул ажилтны гүйцэтгэл хэмжихэд talk_time тохирно.
 *
 * Хоёулаа одоогийн webhook баримтад ОРООГҮЙ — CallPro-гоос нэмж илгээхийг
 * хүсэх шаардлагатай. Ирвэл автоматаар бөглөгдөнө, ирэхгүй бол хоосон үлдэнэ.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calls', function (Blueprint $table) {
            $table->string('business_number', 32)->nullable()->after('number_norm');
            $table->unsignedInteger('talk_time')->nullable()->after('duration');
        });
    }

    public function down(): void
    {
        Schema::table('calls', function (Blueprint $table) {
            $table->dropColumn(['business_number', 'talk_time']);
        });
    }
};
