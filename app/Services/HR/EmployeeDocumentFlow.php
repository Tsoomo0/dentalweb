<?php

namespace App\Services\HR;

use App\Jobs\DeliverEmployeeDocument;
use App\Models\HR\EmployeeContract;
use App\Models\HR\EmployeeDocument;
use App\Models\User;
use App\Notifications\EmployeeDocumentDeclined;
use App\Notifications\EmployeeDocumentSent;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

use function Illuminate\Support\defer;

/**
 * Гэрээний гарын үсгийн урсгалын нэгдсэн логик —
 * HR болон ажилтны талын контроллерууд хоёулаа үүнийг дуудна.
 *
 * PDF үүсгэх, и-мэйл илгээх зэрэг удаан ажлыг хүсэлтийн хариу буцаасны
 * дараа гүйцэтгэнэ. Ингэснээр хэрэглэгч хүлээхгүй бөгөөд queue worker
 * ажиллаагүй сервер дээр ч и-мэйл хүрнэ.
 */
class EmployeeDocumentFlow
{
    /**
     * Ажил олгогч гарын үсэг зурсны дараа ажилтан руу дамжуулна.
     * Ажилтны гарын үсэг шаардахгүй бол шууд баталгаажна.
     */
    public static function afterEmployerSigned(EmployeeDocument $document): void
    {
        $needsEmployee = $document->template?->requires_employee_signature ?? true;

        if (! $needsEmployee) {
            self::complete($document);

            return;
        }

        $document->forceFill([
            'status' => 'pending_employee',
            'sent_at' => now(),
        ])->save();

        self::notifyEmployee($document);
    }

    /** Ажилтан гарын үсэг зурсны дараа баримтыг баталгаажуулна. */
    public static function afterEmployeeSigned(EmployeeDocument $document): void
    {
        self::complete($document);
    }

    /** Ажилтан татгалзсан. */
    public static function decline(EmployeeDocument $document, ?string $reason): void
    {
        $document->forceFill([
            'status' => 'declined',
            'decline_reason' => $reason,
        ])->save();

        $recipients = self::staffRecipients($document);

        defer(function () use ($recipients, $document) {
            foreach ($recipients as $user) {
                try {
                    $user->notify(new EmployeeDocumentDeclined($document));
                } catch (\Throwable $e) {
                    Log::warning('EmployeeDocument decline notification failed', ['id' => $document->id, 'error' => $e->getMessage()]);
                }
            }
        });
    }

    /**
     * Баримтыг баталгаажуулж, PDF үүсгэх, и-мэйлдэх ажлыг хойшлуулна.
     */
    public static function complete(EmployeeDocument $document): void
    {
        $document->forceFill([
            'status' => 'completed',
            'completed_at' => now(),
            'delivery_error' => null,
        ])->save();

        self::syncContract($document);

        self::dispatchDelivery($document);
    }

    /**
     * Баталгаажсан гэрээг ажилтны «Хөдөлмөрийн гэрээ» хэсэгт буулгана.
     *
     * Ажлын байрны тодорхойлолт гэрээ биш тул орохгүй. Нэг баримт нэг
     * мөртэй байхаар document_id-гаар шинэчилнэ — дахин баталгаажсан ч
     * давхардахгүй.
     */
    private static function syncContract(EmployeeDocument $document): void
    {
        if (in_array($document->type, EmployeeContract::NON_CONTRACT_TYPES, true)) {
            return;
        }

        EmployeeContract::updateOrCreate(
            ['document_id' => $document->id],
            [
                'employee_id' => $document->employee_id,
                // Дуусах огноогүй бол тодорхойгүй хугацаатай гэж үзнэ
                'contract_type' => $document->expires_at ? 'fixed' : 'indefinite',
                'title' => $document->title,
                'start_date' => $document->effective_date ?? $document->completed_at?->toDateString(),
                'end_date' => $document->expires_at,
                'notes' => $document->notes,
            ]
        );
    }

    /** Баталгаажсан гэрээг дахин илгээх — и-мэйл хүрээгүй тохиолдолд. */
    public static function redeliver(EmployeeDocument $document): void
    {
        $document->forceFill(['delivery_error' => null])->save();

        self::dispatchDelivery($document);
    }

    /**
     * Хүргэлтийн ажлыг хүсэлтийн хариу буцаасны дараа гүйцэтгэнэ.
     *
     * Дараалалд өгвөл queue worker ажиллахгүй сервер дээр гэрээ хэзээ ч
     * хүрэхгүй тул зориудаар afterResponse ашиглана — хэрэглэгч хүлээхгүй
     * бөгөөд нэмэлт дэд бүтэц шаардахгүй.
     */
    private static function dispatchDelivery(EmployeeDocument $document): void
    {
        dispatch(new DeliverEmployeeDocument($document->id))->afterResponse();
    }

    /** Ажилтанд "гарын үсэг зурна уу" мэдэгдэл + и-мэйл. */
    public static function notifyEmployee(EmployeeDocument $document): void
    {
        $document->loadMissing('employee.user');
        $user = $document->employee?->user;

        if (! $user) {
            return;
        }

        defer(function () use ($user, $document) {
            try {
                $user->notify(new EmployeeDocumentSent($document));
            } catch (\Throwable $e) {
                Log::warning('EmployeeDocument sent notification failed', ['id' => $document->id, 'error' => $e->getMessage()]);
            }
        });
    }

    /**
     * Мэдэгдэл хүлээн авах дотоод ажилтнууд — админууд + баримт үүсгэсэн хүн.
     *
     * @return Collection<int, User>
     */
    private static function staffRecipients(EmployeeDocument $document)
    {
        $users = User::whereHas('role', fn ($q) => $q->where('name', 'admin'))->get();

        $document->loadMissing('creator');
        if ($document->creator && ! $users->contains('id', $document->creator->id)) {
            $users->push($document->creator);
        }

        return $users;
    }
}
