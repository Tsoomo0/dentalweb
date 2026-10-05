<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Хурууны хээний ирцийн төхөөрөмжүүд (ZKTeco).
 *
 * Холболтын хоёр төрөл:
 *   - pull — салбарын агент 4370 портоор уншаад /api/attendance/ingest руу илгээнэ
 *            (JDF200 гэх мэт ADMS-гүй загвар). Агент `api_token`-оор нэвтэрнэ.
 *   - push — төхөөрөмж өөрөө /iclock/* руу ADMS протоколоор илгээнэ (TX628 гэх мэт).
 *            Serial дугаараар танигдана; бүртгэлгүй SN ирвэл идэвхгүй төлөвт үүснэ.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_devices', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->string('connection_type', 8); // pull | push
            $table->string('serial_number', 64)->nullable()->unique();
            $table->string('model', 64)->nullable();
            $table->string('firmware', 64)->nullable();
            // pull төрөлд — агентын config.json-д орно
            $table->string('ip_address', 64)->nullable();
            $table->unsignedInteger('port')->default(4370);
            $table->unsignedInteger('comm_key')->default(0);
            // Агентын токены sha256 — эх токеныг зөвхөн үүсгэх үед нэг удаа харуулна
            $table->string('api_token_hash', 64)->nullable()->unique();
            // push төрөлд — ADMS handshake-д буцаах ATTLOG stamp
            $table->string('push_stamp', 32)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_seen_at')->nullable();
            $table->string('last_ip', 64)->nullable();
            $table->dateTime('last_punch_at')->nullable();
            // Төхөөрөмжийн цаг серверийнхээс хэдэн секунд зөрүүтэй (агент мэдээлнэ)
            $table->integer('clock_drift_seconds')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_devices');
    }
};
