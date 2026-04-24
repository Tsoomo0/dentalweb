<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();

            // 1. ҮНДСЭН МЭДЭЭЛЭЛ
            $table->string('last_name');           // Эцэг/эхийн нэр
            $table->string('first_name');          // Өөрийн нэр
            $table->string('family_name')->nullable();  // Ургийн овог
            $table->string('gender')->nullable();       // Хүйс
            $table->string('birth_city')->nullable();   // Төрсөн аймаг, хот
            $table->date('birth_date')->nullable();     // Төрсөн он, сар, өдөр
            $table->string('register_no')->nullable();  // Регистр №
            $table->boolean('has_insurance')->default(false);        // НДД
            $table->boolean('has_health_insurance')->default(false); // ЭМДД
            $table->text('address')->nullable();        // Оршин суугаа хаяг
            $table->boolean('has_driving_license')->default(false);  // Жолооны үнэмлэх
            $table->string('driving_class')->nullable();  // Жолооны ангилал
            $table->boolean('has_car')->default(false);   // Хувийн машин
            $table->string('phone_home')->nullable();     // Утас (гэр)
            $table->string('phone_mobile')->nullable();   // Утас (гар)
            $table->string('email')->nullable();          // И-мэйл

            // 2. БОЛОВСРОЛ
            $table->json('education')->nullable();             // Сургуулиудын мэдээлэл
            $table->json('professional_training')->nullable(); // Мэргэшлийн сургалт

            // 3. АЖЛЫН ТУРШЛАГА
            $table->string('total_work_years')->nullable();         // Нийт ажилласан жил
            $table->string('unverified_work_years')->nullable();    // НДД-ээр баталгаажаагүй
            $table->string('employment_status')->nullable();        // Хөдөлмөр эрхлэлтийн байдал
            $table->json('work_experience')->nullable();            // Ажлын туршлага

            // 4. УР ЧАДВАР
            $table->json('skills_languages')->nullable();   // Гадаад хэл
            $table->json('skills_computer')->nullable();    // Компьютерийн чадвар
            $table->json('skills_talents')->nullable();     // Авьяас чадвар

            // 5. ГАВЪЯА ШАГНАЛ
            $table->json('awards')->nullable();

            // 6. ТОДОРХОЙЛОЛТ
            $table->json('references')->nullable();

            // 7. ГЭР БҮЛИЙН БАЙДАЛ
            $table->boolean('is_married')->default(false);
            $table->json('family_members')->nullable();
            $table->json('family_relatives')->nullable();

            // 8. БУСАД
            $table->string('health_status')->nullable();
            $table->text('goals_5years')->nullable();
            $table->text('strengths')->nullable();
            $table->text('weaknesses')->nullable();
            $table->text('additional_info')->nullable();
            $table->string('info_source')->nullable();

            // Удирдлагын талбарууд
            $table->enum('status', ['pending', 'reviewed', 'shortlisted', 'rejected'])->default('pending');
            $table->text('admin_notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_applications');
    }
};
