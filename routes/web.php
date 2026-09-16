<?php

use App\Http\Controllers\Admin\AppointmentController;
use App\Http\Controllers\Admin\AppointmentExportController;
use App\Http\Controllers\Admin\ArticleController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\BankReconciliationController;
use App\Http\Controllers\Admin\BotBuilderController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\ChatInboxController;
use App\Http\Controllers\Admin\DailySheetAdminController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DoctorController;
use App\Http\Controllers\Admin\DoctorSlotController;
use App\Http\Controllers\Admin\FaqController;
use App\Http\Controllers\Admin\GalleryController;
use App\Http\Controllers\Admin\GoogleOAuthController;
use App\Http\Controllers\Admin\JobApplicationController as AdminJobApplicationController;
use App\Http\Controllers\Admin\LabCategoryController;
use App\Http\Controllers\Admin\LabCourseController;
use App\Http\Controllers\Admin\LabEmployeeController;
use App\Http\Controllers\Admin\LabExamController;
use App\Http\Controllers\Admin\LabLessonController;
use App\Http\Controllers\Admin\LabOrderController;
use App\Http\Controllers\Admin\LabReportController;
use App\Http\Controllers\Admin\LabTrainingReportController;
use App\Http\Controllers\Admin\NotificationController;
use App\Http\Controllers\Admin\PatientController as AdminPatientController;
use App\Http\Controllers\Admin\PaymentAdminController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\SocialAccountController;
use App\Http\Controllers\Admin\SocialAiController;
use App\Http\Controllers\Admin\SocialBroadcastController;
use App\Http\Controllers\Admin\SocialCommentRuleController;
use App\Http\Controllers\Admin\SocialDashboardController;
use App\Http\Controllers\Admin\SocialFlowController;
use App\Http\Controllers\Admin\SocialFormController;
use App\Http\Controllers\Admin\SocialInboxController;
use App\Http\Controllers\Admin\SocialOAuthController;
use App\Http\Controllers\Admin\SubTreatmentController;
use App\Http\Controllers\Admin\TreatmentCategoryController;
use App\Http\Controllers\Admin\TreatmentController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\PatientRegisterController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\Doctor\DoctorOnlineSlotController;
use App\Http\Controllers\Doctor\DoctorPortalController;
use App\Http\Controllers\Doctor\DoctorProfileController;
use App\Http\Controllers\Doctor\PatientController as DoctorPatientController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\Lab\LabDashboardController;
use App\Http\Controllers\My\AttendanceController;
use App\Http\Controllers\My\BookRentalController;
use App\Http\Controllers\My\ChatController;
use App\Http\Controllers\My\DocumentController;
use App\Http\Controllers\My\EmployeeDocumentController as MyEmployeeDocumentController;
use App\Http\Controllers\My\EquipmentController;
use App\Http\Controllers\My\ExamAttemptController;
use App\Http\Controllers\My\FamilyMemberController;
use App\Http\Controllers\My\FeedbackController;
use App\Http\Controllers\My\HomeController;
use App\Http\Controllers\My\LeaveRequestController;
use App\Http\Controllers\My\NurseBonusController as MyNurseBonusController;
use App\Http\Controllers\My\PasswordController;
use App\Http\Controllers\My\PayrollController;
use App\Http\Controllers\My\ProfileController as MyProfileController;
use App\Http\Controllers\My\ReceptionBonusController;
use App\Http\Controllers\My\ScheduleManageController;
use App\Http\Controllers\My\TrainingController;
use App\Http\Controllers\My\VacationRequestController;
use App\Http\Controllers\My\WarningController;
use App\Http\Controllers\My\WorkScheduleController;
use App\Http\Controllers\Patient\PatientLeasingPaymentController;
use App\Http\Controllers\Patient\PatientOnlineConsultationController;
use App\Http\Controllers\Patient\PatientOutstandingController;
use App\Http\Controllers\Patient\PatientPortalController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PortalController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\Reception\CallController as ReceptionCallController;
use App\Http\Controllers\Reception\DailySheetController;
use App\Http\Controllers\Reception\OrthoApplianceController;
use App\Http\Controllers\Reception\PatientController as ReceptionPatientController;
use App\Http\Controllers\Reception\PatientUserController;
use App\Http\Controllers\Reception\ReceptionAppointmentController;
use App\Http\Controllers\Reception\ReceptionDashboardController;
use App\Http\Controllers\Reception\TreatmentPaymentController;
use App\Http\Controllers\SignatureController;
use App\Http\Controllers\Social\DataDeletionController;
use App\Http\Controllers\Social\PublicFormController;
use App\Http\Controllers\Admin\CallController;
use App\Http\Controllers\Admin\CallBlockedNumberController;
use App\Http\Controllers\Admin\CallDashboardController;
use App\Http\Controllers\Admin\CallReportController;
use App\Http\Controllers\Admin\CallSettingsController;
use App\Http\Controllers\CallPro\CallRecordingController;
use App\Http\Controllers\CallPro\CallWebhookController;
use App\Http\Controllers\Social\SocialWebhookController;
use App\Models\Doctor;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

// ── Public pages ─────────────────────────────────────────────────────────────

Route::get('/', [PublicController::class, 'home'])->name('home');

Route::get('/sitemap.xml', function () {
    $base = config('app.url');
    $pages = [
        ['url' => $base.'/',         'priority' => '1.0', 'freq' => 'weekly'],
        ['url' => $base.'/about',    'priority' => '0.8', 'freq' => 'monthly'],
        ['url' => $base.'/services', 'priority' => '0.9', 'freq' => 'weekly'],
        ['url' => $base.'/doctors',  'priority' => '0.8', 'freq' => 'weekly'],
        ['url' => $base.'/gallery',  'priority' => '0.7', 'freq' => 'weekly'],
        ['url' => $base.'/articles', 'priority' => '0.7', 'freq' => 'daily'],
        ['url' => $base.'/contact',  'priority' => '0.6', 'freq' => 'monthly'],
        ['url' => $base.'/booking',  'priority' => '0.9', 'freq' => 'weekly'],
    ];
    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    foreach ($pages as $page) {
        $xml .= '<url>';
        $xml .= '<loc>'.$page['url'].'</loc>';
        $xml .= '<changefreq>'.$page['freq'].'</changefreq>';
        $xml .= '<priority>'.$page['priority'].'</priority>';
        $xml .= '</url>';
    }
    $xml .= '</urlset>';

    return response($xml, 200)->header('Content-Type', 'application/xml');
});
Route::get('/about', [PublicController::class, 'about'])->name('about');
Route::get('/services', [PublicController::class, 'services'])->name('services');
Route::get('/doctors', [PublicController::class, 'doctors'])->name('doctors');
Route::get('/gallery', [PublicController::class, 'gallery'])->name('gallery');
Route::get('/articles', [PublicController::class, 'articles'])->name('articles');
Route::get('/contact', [PublicController::class, 'contact'])->name('contact');

// ── Цаг захиалга ─────────────────────────────────────────────────────────────
Route::get('/booking', [BookingController::class, 'index'])->name('booking');
Route::post('/booking', [BookingController::class, 'store'])->middleware('throttle:20,1')->name('booking.store');
Route::get('/booking/patient-lookup', [BookingController::class, 'patientLookup'])->middleware('throttle:30,1')->name('booking.patient-lookup');

// ── Ажлын анкет ──────────────────────────────────────────────────────────────
Route::get('/job-application', [JobApplicationController::class, 'index'])->name('job-application');
Route::post('/job-application', [JobApplicationController::class, 'store'])->middleware('throttle:5,1')->name('job-application.store');

// ── Төлбөр ───────────────────────────────────────────────────────────────────
Route::get('/payment/{appointment}', [PaymentController::class, 'show'])->name('payment.show');
Route::post('/payment/{appointment}/invoice', [PaymentController::class, 'createInvoice'])->name('payment.invoice');
Route::get('/payment/{appointment}/check', [PaymentController::class, 'checkStatus'])->name('payment.check');
Route::post('/payment/callback/{appointment}', [PaymentController::class, 'callback'])->name('payment.callback');
Route::post('/payment/{appointment}/cancel', [PaymentController::class, 'cancelExpired'])->name('payment.cancel');

// ── Meta Social webhook (Facebook Page + Instagram) ──────────────────────────
Route::get('/webhooks/social', [SocialWebhookController::class, 'verify'])->name('webhooks.social.verify');
Route::post('/webhooks/social', [SocialWebhookController::class, 'receive'])->name('webhooks.social.receive');

// ── CallPro дуудлагын webhook ────────────────────────────────────────────────
// CallPro payload дотроо event нэрээ илгээдэггүй тул URL-аар ялгана.
// Тэдний баримтад GET, POST аль нь ч байж болно гэсэн тул хоёуланг зөвшөөрөв.
// Түүхэн дата илгээхэд ?source=history нэмнэ.
Route::match(['get', 'post'], '/webhooks/callpro/{event?}', [CallWebhookController::class, 'handle'])
    ->whereIn('event', ['start', 'answered', 'end', 'abandoned'])
    ->middleware(\App\Http\Middleware\VerifyCallProWebhook::class)
    ->name('webhooks.callpro');

// ── Нууцлалын бодлого (Meta App-д шаардлагатай) ──────────────────────────────
Route::get('/privacy', function () {
    $html = <<<'HTML'
<!DOCTYPE html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Нууцлалын бодлого — Cuticul Dental Clinic</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:760px;margin:0 auto;padding:40px 20px;line-height:1.7;color:#1f2937}
  h1{font-size:28px;margin-bottom:4px}h2{font-size:19px;margin-top:28px;color:#111827}
  .muted{color:#6b7280;font-size:14px}a{color:#1877F2}
</style>
</head>
<body>
  <h1>Нууцлалын бодлого</h1>
  <p class="muted">Cuticul Dental Clinic (Кутикул Шүдний эмнэлэг) · Сүүлд шинэчилсэн: 2026-06-06</p>

  <h2>1. Ерөнхий</h2>
  <p>Энэхүү бодлого нь Cuticul Dental Clinic-ийн вэбсайт болон Facebook / Instagram чатбот үйлчилгээгээр дамжуулан таны мэдээллийг хэрхэн цуглуулж, ашиглаж, хамгаалдгийг тайлбарлана.</p>

  <h2>2. Цуглуулдаг мэдээлэл</h2>
  <ul>
    <li>Facebook/Instagram-аар бичсэн мессеж, нэр, профайл зураг, хэрэглэгчийн ID</li>
    <li>Таны өөрөө өгсөн нэр, утас, и-мэйл, цаг захиалгын мэдээлэл</li>
    <li>Үйлчилгээ сайжруулах зорилгоор харилцааны түүх</li>
  </ul>

  <h2>3. Мэдээллийг хэрхэн ашигладаг вэ</h2>
  <ul>
    <li>Таны асуултад хариулах, цаг захиалга авах, үйлчилгээ үзүүлэх</li>
    <li>Үйлчлүүлэгчийн үйлчилгээг сайжруулах</li>
    <li>Зөвхөн танай зөвшөөрсөн зорилгоор ашиглана</li>
  </ul>

  <h2>4. Мэдээлэл хуваалцах</h2>
  <p>Бид таны хувийн мэдээллийг гуравдагч этгээдэд зарж борлуулахгүй. Зөвхөн хууль шаардсан, эсвэл үйлчилгээ үзүүлэхэд зайлшгүй шаардлагатай тохиолдолд хуваалцана.</p>

  <h2>5. Мэдээлэл устгах хүсэлт</h2>
  <p>Та өөрийн мэдээллийг устгуулахыг хүсвэл <a href="mailto:info@cuticul.mn">info@cuticul.mn</a> хаягаар хандана уу. Бид хүсэлтийг хүлээн авч мэдээллийг устгана.</p>

  <h2>6. Холбоо барих</h2>
  <p>Cuticul Dental Clinic — Кутикул Шүдний эмнэлэг<br>И-мэйл: <a href="mailto:info@cuticul.mn">info@cuticul.mn</a><br>Вэб: <a href="https://cuticul.mn">cuticul.mn</a></p>
</body>
</html>
HTML;

    return response($html)->header('Content-Type', 'text/html; charset=utf-8');
})->name('privacy');

// ── Мэдээлэл устгах callback (Meta App Review-д шаардлагатай) ─────────────────
Route::post('/data-deletion', [DataDeletionController::class, 'callback'])->name('data-deletion.callback');
Route::get('/data-deletion', [DataDeletionController::class, 'status'])->name('data-deletion.status');

// ── Олон нийтийн вэбформ ─────────────────────────────────────────────────────
Route::get('/f/{form}', [PublicFormController::class, 'show'])->name('public.social-form');
Route::post('/f/{form}/submit', [PublicFormController::class, 'submit'])->name('public.social-form.submit');

// ── Portal сонгох + ажилтны хувийн хэсэг ─────────────────────────────────────
Route::middleware(['either.auth'])->group(function () {
    Route::get('/portal-select', [PortalController::class, 'select'])->name('portal.select');
    Route::get('/portal/work', [PortalController::class, 'goWork'])->name('portal.work');
    Route::get('/portal/hr', [PortalController::class, 'goHr'])->name('portal.hr');

    // Push subscription (PWA)
    Route::get('push/vapid-key', [PushSubscriptionController::class, 'vapidKey'])->name('push.vapid');
    Route::post('push/subscribe', [PushSubscriptionController::class, 'subscribe'])->name('push.subscribe');
    Route::post('push/unsubscribe', [PushSubscriptionController::class, 'unsubscribe'])->name('push.unsubscribe');

    // Notification routes — either.auth (web болон doctor guard аль алинд нь)
    // ── Хадгалсан гарын үсэг (гэрээ болон бусад баримтад дахин ашиглана) ──
    Route::get('signatures', [SignatureController::class, 'index'])->middleware('throttle:60,1')->name('signatures.index');
    Route::post('signatures', [SignatureController::class, 'store'])->middleware('throttle:20,1')->name('signatures.store');
    Route::patch('signatures/{signature}/default', [SignatureController::class, 'setDefault'])->name('signatures.default');
    Route::post('signatures/{signature}/touch', [SignatureController::class, 'touch'])->middleware('throttle:60,1')->name('signatures.touch');
    Route::delete('signatures/{signature}', [SignatureController::class, 'destroy'])->name('signatures.destroy');

    Route::get('notifications', [NotificationController::class, 'index'])->middleware('throttle:30,1')->name('notif.index');
    Route::patch('notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notif.read');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notif.read-all');
    Route::delete('notifications/clear-all', [NotificationController::class, 'clearAll'])->name('notif.clear-all');

    Route::prefix('my')->name('my.')->group(function () {
        Route::get('/', fn () => redirect()->route('my.home'));
        Route::get('/home', [HomeController::class, 'index'])->name('home');
        Route::get('/profile', [MyProfileController::class, 'index'])->name('profile');
        Route::get('/change-password', [PasswordController::class, 'edit'])->name('change-password');
        Route::post('/change-password', [PasswordController::class, 'update'])->name('change-password.update');
        // Гэр бүлийн гишүүд
        Route::post('/family-members', [FamilyMemberController::class, 'store'])->name('family-members.store');
        Route::put('/family-members/{familyMember}', [FamilyMemberController::class, 'update'])->name('family-members.update');
        Route::delete('/family-members/{familyMember}', [FamilyMemberController::class, 'destroy'])->name('family-members.destroy');
        // Чөлөөний хүсэлт
        Route::get('/leave-requests', [LeaveRequestController::class, 'index'])->name('leave-requests.index');
        Route::post('/leave-requests', [LeaveRequestController::class, 'store'])->name('leave-requests.store');
        // Ээлжийн амралтын хүсэлт
        Route::get('/vacation-requests', [VacationRequestController::class, 'index'])->name('vacation-requests.index');
        Route::post('/vacation-requests', [VacationRequestController::class, 'store'])->name('vacation-requests.store');
        // Цалингийн задаргаа
        Route::get('/payroll', [PayrollController::class, 'index'])->name('payroll.index');
        // Ресепшний урамшуулал
        Route::get('/reception-bonus', [ReceptionBonusController::class, 'index'])->name('reception-bonus.index');
        // Сувилагчийн урамшуулал
        Route::get('/nurse-bonus', [MyNurseBonusController::class, 'index'])->name('nurse-bonus.index');
        // Номын сан
        Route::get('/book-rentals', [BookRentalController::class, 'index'])->name('book-rentals.index');
        Route::post('/book-rentals', [BookRentalController::class, 'store'])->name('book-rentals.store');
        // Тоног төхөөрөмж
        Route::get('/equipment', [EquipmentController::class, 'index'])->name('equipment.index');
        Route::patch('/equipment/{equipmentAssignment}/accept', [EquipmentController::class, 'accept'])->name('equipment.accept');
        Route::patch('/equipment/{equipmentAssignment}/reject', [EquipmentController::class, 'reject'])->name('equipment.reject');
        // Санал хүсэлт гомдол
        Route::get('/feedback', [FeedbackController::class, 'index'])->name('feedback.index');
        Route::post('/feedback', [FeedbackController::class, 'store'])->name('feedback.store');
        // Гэрээ / Ажлын байрны тодорхойлолт
        Route::get('/contracts', [MyEmployeeDocumentController::class, 'index'])->name('contracts.index');
        Route::post('/contracts/{employeeDocument}/sign', [MyEmployeeDocumentController::class, 'sign'])->name('contracts.sign');
        Route::post('/contracts/{employeeDocument}/decline', [MyEmployeeDocumentController::class, 'decline'])->name('contracts.decline');
        Route::get('/contracts/{employeeDocument}/pdf', [MyEmployeeDocumentController::class, 'pdf'])->name('contracts.pdf');
        // Сануулга / Зөрчил
        Route::get('/warnings', [WarningController::class, 'index'])->name('warnings.index');
        Route::patch('/warnings/{warning}/acknowledge', [WarningController::class, 'acknowledge'])->name('warnings.acknowledge');
        // Ажлын хуваарь
        Route::get('/work-schedule', [WorkScheduleController::class, 'index'])->name('work-schedule.index');

        // Хуваарь гаргах (эрхтэй ажилтан — зөвхөн өөрийн салбарын хэмжээнд)
        Route::prefix('schedule-manage')->name('schedule-manage.')->group(function () {
            Route::get('/', [ScheduleManageController::class, 'index'])->name('index');
            Route::post('/', [ScheduleManageController::class, 'storeWork'])->name('store');
            Route::post('/row-fill', [ScheduleManageController::class, 'rowFillWork'])->name('row-fill');
            Route::post('/save-tasks', [ScheduleManageController::class, 'saveTasks'])->name('save-tasks');
            Route::post('/ortho', [ScheduleManageController::class, 'storeOrtho'])->name('ortho.store');
            Route::post('/ortho/range', [ScheduleManageController::class, 'rangeOrtho'])->name('ortho.range');
            Route::post('/ortho/clear-range', [ScheduleManageController::class, 'clearRangeOrtho'])->name('ortho.clear-range');
            Route::delete('/ortho/{orthoSchedule}', [ScheduleManageController::class, 'destroyOrtho'])->name('ortho.destroy');
            Route::post('/support', [ScheduleManageController::class, 'storeSupport'])->name('support.store');
            Route::post('/support/row-fill', [ScheduleManageController::class, 'rowFillSupport'])->name('support.row-fill');
            Route::delete('/support/{supportSchedule}', [ScheduleManageController::class, 'destroySupport'])->name('support.destroy');
            Route::delete('/{workSchedule}', [ScheduleManageController::class, 'destroyWork'])->name('destroy');
        });
        // Баримт бичиг
        Route::get('/documents', [DocumentController::class, 'index'])->name('documents.index');
        Route::get('/documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download');
        Route::get('/documents/{document}/view', [DocumentController::class, 'view'])->name('documents.view');
        // Ирцийн бүртгэл
        Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn'])->name('attendance.check-in');
        Route::post('/attendance/check-out', [AttendanceController::class, 'checkOut'])->name('attendance.check-out');

        // ── Дотоод сургалт: видео ба файл сургалт ───────────────────────────
        // "documents" нь {course}-оос өмнө биш, тусдаа сегмент тул мөргөлдөхгүй
        Route::get('/training', [TrainingController::class, 'index'])->name('training.index');
        Route::get('/training/documents', [TrainingController::class, 'documents'])->name('training.documents');
        Route::get('/training/courses/{course}', [TrainingController::class, 'course'])->name('training.courses.show');
        Route::get('/training/lessons/{lesson}', [TrainingController::class, 'show'])->name('training.lessons.show');
        Route::get('/training/lessons/{lesson}/stream', [TrainingController::class, 'stream'])->name('training.stream');
        Route::post('/training/lessons/{lesson}/progress', [TrainingController::class, 'progress'])->name('training.progress');

        // Баримт хичээл — PDF үзэх, эх файлыг татах, уншсан хуудсыг бүртгэх
        Route::get('/training/lessons/{lesson}/document', [TrainingController::class, 'document'])->name('training.document');
        Route::get('/training/lessons/{lesson}/document/source', [TrainingController::class, 'documentSource'])->name('training.document.source');
        Route::post('/training/lessons/{lesson}/pages', [TrainingController::class, 'pages'])->name('training.pages');
        Route::post('/training/lessons/{lesson}/complete', [TrainingController::class, 'complete'])->name('training.complete');
        Route::post('/training/lessons/{lesson}/comments', [TrainingController::class, 'storeComment'])->name('training.comments.store');
        Route::delete('/training/comments/{comment}', [TrainingController::class, 'destroyComment'])->name('training.comments.destroy');
        Route::post('/training/react', [TrainingController::class, 'react'])->name('training.react');
        Route::post('/training/lessons/{lesson}/notes', [TrainingController::class, 'storeNote'])->name('training.notes.store');
        Route::patch('/training/notes/{note}', [TrainingController::class, 'updateNote'])->name('training.notes.update');
        Route::delete('/training/notes/{note}', [TrainingController::class, 'destroyNote'])->name('training.notes.destroy');

        // ── Дотоод сургалт: шалгалт ─────────────────────────────────────────
        // Жагсаалт нь {exam}-аас өмнө байх ёстой — эс тэгвээс "exams" гэдгийг id гэж уншина
        Route::get('/training/exams', [ExamAttemptController::class, 'index'])->name('training.exams.index');
        Route::get('/training/exams/{exam}', [ExamAttemptController::class, 'show'])->name('training.exams.show');
        Route::post('/training/exams/{exam}/start', [ExamAttemptController::class, 'start'])->name('training.exams.start');
        Route::get('/training/exams/{exam}/attempt/{attempt}', [ExamAttemptController::class, 'take'])->name('training.exams.take');
        Route::post('/training/exams/{exam}/attempt/{attempt}/submit', [ExamAttemptController::class, 'submit'])->name('training.exams.submit');
        Route::get('/training/exams/{exam}/result/{attempt}', [ExamAttemptController::class, 'result'])->name('training.exams.result');
        Route::post('/training/attempts/{attempt}/answer', [ExamAttemptController::class, 'saveAnswer'])->name('training.attempts.answer');

        // ── Chat ──────────────────────────────────────────────────────────────
        Route::get('/chat', [ChatController::class, 'index'])->name('chat.index');
        Route::get('/chat/conversations', [ChatController::class, 'listConversations'])->name('chat.conversations');
        Route::post('/chat/heartbeat', [ChatController::class, 'heartbeat'])->name('chat.heartbeat');
        Route::get('/chat/staff', [ChatController::class, 'listStaff'])->name('chat.staff');
        Route::post('/chat/groups', [ChatController::class, 'createGroup'])->name('chat.groups.store');
        Route::post('/chat/conversations/direct', [ChatController::class, 'startDirect'])->name('chat.direct.start');
        Route::get('/chat/conversations/{conversation}', [ChatController::class, 'show'])->name('chat.show');
        Route::post('/chat/conversations/{conversation}/messages', [ChatController::class, 'store'])->name('chat.messages.store');
        Route::delete('/chat/messages/{message}', [ChatController::class, 'destroyMessage'])->name('chat.messages.destroy');
        Route::delete('/chat/conversations/{conversation}', [ChatController::class, 'destroyConversation'])->name('chat.conversations.destroy');
        Route::post('/chat/conversations/{conversation}/read', [ChatController::class, 'markRead'])->name('chat.read');
        Route::post('/chat/conversations/{conversation}/typing', [ChatController::class, 'typing'])->name('chat.typing');
        Route::post('/chat/conversations/{conversation}/bot/start', [ChatController::class, 'botStart'])->name('chat.bot.start');
        Route::post('/chat/conversations/{conversation}/bot/button/{button}', [ChatController::class, 'botButton'])->name('chat.bot.button');
    });
    Route::post('/portal/verify-switch', [PortalController::class, 'verifyAndSwitch'])->name('portal.verify-switch');
});

// ── Dashboard redirect — хэрэглэгчийн рольоор зөв portal руу чиглүүлнэ ──────
Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        $user = Auth::user();
        if ($user->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }
        if ($user->isPatient()) {
            return redirect()->route('patient.dashboard');
        }

        // HR, Reception гэх мэт олон portal-той хэрэглэгч — portal сонгох
        return redirect()->route('portal.select');
    })->name('dashboard');
});

// ✅ Admin route
Route::middleware(['auth', 'admin', 'throttle:120,1'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('treatments', TreatmentController::class)->except(['show']);
    Route::resource('treatment-categories', TreatmentCategoryController::class)->except(['show', 'create', 'edit']);
    Route::resource('treatments.sub-treatments', SubTreatmentController::class)->only(['store', 'update', 'destroy']);
    Route::resource('branches', BranchController::class)->except(['show']);
    Route::resource('doctors', DoctorController::class)->except(['show']);
    Route::resource('articles', ArticleController::class)->except(['show']);
    Route::resource('faqs', FaqController::class)->except(['show']);
    Route::resource('gallery', GalleryController::class)->except(['show']);
    Route::get('appointments/pending-poll', [AppointmentController::class, 'pendingPoll'])->name('appointments.pending-poll');
    Route::get('appointments/search', [AppointmentController::class, 'search'])->name('appointments.search');
    Route::get('appointments/export-pdf', [AppointmentExportController::class, 'pdf'])->name('appointments.export-pdf');
    Route::resource('appointments', AppointmentController::class)->except(['edit']);
    Route::patch('appointments/{appointment}/status', [AppointmentController::class, 'changeStatus'])->name('appointments.status');
    Route::get('appointments/{appointment}/rebook', [AppointmentController::class, 'rebookForm'])->name('appointments.rebook');
    Route::patch('faqs/{faq}/toggle', [FaqController::class, 'toggle'])->name('faqs.toggle');
    Route::patch('doctors/{doctor}/toggle', function (Doctor $doctor) {
        $doctor->update(['is_active' => ! $doctor->is_active]);

        return back();
    })->name('doctors.toggle');

    // Төлбөр удирдах
    Route::get('payments', [PaymentAdminController::class, 'index'])->name('payments.index');
    Route::post('payments/{appointment}/confirm', [PaymentAdminController::class, 'confirm'])->name('payments.confirm');
    Route::post('payments/{appointment}/regenerate-meet', [PaymentAdminController::class, 'regenerateMeet'])->name('payments.regenerate-meet');
    Route::get('payments/{appointment}', [PaymentAdminController::class, 'show'])->name('payments.show');

    // Эмчийн онлайн цаг удирдах
    Route::get('doctors/{doctor}/slots', [DoctorSlotController::class, 'index'])->name('doctors.slots');
    Route::post('doctors/{doctor}/slots', [DoctorSlotController::class, 'store'])->name('doctors.slots.store');
    Route::put('doctors/{doctor}/slots/{slotId}', [DoctorSlotController::class, 'update'])->name('doctors.slots.update');
    Route::delete('doctors/{doctor}/slots/{slotId}', [DoctorSlotController::class, 'destroy'])->name('doctors.slots.destroy');

    // Ажлын анкет (admin)
    Route::get('job-applications', [AdminJobApplicationController::class, 'index'])->name('job-applications.index');
    Route::get('job-applications/export-csv', [AdminJobApplicationController::class, 'exportCsv'])->name('job-applications.export-csv');
    Route::get('job-applications/{jobApplication}', [AdminJobApplicationController::class, 'show'])->name('job-applications.show');
    Route::patch('job-applications/{jobApplication}', [AdminJobApplicationController::class, 'update'])->name('job-applications.update');
    Route::delete('job-applications/{jobApplication}', [AdminJobApplicationController::class, 'destroy'])->name('job-applications.destroy');

    // Өдрийн тооцоо
    Route::get('daily-sheets/export-excel', [DailySheetAdminController::class, 'exportExcel'])->name('daily-sheets.export');
    Route::get('daily-sheets', [DailySheetAdminController::class, 'index'])->name('daily-sheets.index');
    Route::delete('daily-sheets/{sheet}', [DailySheetAdminController::class, 'destroy'])->name('daily-sheets.destroy');
    Route::delete('daily-sheet-entries/{entry}', [DailySheetAdminController::class, 'destroyEntry'])->name('daily-sheets.entries.destroy');
    Route::post('daily-sheets/{sheet}/unlock', [DailySheetAdminController::class, 'unlock'])->name('daily-sheets.unlock');

    // Банкны мобайл тулгалт (Хаан банкны хуулга × системийн мобайл орлогууд)
    Route::get('bank-reconciliation', [BankReconciliationController::class, 'index'])->name('bank-reconciliation.index');
    Route::post('bank-reconciliation/check', [BankReconciliationController::class, 'check'])->name('bank-reconciliation.check');

    // Дутуу тооцоо (бүх цаг үе, бүх салбар)
    Route::get('outstanding', [DailySheetAdminController::class, 'outstanding'])->name('admin.outstanding');
    Route::get('outstanding/export', [DailySheetAdminController::class, 'exportOutstanding'])->name('admin.outstanding.export');
    Route::delete('outstanding/{entry}', [DailySheetAdminController::class, 'destroyOutstanding'])->name('admin.outstanding.destroy');
    // Илүү тооцоо (бүх цаг үе, бүх салбар)
    Route::get('overpaid', [DailySheetAdminController::class, 'overpaid'])->name('admin.overpaid');
    Route::patch('overpaid/{entry}', [DailySheetAdminController::class, 'updateOverpaid'])->name('admin.overpaid.update');
    Route::delete('overpaid/usages/{usage}', [DailySheetAdminController::class, 'destroyOverpaidUsage'])->name('admin.overpaid.usages.destroy');
    Route::delete('overpaid/{entry}', [DailySheetAdminController::class, 'destroyOverpaid'])->name('admin.overpaid.destroy');
    Route::get('refunds', [DailySheetAdminController::class, 'refunds'])->name('admin.refunds');

    // Системийн тохиргоо
    Route::get('settings', [SettingController::class, 'index'])->name('settings');
    Route::post('settings', [SettingController::class, 'update'])->name('settings.update');
    Route::post('settings/branding', [SettingController::class, 'uploadBranding'])->name('settings.branding');

    // Хэрэглэгч удирдах
    Route::resource('users', UserController::class)->except(['show']);
    Route::patch('users/{user}/toggle', [UserController::class, 'toggle'])->name('users.toggle');

    // Өвчтний карт (харах)
    Route::get('patients', [AdminPatientController::class, 'index'])->name('patients.index');
    Route::get('patients/{patient}', [AdminPatientController::class, 'show'])->name('patients.show');

    // Аудит лог
    Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');

    // ── CallPro дуудлага ────────────────────────────────────────────────────
    Route::get('calls/dashboard', [CallDashboardController::class, 'index'])->name('calls.dashboard');
    Route::get('calls', [CallController::class, 'index'])->name('calls.index');
    Route::patch('calls/{call}/resolve', [CallController::class, 'resolve'])->name('calls.resolve');
    Route::patch('calls/{call}/unresolve', [CallController::class, 'unresolve'])->name('calls.unresolve');
    Route::post('calls/{call}/block', [CallBlockedNumberController::class, 'blockFromCall'])->name('calls.block');

    // Тайлан + Excel экспорт
    Route::get('calls/reports', [CallReportController::class, 'index'])->name('calls.reports');
    Route::get('calls/reports/export', [CallReportController::class, 'export'])->name('calls.reports.export');

    // Спам дугаар
    Route::get('calls/blocked', [CallBlockedNumberController::class, 'index'])->name('calls.blocked');
    Route::post('calls/blocked', [CallBlockedNumberController::class, 'store'])->name('calls.blocked.store');
    Route::delete('calls/blocked/{blocked}', [CallBlockedNumberController::class, 'destroy'])->name('calls.blocked.destroy');

    // Тохиргоо: дотуур дугаар ↔ салбар, queue ↔ салбар
    Route::get('call-settings', [CallSettingsController::class, 'index'])->name('call-settings.index');
    Route::post('call-settings/extensions', [CallSettingsController::class, 'storeExtension'])->name('call-settings.extensions.store');
    Route::patch('call-settings/extensions/{extension}', [CallSettingsController::class, 'updateExtension'])->name('call-settings.extensions.update');
    Route::delete('call-settings/extensions/{extension}', [CallSettingsController::class, 'destroyExtension'])->name('call-settings.extensions.destroy');
    Route::patch('call-settings/operations', [CallSettingsController::class, 'updateOperations'])->name('call-settings.operations.update');
    Route::post('call-settings/queues', [CallSettingsController::class, 'storeQueue'])->name('call-settings.queues.store');
    Route::patch('call-settings/queues/{queue}', [CallSettingsController::class, 'updateQueue'])->name('call-settings.queues.update');
    Route::delete('call-settings/queues/{queue}', [CallSettingsController::class, 'destroyQueue'])->name('call-settings.queues.destroy');

    // Notification
    Route::patch('notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');

    // Ортодонт аппарат бүртгэл (read-only admin view)
    Route::get('ortho-appliances', [OrthoApplianceController::class, 'adminIndex'])->name('ortho-appliances.index');

    // Лаб бүртгэл (read-only admin view + цалин бодсон тэмдэглэгээ)
    Route::get('lab-orders', [LabOrderController::class, 'index'])->name('lab-orders.index');
    Route::get('lab-orders/export', [LabOrderController::class, 'exportExcel'])->name('lab-orders.export');
    Route::post('lab-orders/{labOrder}/payroll', [LabOrderController::class, 'togglePayroll'])->name('lab-orders.payroll');

    // Лабын нэгдсэн тайлан
    Route::get('lab-report', [LabReportController::class, 'index'])->name('lab-report.index');

    // Лаб ажилтны гүйцэтгэл — сар / улирал / жилээр
    Route::get('lab-employees', [LabEmployeeController::class, 'index'])->name('lab-employees.index');
    Route::get('lab-employees/{employee}/export', [LabEmployeeController::class, 'export'])->name('lab-employees.export');
    Route::get('lab-employees/{employee}', [LabEmployeeController::class, 'show'])->name('lab-employees.show');

    // ── Лабын сургалт: видео ба файл хичээл ─────────────────────────────────
    // Хоёр хуудас ижил courses/lessons үйлдлүүдийг хуваалцана — зөвхөн
    // жагсаалт нь сургалтын төрлөөр тусгаарлагдана.
    Route::get('lab-training', [LabCourseController::class, 'index'])->name('lab-training.index');
    Route::get('lab-training/documents', [LabCourseController::class, 'documents'])->name('lab-training.documents');
    Route::post('lab-training/courses/reorder', [LabCourseController::class, 'reorder'])->name('lab-training.courses.reorder');
    Route::post('lab-training/courses', [LabCourseController::class, 'store'])->name('lab-training.courses.store');
    Route::post('lab-training/courses/{labCourse}', [LabCourseController::class, 'update'])->name('lab-training.courses.update');
    Route::delete('lab-training/courses/{labCourse}', [LabCourseController::class, 'destroy'])->name('lab-training.courses.destroy');

    // Админ өөрөө бичлэгээ шалгах — нийтлээгүй хичээл, хадгалаагүй байршуулалт ч тоглоно
    Route::get('lab-training/lessons/{labLesson}/stream', [LabLessonController::class, 'stream'])->name('lab-training.lessons.stream');
    Route::get('lab-training/lessons/{labLesson}/document', [LabLessonController::class, 'document'])->name('lab-training.lessons.document');
    Route::post('lab-training/lessons/{labLesson}/reconvert', [LabLessonController::class, 'reconvert'])->name('lab-training.lessons.reconvert');
    Route::get('lab-training/preview', [LabLessonController::class, 'preview'])->name('lab-training.preview');

    Route::post('lab-training/lessons/reorder', [LabLessonController::class, 'reorder'])->name('lab-training.lessons.reorder');
    Route::post('lab-training/lessons', [LabLessonController::class, 'store'])->name('lab-training.lessons.store');
    Route::post('lab-training/lessons/{labLesson}', [LabLessonController::class, 'update'])->name('lab-training.lessons.update');
    Route::post('lab-training/lessons/{labLesson}/attachment/delete', [LabLessonController::class, 'destroyAttachment'])->name('lab-training.lessons.attachment.destroy');
    Route::delete('lab-training/lessons/{labLesson}', [LabLessonController::class, 'destroy'])->name('lab-training.lessons.destroy');

    // ── Лабын сургалт: ангилал ба бүлэг ─────────────────────────────────────
    Route::post('lab-training/categories/reorder', [LabCategoryController::class, 'reorder'])->name('lab-training.categories.reorder');
    Route::post('lab-training/categories', [LabCategoryController::class, 'store'])->name('lab-training.categories.store');
    Route::post('lab-training/categories/{labCategory}', [LabCategoryController::class, 'update'])->name('lab-training.categories.update');
    Route::delete('lab-training/categories/{labCategory}', [LabCategoryController::class, 'destroy'])->name('lab-training.categories.destroy');

    Route::post('lab-training/sections/reorder', [LabCourseController::class, 'reorderSections'])->name('lab-training.sections.reorder');
    Route::post('lab-training/courses/{labCourse}/sections', [LabCourseController::class, 'storeSection'])->name('lab-training.sections.store');
    Route::post('lab-training/sections/{section}', [LabCourseController::class, 'updateSection'])->name('lab-training.sections.update');
    Route::delete('lab-training/sections/{section}', [LabCourseController::class, 'destroySection'])->name('lab-training.sections.destroy');

    // ── Лабын сургалт: шалгалт ──────────────────────────────────────────────
    Route::get('lab-training/exams', [LabExamController::class, 'index'])->name('lab-training.exams.index');
    // "create" нь {labExam}-аас өмнө байх ёстой — эс тэгвээс id гэж уншина
    Route::get('lab-training/exams/create', [LabExamController::class, 'create'])->name('lab-training.exams.create');
    Route::post('lab-training/exams', [LabExamController::class, 'store'])->name('lab-training.exams.store');
    Route::get('lab-training/exams/{labExam}/edit', [LabExamController::class, 'edit'])->name('lab-training.exams.edit');
    Route::get('lab-training/exams/{labExam}/results', [LabExamController::class, 'results'])->name('lab-training.exams.results');
    Route::post('lab-training/exams/{labExam}', [LabExamController::class, 'update'])->name('lab-training.exams.update');
    Route::delete('lab-training/exams/{labExam}', [LabExamController::class, 'destroy'])->name('lab-training.exams.destroy');
    Route::post('lab-training/answers/{answer}/grade', [LabExamController::class, 'gradeAnswer'])->name('lab-training.answers.grade');

    // ── Лабын сургалт: тайлан, сэтгэгдлийн модерац ──────────────────────────
    Route::get('lab-training/report', [LabTrainingReportController::class, 'index'])->name('lab-training.report');
    Route::get('lab-training/report/lessons/{labLesson}', [LabTrainingReportController::class, 'lesson'])->name('lab-training.report.lesson');

    // Ажилтны сургалтын хувийн хэрэг — дэлгэц дээр ба хэвлэхэд бэлэн PDF.
    // "pdf" нь {user}-аас өмнө биш, дараа нь ирж байгаа тул мөргөлдөхгүй.
    Route::get('lab-training/report/employees/{user}', [LabTrainingReportController::class, 'employee'])->name('lab-training.report.employee');
    Route::get('lab-training/report/employees/{user}/pdf', [LabTrainingReportController::class, 'employeePdf'])->name('lab-training.report.employee.pdf');

    Route::post('lab-training/comments/{comment}/pin', [LabTrainingReportController::class, 'pinComment'])->name('lab-training.comments.pin');
    Route::post('lab-training/comments/{comment}/hide', [LabTrainingReportController::class, 'hideComment'])->name('lab-training.comments.hide');
    Route::delete('lab-training/comments/{comment}', [LabTrainingReportController::class, 'destroyComment'])->name('lab-training.comments.destroy');

    // ── Bot Builder ─────────────────────────────────────────────────────────
    Route::get('chatbot-flows', [BotBuilderController::class, 'index'])->name('chatbot-flows.index');
    Route::put('chatbot/welcome', [BotBuilderController::class, 'updateWelcome'])->name('chatbot.welcome.update');
    Route::post('chatbot/flows', [BotBuilderController::class, 'storeFlow'])->name('chatbot.flows.store');
    Route::put('chatbot/flows/{flow}', [BotBuilderController::class, 'updateFlow'])->name('chatbot.flows.update');
    Route::put('chatbot/flows/{flow}/menu', [BotBuilderController::class, 'updateMenu'])->name('chatbot.flows.menu.update');
    Route::delete('chatbot/flows/{flow}', [BotBuilderController::class, 'destroyFlow'])->name('chatbot.flows.destroy');
    Route::post('chatbot/nodes', [BotBuilderController::class, 'storeNode'])->name('chatbot.nodes.store');
    Route::put('chatbot/nodes/{node}', [BotBuilderController::class, 'updateNode'])->name('chatbot.nodes.update');
    Route::delete('chatbot/nodes/{node}', [BotBuilderController::class, 'destroyNode'])->name('chatbot.nodes.destroy');

    // ── Social Bot (Facebook Page + Instagram) ──────────────────────────────
    Route::get('social/accounts', [SocialAccountController::class, 'index'])->name('social.accounts');
    Route::get('social/connect', [SocialOAuthController::class, 'connect'])->name('social.connect');
    Route::get('social/oauth/callback', [SocialOAuthController::class, 'callback'])->name('social.oauth.callback');
    Route::get('social/select', [SocialOAuthController::class, 'select'])->name('social.select');
    Route::post('social/select', [SocialOAuthController::class, 'store'])->name('social.select.store');
    Route::post('social/accounts/{account}/resubscribe', [SocialAccountController::class, 'resubscribe'])->name('social.accounts.resubscribe');
    Route::delete('social/accounts/{account}', [SocialAccountController::class, 'destroy'])->name('social.accounts.destroy');

    // Social marketing dashboard
    Route::get('social/dashboard', [SocialDashboardController::class, 'index'])->name('social.dashboard');

    // Social AI туслах (Gemini чат + тохиргоо)
    Route::get('social/ai', [SocialAiController::class, 'index'])->name('social.ai');
    Route::put('social/ai', [SocialAiController::class, 'update'])->name('social.ai.update');
    Route::post('social/ai/test', [SocialAiController::class, 'test'])->name('social.ai.test');
    Route::post('social/ai/simulate', [SocialAiController::class, 'simulate'])->name('social.ai.simulate');
    Route::post('social/ai/document', [SocialAiController::class, 'document'])->name('social.ai.document');
    Route::post('social/ai/faqs', [SocialAiController::class, 'storeFaq'])->name('social.ai.faqs.store');
    Route::post('social/ai/faqs/import', [SocialAiController::class, 'importFaqs'])->name('social.ai.faqs.import');
    Route::put('social/ai/faqs/{faq}', [SocialAiController::class, 'updateFaq'])->name('social.ai.faqs.update');
    Route::delete('social/ai/faqs/{faq}', [SocialAiController::class, 'destroyFaq'])->name('social.ai.faqs.destroy');

    // Social broadcast (масс маркетинг мессеж)
    Route::get('social/broadcasts', [SocialBroadcastController::class, 'index'])->name('social.broadcasts');
    Route::post('social/broadcasts/audience', [SocialBroadcastController::class, 'audience'])->name('social.broadcasts.audience');
    Route::post('social/broadcasts/image', [SocialBroadcastController::class, 'uploadImage'])->name('social.broadcasts.image');
    Route::post('social/broadcasts', [SocialBroadcastController::class, 'store'])->name('social.broadcasts.store');
    Route::get('social/broadcasts/{broadcast}', [SocialBroadcastController::class, 'show'])->name('social.broadcasts.show');

    // Social flow builder
    Route::get('social/flows', [SocialFlowController::class, 'index'])->name('social.flows');
    Route::post('social/flows', [SocialFlowController::class, 'storeFlow'])->name('social.flows.store');
    Route::put('social/flows/{flow}', [SocialFlowController::class, 'updateFlow'])->name('social.flows.update');
    Route::delete('social/flows/{flow}', [SocialFlowController::class, 'destroyFlow'])->name('social.flows.destroy');
    Route::post('social/flow-nodes', [SocialFlowController::class, 'storeNode'])->name('social.flow-nodes.store');
    Route::post('social/flow-nodes/positions', [SocialFlowController::class, 'savePositions'])->name('social.flow-nodes.positions');
    Route::post('social/flow-nodes/{node}/duplicate', [SocialFlowController::class, 'duplicateNode'])->name('social.flow-nodes.duplicate');
    Route::post('social/flow-image', [SocialFlowController::class, 'uploadImage'])->name('social.flow-image');
    Route::post('social/flow-file', [SocialFlowController::class, 'uploadFile'])->name('social.flow-file');
    Route::put('social/flow-nodes/{node}', [SocialFlowController::class, 'updateNode'])->name('social.flow-nodes.update');
    Route::delete('social/flow-nodes/{node}', [SocialFlowController::class, 'destroyNode'])->name('social.flow-nodes.destroy');
    Route::post('social/flow-buttons', [SocialFlowController::class, 'storeButton'])->name('social.flow-buttons.store');
    Route::post('social/flow-buttons/reorder', [SocialFlowController::class, 'reorderButtons'])->name('social.flow-buttons.reorder');
    Route::put('social/flow-buttons/{button}/link', [SocialFlowController::class, 'linkButton'])->name('social.flow-buttons.link');
    Route::put('social/flow-buttons/{button}/unlink', [SocialFlowController::class, 'unlinkButton'])->name('social.flow-buttons.unlink');
    Route::put('social/flow-buttons/{button}', [SocialFlowController::class, 'updateButton'])->name('social.flow-buttons.update');
    Route::delete('social/flow-buttons/{button}', [SocialFlowController::class, 'destroyButton'])->name('social.flow-buttons.destroy');

    // Social web forms
    Route::get('social/forms', [SocialFormController::class, 'index'])->name('social.forms');
    Route::post('social/forms', [SocialFormController::class, 'store'])->name('social.forms.store');
    Route::put('social/forms/{form}', [SocialFormController::class, 'update'])->name('social.forms.update');
    Route::delete('social/forms/{form}', [SocialFormController::class, 'destroy'])->name('social.forms.destroy');
    Route::get('social/forms/{form}/submissions', [SocialFormController::class, 'submissions'])->name('social.forms.submissions');

    // Social comment auto-reply rules
    Route::get('social/comment-rules', [SocialCommentRuleController::class, 'index'])->name('social.comment-rules');
    Route::get('social/comment-rules/accounts/{account}/posts', [SocialCommentRuleController::class, 'posts'])->name('social.comment-rules.posts');
    Route::post('social/comment-rules', [SocialCommentRuleController::class, 'store'])->name('social.comment-rules.store');
    Route::put('social/comment-rules/{rule}', [SocialCommentRuleController::class, 'update'])->name('social.comment-rules.update');
    Route::delete('social/comment-rules/{rule}', [SocialCommentRuleController::class, 'destroy'])->name('social.comment-rules.destroy');

    // Social inbox
    Route::get('social/inbox', [SocialInboxController::class, 'index'])->name('social.inbox');
    Route::get('social/inbox/conversations', [SocialInboxController::class, 'conversations'])->name('social.inbox.conversations');
    Route::get('social/inbox/flows', [SocialInboxController::class, 'flows'])->name('social.inbox.flows');
    Route::post('social/inbox/conversations/{conversation}/send-flow', [SocialInboxController::class, 'sendFlow'])->name('social.inbox.send-flow');
    Route::post('social/inbox/conversations/{conversation}/send-node', [SocialInboxController::class, 'sendNode'])->name('social.inbox.send-node');
    Route::get('social/inbox/conversations/{conversation}/messages', [SocialInboxController::class, 'messages'])->name('social.inbox.messages');
    Route::post('social/inbox/conversations/{conversation}/reply', [SocialInboxController::class, 'reply'])->name('social.inbox.reply');
    Route::post('social/inbox/conversations/{conversation}/attach', [SocialInboxController::class, 'attach'])->name('social.inbox.attach');
    Route::post('social/inbox/conversations/{conversation}/read', [SocialInboxController::class, 'markRead'])->name('social.inbox.read');
    Route::post('social/inbox/conversations/{conversation}/status', [SocialInboxController::class, 'setStatus'])->name('social.inbox.status');
    Route::delete('social/inbox/conversations/{conversation}', [SocialInboxController::class, 'destroy'])->name('social.inbox.destroy');
    Route::get('social/inbox/conversations/{conversation}/contact', [SocialInboxController::class, 'contactInfo'])->name('social.inbox.contact');
    Route::patch('social/inbox/conversations/{conversation}/contact', [SocialInboxController::class, 'updateContact'])->name('social.inbox.contact.update');

    // ── Admin chat (full thread UI) ─────────────────────────────────────────
    Route::get('chat', [App\Http\Controllers\Admin\ChatController::class, 'index'])->name('chat.index');

    // ── Chat inbox + group management ────────────────────────────────────────
    Route::get('chat-inbox', [ChatInboxController::class, 'index'])->name('chat-inbox.index');
    Route::get('chat-inbox/handoffs', [ChatInboxController::class, 'listHandoffs'])->name('chat-inbox.handoffs');
    Route::post('chat-inbox/handoffs/{handoff}/claim', [ChatInboxController::class, 'claimHandoff'])->name('chat-inbox.handoffs.claim');
    Route::post('chat-inbox/handoffs/{handoff}/close', [ChatInboxController::class, 'closeHandoff'])->name('chat-inbox.handoffs.close');
    Route::post('chat-inbox/groups', [ChatInboxController::class, 'createGroup'])->name('chat-inbox.groups.store');
    Route::get('chat-inbox/staff', [ChatInboxController::class, 'listStaff'])->name('chat-inbox.staff');
});

// ── Reception portal ─────────────────────────────────────────────────────────
// Ярианы бичлэг — админ ба ресепшн хоёуланд нээлттэй, эрхийг controller шалгана.
Route::middleware('auth')->get('/calls/{call}/recording', CallRecordingController::class)
    ->name('calls.recording');

Route::middleware(['auth', 'reception'])->prefix('reception')->name('reception.')->group(function () {
    Route::get('/dashboard', [ReceptionDashboardController::class, 'dashboard'])->name('dashboard');
    Route::get('/profile', [ReceptionDashboardController::class, 'profile'])->name('profile');

    // ── Дуудлага — зөвхөн өөрийн салбарынх ───────────────────────────────
    Route::get('/calls', [ReceptionCallController::class, 'index'])->name('calls.index');
    Route::get('/calls/poll', [ReceptionCallController::class, 'poll'])->middleware('throttle:60,1')->name('calls.poll');
    Route::patch('/calls/{call}/resolve', [ReceptionCallController::class, 'resolve'])->name('calls.resolve');
    Route::patch('/calls/{call}/unresolve', [ReceptionCallController::class, 'unresolve'])->name('calls.unresolve');
    Route::post('/profile', [ReceptionDashboardController::class, 'updateProfile'])->name('profile.update');

    // Эмчилгээний төлбөр (эмч → ресепшн)
    Route::get('/treatment-payments', [TreatmentPaymentController::class, 'index'])->name('treatment-payments.index');
    Route::get('/treatment-payments/poll', [TreatmentPaymentController::class, 'poll'])->middleware('throttle:60,1')->name('treatment-payments.poll');
    Route::patch('/treatment-payments/{record}/confirm', [TreatmentPaymentController::class, 'confirm'])->name('treatment-payments.confirm');
    Route::post('/leasing-plans/{plan}/pay', [TreatmentPaymentController::class, 'payInstallment'])->name('leasing-plans.pay');

    // Өдрийн тооцоо
    Route::get('/daily-sheet', [DailySheetController::class, 'index'])->name('daily-sheet.index');
    Route::post('/daily-sheet/save', [DailySheetController::class, 'save'])->name('daily-sheet.save');
    Route::post('/daily-sheet/submit-morning', [DailySheetController::class, 'submitMorning'])->name('daily-sheet.submit-morning');
    Route::post('/daily-sheet/submit', [DailySheetController::class, 'submit'])->name('daily-sheet.submit');
    Route::post('/daily-sheet/pay-outstanding/{entry}', [DailySheetController::class, 'payOutstanding'])->name('daily-sheet.pay-outstanding');
    Route::post('/daily-sheet/apply-overpaid/{entry}', [DailySheetController::class, 'applyOverpaid'])->name('daily-sheet.apply-overpaid');
    Route::get('/overpaid', [DailySheetController::class, 'overpaid'])->name('overpaid.index');

    Route::post('/daily-sheet/refund/{entry}', [DailySheetController::class, 'processRefund'])->name('daily-sheet.refund');
    Route::get('/refunds', [DailySheetController::class, 'refunds'])->name('refunds.index');

    // Дутуу тооцоо
    Route::get('/outstanding', [DailySheetController::class, 'outstanding'])->name('outstanding.list');

    // Өвчтний карт — static routes эхэлж, дараа нь {patient} wildcard
    Route::get('/patients', [ReceptionPatientController::class, 'index'])->name('patients.index');
    Route::post('/patients', [ReceptionPatientController::class, 'store'])->name('patients.store');
    Route::get('/patients/create', [ReceptionPatientController::class, 'create'])->name('patients.create');
    Route::get('/patients/search', [ReceptionPatientController::class, 'search'])->name('patients.search');
    Route::get('/patients/{patient}', [ReceptionPatientController::class, 'show'])->name('patients.show');
    Route::put('/patients/{patient}', [ReceptionPatientController::class, 'update'])->name('patients.update');
    Route::put('/patients/{patient}/medical', [ReceptionPatientController::class, 'updateMedical'])->name('patients.medical.update');
    Route::put('/patients/{patient}/ortho', [ReceptionPatientController::class, 'updateOrtho'])->name('patients.ortho.update');
    Route::post('/patients/{patient}/consent', [ReceptionPatientController::class, 'storeConsent'])->name('patients.consent.store');
    Route::post('/patients/{patient}/request-consent/{template}', [ReceptionPatientController::class, 'requestConsent'])->name('patients.consent.request');
    Route::get('/patients/{patient}/consent/{template}', [ReceptionPatientController::class, 'consentDetail'])->name('patients.consent-detail');

    // Хэрэглэгч удирдах (өвчтний нэвтрэх эрх)
    Route::get('/patient-users', [PatientUserController::class, 'index'])->name('patient-users.index');
    Route::post('/patient-users/{patient}/grant-access', [PatientUserController::class, 'grantAccess'])->name('patient-users.grant');
    Route::delete('/patient-users/{patient}/revoke-access', [PatientUserController::class, 'revokeAccess'])->name('patient-users.revoke');

    // Ортодонтийн аппарат бүртгэл
    Route::get('/ortho-appliances', [OrthoApplianceController::class, 'index'])->name('ortho-appliances.index');
    Route::post('/ortho-appliances', [OrthoApplianceController::class, 'store'])->name('ortho-appliances.store');
    Route::put('/ortho-appliances/{record}', [OrthoApplianceController::class, 'update'])->name('ortho-appliances.update');
    Route::delete('/ortho-appliances/{record}', [OrthoApplianceController::class, 'destroy'])->name('ortho-appliances.destroy');
    Route::get('/ortho-appliances/export', [OrthoApplianceController::class, 'export'])->name('ortho-appliances.export');
    Route::post('/ortho-appliances/import', [OrthoApplianceController::class, 'import'])->name('ortho-appliances.import');

    Route::get('/appointments/pending-poll', [ReceptionAppointmentController::class, 'pendingPoll'])->name('appointments.pending-poll');
    Route::get('/appointments/status-poll', [ReceptionAppointmentController::class, 'statusPoll'])->middleware('throttle:60,1')->name('appointments.status-poll');
    Route::get('/appointments/search', [ReceptionAppointmentController::class, 'search'])->name('appointments.search');
    Route::get('/appointments', [ReceptionAppointmentController::class, 'index'])->name('appointments.index');
    Route::post('/appointments', [ReceptionAppointmentController::class, 'store'])->name('appointments.store');
    Route::put('/appointments/{appointment}', [ReceptionAppointmentController::class, 'update'])->name('appointments.update');
    Route::patch('/appointments/{appointment}/status', [ReceptionAppointmentController::class, 'changeStatus'])->name('appointments.status');
    Route::delete('/appointments/{appointment}', [ReceptionAppointmentController::class, 'destroy'])->name('appointments.destroy');

    // ── Лаб бүртгэл ──────────────────────────────────────────────────────────
    Route::get('/lab-orders', [App\Http\Controllers\Reception\LabOrderController::class, 'index'])->name('lab-orders.index');
    Route::post('/lab-orders', [App\Http\Controllers\Reception\LabOrderController::class, 'store'])->name('lab-orders.store');
    Route::patch('/lab-orders/{labOrder}', [App\Http\Controllers\Reception\LabOrderController::class, 'update'])->name('lab-orders.update');
    Route::delete('/lab-orders/{labOrder}', [App\Http\Controllers\Reception\LabOrderController::class, 'destroy'])->name('lab-orders.destroy');

    // Буцаалт — төлбөр тооцоогүй, тусдаа мөчлөг
    Route::post('/lab-orders/{labOrder}/return', [App\Http\Controllers\Reception\LabOrderController::class, 'sendReturn'])->name('lab-orders.return.send');
    Route::post('/lab-orders/{labOrder}/return/close', [App\Http\Controllers\Reception\LabOrderController::class, 'closeReturn'])->name('lab-orders.return.close');
    Route::post('/lab-orders/{labOrder}/return/cancel', [App\Http\Controllers\Reception\LabOrderController::class, 'cancelReturn'])->name('lab-orders.return.cancel');
});

// ── Лабын сургалтын видео байршуулалт ────────────────────────────────────────
// Chunked upload нь нэг видеонд олон арван хүсэлт үүсгэдэг (500MB → ~125 chunk)
// тул админы ердийн throttle:120,1 хязгаарт багтахгүй. Тиймээс тусад нь,
// илүү өндөр хязгаартай бүлэгт байрлуулав.
Route::middleware(['auth', 'admin', 'throttle:1000,1'])->prefix('admin')->name('admin.')->group(function () {
    Route::post('lab-training/upload/chunk', [LabLessonController::class, 'uploadChunk'])->name('lab-training.upload.chunk');
    Route::post('lab-training/upload/finish', [LabLessonController::class, 'uploadFinish'])->name('lab-training.upload.finish');
    Route::post('lab-training/upload/cancel', [LabLessonController::class, 'uploadCancel'])->name('lab-training.upload.cancel');
});

// ── Lab portal ───────────────────────────────────────────────────────────────
// Лаб ажилтан зөвхөн ресепшн үүсгэсэн захиалга дээр ажиллана (нугалсан, өнгөлсөн, бэлэн огноо тэмдэглэх).
// Шинэ захиалга үүсгэх, устгах, төлбөр зэргийг ресепшн л хийнэ.
Route::middleware(['auth', 'lab'])->prefix('lab')->name('lab.')->group(function () {
    Route::get('/dashboard', [LabDashboardController::class, 'dashboard'])->name('dashboard');

    Route::get('/lab-orders', [App\Http\Controllers\Lab\LabOrderController::class, 'index'])->name('lab-orders.index');
    Route::patch('/lab-orders/{labOrder}', [App\Http\Controllers\Lab\LabOrderController::class, 'update'])->name('lab-orders.update');
});

// ── Doctor portal ────────────────────────────────────────────────────────────
Route::middleware(['doctor'])->prefix('doctor')->name('doctor.')->group(function () {
    Route::get('/dashboard', [DoctorPortalController::class, 'dashboard'])->name('dashboard');
    Route::get('/calendar', [DoctorPortalController::class, 'calendar'])->name('calendar');
    Route::get('/poll', [DoctorPortalController::class, 'calendarPoll'])->middleware('throttle:60,1')->name('poll');
    Route::get('/senior-calendar/{senior}', [DoctorPortalController::class, 'seniorCalendar'])->name('senior-calendar');
    Route::get('/online-slots', [DoctorOnlineSlotController::class, 'index'])->name('online-slots');
    Route::post('/online-slots', [DoctorOnlineSlotController::class, 'store'])->name('online-slots.store');
    Route::delete('/online-slots/{slotId}', [DoctorOnlineSlotController::class, 'destroy'])->name('online-slots.destroy');
    Route::get('/profile', [DoctorProfileController::class, 'show'])->name('profile');
    Route::put('/profile/password', [DoctorProfileController::class, 'updatePassword'])->name('profile.password');

    // Өвчтний карт (эмчийн порталд)
    Route::get('/patients/search', [DoctorPatientController::class, 'search'])->name('patients.search');
    Route::post('/patients/{patient}/treatment-records', [DoctorPatientController::class, 'storeTreatmentRecord'])->name('patients.treatment-records.store');
    Route::patch('/patients/{patient}/treatment-records/{record}/send', [DoctorPatientController::class, 'sendTreatmentRecord'])->name('patients.treatment-records.send');
    Route::delete('/patients/{patient}/treatment-records/{record}', [DoctorPatientController::class, 'destroyTreatmentRecord'])->name('patients.treatment-records.destroy');
    Route::put('/patients/{patient}/medical', [DoctorPatientController::class, 'updateMedical'])->name('patients.medical.update');
    Route::put('/patients/{patient}/ortho', [DoctorPatientController::class, 'updateOrtho'])->name('patients.ortho.update');
    // Ortho visits (Ortho-08 per-visit form)
    Route::post('/patients/{patient}/ortho-visits', [DoctorPatientController::class, 'storeOrthoVisit'])->name('patients.ortho-visits.store');
    Route::put('/patients/{patient}/ortho-visits/{visit}', [DoctorPatientController::class, 'updateOrthoVisit'])->name('patients.ortho-visits.update');
    Route::delete('/patients/{patient}/ortho-visits/{visit}', [DoctorPatientController::class, 'destroyOrthoVisit'])->name('patients.ortho-visits.destroy');
    // Ortho media (xray / before / after photos)
    Route::post('/patients/{patient}/ortho-media', [DoctorPatientController::class, 'uploadOrthoMedia'])->name('patients.ortho-media.store');
    Route::delete('/patients/{patient}/ortho-media/{media}', [DoctorPatientController::class, 'destroyOrthoMedia'])->name('patients.ortho-media.destroy');
    // Ortho visit — гарын үсгийн хүсэлт
    Route::post('/patients/{patient}/ortho-visits/{visit}/request-signature', [DoctorPatientController::class, 'requestOrthoVisitSignature'])->name('patients.ortho-visits.request-signature');
    // Ortho visits poll (doctor side — 15s signature status refresh)
    Route::get('/patients/{patient}/ortho-visits/poll', [DoctorPatientController::class, 'pollOrthoVisits'])->middleware('throttle:60,1')->name('patients.ortho-visits.poll');
    // General visits
    Route::post('/patients/{patient}/general-visits', [DoctorPatientController::class, 'storeGeneralVisit'])->name('patients.general-visits.store');
    Route::put('/patients/{patient}/general-visits/{visit}', [DoctorPatientController::class, 'updateGeneralVisit'])->name('patients.general-visits.update');
    Route::delete('/patients/{patient}/general-visits/{visit}', [DoctorPatientController::class, 'destroyGeneralVisit'])->name('patients.general-visits.destroy');
    Route::post('/patients/{patient}/general-visits/{visit}/request-signature', [DoctorPatientController::class, 'requestGeneralVisitSignature'])->name('patients.general-visits.request-signature');
    Route::get('/patients/{patient}/general-visits/poll', [DoctorPatientController::class, 'pollGeneralVisits'])->middleware('throttle:60,1')->name('patients.general-visits.poll');
    Route::get('/patients/{patient}', [DoctorPatientController::class, 'show'])->name('patients.show');
    Route::get('/patients', [DoctorPatientController::class, 'index'])->name('patients.index');
});

// ── Өвчтний бүртгэл (public) ─────────────────────────────────────────────────
Route::middleware('guest')->group(function () {
    Route::get('/patient/register', [PatientRegisterController::class, 'create'])->name('patient.register');
    Route::post('/patient/register/send-otp', [PatientRegisterController::class, 'sendOtp'])->middleware('throttle:5,1')->name('patient.register.send-otp');
    Route::get('/patient/register/otp', [PatientRegisterController::class, 'showOtp'])->name('patient.register.otp');
    Route::post('/patient/register/resend-otp', [PatientRegisterController::class, 'resendOtp'])->middleware('throttle:3,1')->name('patient.register.resend-otp');
    Route::post('/patient/register/verify-otp', [PatientRegisterController::class, 'verifyOtp'])->middleware('throttle:10,1')->name('patient.register.verify-otp');
});

// ── Өвчтний портал ───────────────────────────────────────────────────────────
Route::middleware(['auth', 'patient'])->prefix('patient')->name('patient.')->group(function () {
    Route::get('/dashboard', [PatientPortalController::class, 'dashboard'])->name('dashboard');
    Route::get('/profile', [PatientPortalController::class, 'profile'])->name('profile');
    Route::put('/profile', [PatientPortalController::class, 'updateProfile'])->name('profile.update');
    Route::post('/change-password', [PatientPortalController::class, 'changePassword'])->name('change-password');
    Route::get('/appointments', [PatientPortalController::class, 'appointments'])->name('appointments');
    Route::get('/appointments/poll', [PatientPortalController::class, 'appointmentsPoll'])->middleware('throttle:60,1')->name('appointments.poll');
    Route::post('/appointments/request', [PatientPortalController::class, 'requestAppointment'])->name('appointments.request');
    Route::get('/treatments', [PatientPortalController::class, 'treatments'])->name('treatments');
    Route::get('/consent-forms', [PatientPortalController::class, 'consentForms'])->name('consent-forms');
    Route::post('/consent-forms', [PatientPortalController::class, 'storeConsent'])->name('consent-forms.store');

    // Лизингийн QPay төлбөр
    Route::post('/leasing/{plan}/invoice', [PatientLeasingPaymentController::class, 'createInvoice'])->name('leasing.invoice');
    Route::get('/leasing/{plan}/check', [PatientLeasingPaymentController::class, 'checkStatus'])->name('leasing.check');

    // Дутуу тооцооны QPay төлбөр
    Route::post('/outstanding/{record}/invoice', [PatientOutstandingController::class, 'createInvoice'])->name('outstanding.invoice');
    Route::get('/outstanding/{record}/check', [PatientOutstandingController::class, 'checkStatus'])->name('outstanding.check');

    // Онлайн үзлэг зөвлөгөө
    Route::get('/online-consultation', [PatientOnlineConsultationController::class, 'index'])->name('online-consultation');
    Route::post('/online-consultation', [PatientOnlineConsultationController::class, 'store'])->name('online-consultation.store');

    // Ортодонт — гарын үсэг зурах
    Route::get('/ortho-signatures', [PatientPortalController::class, 'orthoSignatures'])->name('ortho-signatures');
    Route::get('/ortho-signatures/poll', [PatientPortalController::class, 'orthoSignaturesPoll'])->middleware('throttle:60,1')->name('ortho-signatures.poll');
    Route::post('/ortho-signatures/{visit}/sign', [PatientPortalController::class, 'signOrthoVisit'])->name('ortho-signatures.sign');
    Route::post('/general-signatures/{visit}/sign', [PatientPortalController::class, 'signGeneralVisit'])->name('general-signatures.sign');
});

// QPay callback — auth шаардахгүй (QPay сервер дуудна)
Route::post('/patient/leasing/callback/{planId}', [PatientLeasingPaymentController::class, 'callback'])->name('patient.leasing.callback');
Route::post('/patient/outstanding/callback/{recordId}', [PatientOutstandingController::class,  'callback'])->name('patient.outstanding.callback');

// ── Google OAuth (Meet линк үүсгэх зөвшөөрөл) ───────────────────────────────
Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/google/redirect', [GoogleOAuthController::class, 'redirect'])->name('google.redirect');
    Route::get('/google/callback', [GoogleOAuthController::class, 'callback'])->name('google.callback');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/hr.php';
