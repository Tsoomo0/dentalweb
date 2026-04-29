<?php

use App\Http\Controllers\Doctor\DoctorPortalController;
use App\Http\Controllers\Doctor\DoctorOnlineSlotController;
use App\Http\Controllers\Doctor\DoctorProfileController;
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
use App\Http\Controllers\PublicController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\Admin\JobApplicationController as AdminJobApplicationController;
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
Route::post('/booking',                  [BookingController::class, 'store'])->middleware('throttle:8,1')->name('booking.store');
Route::get('/booking/patient-lookup',    [BookingController::class, 'patientLookup'])->middleware('throttle:30,1')->name('booking.patient-lookup');

// ── Ажлын анкет ──────────────────────────────────────────────────────────────
Route::get('/job-application',  [JobApplicationController::class, 'index'])->name('job-application');
Route::post('/job-application', [JobApplicationController::class, 'store'])->middleware('throttle:5,1')->name('job-application.store');

// ── Төлбөр ───────────────────────────────────────────────────────────────────
Route::get('/payment/{appointment}',          [PaymentController::class, 'show'])->name('payment.show');
Route::post('/payment/{appointment}/invoice', [PaymentController::class, 'createInvoice'])->name('payment.invoice');
Route::get('/payment/{appointment}/check',    [PaymentController::class, 'checkStatus'])->name('payment.check');
Route::post('/payment/callback/{appointment}',[PaymentController::class, 'callback'])->name('payment.callback');

// ── Dashboard redirect ────────────────────────────────────────────────────────
Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', fn() => redirect()->route('admin.dashboard'))->name('dashboard');
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
    Route::resource('appointments', AppointmentController::class)->except(['edit']);
    Route::patch('appointments/{appointment}/status', [AppointmentController::class, 'changeStatus'])->name('appointments.status');
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

    // Системийн тохиргоо
    Route::get('settings', [SettingController::class, 'index'])->name('settings');
    Route::post('settings', [SettingController::class, 'update'])->name('settings.update');
    Route::post('settings/branding', [SettingController::class, 'uploadBranding'])->name('settings.branding');

    // Хэрэглэгч удирдах
    Route::resource('users', UserController::class)->except(['show']);
    Route::patch('users/{user}/toggle', [UserController::class, 'toggle'])->name('users.toggle');
});

// ── Reception portal ─────────────────────────────────────────────────────────
Route::middleware(['auth', 'reception'])->prefix('reception')->name('reception.')->group(function () {
    Route::get('/dashboard', [ReceptionDashboardController::class, 'dashboard'])->name('dashboard');
    Route::get('/profile', [ReceptionDashboardController::class, 'profile'])->name('profile');
    Route::post('/profile', [ReceptionDashboardController::class, 'updateProfile'])->name('profile.update');

    Route::get('/appointments/pending-poll', [ReceptionAppointmentController::class, 'pendingPoll'])->name('appointments.pending-poll');
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
    Route::get('/senior-calendar/{senior}', [DoctorPortalController::class, 'seniorCalendar'])->name('senior-calendar');
    Route::get('/online-slots', [DoctorOnlineSlotController::class, 'index'])->name('online-slots');
    Route::post('/online-slots', [DoctorOnlineSlotController::class, 'store'])->name('online-slots.store');
    Route::delete('/online-slots/{slotId}', [DoctorOnlineSlotController::class, 'destroy'])->name('online-slots.destroy');
    Route::get('/profile', [DoctorProfileController::class, 'show'])->name('profile');
    Route::put('/profile/password', [DoctorProfileController::class, 'updatePassword'])->name('profile.password');
});

// ── Google OAuth (Meet линк үүсгэх зөвшөөрөл) ───────────────────────────────
Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/google/redirect', [\App\Http\Controllers\Admin\GoogleOAuthController::class, 'redirect'])->name('google.redirect');
    Route::get('/google/callback', [\App\Http\Controllers\Admin\GoogleOAuthController::class, 'callback'])->name('google.callback');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
