<?php

namespace Database\Seeders;

use App\Models\Bot\BotButton;
use App\Models\Bot\BotFlow;
use App\Models\Bot\BotNode;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Жишээ FAQ-bot seed. Бүх хариулт static (Q&A маягтай).
 * Динамик data binding ашиглахгүй — admin UI-аас удирдана.
 *
 * Бүтэц:
 *   Welcome
 *     ├─ 💰 Цалин (flow)
 *     │     ├─ Q1: Цалин хэзээ буух вэ?
 *     │     ├─ Q2: НДШ, ХХОАТ хэдэн хувь?
 *     │     ├─ Q3: Урьдчилгаа авч болох уу?
 *     │     └─ Q4: Цалингийн зөрүү гарвал хаашаа хандах вэ?
 *     ├─ 📅 Чөлөө
 *     ├─ 🏖️ Ээлжийн амралт
 *     ├─ ⏱️ Ажлын хуваарь
 *     ├─ 📋 Ажлын дүрэм
 *     └─ 👨‍💼 Админтай холбогдох (handoff)
 */
class BotFlowSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // Wipe + reseed for dev idempotency. Hard delete so unique keys are freed.
            BotButton::query()->forceDelete();
            BotNode::query()->withTrashed()->forceDelete();
            BotFlow::query()->withTrashed()->forceDelete();

            // ── 1. Welcome node (no flow) ────────────────────────────────
            $welcome = BotNode::create([
                'flow_id'    => null,
                'key'        => 'welcome',
                'title'      => 'Сайн байна уу 👋',
                'body'       => "Сайн байна уу 👋\nТанд хэрхэн туслах вэ? Доорх ангиллаас сонгоно уу:",
                'is_welcome' => true,
            ]);

            // ── 2. Flow тус бүрийг seed + welcome дээр товч нэмэх ────────
            $flowsData = [
                ['key' => 'payroll',    'name' => 'Цалин',           'icon' => '💰', 'sort' => 1, 'qa' => [
                    ['Цалин хэзээ буух вэ?',
                     "📆 Сар болгоны 20, 05-нд цалин бууна.\n\nҮндсэн цалин — 20-нд\nҮлдсэн хэсэг — дараа сарын 05-нд"],
                    ['НДШ, ХХОАТ хэдэн хувь?',
                     "🧾 Татварын суутгал:\n\n• НДШ — 11.5%\n• ХХОАТ — 10%\n\nЭдгээр нь цалингаас автоматаар суутгагдана."],
                    ['Урьдчилгаа авч болох уу?',
                     "💵 Тийм. Ажилтан 7 хоногийн өмнө HR-д бичгээр хүсэлт явуулсан тохиолдолд олгоно. Олгох хэмжээ нь үндсэн цалингийн 50% хүртэл."],
                    ['Цалингийн зөрүү гарвал?',
                     "📞 Цалингийн задаргааг /my/payroll дотроос харна уу.\n\nЗөрүү байгаа бол HR-тэй шууд холбогдоно уу."],
                ]],
                ['key' => 'leave',      'name' => 'Чөлөө',           'icon' => '📅', 'sort' => 2, 'qa' => [
                    ['Чөлөө яаж авах вэ?',
                     "✍️ /my/leave-requests хуудсаас хүсэлт явуулна. HR баталгаажуулсны дараа чөлөө хүчинтэй болно."],
                    ['Эрүүл мэндийн чөлөө хэрхэн авах вэ?',
                     "🏥 Эмнэлгийн тодорхойлолтыг 3 хоногийн дотор HR-д хүлээлгэн өгнө. Богино хугацаанд бол утсаар мэдэгдэх боломжтой."],
                    ['Чөлөөгөө буцаах боломжтой юу?',
                     "↩️ HR баталгаажуулахаас өмнө бол өөрөө цуцалж болно. Баталгаажсан бол HR-тэй холбогдож цуцлуулна."],
                ]],
                ['key' => 'vacation',   'name' => 'Ээлжийн амралт',  'icon' => '🏖️', 'sort' => 3, 'qa' => [
                    ['Жилд хэдэн өдөр амрах вэ?',
                     "📅 Хөдөлмөрийн хуулийн дагуу НДШ-ийн жилээр тооцон:\n\n• 0–4 жил → 15 өдөр\n• 5–9 жил → 16 өдөр\n• 10–14 → 17\n• 15–19 → 18\n• 20–24 → 19\n• 25–29 → 20\n• 30+ → 21"],
                    ['Ээлжийн амралт хэзээ авч болох вэ?',
                     "🗓️ Ажилласан жил тутамд нэг удаа авах эрхтэй. Хүсэлтийг 2 долоо хоногийн өмнө HR-д явуулна."],
                    ['Хүсэлт хэрхэн явуулах вэ?',
                     "✍️ /my/vacation-requests дотроос хүсэлт явуулна. HR баталгаажуулсны дараа цалин олгох тооцоо хийгдэнэ."],
                ]],
                ['key' => 'schedule',   'name' => 'Ажлын хуваарь',   'icon' => '⏱️', 'sort' => 4, 'qa' => [
                    ['Ажлын хуваариа хаанаас харах вэ?',
                     "👀 /my/work-schedule дотроос 7 хоногийн хуваариа харна."],
                    ['Ажлын хуваарь хэрхэн гаргадаг вэ?',
                     "📝 Хуваарийг HR долоо хоног тутам гаргана. Тухайн нөхцөл байдал, эмч/сувилагч/ресепшний бүрэлдэхүүн, өвчтөний урсгалаас шалтгаалан гаргадаг."],
                    ['Шифт солих хэрэгтэй бол?',
                     "🔄 Хамтран ажиллагч ажилтантайгаа тохиролцсоны дараа HR-руу мэдэгдэнэ. HR баталгаажуулсны дараа албан ёсоор солигдоно."],
                ]],
                ['key' => 'rules',      'name' => 'Ажлын дүрэм',     'icon' => '📋', 'sort' => 5, 'qa' => [
                    ['Ажилд хэдэн цагт ирэх вэ?',
                     "⏰ Ажлын цаг 09:00 цагт эхэлнэ. 08:50-аас өмнө ирж бэлдсэн байх ёстой."],
                    ['Хоцорсон бол яах вэ?',
                     "⚠️ HR-д шууд мэдэгдэнэ. Хоцролт цалингаас суутгагдана. 3 удаа давтагдвал сануулга өгнө."],
                    ['Хувцаслалт ямар байх ёстой вэ?',
                     "🥼 Дотуур: цэвэр халат, нэрийн ялгах, иш сэрвэгчтэй гутал. Үсээ цэвэрхэн зангидсан байх."],
                ]],
            ];

            foreach ($flowsData as $f) {
                $flow = BotFlow::create([
                    'key'        => $f['key'],
                    'name'       => $f['name'],
                    'icon'       => $f['icon'],
                    'sort_order' => $f['sort'],
                    'is_active'  => true,
                ]);

                // Flow-ийн menu node (entry, is_welcome=true within flow)
                $menu = BotNode::create([
                    'flow_id'    => $flow->id,
                    'key'        => 'menu',
                    'title'      => $f['name'],
                    'body'       => $f['icon'] . ' ' . $f['name'] . " — асуултаа сонгоно уу:",
                    'is_welcome' => true,
                ]);

                // Welcome screen-д нэвтрэх товч
                BotButton::create([
                    'node_id'        => $welcome->id,
                    'label'          => $f['name'],
                    'icon'           => $f['icon'],
                    'action'         => BotButton::ACTION_FLOW_START,
                    'target_flow_id' => $flow->id,
                    'sort_order'     => $f['sort'],
                ]);

                // Q&A node бүрт хариулт + 2 буцах товч
                $sort = 0;
                foreach ($f['qa'] as $i => [$question, $answer]) {
                    $sort++;
                    $node = BotNode::create([
                        'flow_id' => $flow->id,
                        'key'     => 'q' . ($i + 1),
                        'title'   => $question,
                        'body'    => $answer,
                    ]);
                    // Menu-аас энэ Q-руу шилжих товч
                    BotButton::create([
                        'node_id'        => $menu->id,
                        'label'          => $question,
                        'action'         => BotButton::ACTION_NEXT_NODE,
                        'target_node_id' => $node->id,
                        'sort_order'     => $sort,
                    ]);
                    // Хариултын дараа буцах товчнууд
                    BotButton::create([
                        'node_id'        => $node->id,
                        'label'          => 'Өөр асуулт',
                        'icon'           => '🔁',
                        'action'         => BotButton::ACTION_NEXT_NODE,
                        'target_node_id' => $menu->id,
                        'sort_order'     => 1,
                    ]);
                    BotButton::create([
                        'node_id'    => $node->id,
                        'label'      => 'Админтай холбогдох',
                        'icon'       => '👨‍💼',
                        'action'     => BotButton::ACTION_HANDOFF,
                        'sort_order' => 2,
                    ]);
                    BotButton::create([
                        'node_id'    => $node->id,
                        'label'      => 'Үндсэн цэс',
                        'icon'       => '🔙',
                        'action'     => BotButton::ACTION_BACK,
                        'sort_order' => 3,
                    ]);
                }

                // Menu-ийн ёроолд "Үндсэн цэс рүү буцах" товч
                BotButton::create([
                    'node_id'    => $menu->id,
                    'label'      => 'Үндсэн цэс',
                    'icon'       => '🔙',
                    'action'     => BotButton::ACTION_BACK,
                    'sort_order' => 99,
                ]);
            }

            // ── 3. Welcome screen-ийн ёроолд "Админтай холбогдох" ─────────
            BotButton::create([
                'node_id'    => $welcome->id,
                'label'      => 'Админтай холбогдох',
                'icon'       => '👨‍💼',
                'action'     => BotButton::ACTION_HANDOFF,
                'sort_order' => 99,
            ]);
        });
    }
}
