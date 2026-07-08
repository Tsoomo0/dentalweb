<?php

namespace Database\Seeders;

use App\Models\Social\SocialAccount;
use App\Models\Social\SocialFlow;
use App\Models\Social\SocialFlowButton;
use App\Models\Social\SocialFlowNode;
use Illuminate\Database\Seeder;

/**
 * Тест симулятор (AI туслах → Тест чат)-ыг турших зориулалттай бэлэн Flow.
 * "тест" / "test" / "туршилт" гэж бичихэд эхэлнэ. Симуляторын БҮХ боломжийг харуулна:
 *   • Түлхүүр үгээр эхлэх        • Товч дарж навигаци (quick reply)
 *   • Карусель картууд           • Асуулт → хариу хадгалах (awaiting state)
 *   • URL товч                   • Оператор руу шилжүүлэх (handoff)
 *
 * Welcome/Default flow-д хүрэлцэхгүй тул жинхэнэ ботод нөлөөлөхгүй.
 * Ажиллуулах:  php artisan db:seed --class=SocialTestFlowSeeder
 * Устгах:      Flow builder-ээс "🧪 Тест цэс" flow-г устгана.
 */
class SocialTestFlowSeeder extends Seeder
{
    public function run(): void
    {
        // Эхний холбогдсон account-д хамааруулна (байхгүй бол глобал = null).
        $accountId = SocialAccount::query()->orderBy('id')->value('id');

        // Хуучин тест flow-г цэвэрлэнэ (дахин ажиллуулахад давхцахгүй).
        foreach (SocialFlow::where('key', 'test_sim')->get() as $f) {
            $nodeIds = SocialFlowNode::where('flow_id', $f->id)->pluck('id');
            SocialFlowButton::whereIn('node_id', $nodeIds)->delete();
            SocialFlowNode::where('flow_id', $f->id)->delete();
            $f->delete();
        }

        $flow = SocialFlow::create([
            'social_account_id' => $accountId,
            'key' => 'test_sim',
            'name' => '🧪 Тест цэс (симулятор)',
            'icon' => '🧪',
            'trigger_type' => SocialFlow::TRIGGER_KEYWORD,
            'keywords' => ['тест', 'test', 'туршилт'],
            'is_active' => true,
            'sort_order' => 99,
        ]);

        $node = fn (array $attr) => SocialFlowNode::create(array_merge([
            'flow_id' => $flow->id,
            'type' => SocialFlowNode::TYPE_MESSAGE,
            'sent_count' => 0,
            'sort_order' => 0,
        ], $attr));

        // ── Node-ууд ────────────────────────────────────────────────────────────
        // T1 — үндсэн цэс (эхлэх цэг)
        $t1 = $node([
            'is_entry' => true,
            'title' => 'Тест цэс',
            'body' => "🧪 Тест цэс — доорхоос сонгоно уу 👇",
            'position_x' => 0, 'position_y' => 0, 'sort_order' => 1,
        ]);

        // T2 — үнэ (URL товч + буцах)
        $t2 = $node([
            'title' => 'Үнэ',
            'body' => "💰 Үнийн жагсаалт:\n• Цэвэрлэгээ — 50,000₮\n• Ломбо — 80,000₮-с\n• Цайруулга — 250,000₮",
            'position_x' => 380, 'position_y' => -180, 'sort_order' => 2,
        ]);

        // T3 — карусель (3 карт, тус бүр «Захиалах» → handoff)
        $t3 = $node([
            'type' => SocialFlowNode::TYPE_CAROUSEL,
            'title' => 'Эмчилгээнүүд',
            'position_x' => 380, 'position_y' => 0, 'sort_order' => 3,
            'cards' => [
                ['title' => 'Цэвэрлэгээ', 'subtitle' => 'Мэргэжлийн цэвэрлэгээ · 50,000₮', 'buttons' => [['label' => '📅 Захиалах', 'action' => 'handoff']]],
                ['title' => 'Ломбо', 'subtitle' => 'Гэрэлд хатдаг ломбо · 80,000₮-с', 'buttons' => [['label' => '📅 Захиалах', 'action' => 'handoff']]],
                ['title' => 'Цайруулга', 'subtitle' => 'Гэр/эмнэлгийн цайруулга · 250,000₮', 'buttons' => [['label' => '📅 Захиалах', 'action' => 'handoff']]],
            ],
        ]);

        // T4 — асуулт (нэр асууж хадгална)
        $t4 = $node([
            'type' => SocialFlowNode::TYPE_QUESTION,
            'title' => 'Захиалга',
            'body' => '📝 Захиалга авъя. Таны нэрийг бичнэ үү?',
            'save_field' => 'test_name',
            'position_x' => 380, 'position_y' => 180, 'sort_order' => 4,
        ]);

        // T5 — баталгаажуулалт
        $t5 = $node([
            'title' => 'Баталгаа',
            'body' => '✅ Баярлалаа! Таны хүсэлтийг хүлээн авлаа. Ажилтан удахгүй холбогдоно.',
            'position_x' => 760, 'position_y' => 180, 'sort_order' => 5,
        ]);

        // T4 асуултын дараа T5 руу үргэлжилнэ.
        $t4->update(['next_node_id' => $t5->id]);

        // ── Товчнууд ────────────────────────────────────────────────────────────
        $btn = fn (SocialFlowNode $n, array $attr, int $order) => SocialFlowButton::create(array_merge([
            'node_id' => $n->id,
            'is_quick_reply' => false,
            'click_count' => 0,
            'sort_order' => $order,
        ], $attr));

        // T1 — 4 quick reply (навигаци + оператор)
        $btn($t1, ['label' => '💰 Үнэ', 'action' => 'next_node', 'target_node_id' => $t2->id, 'is_quick_reply' => true], 1);
        $btn($t1, ['label' => '🦷 Эмчилгээнүүд', 'action' => 'next_node', 'target_node_id' => $t3->id, 'is_quick_reply' => true], 2);
        $btn($t1, ['label' => '📝 Захиалга', 'action' => 'next_node', 'target_node_id' => $t4->id, 'is_quick_reply' => true], 3);
        $btn($t1, ['label' => '☎️ Ажилтан', 'action' => 'handoff', 'is_quick_reply' => true], 4);

        // T2 — URL товч (карт) + буцах (quick)
        $btn($t2, ['label' => '🌐 Вэбсайт үзэх', 'action' => 'url', 'url' => 'https://example.mn'], 1);
        $btn($t2, ['label' => '🔙 Буцах', 'action' => 'next_node', 'target_node_id' => $t1->id, 'is_quick_reply' => true], 2);

        // T5 — цэс рүү буцах / оператор
        $btn($t5, ['label' => '🔙 Үндсэн цэс', 'action' => 'next_node', 'target_node_id' => $t1->id, 'is_quick_reply' => true], 1);
        $btn($t5, ['label' => '☎️ Ажилтантай холбогдох', 'action' => 'handoff', 'is_quick_reply' => true], 2);

        $this->command?->info("🧪 Тест flow үүслээ (#{$flow->id}). Тест чатад «тест» гэж бичээд эхлүүлээрэй.");
    }
}
