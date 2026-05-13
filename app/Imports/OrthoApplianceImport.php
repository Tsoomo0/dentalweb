<?php

namespace App\Imports;

use App\Models\OrthoApplianceRecord;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;

class OrthoApplianceImport implements ToModel, WithHeadingRow, SkipsEmptyRows
{
    public function __construct(private int $doctorId) {}

    public function model(array $row): ?OrthoApplianceRecord
    {
        $lastName  = trim($row['ovog']  ?? $row['last_name']  ?? '');
        $firstName = trim($row['ner']   ?? $row['first_name'] ?? '');

        if ($lastName === '' || $firstName === '') {
            return null;
        }

        $typeRaw = mb_strtolower(trim($row['apparat_torol'] ?? $row['appliance_type'] ?? ''));
        $type    = match(true) {
            str_contains($typeRaw, 'авагддаг') && !str_contains($typeRaw, 'үй') => 'removable',
            str_contains($typeRaw, 'removable')                                   => 'removable',
            default                                                                => 'fixed',
        };

        $attachedRaw = trim($row['zuusen_odor'] ?? $row['attached_date'] ?? '');
        $removedRaw  = trim($row['salgasan_odor'] ?? $row['removed_date'] ?? '');

        return new OrthoApplianceRecord([
            'doctor_id'       => $this->doctorId,
            'appliance_type'  => $type,
            'archive_code'    => trim($row['arhiv_kod']    ?? $row['archive_code']    ?? '') ?: null,
            'card_number'     => trim($row['kartn_']       ?? $row['card_number']     ?? '') ?: null,
            'register_number' => trim($row['rd']           ?? $row['register_number'] ?? '') ?: null,
            'last_name'       => $lastName,
            'first_name'      => $firstName,
            'phone'           => trim($row['utas']         ?? $row['phone']           ?? '') ?: null,
            'attached_date'   => $this->parseDate($attachedRaw),
            'removed_date'    => $this->parseDate($removedRaw),
            'notes'           => trim($row['temdeglelel'] ?? $row['temdeglelel'] ?? $row['notes'] ?? '') ?: null,
            'created_by'      => Auth::user()?->name ?? 'import',
        ]);
    }

    private function parseDate(string $raw): ?string
    {
        if ($raw === '') return null;
        try {
            return \Carbon\Carbon::parse($raw)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }
}
