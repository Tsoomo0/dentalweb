<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CallPro дуудлагын бүртгэл.
 *
 * Нэг дуудлагад 3-4 event ирдэг (start → answered → end) бөгөөд бүгд нэг
 * `unique_id`-тай тул энэ хүснэгт дээр дараалан updateOrCreate хийнэ.
 *
 * `Call abandoned` event нь ОНЦГОЙ тохиолдол: `unique_id` огт ирдэггүй тул
 * тэр мөрүүд unique_id = NULL-тэй үүснэ (MySQL unique индекс олон NULL зөвшөөрнө).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calls', function (Blueprint $table) {
            $table->id();

            // CallPro-гийн unique_id / Callid. Abandoned дээр байхгүй тул nullable.
            $table->string('unique_id', 64)->nullable()->unique();

            // Дугаарыг түүхийгээр нь хадгална — CallPro int илгээдэг ч урд талын
            // 0 эсвэл +976 алдагдахаас сэргийлж string болгон авна.
            $table->string('number', 32)->nullable();
            // Өвчтөнтэй тааруулахад ашиглах нормчилсон хэлбэр (сүүлийн 8 орон).
            $table->string('number_norm', 16)->nullable();
            $table->string('caller_name')->nullable();

            $table->string('direction', 16)->default('inbound');   // inbound | outbound
            $table->string('call_status', 32)->nullable();         // ANSWERED | NO ANSWER | ABANDONED
            $table->string('queue_name')->nullable();

            // CallPro-с ирсэн түүхий agent утга. call_extensions-тэй таарвал
            // branch_id / user_id бөглөгдөнө, таарахгүй бол энэ утга үлдэж
            // админ гар аргаар холбох боломжтой болно.
            $table->string('agent', 32)->nullable();

            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('answered_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->unsignedInteger('duration')->nullable();       // секунд
            $table->unsignedInteger('hold_time')->nullable();      // хүлээлгэсэн хугацаа

            // Бичлэгийн URL. Хөтөч рүү ХЭЗЭЭ Ч шууд өгөхгүй — өөрийн сервер
            // дээгүүр дамжуулж, хэн сонссоныг бүртгэнэ.
            $table->string('call_record', 512)->nullable();

            $table->boolean('is_missed')->default(false);
            // Мэдэгдэл давхардахаас сэргийлнэ: нэг алдсан дуудлагад abandoned
            // болон "NO ANSWER"-тэй end гэсэн ХОЁР event ирж болзошгүй.
            $table->timestamp('missed_notified_at')->nullable();
            $table->timestamp('handled_at')->nullable();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('resolution', 32)->nullable();
            $table->text('resolution_note')->nullable();

            $table->string('source', 16)->default('realtime');     // realtime | backfill
            $table->timestamps();

            $table->index('number_norm');
            $table->index('started_at');
            $table->index('queue_name');
            $table->index(['branch_id', 'started_at']);
            // Ресепшний гол дэлгэц: салбарын шийдэгдээгүй алдсан дуудлага
            $table->index(['branch_id', 'is_missed', 'handled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calls');
    }
};
