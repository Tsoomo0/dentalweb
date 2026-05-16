<?php

use App\Http\Controllers\Doctor\DoctorPortalController;
use App\Http\Controllers\Doctor\DoctorOnlineSlotController;
use App\Http\Controllers\Doctor\DoctorProfileController;
use App\Http\Controllers\Doctor\PatientController as DoctorPatientController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\TreatmentController;
use App\Http\Controllers\Admin\TreatmentCategoryController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\ArticleController;
use App\Http\Controllers\Admin\DoctorController;
use App\Http\Controllers\Admin\DoctorSlotController;
use App\Http\Controllers\Admin\SubTreatmentController;
use App\Http\Controllers\Admin\FaqController;
use App\Http\Controllers\Admin\AppointmentController;
use App\Http\Controllers\Admin\GalleryController;
use App\Http\Controllers\Admin\PaymentAdminController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Reception\ReceptionDashboardController;
use App\Http\Controllers\Reception\ReceptionAppointmentController;
use App\Http\Controllers\Reception\DailySheetController;
use App\Http\Controllers\Reception\TreatmentPaymentController;
use App\Http\Controllers\Reception\PatientController as ReceptionPatientController;
use App\Http\Controllers\Reception\PatientUserController;
use App\Http\Controllers\Reception\OrthoApplianceController;
use App\Http\Controllers\Patient\PatientPortalController;
use App\Http\Controllers\Auth\PatientRegisterController;
use App\Http\Controllers\Admin\DailySheetAdminController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\AppointmentExportController;
use App\Http\Controllers\Admin\NotificationController;
use App\Http\Controllers\Admin\PatientController as AdminPatientController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\Admin\JobApplicationController as AdminJobApplicationController;
use App\Http\Controllers\PortalController;
use App\Http\Controllers\My\ProfileController as MyProfileController;
use App\Http\Controllers\My\NurseBonusController as MyNurseBonusController;
use Illuminate\Support\Facades\Route;

// ── Public pages ─────────────────────────────────────────────────────────────

Route::get('/',               [PublicController::class, 'home'])->name('home');

Route::get('/sitemap.xml', function () {
    $base = config('app.url');
    $pages = [
        ['url' => $base . '/',         'priority' => '1.0', 'freq' => 'weekly'],
        ['url' => $base . '/about',    'priority' => '0.8', 'freq' => 'monthly'],
        ['url' => $base . '/services', 'priority' => '0.9', 'freq' => 'weekly'],
        ['url' => $base . '/doctors',  'priority' => '0.8', 'freq' => 'weekly'],
        ['url' => $base . '/gallery',  'priority' => '0.7', 'freq' => 'weekly'],
        ['url' => $base . '/articles', 'priority' => '0.7', 'freq' => 'daily'],
        ['url' => $base . '/contact',  'priority' => '0.6', 'freq' => 'monthly'],
        ['url' => $base . '/booking',  'priority' => '0.9', 'freq' => 'weekly'],
    ];
    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    foreach ($pages as $page) {
        $xml .= '<url>';
        $xml .= '<loc>' . $page['url'] . '</loc>';
        $xml .= '<changefreq>' . $page['freq'] . '</changefreq>';
        $xml .= '<priority>' . $page['priority'] . '</priority>';
        $xml .= '</url>';
    }
    $xml .= '</urlset>';
    return response($xml, 200)->header('Content-Type', 'application/xml');
});
Route::get('/about',          [PublicController::class, 'about'])->name('about');
Route::get('/services',       [PublicController::class, 'services'])->name('services');
Route::get('/doctors',        [PublicController::class, 'doctors'])->name('doctors');
Route::get('/gallery',        [PublicController::class, 'gallery'])->name('gallery');
Route::get('/articles',       [PublicController::class, 'articles'])->name('articles');
Route::get('/contact',        [PublicController::class, 'contact'])->name('contact');

// ── Цаг захиалга ─────────────────────────────────────────────────────────────
Route::get('/booking',                   [BookingController::class, 'index'])->name('booking');
Route::post('/booking',                  [BookingController::class, 'store'])->middleware('throttle:20,1')->name('booking.store');
Route::get('/booking/patient-lookup',    [BookingController::class, 'patientLookup'])->middleware('throttle:30,1')->name('booking.patient-lookup');

// ── Ажлын анкет ──────────────────────────────────────────────────────────────
Route::get('/job-application',  [JobApplicationController::class, 'index'])->name('job-application');
Route::post('/job-application', [JobApplicationController::class, 'store'])->middleware('throttle:5,1')->name('job-application.store');

// ── Төлбөр ───────────────────────────────────────────────────────────────────
Route::get('/payment/{appointment}',          [PaymentController::class, 'show'])->name('payment.show');
Route::post('/payment/{appointment}/invoice', [PaymentController::class, 'createInvoice'])->name('payment.invoice');
Route::get('/payment/{appointment}/check',    [PaymentController::class, 'checkStatus'])->name('payment.check');
Route::post('/payment/callback/{appointment}',[PaymentController::class, 'callback'])->name('payment.callback');

// ── Portal сонгох + ажилтны хувийн хэсэг ─────────────────────────────────────
Route::middleware(['either.auth'])->group(function () {
    Route::get('/portal-select',  [PortalController::class, 'select'])->name('portal.select');
    Route::get('/portal/work',    [PortalController::class, 'goWork'])->name('portal.work');
    Route::get('/portal/hr',      [PortalController::class, 'goHr'])->name('portal.hr');

    // Push subscription (PWA)
    Route::get('push/vapid-key',    [\App\Http\Controllers\PushSubscriptionController::class, 'vapidKey'])->name('push.vapid');
    Route::post('push/subscribe',   [\App\Http\Controllers\PushSubscriptionController::class, 'subscribe'])->name('push.subscribe');
    Route::post('push/unsubscribe', [\App\Http\Controllers\PushSubscriptionController::class, 'unsubscribe'])->name('push.unsubscribe');

    // Notification routes — either.auth (web болон doctor guard аль алинд нь)
    Route::get('notifications',               [NotificationController::class, 'index'])->middleware('throttle:30,1')->name('notif.index');
    Route::patch('notifications/{id}/read',  [NotificationController::class, 'markRead'])->name('notif.read');
    Route::post('notifications/read-all',    [NotificationController::class, 'markAllRead'])->name('notif.read-all');
    Route::delete('notifications/clear-all', [NotificationController::class, 'clearAll'])->name('notif.clear-all');

    Route::prefix('my')->name('my.')->group(function () {
        Route::get('/',       fn() => redirect()->route('my.home'));
        Route::get('/home',   [\App\Http\Controllers\My\HomeController::class, 'index'])->name('home');
        Route::get('/profile',          [MyProfileController::class, 'index'])->name('profile');
        Route::get('/change-password',  [\App\Http\Controllers\My\PasswordController::class, 'edit'])->name('change-password');
        Route::post('/change-password', [\App\Http\Controllers\My\PasswordController::class, 'update'])->name('change-password.update');
        // Гэр бүлийн гишүүд
        Route::post('/family-members',              [\App\Http\Controllers\My\FamilyMemberController::class, 'store'])->name('family-members.store');
        Route::put('/family-members/{familyMember}', [\App\Http\Controllers\My\FamilyMemberController::class, 'update'])->name('family-members.update');
        Route::delete('/family-members/{familyMember}', [\App\Http\Controllers\My\FamilyMemberController::class, 'destroy'])->name('family-members.destroy');
        // Чөлөөний хүсэлт
        Route::get('/leave-requests',  [\App\Http\Controllers\My\LeaveRequestController::class, 'index'])->name('leave-requests.index');
        Route::post('/leave-requests', [\App\Http\Controllers\My\LeaveRequestController::class, 'store'])->name('leave-requests.store');
        // Ээлжийн амралтын хүсэлт
        Route::get('/vacation-requests',  [\App\Http\Controllers\My\VacationRequestController::class, 'index'])->name('vacation-requests.index');
        Route::post('/vacation-requests', [\App\Http\Controllers\My\VacationRequestController::class, 'store'])->name('vacation-requests.store');
        // Цалингийн задаргаа
        Route::get('/payroll', [\App\Http\Controllers\My\PayrollController::class, 'index'])->name('payroll.index');
        // Ресепшний урамшуулал
        Route::get('/reception-bonus', [\App\Http\Controllers\My\ReceptionBonusController::class, 'index'])->name('reception-bonus.index');
        // Сувилагчийн урамшуулал
        Route::get('/nurse-bonus', [MyNurseBonusController::class, 'index'])->name('nurse-bonus.index');
        // Номын сан
        Route::get('/book-rentals',  [\App\Http\Controllers\My\BookRentalController::class, 'index'])->name('book-rentals.index');
        Route::post('/book-rentals', [\App\Http\Controllers\My\BookRentalController::class, 'store'])->name('book-rentals.store');
        // Тоног төхөөрөмж
        Route::get('/equipment',  [\App\Http\Controllers\My\EquipmentController::class, 'index'])->name('equipment.index');
        Route::patch('/equipment/{equipmentAssignment}/accept', [\App\Http\Controllers\My\EquipmentController::class, 'accept'])->name('equipment.accept');
        Route::patch('/equipment/{equipmentAssignment}/reject', [\App\Http\Controllers\My\EquipmentController::class, 'reject'])->name('equipment.reject');
        // Санал хүсэлт гомдол
        Route::get('/feedback',  [\App\Http\Controllers\My\FeedbackController::class, 'index'])->name('feedback.index');
        Route::post('/feedback', [\App\Http\Controllers\My\FeedbackController::class, 'store'])->name('feedback.store');
        // Сануулга / Зөрчил
        Route::get('/warnings',                                     [\App\Http\Controllers\My\WarningController::class, 'index'])->name('warnings.index');
        Route::patch('/warnings/{warning}/acknowledge',             [\App\Http\Controllers\My\WarningController::class, 'acknowledge'])->name('warnings.acknowledge');
        // Ажлын хуваарь
        Route::get('/work-schedule',                                [\App\Http\Controllers\My\WorkScheduleController::class, 'index'])->name('work-schedule.index');
        // Баримт бичиг
        Route::get('/documents',                                    [\App\Http\Controllers\My\DocumentController::class, 'index'])->name('documents.index');
        Route::get('/documents/{document}/download',                [\App\Http\Controllers\My\DocumentController::class, 'download'])->name('documents.download');
        Route::get('/documents/{document}/view',                    [\App\Http\Controllers\My\DocumentController::class, 'view'])->name('documents.view');
        // Ирцийн бүртгэл
        Route::post('/attendance/check-in',  [\App\Http\Controllers\My\AttendanceController::class, 'checkIn'])->name('attendance.check-in');
        Route::post('/attendance/check-out', [\App\Http\Controllers\My\AttendanceController::class, 'checkOut'])->name('attendance.check-out');

        // ── Chat ──────────────────────────────────────────────────────────────
        Route::get('/chat',                                       [\App\Http\Controllers\My\ChatController::class, 'index'])->name('chat.index');
        Route::get('/chat/conversations',                         [\App\Http\Controllers\My\ChatController::class, 'listConversations'])->name('chat.conversations');
        Route::post('/chat/heartbeat',                            [\App\Http\Controllers\My\ChatController::class, 'heartbeat'])->name('chat.heartbeat');
        Route::get('/chat/staff',                                 [\App\Http\Controllers\My\ChatController::class, 'listStaff'])->name('chat.staff');
        Route::post('/chat/groups',                               [\App\Http\Controllers\My\ChatController::class, 'createGroup'])->name('chat.groups.store');
        Route::post('/chat/conversations/direct',                 [\App\Http\Controllers\My\ChatController::class, 'startDirect'])->name('chat.direct.start');
        Route::get('/chat/conversations/{conversation}',          [\App\Http\Controllers\My\ChatController::class, 'show'])->name('chat.show');
        Route::post('/chat/conversations/{conversation}/messages', [\App\Http\Controllers\My\ChatController::class, 'store'])->name('chat.messages.store');
        Route::delete('/chat/messages/{message}',                  [\App\Http\Controllers\My\ChatController::class, 'destroyMessage'])->name('chat.messages.destroy');
        Route::delete('/chat/conversations/{conversation}',        [\App\Http\Controllers\My\ChatController::class, 'destroyConversation'])->name('chat.conversations.destroy');
        Route::post('/chat/conversations/{conversation}/read',    [\App\Http\Controllers\My\ChatController::class, 'markRead'])->name('chat.read');
        Route::post('/chat/conversations/{conversation}/typing',  [\App\Http\Controllers\My\ChatController::class, 'typing'])->name('chat.typing');
        Route::post('/chat/conversations/{conversation}/bot/start',  [\App\Http\Controllers\My\ChatController::class, 'botStart'])->name('chat.bot.start');
        Route::post('/chat/conversations/{conversation}/bot/button/{button}', [\App\Http\Controllers\My\ChatController::class, 'botButton'])->name('chat.bot.button');
    });
    Route::post('/portal/verify-switch', [\App\Http\Controllers\PortalController::class, 'verifyAndSwitch'])->name('portal.verify-switch');
});

// ── Dashboard redirect — хэрэглэгчийн рольоор зөв portal руу чиглүүлнэ ──────
Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        $user = \Illuminate\Support\Facades\Auth::user();
        if ($user->isAdmin())   return redirect()->route('admin.dashboard');
        if ($user->isPatient()) return redirect()->route('patient.dashboard');
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
    Route::patch('doctors/{doctor}/toggle', function (\App\Models\Doctor $doctor) {
        $doctor->update(['is_active' => !$doctor->is_active]);
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

    // Дутуу тооцоо (бүх цаг үе, бүх салбар)
    Route::get('outstanding', [DailySheetAdminController::class, 'outstanding'])->name('admin.outstanding');
    Route::get('outstanding/export', [DailySheetAdminController::class, 'exportOutstanding'])->name('admin.outstanding.export');

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

    // Notification
    Route::patch('notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('notifications/read-all',   [NotificationController::class, 'markAllRead'])->name('notifications.read-all');

    // Ортодонт аппарат бүртгэл (read-only admin view)
    Route::get('ortho-appliances', [OrthoApplianceController::class, 'adminIndex'])->name('ortho-appliances.index');

    // ── Bot Builder ─────────────────────────────────────────────────────────
    Route::get('chatbot-flows',                  [\App\Http\Controllers\Admin\BotBuilderController::class, 'index'])->name('chatbot-flows.index');
    Route::put('chatbot/welcome',                [\App\Http\Controllers\Admin\BotBuilderController::class, 'updateWelcome'])->name('chatbot.welcome.update');
    Route::post('chatbot/flows',                 [\App\Http\Controllers\Admin\BotBuilderController::class, 'storeFlow'])->name('chatbot.flows.store');
    Route::put('chatbot/flows/{flow}',           [\App\Http\Controllers\Admin\BotBuilderController::class, 'updateFlow'])->name('chatbot.flows.update');
    Route::put('chatbot/flows/{flow}/menu',      [\App\Http\Controllers\Admin\BotBuilderController::class, 'updateMenu'])->name('chatbot.flows.menu.update');
    Route::delete('chatbot/flows/{flow}',        [\App\Http\Controllers\Admin\BotBuilderController::class, 'destroyFlow'])->name('chatbot.flows.destroy');
    Route::post('chatbot/nodes',                 [\App\Http\Controllers\Admin\BotBuilderController::class, 'storeNode'])->name('chatbot.nodes.store');
    Route::put('chatbot/nodes/{node}',           [\App\Http\Controllers\Admin\BotBuilderController::class, 'updateNode'])->name('chatbot.nodes.update');
    Route::delete('chatbot/nodes/{node}',        [\App\Http\Controllers\Admin\BotBuilderController::class, 'destroyNode'])->name('chatbot.nodes.destroy');

    // ── Admin chat (full thread UI) ─────────────────────────────────────────
    Route::get('chat', [\App\Http\Controllers\Admin\ChatController::class, 'index'])->name('chat.index');

    // ── Chat inbox + group management ────────────────────────────────────────
    Route::get('chat-inbox',                                  [\App\Http\Controllers\Admin\ChatInboxController::class, 'index'])->name('chat-inbox.index');
    Route::get('chat-inbox/handoffs',                         [\App\Http\Controllers\Admin\ChatInboxController::class, 'listHandoffs'])->name('chat-inbox.handoffs');
    Route::post('chat-inbox/handoffs/{handoff}/claim',        [\App\Http\Controllers\Admin\ChatInboxController::class, 'claimHandoff'])->name('chat-inbox.handoffs.claim');
    Route::post('chat-inbox/handoffs/{handoff}/close',        [\App\Http\Controllers\Admin\ChatInboxController::class, 'closeHandoff'])->name('chat-inbox.handoffs.close');
    Route::post('chat-inbox/groups',                          [\App\Http\Controllers\Admin\ChatInboxController::class, 'createGroup'])->name('chat-inbox.groups.store');
    Route::get('chat-inbox/staff',                            [\App\Http\Controllers\Admin\ChatInboxController::class, 'listStaff'])->name('chat-inbox.staff');
});

// ── Reception portal ─────────────────────────────────────────────────────────
Route::middleware(['auth', 'reception'])->prefix('reception')->name('reception.')->group(function () {
    Route::get('/dashboard', [ReceptionDashboardController::class, 'dashboard'])->name('dashboard');
    Route::get('/profile', [ReceptionDashboardController::class, 'profile'])->name('profile');
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

    // Дутуу тооцоо
    Route::get('/outstanding', [DailySheetController::class, 'outstanding'])->name('outstanding.list');

    // Өвчтний карт — static routes эхэлж, дараа нь {patient} wildcard
    Route::get('/patients',                                          [ReceptionPatientController::class, 'index'])->name('patients.index');
    Route::post('/patients',                                         [ReceptionPatientController::class, 'store'])->name('patients.store');
    Route::get('/patients/create',                                   [ReceptionPatientController::class, 'create'])->name('patients.create');
    Route::get('/patients/search',                                   [ReceptionPatientController::class, 'search'])->name('patients.search');
    Route::get('/patients/{patient}',                                [ReceptionPatientController::class, 'show'])->name('patients.show');
    Route::put('/patients/{patient}',                                [ReceptionPatientController::class, 'update'])->name('patients.update');
    Route::put('/patients/{patient}/medical',                        [ReceptionPatientController::class, 'updateMedical'])->name('patients.medical.update');
    Route::put('/patients/{patient}/ortho',                          [ReceptionPatientController::class, 'updateOrtho'])->name('patients.ortho.update');
    Route::post('/patients/{patient}/consent',                       [ReceptionPatientController::class, 'storeConsent'])->name('patients.consent.store');
    Route::post('/patients/{patient}/request-consent/{template}',   [ReceptionPatientController::class, 'requestConsent'])->name('patients.consent.request');
    Route::get('/patients/{patient}/consent/{template}',             [ReceptionPatientController::class, 'consentDetail'])->name('patients.consent-detail');

    // Хэрэглэгч удирдах (өвчтний нэвтрэх эрх)
    Route::get('/patient-users',                                    [PatientUserController::class, 'index'])->name('patient-users.index');
    Route::post('/patient-users/{patient}/grant-access',            [PatientUserController::class, 'grantAccess'])->name('patient-users.grant');
    Route::delete('/patient-users/{patient}/revoke-access',         [PatientUserController::class, 'revokeAccess'])->name('patient-users.revoke');

    // Ортодонтийн аппарат бүртгэл
    Route::get('/ortho-appliances',                                [OrthoApplianceController::class, 'index'])->name('ortho-appliances.index');
    Route::post('/ortho-appliances',                               [OrthoApplianceController::class, 'store'])->name('ortho-appliances.store');
    Route::put('/ortho-appliances/{record}',                       [OrthoApplianceController::class, 'update'])->name('ortho-appliances.update');
    Route::delete('/ortho-appliances/{record}',                    [OrthoApplianceController::class, 'destroy'])->name('ortho-appliances.destroy');
    Route::get('/ortho-appliances/export',                         [OrthoApplianceController::class, 'export'])->name('ortho-appliances.export');
    Route::post('/ortho-appliances/import',                        [OrthoApplianceController::class, 'import'])->name('ortho-appliances.import');

    Route::get('/appointments/pending-poll', [ReceptionAppointmentController::class, 'pendingPoll'])->name('appointments.pending-poll');
    Route::get('/appointments/status-poll', [ReceptionAppointmentController::class, 'statusPoll'])->middleware('throttle:60,1')->name('appointments.status-poll');
    Route::get('/appointments/search', [ReceptionAppointmentController::class, 'search'])->name('appointments.search');
    Route::get('/appointments', [ReceptionAppointmentController::class, 'index'])->name('appointments.index');
    Route::post('/appointments', [ReceptionAppointmentController::class, 'store'])->name('appointments.store');
    Route::put('/appointments/{appointment}', [ReceptionAppointmentController::class, 'update'])->name('appointments.update');
    Route::patch('/appointments/{appointment}/status', [ReceptionAppointmentController::class, 'changeStatus'])->name('appointments.status');
    Route::delete('/appointments/{appointment}', [ReceptionAppointmentController::class, 'destroy'])->name('appointments.destroy');
});

// ── Doctor portal ────────────────────────────────────────────────────────────
Route::middleware(['doctor'])->prefix('doctor')->name('doctor.')->group(function () {
    Route::get('/dashboard',        [DoctorPortalController::class, 'dashboard'])->name('dashboard');
    Route::get('/calendar',         [DoctorPortalController::class, 'calendar'])->name('calendar');
    Route::get('/poll',             [DoctorPortalController::class, 'calendarPoll'])->middleware('throttle:60,1')->name('poll');
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
    Route::put('/patients/{patient}/ortho',   [DoctorPatientController::class, 'updateOrtho'])->name('patients.ortho.update');
    // Ortho visits (Ortho-08 per-visit form)
    Route::post('/patients/{patient}/ortho-visits',         [DoctorPatientController::class, 'storeOrthoVisit'])->name('patients.ortho-visits.store');
    Route::put('/patients/{patient}/ortho-visits/{visit}',  [DoctorPatientController::class, 'updateOrthoVisit'])->name('patients.ortho-visits.update');
    Route::delete('/patients/{patient}/ortho-visits/{visit}',[DoctorPatientController::class, 'destroyOrthoVisit'])->name('patients.ortho-visits.destroy');
    // Ortho media (xray / before / after photos)
    Route::post('/patients/{patient}/ortho-media',          [DoctorPatientController::class, 'uploadOrthoMedia'])->name('patients.ortho-media.store');
    Route::delete('/patients/{patient}/ortho-media/{media}',[DoctorPatientController::class, 'destroyOrthoMedia'])->name('patients.ortho-media.destroy');
    // Ortho visit — гарын үсгийн хүсэлт
    Route::post('/patients/{patient}/ortho-visits/{visit}/request-signature', [DoctorPatientController::class, 'requestOrthoVisitSignature'])->name('patients.ortho-visits.request-signature');
    // Ortho visits poll (doctor side — 15s signature status refresh)
    Route::get('/patients/{patient}/ortho-visits/poll', [DoctorPatientController::class, 'pollOrthoVisits'])->middleware('throttle:60,1')->name('patients.ortho-visits.poll');
    // General visits
    Route::post('/patients/{patient}/general-visits',                             [DoctorPatientController::class, 'storeGeneralVisit'])->name('patients.general-visits.store');
    Route::put('/patients/{patient}/general-visits/{visit}',                      [DoctorPatientController::class, 'updateGeneralVisit'])->name('patients.general-visits.update');
    Route::delete('/patients/{patient}/general-visits/{visit}',                   [DoctorPatientController::class, 'destroyGeneralVisit'])->name('patients.general-visits.destroy');
    Route::post('/patients/{patient}/general-visits/{visit}/request-signature',   [DoctorPatientController::class, 'requestGeneralVisitSignature'])->name('patients.general-visits.request-signature');
    Route::get('/patients/{patient}/general-visits/poll',                         [DoctorPatientController::class, 'pollGeneralVisits'])->middleware('throttle:60,1')->name('patients.general-visits.poll');
    Route::get('/patients/{patient}', [DoctorPatientController::class, 'show'])->name('patients.show');
    Route::get('/patients', [DoctorPatientController::class, 'index'])->name('patients.index');
});

// ── Өвчтний бүртгэл (public) ─────────────────────────────────────────────────
Route::middleware('guest')->group(function () {
    Route::get('/patient/register',              [PatientRegisterController::class, 'create'])->name('patient.register');
    Route::post('/patient/register/send-otp',    [PatientRegisterController::class, 'sendOtp'])->middleware('throttle:5,1')->name('patient.register.send-otp');
    Route::get('/patient/register/otp',          [PatientRegisterController::class, 'showOtp'])->name('patient.register.otp');
    Route::post('/patient/register/resend-otp',  [PatientRegisterController::class, 'resendOtp'])->middleware('throttle:3,1')->name('patient.register.resend-otp');
    Route::post('/patient/register/verify-otp',  [PatientRegisterController::class, 'verifyOtp'])->middleware('throttle:10,1')->name('patient.register.verify-otp');
});

// ── Өвчтний портал ───────────────────────────────────────────────────────────
Route::middleware(['auth', 'patient'])->prefix('patient')->name('patient.')->group(function () {
    Route::get('/dashboard',      [PatientPortalController::class, 'dashboard'])->name('dashboard');
    Route::get('/profile',        [PatientPortalController::class, 'profile'])->name('profile');
    Route::put('/profile',        [PatientPortalController::class, 'updateProfile'])->name('profile.update');
    Route::post('/change-password', [PatientPortalController::class, 'changePassword'])->name('change-password');
    Route::get('/appointments',       [PatientPortalController::class, 'appointments'])->name('appointments');
    Route::get('/appointments/poll',  [PatientPortalController::class, 'appointmentsPoll'])->middleware('throttle:60,1')->name('appointments.poll');
    Route::post('/appointments/request', [PatientPortalController::class, 'requestAppointment'])->name('appointments.request');
    Route::get('/treatments', [PatientPortalController::class, 'treatments'])->name('treatments');
    Route::get('/consent-forms',      [PatientPortalController::class, 'consentForms'])->name('consent-forms');
    Route::post('/consent-forms',     [PatientPortalController::class, 'storeConsent'])->name('consent-forms.store');

    // Лизингийн QPay төлбөр
    Route::post('/leasing/{plan}/invoice', [\App\Http\Controllers\Patient\PatientLeasingPaymentController::class, 'createInvoice'])->name('leasing.invoice');
    Route::get('/leasing/{plan}/check',    [\App\Http\Controllers\Patient\PatientLeasingPaymentController::class, 'checkStatus'])->name('leasing.check');

    // Дутуу тооцооны QPay төлбөр
    Route::post('/outstanding/{record}/invoice', [\App\Http\Controllers\Patient\PatientOutstandingController::class, 'createInvoice'])->name('outstanding.invoice');
    Route::get('/outstanding/{record}/check',    [\App\Http\Controllers\Patient\PatientOutstandingController::class, 'checkStatus'])->name('outstanding.check');

    // Онлайн үзлэг зөвлөгөө
    Route::get('/online-consultation',  [\App\Http\Controllers\Patient\PatientOnlineConsultationController::class, 'index'])->name('online-consultation');
    Route::post('/online-consultation', [\App\Http\Controllers\Patient\PatientOnlineConsultationController::class, 'store'])->name('online-consultation.store');

    // Ортодонт — гарын үсэг зурах
    Route::get('/ortho-signatures',                      [PatientPortalController::class, 'orthoSignatures'])->name('ortho-signatures');
    Route::get('/ortho-signatures/poll',                 [PatientPortalController::class, 'orthoSignaturesPoll'])->middleware('throttle:60,1')->name('ortho-signatures.poll');
    Route::post('/ortho-signatures/{visit}/sign',        [PatientPortalController::class, 'signOrthoVisit'])->name('ortho-signatures.sign');
    Route::post('/general-signatures/{visit}/sign',      [PatientPortalController::class, 'signGeneralVisit'])->name('general-signatures.sign');
});

// QPay callback — auth шаардахгүй (QPay сервер дуудна)
Route::post('/patient/leasing/callback/{planId}',       [\App\Http\Controllers\Patient\PatientLeasingPaymentController::class, 'callback'])->name('patient.leasing.callback');
Route::post('/patient/outstanding/callback/{recordId}', [\App\Http\Controllers\Patient\PatientOutstandingController::class,  'callback'])->name('patient.outstanding.callback');

// ── Google OAuth (Meet линк үүсгэх зөвшөөрөл) ───────────────────────────────
Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/google/redirect', [\App\Http\Controllers\Admin\GoogleOAuthController::class, 'redirect'])->name('google.redirect');
    Route::get('/google/callback', [\App\Http\Controllers\Admin\GoogleOAuthController::class, 'callback'])->name('google.callback');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/hr.php';
