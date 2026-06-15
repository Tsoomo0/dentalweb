<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\HR\Employee;
use App\Models\HR\Position;
use App\Models\Patient;
use App\Models\SubTreatment;
use App\Models\Treatment;
use App\Models\TreatmentCategory;
use App\Models\TreatmentRecord;
use Illuminate\Database\Seeder;

/**
 * Модуль бүрт 1-2 жишээ өгөгдөл (migrate:fresh-ийн дараа туршихад).
 * Идемпотент — firstOrCreate ашигласан тул дахин ажиллуулж болно.
 */
class SampleDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Салбар (Branch)
        $main = Branch::firstOrCreate(['name' => 'Төв салбар'], [
            'type' => 'клиник', 'address' => 'СБД, 1-р хороо, Сансар', 'phone' => '70003931',
            'description' => 'Үндсэн төв салбар', 'is_active' => true, 'is_featured' => true, 'order' => 1,
        ]);
        $branch2 = Branch::firstOrCreate(['name' => 'Зайсан салбар'], [
            'type' => 'клиник', 'address' => 'ХУД, Зайсан', 'phone' => '70003932',
            'is_active' => true, 'order' => 2,
        ]);

        // 2. Ажлын байр (Position)
        $posDoctor = Position::firstOrCreate(['name' => 'Эмч'], ['portal' => 'clinic', 'department' => 'Эмчилгээ', 'is_active' => true]);
        $posReception = Position::firstOrCreate(['name' => 'Ресепшн'], ['portal' => 'reception', 'department' => 'Үйлчилгээ', 'is_active' => true]);

        // 3. Үйлчилгээний ангилал / үйлчилгээ (Treatment catalog)
        $catOrtho = TreatmentCategory::firstOrCreate(['name' => 'Гажиг засал'], ['icon' => '🦷', 'order' => 1, 'is_active' => true]);
        $catGeneral = TreatmentCategory::firstOrCreate(['name' => 'Ерөнхий эмчилгээ'], ['icon' => '😁', 'order' => 2, 'is_active' => true]);

        $tMetal = Treatment::firstOrCreate(['treatment_category_id' => $catOrtho->id, 'title' => 'Металл аппарат'], [
            'description' => 'Металл гажиг заслын аппарат', 'price_min' => 1560000, 'price_max' => 1800000, 'duration_min' => 60, 'is_active' => true,
        ]);
        $tClean = Treatment::firstOrCreate(['treatment_category_id' => $catGeneral->id, 'title' => 'Шүдний цэвэрлэгээ'], [
            'description' => 'Чулуу авах, цэвэрлэгээ', 'price_min' => 50000, 'price_max' => 80000, 'duration_min' => 30, 'is_active' => true,
        ]);

        SubTreatment::firstOrCreate(['treatment_id' => $tMetal->id, 'title' => 'Дээд эрүү'], ['price_min' => 800000, 'price_max' => 900000, 'is_active' => true]);
        SubTreatment::firstOrCreate(['treatment_id' => $tMetal->id, 'title' => 'Доод эрүү'], ['price_min' => 800000, 'price_max' => 900000, 'is_active' => true]);

        // 4. Эмч (Doctor)
        $doc1 = Doctor::firstOrCreate(['branch_id' => $main->id, 'name' => 'Б.Болд'], [
            'specialization' => 'Гажиг засал', 'degree' => 'Их эмч', 'experience_years' => 10,
            'phone' => '99110011', 'email' => 'bold@cuticul.mn', 'is_active' => true, 'has_online_booking' => true, 'order' => 1,
        ]);
        $doc2 = Doctor::firstOrCreate(['branch_id' => $main->id, 'name' => 'Д.Сараа'], [
            'specialization' => 'Ерөнхий эмчилгээ', 'degree' => 'Их эмч', 'experience_years' => 6,
            'phone' => '99110022', 'email' => 'saraa@cuticul.mn', 'is_active' => true, 'has_online_booking' => true, 'order' => 2,
        ]);

        // 5. Ажилтан (Employee) — employee_number автоматаар
        Employee::firstOrCreate(['first_name' => 'Болд', 'last_name' => 'Бат'], [
            'branch_id' => $main->id, 'position_id' => $posDoctor->id, 'phone' => '99110011',
            'gender' => 'Эрэгтэй', 'status' => 'active', 'hired_date' => now()->subYears(3), 'salary' => 2500000,
        ]);
        Employee::firstOrCreate(['first_name' => 'Сараа', 'last_name' => 'Дорж'], [
            'branch_id' => $main->id, 'position_id' => $posReception->id, 'phone' => '99110033',
            'gender' => 'Эмэгтэй', 'status' => 'active', 'hired_date' => now()->subYear(), 'salary' => 1500000,
        ]);

        // 6. Өвчтөн (Patient)
        $pat1 = Patient::firstOrCreate(['phone' => '88001122'], [
            'patient_number' => Patient::generateNumber(), 'last_name' => 'Дорж', 'first_name' => 'Цэрэн',
            'gender' => 'Эрэгтэй', 'date_of_birth' => '1995-05-10', 'branch_id' => $main->id,
        ]);
        $pat2 = Patient::firstOrCreate(['phone' => '88003344'], [
            'patient_number' => Patient::generateNumber(), 'last_name' => 'Бат', 'first_name' => 'Ану',
            'gender' => 'Эмэгтэй', 'date_of_birth' => '2000-08-20', 'branch_id' => $main->id,
        ]);

        // 7. Цаг захиалга (Appointment)
        $apt1 = Appointment::firstOrCreate(['appointment_number' => 'SAMPLE-APT-1'], [
            'patient_id' => $pat1->id, 'patient_name' => 'Дорж Цэрэн', 'patient_phone' => '88001122',
            'doctor_id' => $doc1->id, 'branch_id' => $main->id, 'service' => 'Металл аппарат', 'type' => 'in_person',
            'appointment_date' => now()->addDay()->toDateString(), 'appointment_time' => '10:00',
            'status' => 'confirmed', 'payment_status' => 'paid', 'payment_amount' => 10000,
        ]);
        $apt2 = Appointment::firstOrCreate(['appointment_number' => 'SAMPLE-APT-2'], [
            'patient_id' => $pat2->id, 'patient_name' => 'Бат Ану', 'patient_phone' => '88003344',
            'doctor_id' => $doc2->id, 'branch_id' => $main->id, 'service' => 'Шүдний цэвэрлэгээ', 'type' => 'in_person',
            'appointment_date' => now()->addDays(2)->toDateString(), 'appointment_time' => '14:00',
            'status' => 'pending', 'payment_status' => 'free',
        ]);

        // 8. Эмчилгээний бүртгэл (TreatmentRecord)
        TreatmentRecord::firstOrCreate(['appointment_id' => $apt1->id], [
            'patient_id' => $pat1->id, 'doctor_id' => $doc1->id, 'treatment_type' => 'Металл аппарат',
            'tooth_numbers' => '11,12,13', 'chief_complaint' => 'Шүд тэгшлүүлэх', 'treatment_performed' => 'Аппарат суурилуулсан',
            'amount_charged' => 1560000, 'paid_amount' => 10000, 'payment_status' => 'partial',
            'record_date' => now()->toDateString(), 'services' => [['name' => 'Металл аппарат', 'price' => 1560000]],
        ]);
    }
}
