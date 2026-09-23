<?php

namespace App\Services\CallPro;

use App\Models\CallPro\Call;
use App\Models\CallPro\CallBlockedNumber;
use App\Models\CallPro\CallExtension;
use App\Models\CallPro\CallQueue;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Нэг normalize хийгдсэн event-ийг `calls` хүснэгтэд буулгана.
 *
 * Нэг дуудлагад 3 event ирдэг (start → answered → end) бөгөөд бүгд ижил
 * unique_id-тай тул updateOrCreate зарчмаар дараалан баяжуулна. Event-үүд
 * эмх замбараагүй ирж болзошгүй тул аль хэдийн бөглөгдсөн талбарыг
 * хоосон утгаар ДАРЖ БОЛОХГҮЙ.
 */
class CallIngestor
{
    /** Abandoned event-ийг өмнөх Call start-тай тааруулах хугацааны цонх. */
    private const ABANDON_MATCH_MINUTES = 30;

    /** @var array<string,int|null>|null queue нэр → branch_id */
    private ?array $queueMap = null;

    public function ingest(array $data, string $source = 'realtime'): Call
    {
        return DB::transaction(function () use ($data, $source) {
            $call = $this->findOrCreateCall($data, $source);

            $this->fillTimestamps($call, $data);
            $this->fillIfEmpty($call, $data);
            $this->resolveBranchAndAgent($call, $data);
            $this->applyMissedFlag($call, $data);
            $this->applyOperationalFlags($call);

            $call->save();

            return $call;
        });
    }

    /**
     * unique_id байвал түүгээр, байхгүй бол (abandoned) дугаар + цагийн
     * цонхоор өмнөх дуудлагатай тааруулна.
     */
    private function findOrCreateCall(array $data, string $source): Call
    {
        if (filled($data['unique_id'])) {
            return Call::firstOrNew(
                ['unique_id' => (string) $data['unique_id']],
                ['source' => $source],
            );
        }

        // Abandoned — unique_id ирдэггүй. Тухайн дугаарын сүүлийн, дуусаагүй
        // ирсэн дуудлагыг олж түүн дээр нь тэмдэглэнэ. Олдохгүй бол шинээр.
        $since = ($data['call_date'] ?? Carbon::now())->copy()->subMinutes(self::ABANDON_MATCH_MINUTES);

        $existing = filled($data['number_norm'])
            ? Call::where('number_norm', $data['number_norm'])
                ->where('direction', 'inbound')
                ->whereNull('ended_at')
                ->where('started_at', '>=', $since)
                ->latest('started_at')
                ->first()
            : null;

        return $existing ?? new Call(['source' => $source]);
    }

    /** Event төрлөөс хамаарч цагийн талбаруудыг бөглөнө. */
    private function fillTimestamps(Call $call, array $data): void
    {
        // Abandoned дээр огноо ирэх эсэх нь баримт бичигт зөрүүтэй байсан тул
        // ирээгүй бол хүлээн авсан цагаар орлуулна.
        $at = $data['call_date'] ?? Carbon::now();

        $field = match ($data['event']) {
            'start' => 'started_at',
            'answered' => 'answered_at',
            'end', 'abandoned' => 'ended_at',
            default => null,
        };

        if ($field !== null && blank($call->{$field})) {
            $call->{$field} = $at;
        }

        // Ямар ч тохиолдолд эхэлсэн цаг хоосон үлдэхгүй (жагсаалт үүгээр эрэмбэлэгдэнэ).
        if (blank($call->started_at)) {
            $call->started_at = $at;
        }
    }

    /** Хоосон талбарыг л бөглөнө — сүүлийн event өмнөхийг устгахаас сэргийлнэ. */
    private function fillIfEmpty(Call $call, array $data): void
    {
        foreach (['number', 'number_norm', 'business_number', 'caller_name', 'queue_name', 'call_record'] as $field) {
            if (blank($call->{$field}) && filled($data[$field] ?? null)) {
                $call->{$field} = $data[$field];
            }
        }

        // Эдгээрийг сүүлийн event-ийн утгаар шинэчилнэ (төлөв өөрчлөгддөг).
        if (filled($data['direction'])) {
            $call->direction = $data['direction'];
        }
        if (filled($data['call_status'])) {
            $call->call_status = $data['call_status'];
        }
        if (filled($data['duration'])) {
            $call->duration = $data['duration'];
        }
        if (filled($data['talk_time'])) {
            $call->talk_time = $data['talk_time'];
        }
        if (filled($data['hold_time'])) {
            $call->hold_time = $data['hold_time'];
        }
    }

    /**
     * Салбарыг тодорхойлох дараалал:
     *   1. agent (дотуур дугаар) → call_extensions      — хэн хариулсанаар
     *   2. queue_name (IVR товч)  → call_queues        — аль товч дарсанаар
     *
     * business_number-ийг ашиглахгүй: бүх салбар нэг ижил дугаартай (70003931)
     * тул салбар ялгах чадваргүй.
     *
     * ЧУХАЛ: АЛДСАН дуудлаганд `agent` ҮРГЭЛЖ хоосон ирдэг — CallPro хэн рүү
     * хонх дуугарснаа илгээдэггүй (2026-09-23-нд бодит датагаар баталсан).
     * Тиймээс алдсан дуудлагын цорын ганц эх сурвалж нь queue_name буюу
     * IVR-д дарсан товч. Түүнийг ч зөвхөн `abandoned` event авчирдаг.
     *
     * Аль нь ч олдохгүй бол branch_id хоосон үлдэж, админ талд "тодорхойгүй"
     * гэж харагдана. Дата хэзээ ч алдагдахгүй.
     */
    private function resolveBranchAndAgent(Call $call, array $data): void
    {
        if (filled($data['agent'])) {
            $call->agent = (string) $data['agent'];

            $ext = CallExtension::where('extension', $call->agent)->first();
            if ($ext) {
                $call->branch_id ??= $ext->branch_id;
                $call->user_id ??= $ext->user_id;
            }
        }

        if ($call->branch_id === null && filled($call->queue_name)) {
            $call->branch_id = $this->branchIdForQueue($call->queue_name);
        }
    }

    /**
     * Queue нэрээр салбар олно.
     *
     * Бүртгэлтэй боловч branch_id нь NULL бол энэ нь "зориуд салбаргүй" queue
     * (жишээ: 0 — мэдээлэл авах) — null буцаах нь зөв хариу.
     *
     * Нэг job дотор олон удаа дуудагдвал дахин уншихгүй. Job бүр шинэ instance
     * авдаг тул админ mapping-ээ өөрчилвөл шууд мөрдөгдөнө.
     */
    private function branchIdForQueue(string $queue): ?int
    {
        $this->queueMap ??= CallQueue::where('is_active', true)
            ->get(['name', 'branch_id'])
            ->mapWithKeys(fn (CallQueue $q) => [CallQueue::key($q->name) => $q->branch_id])
            ->all();

        return $this->queueMap[CallQueue::key($queue)] ?? null;
    }

    /**
     * Ажлын цаг болон спам төлөвийг тогтооно.
     *
     * Хоёулаа дуудлага үүсэх мөчид тогтоогдоно — дараа нь тохиргоо өөрчлөгдвөл
     * өнгөрсөн бүртгэл өөрчлөгдөхгүй. Тухайн үед ажлын цаг байсан эсэх нь
     * түүхэн баримт тул хойшид дахин тооцох нь буруу.
     */
    private function applyOperationalFlags(Call $call): void
    {
        $call->is_after_hours = ! CallSettings::isWorkingTime($call->started_at);
        $call->is_spam = CallBlockedNumber::isBlocked($call->number_norm);
    }

    /**
     * Алдсан дуудлага гэж үзэх нөхцөл:
     *   - abandoned event (дараалалд хүлээгээд таслав), эсвэл
     *   - ирсэн дуудлага дуусахад төлөв нь ANSWERED биш
     */
    private function applyMissedFlag(Call $call, array $data): void
    {
        if ($data['event'] === 'abandoned') {
            $call->is_missed = true;

            return;
        }

        if ($data['event'] !== 'end' || $call->direction !== 'inbound') {
            return;
        }

        $status = (string) $call->call_status;

        // Төлөв ирээгүй бол таамаглахгүй — хуурамч сэрэмжлүүлэг өгөхөөс
        // хойшлуулсан бүртгэл дээр нь дүгнэх нь дээр.
        if ($status === '') {
            return;
        }

        // Disposition: ANSWERED | NO ANSWER | BUSY | FAILED ...
        $call->is_missed = $status !== 'ANSWERED';
    }
}
