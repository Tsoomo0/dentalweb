<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\CallPro\Call;
use App\Models\CallPro\CallExtension;
use App\Models\CallPro\CallQueue;
use App\Models\Role;
use App\Models\User;
use App\Notifications\MissedCall;
use Database\Seeders\CallProSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Бодит салбарын тохиргоо дээр дуудлага зөв салбарт очиж байгааг шалгана.
 *
 * Энэ тест нь CallProSeeder дэх жинхэнэ дугаар/queue-г ашигладаг тул
 * тохиргоо санамсаргүй өөрчлөгдвөл шууд унана.
 */
class CallProBranchRoutingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['Сансар', 'Хороолол', 'Цамбагарав', 'Яармаг'] as $name) {
            Branch::create(['name' => $name]);
        }

        $this->seed(CallProSeeder::class);
    }

    private function hook(string $event, array $payload)
    {
        return $this->postJson('/webhooks/callpro/'.$event, $payload);
    }

    private function branchId(string $name): int
    {
        return Branch::where('name', $name)->value('id');
    }

    public function test_seeder_maps_every_branch(): void
    {
        $this->assertSame($this->branchId('Сансар'), CallQueue::where('name', '1')->value('branch_id'));
        $this->assertSame($this->branchId('Яармаг'), CallQueue::where('name', '4')->value('branch_id'));

        // 4 салбарын 17 дугаар + мэдээллийн 504
        $this->assertSame(18, CallExtension::count());
        // IVR-ийн 1-4 товч + салбаргүй 0 (мэдээлэл авах)
        $this->assertSame(5, CallQueue::count());
    }

    /** Хариулсан дуудлага — дотуур дугаараар салбар тодорхойлогдоно. */
    public function test_answered_call_routes_by_extension(): void
    {
        $cases = [
            '510' => 'Цамбагарав',
            '501' => 'Хороолол',
            '505' => 'Яармаг',
            '100' => 'Сансар',
        ];

        foreach ($cases as $extension => $branch) {
            $this->hook('answered', [
                'unique_id' => 'ext.'.$extension,
                'number' => 99112233,
                'agent' => $extension,
                'call_status' => 'ANSWERED',
            ]);

            $call = Call::where('unique_id', 'ext.'.$extension)->first();
            $this->assertSame($this->branchId($branch), $call->branch_id, "Дугаар {$extension} → {$branch}");
        }
    }

    /** Алдсан дуудлага — IVR-д дарсан товчоор салбар тодорхойлогдоно. */
    public function test_abandoned_call_routes_by_queue(): void
    {
        $cases = [
            '3' => 'Цамбагарав',
            '2' => 'Хороолол',
            '1' => 'Сансар',
            '4' => 'Яармаг',
        ];

        foreach ($cases as $queue => $branch) {
            $this->hook('abandoned', ['number' => 99112233, 'queue_name' => $queue]);

            $call = Call::where('queue_name', $queue)->first();
            $this->assertNotNull($call, "Queue {$queue} дуудлага үүсээгүй");
            $this->assertTrue($call->is_missed);
            $this->assertSame($this->branchId($branch), $call->branch_id, "Queue {$queue} → {$branch}");
        }
    }

    /** CallPro товчийг зайтай илгээсэн ч таарах ёстой. */
    public function test_queue_matching_ignores_spacing(): void
    {
        foreach ([' 4', '4 ', ' 4 '] as $i => $variant) {
            $number = '9911223'.$i;

            $this->hook('abandoned', ['number' => $number, 'queue_name' => $variant]);

            $call = Call::where('number', $number)->first();
            $this->assertSame($this->branchId('Яармаг'), $call->branch_id, "«{$variant}» таарсангүй");
        }
    }

    /**
     * Мэдээллийн дугаар (504) аль ч салбарт харьяалагдахгүй — бүх салбарын
     * үйлчлүүлэгч холбогддог тул нэгд нь хамааруулж болохгүй.
     */
    public function test_information_desk_has_no_branch(): void
    {
        $this->assertNull(CallExtension::where('extension', '504')->value('branch_id'));

        $this->hook('answered', [
            'unique_id' => 'info.1',
            'number' => 99112233,
            'agent' => '504',
            'call_status' => 'ANSWERED',
        ]);

        $call = Call::where('unique_id', 'info.1')->first();
        $this->assertSame('504', $call->agent);
        $this->assertNull($call->branch_id);
    }

    /** Бүртгэлтэй боловч зориуд салбаргүй queue. */
    public function test_shared_queue_is_registered_without_branch(): void
    {
        $this->assertNull(CallQueue::where('name', '0')->value('branch_id'));

        $this->hook('abandoned', ['number' => 99112233, 'queue_name' => '0']);

        $call = Call::first();
        $this->assertTrue($call->is_missed);
        $this->assertNull($call->branch_id);
    }

    /**
     * Салбаргүй алдсан дуудлага ЗӨВХӨН админд очно.
     *
     * Бүх салбарын ресепшн рүү цацвал хэн нь ч "минийх биш" гэж бодоод орхих
     * эрсдэлтэй. Админ хараад зохих салбарт нь хуваарилна.
     */
    public function test_branchless_missed_call_notifies_admin_only(): void
    {
        Notification::fake();

        $admin = User::factory()->create([
            'role_id' => Role::firstOrCreate(['name' => 'admin'])->id,
        ]);

        $receptionRole = Role::firstOrCreate(['name' => 'receptionist'])->id;
        $reception = User::factory()->create([
            'role_id' => $receptionRole,
            'branch_id' => $this->branchId('Сансар'),
        ]);

        $this->hook('abandoned', ['number' => 99112233, 'queue_name' => '0']);

        $this->assertNull(Call::first()->branch_id);

        Notification::assertSentTo($admin, MissedCall::class);
        Notification::assertNotSentTo($reception, MissedCall::class);
    }

    /**
     * Мэдэгдэл нь ДОТУУР ДУГААР хариуцдаг ажилтанд очно.
     *
     * Утас гар дор байгаа хүн л дуудлагыг барьж чадна — `users.branch_id`
     * бол ажлын байрны бүртгэл болохоос утасны эзэн хэн болохыг хэлдэггүй.
     */
    public function test_missed_call_notifies_extension_owner(): void
    {
        Notification::fake();

        $receptionRole = Role::firstOrCreate(['name' => 'receptionist'])->id;

        // Салбарын бүртгэлгүй ч Сансарын 506 дугаарыг хариуцдаг.
        $owner = User::factory()->create(['role_id' => $receptionRole, 'branch_id' => null]);
        CallExtension::where('extension', '506')->update(['user_id' => $owner->id]);

        // Сансарт бүртгэлтэй ч ямар ч дугаар хариуцдаггүй.
        $bystander = User::factory()->create([
            'role_id' => $receptionRole,
            'branch_id' => $this->branchId('Сансар'),
        ]);

        $this->hook('abandoned', ['number' => 99112233, 'queue_name' => '1']);

        Notification::assertSentTo($owner, MissedCall::class);
        Notification::assertNotSentTo($bystander, MissedCall::class);
    }

    /**
     * Салбартай алдсан дуудлага — зөвхөн ТУХАЙН салбарын ресепшнд.
     *
     * Энэ нь нөөц зам: тухайн салбарын нэг ч дугаарт ажилтан холбоогүй үед
     * мэдэгдэл чимээгүй алга болохгүй, ресепшний бүртгэлээр хаяглагдана.
     */
    public function test_branch_missed_call_reaches_that_branch_only(): void
    {
        Notification::fake();

        $receptionRole = Role::firstOrCreate(['name' => 'receptionist'])->id;
        $sansar = User::factory()->create(['role_id' => $receptionRole, 'branch_id' => $this->branchId('Сансар')]);
        $yarmag = User::factory()->create(['role_id' => $receptionRole, 'branch_id' => $this->branchId('Яармаг')]);

        $this->hook('abandoned', ['number' => 99112233, 'queue_name' => '1']);

        Notification::assertSentTo($sansar, MissedCall::class);
        Notification::assertNotSentTo($yarmag, MissedCall::class);
    }

    /**
     * Бүртгэлгүй queue (жишээ нь "Гажиг засал" мэт үйлчилгээний дараалал)
     * ирвэл дуудлага хаягдахгүй — салбаргүйгээр бүртгэгдэнэ.
     */
    public function test_unknown_queue_still_records_the_call(): void
    {
        $this->hook('abandoned', ['number' => 99112233, 'queue_name' => 'gajig_zasal']);

        $call = Call::first();
        $this->assertTrue($call->is_missed);
        $this->assertNull($call->branch_id);
        $this->assertSame('gajig_zasal', $call->queue_name);
    }
}
