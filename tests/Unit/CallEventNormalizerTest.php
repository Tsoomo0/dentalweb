<?php

namespace Tests\Unit;

use App\Services\CallPro\CallEventNormalizer;
use App\Services\CallPro\PhoneNormalizer;
use PHPUnit\Framework\TestCase;

/**
 * CallPro-с ирсэн БОДИТ payload жишээнүүд дээр parser-ийг шалгана.
 *
 * Хоёр өөр нэршил дэмжигдэх ёстой:
 *   1. Realtime webhook (CallPro-integration-doc)
 *   2. Түүхэн дата (Voice-history-parameters) — 6 сарын дата ингэж ирнэ
 */
class CallEventNormalizerTest extends TestCase
{
    private CallEventNormalizer $n;

    protected function setUp(): void
    {
        $this->n = new CallEventNormalizer;
    }

    public function test_call_start(): void
    {
        $out = $this->n->normalize([
            'unique_id' => '1725436801.234',
            'number' => 99112233,
            'call_date' => '2026-09-04 10:15:02',
            'call_type' => 'inbound',
        ], 'start');

        $this->assertSame('start', $out['event']);
        $this->assertSame('1725436801.234', $out['unique_id']);
        $this->assertSame('99112233', $out['number_norm']);
        $this->assertSame('inbound', $out['direction']);
        $this->assertSame('2026-09-04 10:15:02', $out['call_date']->format('Y-m-d H:i:s'));
    }

    /** Баримт бичигт Call start хэсэгт "uniqie_id" гэж үсгийн алдаатай бичигдсэн. */
    public function test_typo_unique_id_is_accepted(): void
    {
        $out = $this->n->normalize(['uniqie_id' => 'abc.1', 'number' => 99112233], 'start');

        $this->assertSame('abc.1', $out['unique_id']);
    }

    public function test_call_answered(): void
    {
        $out = $this->n->normalize([
            'unique_id' => '1725436801.234',
            'number' => 99112233,
            'call_date' => '2026-09-04 10:15:07',
            'call_type' => 'inbound',
            'agent' => 1042,
            'call_status' => 'ANSWERED',
            'call_record' => 'https://cdr.callpro.mn/records/1725436801.234',
        ], 'answered');

        $this->assertSame('answered', $out['event']);
        $this->assertSame('1042', $out['agent']);
        $this->assertSame('ANSWERED', $out['call_status']);
        $this->assertSame('https://cdr.callpro.mn/records/1725436801.234', $out['call_record']);
    }

    public function test_call_end(): void
    {
        $out = $this->n->normalize([
            'unique_id' => '1725436801.234',
            'number' => 99112233,
            'call_date' => '2026-09-04 10:18:44',
            'call_type' => 'inbound',
            'call_record' => 'https://cdr.callpro.mn/records/1725436801.234',
            'call_status' => 'ANSWERED',
            'agent' => 1042,
            'duration' => 217,
        ], 'end');

        $this->assertSame('end', $out['event']);
        $this->assertSame(217, $out['duration']);
    }

    /** Алдсан дуудлагад unique_id ч, огноо ч ирдэггүй. */
    public function test_call_abandoned(): void
    {
        $out = $this->n->normalize([
            'number' => 99112233,
            'queue_name' => 'sales_queue',
        ], 'abandoned');

        $this->assertSame('abandoned', $out['event']);
        $this->assertNull($out['unique_id']);
        $this->assertNull($out['call_date']);
        $this->assertSame('sales_queue', $out['queue_name']);
        $this->assertSame('ABANDONED', $out['call_status']);
    }

    /** Voice-history-parameters.pdf-ийн нэршил — 6 сарын түүхэн дата ингэж ирнэ. */
    public function test_voice_history_naming(): void
    {
        $out = $this->n->normalize([
            'Unique ID' => '1725436801.999',
            'Date' => '2026-03-01 09:04:11',
            'Dir' => 'outbound',
            'Caller ID number' => 99887766,
            'Caller ID name' => 'Болд',
            'Disposition' => 'NO ANSWER',
            'Duration' => 42,
            'Who answered' => 501,
        ]);

        $this->assertSame('1725436801.999', $out['unique_id']);
        $this->assertSame('outbound', $out['direction']);
        $this->assertSame('99887766', $out['number_norm']);
        $this->assertSame('Болд', $out['caller_name']);
        $this->assertSame('NO ANSWER', $out['call_status']);
        $this->assertSame('501', $out['agent']);
        $this->assertSame('2026-03-01 09:04:11', $out['call_date']->format('Y-m-d H:i:s'));
    }

    /** Queue History нэршил — Callid, Queue, Agent, Hold time, Call time. */
    public function test_queue_history_naming(): void
    {
        $out = $this->n->normalize([
            'Callid' => 'q.55',
            'Queue' => 'salbar1',
            'Agent' => '102',
            'Hold time' => '00:00:35',
            'Call time' => '00:03:37',
            'Disposition' => 'Answered',
        ]);

        $this->assertSame('q.55', $out['unique_id']);
        $this->assertSame('salbar1', $out['queue_name']);
        $this->assertSame('102', $out['agent']);
        $this->assertSame(35, $out['hold_time']);
        // "Call time" нь ЯРЬСАН хугацаа — console дээр Duration-аас тусад нь
        // харагддаг. Нийт хугацаа ирээгүй тул үүгээр орлуулна.
        $this->assertSame(217, $out['talk_time']);
        $this->assertSame(217, $out['duration']);
        $this->assertSame('ANSWERED', $out['call_status']);
    }

    /** Console дээрх Duration (нийт) ба Talk time (яриа) хоёр тусдаа. */
    public function test_duration_and_talk_time_are_separate(): void
    {
        $out = $this->n->normalize([
            'unique_id' => 'd.1',
            'duration' => 142,        // 02:22 — хонх, хүлээлт орсон нийт
            'talk_time' => 65,        // 01:05 — яг ярьсан
        ], 'end');

        $this->assertSame(142, $out['duration']);
        $this->assertSame(65, $out['talk_time']);
    }

    /** Console дээр харагдсан Business number талбар. */
    public function test_business_number_is_captured(): void
    {
        $out = $this->n->normalize([
            'unique_id' => 'b.1',
            'number' => 88716624,
            'business_number' => 70003931,
        ], 'start');

        $this->assertSame('70003931', $out['business_number']);
    }

    /** CallPro хариултдаа call_recording гэж бичсэн, JSON жишээнд call_record. */
    public function test_both_recording_field_names(): void
    {
        $a = $this->n->normalize(['call_recording' => 'https://x/1'], 'end');

        $this->assertSame('https://x/1', $a['call_record']);
    }

    /** URL-д event заагаагүй үед талбаруудаас нь таамаглана. */
    public function test_event_inference_without_hint(): void
    {
        $this->assertSame('abandoned', $this->n->normalize(['number' => 1, 'queue_name' => 'q'])['event']);
        $this->assertSame('end', $this->n->normalize(['unique_id' => 'x', 'duration' => 10])['event']);
        $this->assertSame('answered', $this->n->normalize(['unique_id' => 'x', 'agent' => 100])['event']);
        $this->assertSame('start', $this->n->normalize(['unique_id' => 'x', 'number' => 99112233])['event']);
    }

    public function test_phone_normalization(): void
    {
        $this->assertSame('99112233', PhoneNormalizer::normalize('99112233'));
        $this->assertSame('99112233', PhoneNormalizer::normalize(99112233));
        $this->assertSame('99112233', PhoneNormalizer::normalize('+976 99112233'));
        $this->assertSame('99112233', PhoneNormalizer::normalize('976-9911-2233'));
        $this->assertSame('99112233', PhoneNormalizer::normalize('97699112233'));
        // Дотуур дугаар — өвчтөнтэй тааруулах утгагүй
        $this->assertNull(PhoneNormalizer::normalize('102'));
        $this->assertNull(PhoneNormalizer::normalize(''));
        $this->assertNull(PhoneNormalizer::normalize(null));
    }
}
