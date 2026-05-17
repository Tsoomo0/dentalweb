<?php

namespace App\Console\Commands;

use App\Mail\AppointmentConfirmed;
use App\Mail\AppointmentReminder;
use App\Mail\BookRentalDecisionMail;
use App\Mail\BookRentalSubmittedMail;
use App\Mail\EquipmentAssignedMail;
use App\Mail\EquipmentAssignmentResponseMail;
use App\Mail\LeaveRequestDecisionMail;
use App\Mail\LeaveRequestSubmittedMail;
use App\Mail\NurseBonusMail;
use App\Mail\PayrollSlipMail;
use App\Mail\ReceptionBonusMail;
use App\Mail\VacationRequestDecisionMail;
use App\Mail\VacationRequestSubmittedMail;
use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\HR\Book;
use App\Models\HR\BookRental;
use App\Models\HR\Employee;
use App\Models\HR\Equipment;
use App\Models\HR\EquipmentAssignment;
use App\Models\HR\LeaveRequest;
use App\Models\HR\NurseBonusEntry;
use App\Models\HR\NurseBonusRun;
use App\Models\HR\PayrollEntry;
use App\Models\HR\PayrollRun;
use App\Models\HR\Position;
use App\Models\HR\ReceptionBonusEntry;
use App\Models\HR\ReceptionBonusRun;
use App\Models\HR\VacationRequest;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

class SendTestEmails extends Command
{
    protected $signature = 'mail:test {email? : Илгээх и-мэйл хаяг}';

    protected $description = 'Бүх и-мэйл загварыг тест байдлаар илгээнэ';

    public function handle(): int
    {
        $email = $this->argument('email') ?? 'ttsoomoo917@gmail.com';

        $this->info("И-мэйл хаяг: {$email}");
        $this->newLine();

        $mails = $this->buildMails();

        $bar = $this->output->createProgressBar(count($mails));
        $bar->start();

        $sent = 0;
        $failed = [];

        foreach ($mails as [$label, $mailable]) {
            try {
                Mail::to($email)->send($mailable);
                $sent++;
                $this->newLine();
                $this->line("  <fg=green>✓</> {$label}");
            } catch (\Throwable $e) {
                $failed[] = [$label, $e->getMessage()];
                $this->newLine();
                $this->line("  <fg=red>✗</> {$label}: {$e->getMessage()}");
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info('Нийт: '.count($mails)." | Илгээсэн: {$sent} | Алдаатай: ".count($failed));

        if ($failed) {
            $this->newLine();
            $this->warn('Алдаатай мэйлүүд:');
            foreach ($failed as [$label, $err]) {
                $this->line("  - {$label}: {$err}");
            }
        }

        return self::SUCCESS;
    }

    // ── Fake data builders ────────────────────────────────────────────────────

    private function buildMails(): array
    {
        $branch = $this->fakeBranch();
        $position = $this->fakePosition();
        $employee = $this->fakeEmployee($branch, $position);
        $doctor = $this->fakeDoctor();

        $appointment = $this->fakeAppointment($doctor, 'online', $branch);
        $appointmentInPerson = $this->fakeAppointment($doctor, 'in_person', $branch);

        return [
            // ── Онлайн захиалга ──
            ['Онлайн захиалга — Өвчтөнд (confirmed)',  new AppointmentConfirmed($appointment, 'patient')],
            ['Онлайн захиалга — Эмчид (confirmed)',    new AppointmentConfirmed($appointment, 'doctor')],
            ['Онлайн захиалга — 24 цагийн сануулга',  new AppointmentReminder($appointment, '24h')],
            ['Онлайн захиалга — 2 цагийн сануулга',   new AppointmentReminder($appointment, '2h')],

            // ── Биечлэн ирэх захиалга ──
            ['Биечлэн ирэх — 24 цагийн сануулга (маргааш)', new AppointmentReminder($appointmentInPerson, '24h')],
            ['Биечлэн ирэх — 2 цагийн сануулга (удахгүй)',  new AppointmentReminder($appointmentInPerson, '2h')],

            // ── Чөлөо ──
            ['Чөлөөний хүсэлт — submitted',   new LeaveRequestSubmittedMail($this->fakeLeaveRequest($employee))],
            ['Чөлөөний хүсэлт — зөвшөөрсөн', new LeaveRequestDecisionMail($this->fakeLeaveRequest($employee, 'approved'))],
            ['Чөлөөний хүсэлт — цуцалсан',   new LeaveRequestDecisionMail($this->fakeLeaveRequest($employee, 'rejected'))],

            // ── Ээлжийн амралт ──
            ['Ээлжийн амралт — submitted',   new VacationRequestSubmittedMail($this->fakeVacationRequest($employee))],
            ['Ээлжийн амралт — зөвшөөрсөн', new VacationRequestDecisionMail($this->fakeVacationRequest($employee, 'approved'))],
            ['Ээлжийн амралт — цуцалсан',   new VacationRequestDecisionMail($this->fakeVacationRequest($employee, 'rejected'))],

            // ── Номын түрээс ──
            ['Номын түрээс — submitted',   new BookRentalSubmittedMail($this->fakeBookRental($employee))],
            ['Номын түрээс — зөвшөөрсөн', new BookRentalDecisionMail($this->fakeBookRental($employee, 'approved'))],
            ['Номын түрээс — цуцалсан',   new BookRentalDecisionMail($this->fakeBookRental($employee, 'rejected'))],

            // ── Тоног төхөөрөмж ──
            ['Тоног төхөөрөмж — assigned',          new EquipmentAssignedMail($this->fakeEquipmentAssignment($employee))],
            ['Тоног төхөөрөмж — зөвшөөрсөн хариу',  new EquipmentAssignmentResponseMail($this->fakeEquipmentAssignment($employee, 'accepted'))],
            ['Тоног төхөөрөмж — татгалзсан хариу',  new EquipmentAssignmentResponseMail($this->fakeEquipmentAssignment($employee, 'rejected'))],

            // ── Санхүү ──
            ['Цалингийн задаргаа',         new PayrollSlipMail($this->fakePayrollEntry($employee))],
            ['Сувилагчийн урамшуулал',     new NurseBonusMail($this->fakeNurseBonusEntry($employee))],
            ['Урамшууллын задаргаа',       new ReceptionBonusMail($this->fakeReceptionBonusEntry($employee))],
        ];
    }

    // ── Fake model helpers ────────────────────────────────────────────────────

    private function fakeBranch(): Branch
    {
        $b = new Branch;
        $b->forceFill(['id' => 1, 'name' => 'Төв салбар']);

        return $b;
    }

    private function fakePosition(): Position
    {
        $p = new Position;
        $p->forceFill(['id' => 1, 'name' => 'Сувилагч']);

        return $p;
    }

    private function fakeEmployee(Branch $branch, Position $position): Employee
    {
        $e = new Employee;
        $e->forceFill([
            'id' => 1,
            'employee_number' => 'EMP-0001',
            'last_name' => 'Болд',
            'first_name' => 'Мөнх',
        ]);
        $e->setRelation('branch', $branch);
        $e->setRelation('position', $position);

        return $e;
    }

    private function fakeDoctor(): Doctor
    {
        $d = new Doctor;
        $d->forceFill(['id' => 1, 'name' => 'Д.Батзориг']);

        return $d;
    }

    private function fakeAppointment(Doctor $doctor, string $type = 'online', ?Branch $branch = null): Appointment
    {
        $a = new Appointment;
        $a->forceFill([
            'id' => 1,
            'appointment_number' => $type === 'in_person' ? 'APT-2026-0099' : 'APT-2026-0042',
            'patient_name' => 'Нямаа Дорж',
            'patient_phone' => '99001122',
            'type' => $type,
            'appointment_date' => Carbon::today()->addDays(1),
            'appointment_time' => '10:00',
            'appointment_time_end' => '10:30',
            'meet_link' => $type === 'online' ? 'https://meet.google.com/abc-defg-hij' : null,
        ]);
        $a->setRelation('doctor', $doctor);
        $a->setRelation('branch', $branch);

        return $a;
    }

    private function fakeLeaveRequest(Employee $employee, string $status = 'pending'): LeaveRequest
    {
        $lr = new LeaveRequest;
        $lr->forceFill([
            'id' => 1,
            'status' => $status,
            'start_date' => Carbon::today()->addDays(5),
            'end_date' => Carbon::today()->addDays(7),
            'reason' => 'Гэр бүлийн тулгамдсан асуудал шийдвэрлэх шаардлагатай болсон тул чөлөө хүсэж байна.',
            'rejection_reason' => $status === 'rejected' ? 'Тухайн хугацаанд ажлын ачаалал их байгаа тул зөвшөөрч чадахгүй байна.' : null,
            'reviewed_at' => $status !== 'pending' ? Carbon::now() : null,
        ]);
        $lr->setRelation('employee', $employee);
        $lr->setRelation('replacement', null);

        return $lr;
    }

    private function fakeVacationRequest(Employee $employee, string $status = 'pending'): VacationRequest
    {
        $vr = new VacationRequest;
        $vr->forceFill([
            'id' => 1,
            'status' => $status,
            'start_date' => Carbon::today()->addDays(14),
            'end_date' => Carbon::today()->addDays(28),
            'reason' => 'Жил бүрийн ээлжийн амралтаа авах хүсэлт гаргаж байна.',
            'location_during_leave' => 'Монгол улс, Улаанбаатар',
            'emergency_phone' => '99001122',
            'rejection_reason' => $status === 'rejected' ? 'Тухайн хугацаанд ажлын хуваарь дүүрэн байгаа тул зөвшөөрч чадахгүй.' : null,
            'reviewed_at' => $status !== 'pending' ? Carbon::now() : null,
        ]);
        $vr->setRelation('employee', $employee);

        return $vr;
    }

    private function fakeBook(): Book
    {
        $book = new Book;
        $book->forceFill([
            'id' => 1,
            'title' => 'Clinical Periodontology and Implant Dentistry',
            'author' => 'Jan Lindhe',
            'isbn' => '978-1-119-94053-6',
        ]);
        $book->setRelation('category', null);

        return $book;
    }

    private function fakeBookRental(Employee $employee, string $status = 'pending'): BookRental
    {
        $rental = new BookRental;
        $rental->forceFill([
            'id' => 1,
            'status' => $status,
            'rejection_reason' => $status === 'rejected' ? 'Ном одоогоор бусад ажилтанд байгаа тул зөвшөөрч чадахгүй.' : null,
        ]);
        $rental->setRelation('employee', $employee);
        $rental->setRelation('book', $this->fakeBook());

        return $rental;
    }

    private function fakeEquipment(): Equipment
    {
        $eq = new Equipment;
        $eq->forceFill([
            'id' => 1,
            'name' => 'EMS Airflow Prophylaxis Master',
            'serial_number' => 'SN-2024-00123',
            'brand' => 'EMS',
            'model' => 'Airflow',
            'condition' => 'good',
        ]);

        return $eq;
    }

    private function fakeEquipmentAssignment(Employee $employee, string $status = 'pending'): EquipmentAssignment
    {
        $ea = new EquipmentAssignment;
        $ea->forceFill([
            'id' => 1,
            'status' => $status,
            'rejection_reason' => $status === 'rejected' ? 'Тоног төхөөрөмж хариуцах боломжгүй.' : null,
            'created_at' => Carbon::now(),
        ]);
        $ea->setRelation('equipment', $this->fakeEquipment());
        $ea->setRelation('employee', $employee);

        return $ea;
    }

    private function fakePayrollRun(): PayrollRun
    {
        $run = new PayrollRun;
        $run->forceFill([
            'id' => 1,
            'year' => 2026,
            'month' => 5,
            'half' => 'first',
            'label' => null,
        ]);

        return $run;
    }

    private function fakePayrollEntry(Employee $employee): PayrollEntry
    {
        $entry = new PayrollEntry;
        $entry->forceFill([
            'id' => 1,
            'basic_salary' => 1_500_000,
            'nd_salary' => 200_000,
            'prev_paid' => 750_000,
            'total_bonus' => 120_000,
            'calc_salary' => 1_820_000,
            'ndsh' => 209_300,
            'income_tax' => 84_000,
            'net_hand' => 1_526_700,
            'bank_salary' => 1_526_700,
        ]);
        $entry->setRelation('run', $this->fakePayrollRun());
        $entry->setRelation('employee', $employee);

        return $entry;
    }

    private function fakeNurseBonusRun(): NurseBonusRun
    {
        $run = new NurseBonusRun;
        $run->forceFill([
            'id' => 1,
            'year' => 2026,
            'month' => 5,
            'half' => 'first',
            'label' => null,
        ]);

        return $run;
    }

    private function fakeNurseBonusEntry(Employee $employee): NurseBonusEntry
    {
        $entry = new NurseBonusEntry;
        $entry->forceFill([
            'id' => 1,
            'clothing' => 15,
            'hand_hygiene' => 14,
            'chair_sterilization' => 12,
            'equipment_prep' => 13,
            'material_prep' => 11,
            'card_issued' => 8,
            'card_collected' => 7,
            'pre_exam_prep' => 10,
            'exam_chair_prep' => 9,
            'post_exam_chair_sterilize' => 9,
            'tube_sterilization' => 6,
            'suction_filter' => 5,
            'quartz_before' => 10,
            'quartz_after' => 10,
            'xray' => 3,
            'model_cast' => 2,
            'implant' => 1,
            'blood_pressure' => 8,
            'complaint' => 0,
            'absent' => 0,
            'total_amount' => 64_700,
        ]);
        $entry->setRelation('run', $this->fakeNurseBonusRun());
        $entry->setRelation('employee', $employee);

        return $entry;
    }

    private function fakeReceptionBonusRun(): ReceptionBonusRun
    {
        $run = new ReceptionBonusRun;
        $run->forceFill([
            'id' => 1,
            'year' => 2026,
            'month' => 5,
            'half' => 'first',
            'label' => null,
        ]);

        return $run;
    }

    private function fakeReceptionBonusEntry(Employee $employee): ReceptionBonusEntry
    {
        $entry = new ReceptionBonusEntry;
        $entry->forceFill([
            'id' => 1,
            'total_amount' => 78_500,
        ]);

        // Fill all criteria keys with sample values
        $criteria = ReceptionBonusEntry::CRITERIA;
        $fills = [];
        $i = 1;
        foreach ($criteria as $key => $c) {
            $fills[$key] = $i++;
        }
        $entry->forceFill($fills);

        $entry->setRelation('run', $this->fakeReceptionBonusRun());
        $entry->setRelation('employee', $employee);

        return $entry;
    }
}
