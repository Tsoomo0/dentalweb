<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('patient_medical_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->boolean('has_heart_disease')->default(false);
            $table->boolean('has_diabetes')->default(false);
            $table->boolean('has_hypertension')->default(false);
            $table->boolean('has_hepatitis')->default(false);
            $table->boolean('has_bleeding_disorder')->default(false);
            $table->boolean('has_asthma')->default(false);
            $table->boolean('has_epilepsy')->default(false);
            $table->boolean('has_kidney_disease')->default(false);
            $table->boolean('has_hiv')->default(false);
            $table->boolean('has_mental_disorder')->default(false);
            $table->boolean('has_cancer')->default(false);
            $table->boolean('is_cancer_treatment')->default(false);
            $table->boolean('has_thyroid_disorder')->default(false);
            $table->boolean('has_anemia')->default(false);
            $table->boolean('takes_blood_thinners')->default(false);
            $table->boolean('has_tuberculosis')->default(false);
            $table->boolean('has_infectious_hepatitis')->default(false);
            $table->boolean('has_tonsils')->default(false);
            $table->boolean('is_pregnant')->default(false);
            $table->boolean('is_nursing')->default(false);
            $table->boolean('has_womens_condition')->default(false);
            $table->boolean('is_smoker')->default(false);
            $table->boolean('drinks_alcohol')->default(false);
            $table->text('other_conditions')->nullable();
            $table->text('organ_stones')->nullable();
            $table->boolean('allergy_penicillin')->default(false);
            $table->boolean('allergy_aspirin')->default(false);
            $table->boolean('allergy_latex')->default(false);
            $table->boolean('allergy_anesthetic')->default(false);
            $table->boolean('had_anesthetic_allergy')->default(false);
            $table->text('allergy_other')->nullable();
            $table->text('current_medications')->nullable();
            $table->text('special_ongoing_treatment')->nullable();
            $table->boolean('had_dental_complications')->default(false);
            $table->text('dental_complication_detail')->nullable();
            $table->text('previous_surgeries')->nullable();
            $table->text('previous_dental_treatments')->nullable();
            $table->string('last_checkup')->nullable();
            $table->text('previous_dental_clinics')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('patient_medical_histories'); }
};
