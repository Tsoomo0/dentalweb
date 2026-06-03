<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Services\BankReconciliationService;
use App\Services\KhanBankStatementParser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BankReconciliationController extends Controller
{
    public function index(): Response
    {
        $branches = Branch::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('admin/bank-reconciliation/index', [
            'branches' => $branches,
        ]);
    }

    public function check(
        Request $request,
        KhanBankStatementParser $parser,
        BankReconciliationService $reconciler,
    ): JsonResponse|RedirectResponse {
        $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'year'      => 'required|integer|min:2020|max:2100',
            'month'     => 'required|integer|min:1|max:12',
            'day'       => 'required|integer|min:1|max:31',
            'file'      => ['required', 'file', 'max:10240', function ($attr, $value, $fail) {
                $ext = strtolower($value->getClientOriginalExtension());
                if (! in_array($ext, ['pdf', 'xls', 'xlsx', 'csv'])) {
                    $fail("Зөвхөн PDF, Excel, CSV файл оруулах боломжтой. Та .$ext файл оруулсан.");
                }
            }],
        ]);

        try {
            $statement = $parser->parse($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Файл уншихад алдаа гарлаа: '.$e->getMessage(),
            ], 422);
        }

        if (empty($statement['credits'])) {
            return response()->json([
                'error' => 'Хуулгаас кредит гүйлгээ олдсонгүй. Файлын формат буруу байж магадгүй.',
            ], 422);
        }

        $date = sprintf('%04d-%02d-%02d', $request->year, $request->month, $request->day);

        $result = $reconciler->reconcile(
            (int) $request->branch_id,
            $date,
            $statement,
        );

        return response()->json([
            'statement' => [
                'account_number' => $statement['account_number'] ?? null,
                'account_holder' => $statement['account_holder'] ?? null,
                'period_from'    => $statement['period_from']    ?? null,
                'period_to'      => $statement['period_to']      ?? null,
            ],
            'result' => $result,
        ]);
    }
}
