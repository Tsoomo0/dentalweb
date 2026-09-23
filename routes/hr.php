<?php

use App\Http\Controllers\HR\AttendanceController;
use App\Http\Controllers\HR\BookCategoryController;
use App\Http\Controllers\HR\BookController;
use App\Http\Controllers\HR\BookRentalController;
use App\Http\Controllers\HR\CompanyStampController;
use App\Http\Controllers\HR\DashboardController;
use App\Http\Controllers\HR\DocumentCategoryController;
use App\Http\Controllers\HR\DocumentController;
use App\Http\Controllers\HR\DocumentTemplateController;
use App\Http\Controllers\HR\EmployeeController;
use App\Http\Controllers\HR\EmployeeDocumentController;
use App\Http\Controllers\HR\EquipmentController;
use App\Http\Controllers\HR\ExitChecklistController;
use App\Http\Controllers\HR\FeedbackController;
use App\Http\Controllers\HR\LeaveRequestController;
use App\Http\Controllers\HR\NurseBonusController;
use App\Http\Controllers\HR\OrthoScheduleController;
use App\Http\Controllers\HR\PayrollController;
use App\Http\Controllers\HR\PositionController;
use App\Http\Controllers\HR\ReceptionBonusController;
use App\Http\Controllers\HR\SealLockController;
use App\Http\Controllers\HR\SupportScheduleController;
use App\Http\Controllers\HR\VacationRequestController;
use App\Http\Controllers\HR\WarningController;
use App\Http\Controllers\HR\WorkScheduleController;
use App\Http\Controllers\SignatureController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'hr'])->prefix('hr')->name('hr.')->group(function () {

    // ── Хянах самбар ─────────────────────────────────────────────────────────
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // ── Албан тушаал ─────────────────────────────────────────────────────────
    Route::get('positions', [PositionController::class, 'index'])->name('positions.index');
    Route::post('positions', [PositionController::class, 'store'])->name('positions.store');
    Route::put('positions/{position}', [PositionController::class, 'update'])->name('positions.update');
    Route::delete('positions/{position}', [PositionController::class, 'destroy'])->name('positions.destroy');

    // ── Ажилтны бүртгэл ──────────────────────────────────────────────────────
    Route::get('employees', [EmployeeController::class, 'index'])->name('employees.index');
    Route::get('employees/export-excel', [EmployeeController::class, 'exportExcel'])->name('employees.export-excel');
    Route::get('employees/create', [EmployeeController::class, 'create'])->name('employees.create');
    Route::post('employees', [EmployeeController::class, 'store'])->name('employees.store');
    Route::get('employees/{employee}', [EmployeeController::class, 'show'])->name('employees.show');
    Route::get('employees/{employee}/edit', [EmployeeController::class, 'edit'])->name('employees.edit');
    Route::put('employees/{employee}', [EmployeeController::class, 'update'])->name('employees.update');
    Route::delete('employees/{employee}', [EmployeeController::class, 'destroy'])->name('employees.destroy');
    Route::patch('employees/{employee}/toggle', [EmployeeController::class, 'toggleStatus'])->name('employees.toggle');

    // ── Чөлөөний хүсэлт ─────────────────────────────────────────────────────
    Route::get('leave-requests', [LeaveRequestController::class, 'index'])->name('leave-requests.index');
    Route::get('leave-requests/export-excel', [LeaveRequestController::class, 'exportExcel'])->name('leave-requests.export-excel');
    Route::get('leave-requests/{leaveRequest}/pdf', [LeaveRequestController::class, 'pdf'])->name('leave-requests.pdf');
    Route::patch('leave-requests/{leaveRequest}/approve', [LeaveRequestController::class, 'approve'])->name('leave-requests.approve');
    Route::patch('leave-requests/{leaveRequest}/reject', [LeaveRequestController::class, 'reject'])->name('leave-requests.reject');
    Route::delete('leave-requests/{leaveRequest}', [LeaveRequestController::class, 'destroy'])->name('leave-requests.destroy');

    // ── Ээлжийн амралтын хүсэлт ──────────────────────────────────────────────
    Route::get('vacation-balance', [VacationRequestController::class, 'balanceIndex'])->name('vacation-requests.balance-index');
    Route::get('vacation-requests', [VacationRequestController::class, 'index'])->name('vacation-requests.index');
    Route::get('vacation-requests/export-excel', [VacationRequestController::class, 'exportExcel'])->name('vacation-requests.export-excel');
    Route::get('vacation-requests/{vacationRequest}/pdf', [VacationRequestController::class, 'pdf'])->name('vacation-requests.pdf');
    Route::patch('vacation-requests/{vacationRequest}/approve', [VacationRequestController::class, 'approve'])->name('vacation-requests.approve');
    Route::patch('vacation-requests/{vacationRequest}/reject', [VacationRequestController::class, 'reject'])->name('vacation-requests.reject');
    Route::delete('vacation-requests/{vacationRequest}', [VacationRequestController::class, 'destroy'])->name('vacation-requests.destroy');
    Route::patch('vacation-requests/employees/{employee}/balance', [VacationRequestController::class, 'updateBalance'])->name('vacation-requests.balance');

    // ── Цалингийн тооцоо ─────────────────────────────────────────────────────
    Route::get('payroll', [PayrollController::class, 'index'])->name('payroll.index');
    Route::get('payroll/create', [PayrollController::class, 'create'])->name('payroll.create');
    Route::post('payroll', [PayrollController::class, 'store'])->name('payroll.store');
    Route::get('payroll/{payrollRun}', [PayrollController::class, 'show'])->name('payroll.show');
    Route::put('payroll/{payrollRun}', [PayrollController::class, 'update'])->name('payroll.update');
    Route::patch('payroll/{payrollRun}/finalize', [PayrollController::class, 'finalize'])->name('payroll.finalize');
    Route::patch('payroll/{payrollRun}/reopen', [PayrollController::class, 'reopen'])->name('payroll.reopen');
    Route::delete('payroll/{payrollRun}', [PayrollController::class, 'destroy'])->name('payroll.destroy');
    Route::get('payroll/{payrollRun}/excel', [PayrollController::class, 'exportExcel'])->name('payroll.excel');
    Route::get('payroll/{payrollRun}/template', [PayrollController::class, 'downloadTemplate'])->name('payroll.template');
    Route::post('payroll/{payrollRun}/import', [PayrollController::class, 'importCsv'])->name('payroll.import');
    Route::post('payroll/{payrollRun}/entries/{entry}/send', [PayrollController::class, 'sendEntry'])->name('payroll.send-entry');

    // ── Ресепшний урамшуулал ──────────────────────────────────────────────────
    Route::get('reception-bonus', [ReceptionBonusController::class, 'index'])->name('reception-bonus.index');
    Route::post('reception-bonus', [ReceptionBonusController::class, 'store'])->name('reception-bonus.store');
    Route::get('reception-bonus/{receptionBonusRun}', [ReceptionBonusController::class, 'show'])->name('reception-bonus.show');
    Route::put('reception-bonus/{receptionBonusRun}', [ReceptionBonusController::class, 'update'])->name('reception-bonus.update');
    Route::patch('reception-bonus/{receptionBonusRun}/finalize', [ReceptionBonusController::class, 'finalize'])->name('reception-bonus.finalize');
    Route::patch('reception-bonus/{receptionBonusRun}/reopen', [ReceptionBonusController::class, 'reopen'])->name('reception-bonus.reopen');
    Route::delete('reception-bonus/{receptionBonusRun}', [ReceptionBonusController::class, 'destroy'])->name('reception-bonus.destroy');
    Route::get('reception-bonus/{receptionBonusRun}/excel', [ReceptionBonusController::class, 'exportExcel'])->name('reception-bonus.excel');
    Route::post('reception-bonus/{receptionBonusRun}/entries/{entry}/send', [ReceptionBonusController::class, 'sendEntry'])->name('reception-bonus.send-entry');

    // ── Сувилагчийн урамшуулал ──────────────────────────────────────────────────
    Route::get('nurse-bonus', [NurseBonusController::class, 'index'])->name('nurse-bonus.index');
    Route::post('nurse-bonus', [NurseBonusController::class, 'store'])->name('nurse-bonus.store');
    Route::post('nurse-bonus/bulk-finalize', [NurseBonusController::class, 'bulkFinalize'])->name('nurse-bonus.bulk-finalize');
    Route::get('nurse-bonus/{nurseBonusRun}', [NurseBonusController::class, 'show'])->name('nurse-bonus.show');
    Route::put('nurse-bonus/{nurseBonusRun}', [NurseBonusController::class, 'update'])->name('nurse-bonus.update');
    Route::patch('nurse-bonus/{nurseBonusRun}/finalize', [NurseBonusController::class, 'finalize'])->name('nurse-bonus.finalize');
    Route::patch('nurse-bonus/{nurseBonusRun}/reopen', [NurseBonusController::class, 'reopen'])->name('nurse-bonus.reopen');
    Route::delete('nurse-bonus/{nurseBonusRun}', [NurseBonusController::class, 'destroy'])->name('nurse-bonus.destroy');
    Route::get('nurse-bonus/{nurseBonusRun}/excel', [NurseBonusController::class, 'exportExcel'])->name('nurse-bonus.excel');
    Route::post('nurse-bonus/{nurseBonusRun}/entries', [NurseBonusController::class, 'addEntry'])->name('nurse-bonus.entries.add');
    Route::delete('nurse-bonus/{nurseBonusRun}/entries/{entry}', [NurseBonusController::class, 'removeEntry'])->name('nurse-bonus.entries.remove');

    // ── Санал хүсэлт гомдол ─────────────────────────────────────────────────
    Route::get('feedback', [FeedbackController::class, 'index'])->name('feedback.index');
    Route::patch('feedback/{feedback}/respond', [FeedbackController::class, 'respond'])->name('feedback.respond');
    Route::delete('feedback/{feedback}', [FeedbackController::class, 'destroy'])->name('feedback.destroy');

    // ── Ирцийн бүртгэл ──────────────────────────────────────────────────────
    Route::get('attendance', [AttendanceController::class, 'index'])->name('attendance.index');
    Route::get('attendance/export-excel', [AttendanceController::class, 'exportExcel'])->name('attendance.export-excel');

    // ── Ажлын хуваарь ────────────────────────────────────────────────────────
    Route::get('work-schedules', [WorkScheduleController::class, 'index'])->name('work-schedules.index');
    Route::post('work-schedules', [WorkScheduleController::class, 'store'])->name('work-schedules.store');
    Route::post('work-schedules/copy-week', [WorkScheduleController::class, 'copyWeek'])->name('work-schedules.copy-week');
    Route::post('work-schedules/row-fill', [WorkScheduleController::class, 'rowFill'])->name('work-schedules.row-fill');
    Route::post('work-schedules/save-tasks', [WorkScheduleController::class, 'saveTasks'])->name('work-schedules.save-tasks');
    Route::delete('work-schedules/{workSchedule}', [WorkScheduleController::class, 'destroy'])->name('work-schedules.destroy');

    // ── Гажиг заслын хуваарь (харагдац нь work-schedules доторх таб) ──────────
    Route::get('ortho-schedules', fn () => redirect()->route('hr.work-schedules.index'))->name('ortho-schedules.index');
    Route::post('ortho-schedules', [OrthoScheduleController::class, 'store'])->name('ortho-schedules.store');
    Route::post('ortho-schedules/range', [OrthoScheduleController::class, 'range'])->name('ortho-schedules.range');
    Route::post('ortho-schedules/clear-range', [OrthoScheduleController::class, 'clearRange'])->name('ortho-schedules.clear-range');
    Route::delete('ortho-schedules/{orthoSchedule}', [OrthoScheduleController::class, 'destroy'])->name('ortho-schedules.destroy');

    // ── Туслах ажилтны хуваарь (рентген техникч / ариутгал / ресепшн — work-schedules доторх таб) ──
    Route::post('support-schedules', [SupportScheduleController::class, 'store'])->name('support-schedules.store');
    Route::post('support-schedules/row-fill', [SupportScheduleController::class, 'rowFill'])->name('support-schedules.row-fill');
    Route::delete('support-schedules/{supportSchedule}', [SupportScheduleController::class, 'destroy'])->name('support-schedules.destroy');

    // ── Гарах бүртгэл ────────────────────────────────────────────────────────
    Route::get('exit-checklists', [ExitChecklistController::class, 'index'])->name('exit-checklists.index');
    Route::get('exit-checklists/create', [ExitChecklistController::class, 'create'])->name('exit-checklists.create');
    Route::post('exit-checklists', [ExitChecklistController::class, 'store'])->name('exit-checklists.store');
    Route::get('exit-checklists/{exitChecklist}', [ExitChecklistController::class, 'show'])->name('exit-checklists.show');
    Route::put('exit-checklists/{exitChecklist}', [ExitChecklistController::class, 'update'])->name('exit-checklists.update');
    Route::post('exit-checklists/{exitChecklist}/complete', [ExitChecklistController::class, 'complete'])->name('exit-checklists.complete');
    Route::post('exit-checklists/{exitChecklist}/reopen', [ExitChecklistController::class, 'reopen'])->name('exit-checklists.reopen');
    Route::delete('exit-checklists/{exitChecklist}', [ExitChecklistController::class, 'destroy'])->name('exit-checklists.destroy');

    // ── Баримт бичиг ─────────────────────────────────────────────────────────
    Route::get('documents', [DocumentController::class, 'index'])->name('documents.index');
    Route::post('documents', [DocumentController::class, 'store'])->name('documents.store');
    Route::delete('documents/{document}', [DocumentController::class, 'destroy'])->name('documents.destroy');
    Route::get('documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download');
    Route::get('documents/{document}/view', [DocumentController::class, 'view'])->name('documents.view');
    Route::post('document-categories', [DocumentCategoryController::class, 'store'])->name('document-categories.store');
    Route::put('document-categories/{documentCategory}', [DocumentCategoryController::class, 'update'])->name('document-categories.update');
    Route::delete('document-categories/{documentCategory}', [DocumentCategoryController::class, 'destroy'])->name('document-categories.destroy');

    // ── Гэрээ / АБТ-ийн загвар ───────────────────────────────────────────────
    Route::get('document-templates', [DocumentTemplateController::class, 'index'])->name('document-templates.index');
    Route::post('document-templates', [DocumentTemplateController::class, 'store'])->name('document-templates.store');
    Route::put('document-templates/{documentTemplate}', [DocumentTemplateController::class, 'update'])->name('document-templates.update');
    Route::post('document-templates/{documentTemplate}/duplicate', [DocumentTemplateController::class, 'duplicate'])->name('document-templates.duplicate');
    Route::delete('document-templates/{documentTemplate}', [DocumentTemplateController::class, 'destroy'])->name('document-templates.destroy');

    // ── Тамга / гарын үсгийн түгжээ ──────────────────────────────────────────
    // HR портал нь хүн нөөцийн бүх ажилтанд нээлттэй тул тамга солих, захирлын
    // гарын үсэг зурах үйлдлийг нэмэлт PIN кодоор хамгаална.
    Route::get('seal', [SealLockController::class, 'status'])->name('seal.status');
    Route::post('seal/unlock', [SealLockController::class, 'unlock'])->middleware('throttle:10,1')->name('seal.unlock');
    Route::post('seal/lock', [SealLockController::class, 'lock'])->name('seal.lock');

    // ── Байгууллагын тамга ───────────────────────────────────────────────────
    Route::get('company-stamp', [CompanyStampController::class, 'show'])->name('company-stamp.show');
    Route::post('company-stamp', [CompanyStampController::class, 'store'])->middleware('seal')->name('company-stamp.store');
    Route::delete('company-stamp', [CompanyStampController::class, 'destroy'])->middleware('seal')->name('company-stamp.destroy');
    Route::get('company-stamp/preview', [CompanyStampController::class, 'preview'])->name('company-stamp.preview');

    // ── Захирлын хадгалсан гарын үсэг — бичих үйлдэл түгжээтэй ───────────────
    // Ажилтан өөрийн баримтад гарын үсэг зурахад /signatures (түгжээгүй) чигээр
    // үлдэнэ; энд зөвхөн HR талын гэрээний дэлгэцээс хийх өөрчлөлт түгжигдэнэ.
    Route::get('signatures', [SignatureController::class, 'index'])->middleware('throttle:60,1')->name('signatures.index');
    Route::post('signatures', [SignatureController::class, 'store'])->middleware(['seal', 'throttle:20,1'])->name('signatures.store');
    Route::patch('signatures/{signature}/default', [SignatureController::class, 'setDefault'])->middleware('seal')->name('signatures.default');
    Route::post('signatures/{signature}/touch', [SignatureController::class, 'touch'])->middleware('throttle:60,1')->name('signatures.touch');
    Route::delete('signatures/{signature}', [SignatureController::class, 'destroy'])->middleware('seal')->name('signatures.destroy');

    // ── Ажилтны гэрээ / ажлын байрны тодорхойлолт ────────────────────────────
    Route::get('employee-documents', [EmployeeDocumentController::class, 'index'])->name('employee-documents.index');
    Route::post('employee-documents', [EmployeeDocumentController::class, 'store'])->name('employee-documents.store');
    Route::get('employee-documents/{employeeDocument}/content', [EmployeeDocumentController::class, 'show'])->name('employee-documents.content');
    Route::put('employee-documents/{employeeDocument}', [EmployeeDocumentController::class, 'update'])->name('employee-documents.update');
    Route::post('employee-documents/{employeeDocument}/sign', [EmployeeDocumentController::class, 'signEmployer'])->middleware('seal')->name('employee-documents.sign');
    Route::post('employee-documents/{employeeDocument}/remind', [EmployeeDocumentController::class, 'remind'])->name('employee-documents.remind');
    Route::post('employee-documents/{employeeDocument}/redeliver', [EmployeeDocumentController::class, 'redeliver'])->name('employee-documents.redeliver');
    Route::patch('employee-documents/{employeeDocument}/cancel', [EmployeeDocumentController::class, 'cancel'])->name('employee-documents.cancel');
    Route::get('employee-documents/{employeeDocument}/pdf', [EmployeeDocumentController::class, 'pdf'])->name('employee-documents.pdf');
    Route::delete('employee-documents/{employeeDocument}', [EmployeeDocumentController::class, 'destroy'])->name('employee-documents.destroy');

    // ── Сануулга / Зөрчил ────────────────────────────────────────────────────
    Route::get('warnings', [WarningController::class, 'index'])->name('warnings.index');
    Route::post('warnings', [WarningController::class, 'store'])->name('warnings.store');
    Route::delete('warnings/{warning}', [WarningController::class, 'destroy'])->name('warnings.destroy');

    // ── Тоног төхөөрөмж ──────────────────────────────────────────────────────
    Route::get('equipment', [EquipmentController::class, 'index'])->name('equipment.index');
    Route::post('equipment', [EquipmentController::class, 'store'])->name('equipment.store');
    Route::put('equipment/{equipment}', [EquipmentController::class, 'update'])->name('equipment.update');
    Route::delete('equipment/{equipment}', [EquipmentController::class, 'destroy'])->name('equipment.destroy');
    Route::post('equipment/{equipment}/assign', [EquipmentController::class, 'assign'])->name('equipment.assign');
    Route::patch('equipment-assignments/{equipmentAssignment}/return', [EquipmentController::class, 'markReturned'])->name('equipment-assignments.return');

    // ── Номын сан ────────────────────────────────────────────────────────────
    Route::get('books', [BookController::class, 'index'])->name('books.index');
    Route::post('books', [BookController::class, 'store'])->name('books.store');
    Route::put('books/{book}', [BookController::class, 'update'])->name('books.update');
    Route::delete('books/{book}', [BookController::class, 'destroy'])->name('books.destroy');

    Route::post('book-categories', [BookCategoryController::class, 'store'])->name('book-categories.store');
    Route::put('book-categories/{bookCategory}', [BookCategoryController::class, 'update'])->name('book-categories.update');
    Route::delete('book-categories/{bookCategory}', [BookCategoryController::class, 'destroy'])->name('book-categories.destroy');

    Route::get('book-rentals', [BookRentalController::class, 'index'])->name('book-rentals.index');
    Route::patch('book-rentals/{bookRental}/approve', [BookRentalController::class, 'approve'])->name('book-rentals.approve');
    Route::patch('book-rentals/{bookRental}/reject', [BookRentalController::class, 'reject'])->name('book-rentals.reject');
    Route::patch('book-rentals/{bookRental}/return', [BookRentalController::class, 'markReturned'])->name('book-rentals.return');
    Route::delete('book-rentals/{bookRental}', [BookRentalController::class, 'destroy'])->name('book-rentals.destroy');
});
