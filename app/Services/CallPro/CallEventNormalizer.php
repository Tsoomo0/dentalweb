<?php

namespace App\Services\CallPro;

use Illuminate\Support\Carbon;

/**
 * CallPro-с ирэх payload-ыг нэг стандарт хэлбэрт оруулна.
 *
 * ХОЁР өөр нэршил ирдэг:
 *   1. Realtime webhook — unique_id, call_date, call_type, call_status, agent
 *   2. Түүхэн дата (Voice-history-parameters.pdf) — "Unique ID", "Date", "Dir",
 *      "Caller ID number", "Disposition", "Who answered", "Callid" ...
 *
 * Мөн баримт бичигт зөрүү байгааг тооцсон:
 *   - "uniqie_id" (Call start хэсэгт үсгийн алдаа)
 *   - "call_record" ба "call_recording" (хоёр өөр газар өөрөөр бичигдсэн)
 *
 * Түлхүүрийг жижиг үсэг + доогуур зураас болгож жиших тул "Caller ID number",
 * "caller_id_number", "CALLER_ID_NUMBER" бүгд ижил утгатай болно.
 */
class CallEventNormalizer
{
    /** Стандарт талбар → түүнд тохирох боломжит нэрсийн жагсаалт (эрэмбэтэй). */
    private const ALIASES = [
        'unique_id' => ['unique_id', 'uniqie_id', 'callid', 'call_id', 'uniqueid'],
        'number' => ['number', 'caller_id_number', 'caller_number', 'callerid', 'from'],
        'number_dialed' => ['number_dialed', 'dialed_number', 'to'],
        'caller_name' => ['caller_id_name', 'caller_name'],
        'direction' => ['call_type', 'dir', 'direction'],
        'call_status' => ['call_status', 'disposition', 'status'],
        // Үйлчлүүлэгчийн залгасан эмнэлгийн дугаар (CallPro console дээр
        // "Business number"). Салбар тодорхойлоход ашиглана.
        'business_number' => ['business_number', 'did', 'line_number', 'business'],
        'agent' => ['agent', 'who_answered', 'answered_by', 'extension'],
        'agent_name' => ['name', 'agent_name'],
        'queue_name' => ['queue_name', 'queue'],
        'call_date' => ['call_date', 'date', 'datetime', 'start_time'],
        'duration' => ['duration'],
        'talk_time' => ['talk_time', 'talktime', 'call_time', 'billsec'],
        'hold_time' => ['hold_time', 'holdtime', 'waittime'],
        'call_record' => ['call_record', 'call_recording', 'recording', 'record_url', 'recordingfile'],
        'transferred' => ['transferred'],
        'position' => ['position'],
        'who_hangup' => ['who_hangup', 'hangup'],
    ];

    /**
     * @param  array<string,mixed>  $payload
     * @param  string|null  $eventHint  URL-аас ирсэн event нэр (start|answered|end|abandoned)
     * @return array<string,mixed>
     */
    public function normalize(array $payload, ?string $eventHint = null): array
    {
        $flat = $this->flattenKeys($payload);

        $out = [];
        foreach (self::ALIASES as $field => $aliases) {
            $out[$field] = $this->pick($flat, $aliases);
        }

        $out['event'] = $this->resolveEvent($eventHint, $out);
        $out['direction'] = $this->normalizeDirection($out['direction']);
        $out['call_status'] = $this->normalizeStatus($out['call_status'], $out['event']);
        $out['call_date'] = $this->parseDate($out['call_date']);
        $out['duration'] = $this->parseSeconds($out['duration']);
        $out['talk_time'] = $this->parseSeconds($out['talk_time']);
        $out['hold_time'] = $this->parseSeconds($out['hold_time']);

        // Зөвхөн ярьсан хугацаа ирсэн бол нийт хугацаа гэж үзнэ (нэгээс
        // илүүг мэдэхгүй байснаас нэгийг мэдэх нь дээр).
        $out['duration'] ??= $out['talk_time'];

        // Outbound үед `number` нь бидний залгасан дугаар байх ёстой. CallPro
        // зөвхөн caller id илгээвэл number_dialed рүү шилжинэ.
        if ($out['number'] === null && $out['number_dialed'] !== null) {
            $out['number'] = $out['number_dialed'];
        }

        $out['number'] = $out['number'] !== null ? trim((string) $out['number']) : null;
        $out['business_number'] = $out['business_number'] !== null ? trim((string) $out['business_number']) : null;
        $out['number_norm'] = PhoneNormalizer::normalize($out['number']);
        $out['agent'] = $out['agent'] !== null ? trim((string) $out['agent']) : null;

        return $out;
    }

    /** Түлхүүрийг жижиг үсэг + доогуур зураас болгоно: "Caller ID name" → caller_id_name */
    private function flattenKeys(array $payload): array
    {
        $flat = [];
        foreach ($payload as $key => $value) {
            if (is_array($value)) {
                continue;
            }
            $norm = strtolower(trim((string) $key));
            $norm = preg_replace('/[^a-z0-9]+/', '_', $norm) ?? $norm;
            $flat[trim($norm, '_')] = $value;
        }

        return $flat;
    }

    private function pick(array $flat, array $aliases): mixed
    {
        foreach ($aliases as $alias) {
            if (array_key_exists($alias, $flat) && $flat[$alias] !== '' && $flat[$alias] !== null) {
                return $flat[$alias];
            }
        }

        return null;
    }

    /**
     * Event-ийг тодорхойлно. CallPro payload дотор event нэр илгээдэггүй тул
     * URL-аар ялгана. Хэрэв URL-д заагаагүй бол талбаруудаас таамаглана.
     */
    private function resolveEvent(?string $hint, array $out): string
    {
        $hint = strtolower((string) $hint);
        if (in_array($hint, ['start', 'answered', 'end', 'abandoned'], true)) {
            return $hint;
        }

        // unique_id байхгүй + queue байгаа = алдагдсан дуудлага
        if ($out['unique_id'] === null && $out['queue_name'] !== null) {
            return 'abandoned';
        }
        // Хугацаа нь зөвхөн дуудлага дуусахад ирнэ
        if ($out['duration'] !== null || $out['talk_time'] !== null) {
            return 'end';
        }
        if ($out['agent'] !== null || $out['call_status'] !== null) {
            return 'answered';
        }

        return 'start';
    }

    private function normalizeDirection(mixed $raw): string
    {
        $v = strtolower(trim((string) $raw));

        return str_contains($v, 'out') ? 'outbound' : 'inbound';
    }

    private function normalizeStatus(mixed $raw, string $event): ?string
    {
        if ($raw === null) {
            return $event === 'abandoned' ? 'ABANDONED' : null;
        }

        // "no answer", "NO ANSWER", "NOANSWER" → NO ANSWER
        $v = strtoupper(trim((string) $raw));

        return preg_replace('/\s+/', ' ', $v);
    }

    private function parseDate(mixed $raw): ?Carbon
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        try {
            // CallPro "2026-09-04 10:15:02" хэлбэрээр, цагийн бүсгүйгээр илгээдэг
            // тул аппын цагийн бүсээр уншина.
            return Carbon::parse((string) $raw);
        } catch (\Throwable) {
            return null;
        }
    }

    /** "217", 217, "00:03:37" бүгдийг секунд болгоно. */
    private function parseSeconds(mixed $raw): ?int
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        $v = trim((string) $raw);

        if (str_contains($v, ':')) {
            $parts = array_reverse(array_map('intval', explode(':', $v)));
            $seconds = 0;
            foreach ($parts as $i => $part) {
                $seconds += $part * (60 ** $i);
            }

            return $seconds;
        }

        return is_numeric($v) ? (int) $v : null;
    }
}
