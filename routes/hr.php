<?php

use App\Http\Controllers\HR\AttendanceController;
use App\Http\Controllers\HR\BookCategoryController;
use App\Http\Controllers\HR\BookController;
use App\Http\Controllers\HR\BookRentalController;
use App\Http\Controllers\HR\DashboardController;
use App\Http\Controllers\HR\DocumentCategoryController;
use App\Http\Controllers\HR\DocumentController;
use App\Http\Controllers\HR\EmployeeController;
use App\Http\Controllers\HR\EquipmentController;
use App\Http\Controllers\HR\ExitChecklistController;
use App\Http\Controllers\HR\FeedbackController;
use App\Http\Controllers\HR\LeaveRequestController;
use App\Http\Controllers\HR\NurseBonusController;
use App\Http\Controllers\HR\PayrollController;
use App\Http\Controllers\HR\PositionController;
use App\Http\Controllers\HR\ReceptionBonusController;
use App\Http\Controllers\HR\VacationRequestController;
use App\Http\Controllers\HR\WarningController;
use App\Http\Controllers\HR\WorkScheduleController;
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
    Route::get('nurse-bonus/{nurseBonusRun}', [NurseBonusController::class, 'show'])->name('nurse-bonus.show');
    Route::put('nurse-bonus/{nurseBonusRun}', [NurseBonusController::class, 'update'])->name('nurse-bonus.update');
    Route::patch('nurse-bonus/{nurseBonusRun}/finalize', [NurseBonusController::class, 'finalize'])->name('nurse-bonus.finalize');
    Route::patch('nurse-bonus/{nurseBonusRun}/reopen', [NurseBonusController::class, 'reopen'])->name('nurse-bonus.reopen');
    Route::delete('nurse-bonus/{nurseBonusRun}', [NurseBonusController::class, 'destroy'])->name('nurse-bonus.destroy');
    Route::get('nurse-bonus/{nurseBonusRun}/excel', [NurseBonusController::class, 'exportExcel'])->name('nurse-bonus.excel');
    Route::post('nurse-bonus/{nurseBonusRun}/entries/{entry}/send', [NurseBonusController::class, 'sendEntry'])->name('nurse-bonus.send-entry');

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
    Route::put('work-schedules/{workSchedule}', [WorkScheduleController::class, 'update'])->name('work-schedules.update');
    Route::delete('work-schedules/{workSchedule}', [WorkScheduleController::class, 'destroy'])->name('work-schedules.destroy');

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
