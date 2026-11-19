<?php

namespace Tests\Unit;

use App\Models\OverpaidUsage;
use PHPUnit\Framework\TestCase;

class OverpaidCreditHolderTest extends TestCase
{
    public function test_credit_goes_only_to_earliest_entry_with_same_receipt(): void
    {
        $entries = [
            (object) ['id' => 40, 'appointment_number' => '593'],   // сойз (дараа нэмсэн)
            (object) ['id' => 12, 'appointment_number' => ' 593 '], // чангалгаа (эхнийх)
            (object) ['id' => 15, 'appointment_number' => '599'],
            (object) ['id' => 16, 'appointment_number' => null],
            (object) ['id' => 17, 'appointment_number' => ''],
        ];

        $this->assertSame(['593' => 12, '599' => 15], OverpaidUsage::creditHolderIds($entries));
    }
}
