<?php

namespace App\Http\Controllers\Admin;

use App\Exports\CallReportExport;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Services\CallPro\CallReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Админ тал — дуудлагын тайлан.
 *
 * Хянах самбар нь "яг одоо юу болж байна"-г графикаар харуулдаг бол энэ хуудас
 * нь "хугацаанд юу болсон"-ыг тоогоор гаргаж, Excel рүү экспортлоно.
 */
class CallReportController extends Controller
{
    public function index(Request $request, CallReportService $reports): Response
    {
        $f = $this->filters($request);

        return Inertia::render('admin/calls/reports', [
            'filters' => $f,
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'rows' => $reports->periods($f['from'], $f['to'], $f['branch_id'], $f['group_by']),
            'totals' => $reports->totals($f['from'], $f['to'], $f['branch_id']),
            'byBranch' => $reports->byBranch($f['from'], $f['to']),
        ]);
    }

    public function export(Request $request, CallReportService $reports): BinaryFileResponse
    {
        $f = $this->filters($request);

        $rows = $reports->periods($f['from'], $f['to'], $f['branch_id'], $f['group_by']);
        $rows[] = $reports->totals($f['from'], $f['to'], $f['branch_id']);

        $name = 'duudlaga-tailan-'.$f['from'].'_'.$f['to'].'.xlsx';

        return Excel::download(new CallReportExport($rows), $name);
    }

    /** @return array<string,mixed> */
    private function filters(Request $request): array
    {
        $groupBy = $request->query('group_by');

        return [
            'from' => $request->query('from') ?: Carbon::now()->startOfMonth()->toDateString(),
            'to' => $request->query('to') ?: Carbon::now()->toDateString(),
            'branch_id' => $request->query('branch_id') ? (int) $request->query('branch_id') : null,
            'group_by' => in_array($groupBy, ['day', 'week', 'month'], true) ? $groupBy : 'day',
        ];
    }
}
