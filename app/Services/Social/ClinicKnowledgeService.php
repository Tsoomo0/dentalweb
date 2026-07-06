<?php

namespace App\Services\Social;

use App\Models\Branch;
use App\Models\Doctor;
use App\Models\Faq;
use App\Models\HR\WorkSchedule;
use App\Models\Setting;
use App\Models\TreatmentCategory;
use Illuminate\Support\Facades\Cache;

/**
 * Эмнэлгийн нийтийн мэдээллийг (эмч, эмчилгээний үнэ, ажлын цаг, салбар/холбоо барих)
 * AI-д зориулсан богино текст болгон эмхэтгэнэ. Ганц эмнэлгийн мэдээлэл бага тул
 * бүхэлд нь context болгож өгөх нь tool-loop-оос энгийн бөгөөд найдвартай.
 */
class ClinicKnowledgeService
{
    private const CACHE_KEY = 'social_ai_clinic_knowledge';

    private const CACHE_TTL = 600; // 10 минут

    /** Cache-тай бэлэн context текстийг буцаана. */
    public function context(): string
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, fn () => $this->build());
    }

    /** Мэдээлэл өөрчлөгдсөн үед (эмч/үнэ засах) cache цэвэрлэхэд дуудна. */
    public static function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Эмчилгээ + үнийн жагсаалт (FAQ хариулт дахь {{treatments}} / {{treatments:Ангилал}} слотод).
     * $category өгвөл тухайн ангиллын (LIKE) эмчилгээг л буцаана.
     */
    public function treatmentList(?string $category = null): string
    {
        $query = TreatmentCategory::where('is_active', true)
            ->with(['treatments' => fn ($q) => $q->where('is_active', true)->orderBy('order')]);
        if ($category !== null && $category !== '') {
            $query->where('name', 'like', '%'.$category.'%');
        }

        $lines = [];
        foreach ($query->orderBy('order')->get() as $cat) {
            foreach ($cat->treatments as $t) {
                $price = $this->price($t->price_min, $t->price_max);
                $lines[] = '• '.$t->title.($price ? ' — '.$price : '');
            }
        }

        return implode("\n", $lines);
    }

    /** Идэвхтэй эмч нарын жагсаалт (FAQ хариулт дахь {{doctors}} слотод). */
    public function doctorList(): string
    {
        return Doctor::where('is_active', true)->orderBy('order')->limit(40)->get()
            ->map(function (Doctor $d) {
                $bits = ['• '.$d->name];
                if ($d->specialization) {
                    $bits[] = $d->specialization;
                }
                if ($d->experience_years) {
                    $bits[] = $d->experience_years.' жил туршлагатай';
                }

                return implode(', ', $bits);
            })->implode("\n");
    }

    private function build(): string
    {
        $parts = [];

        // ── Эмнэлгийн ерөнхий мэдээлэл ────────────────────────────────────────
        $name = Setting::get('site_name', 'Кутикул шүдний эмнэлэг');
        $general = [];
        if ($v = Setting::get('working_hours')) {
            $general[] = "Ажлын цаг: {$v}";
        }
        if ($v = Setting::get('contact_phone')) {
            $general[] = "Утас: {$v}";
        }
        if ($v = Setting::get('contact_email')) {
            $general[] = "Имэйл: {$v}";
        }
        if ($v = Setting::get('address')) {
            $general[] = "Хаяг: {$v}";
        }
        $parts[] = "ЭМНЭЛЭГ: {$name}".($general ? "\n".implode("\n", $general) : '');

        // ── Салбарууд ────────────────────────────────────────────────────────
        $branches = Branch::where('is_active', true)->orderBy('order')->get();
        if ($branches->isNotEmpty()) {
            $lines = $branches->map(function (Branch $b) {
                $bits = ["- {$b->name}"];
                if ($b->address) {
                    $bits[] = $b->address;
                }
                if ($b->phone) {
                    $bits[] = 'утас '.$b->phone;
                }

                return implode(', ', $bits);
            })->implode("\n");
            $parts[] = "САЛБАРУУД:\n{$lines}";
        }

        // ── Эмч нар ──────────────────────────────────────────────────────────
        $doctors = Doctor::where('is_active', true)
            ->with('branch:id,name')
            ->orderBy('order')
            ->limit(80)
            ->get();
        if ($doctors->isNotEmpty()) {
            $lines = $doctors->map(function (Doctor $d) {
                $bits = ["- {$d->name}"];
                if ($d->specialization) {
                    $bits[] = $d->specialization;
                }
                if ($d->degree) {
                    $bits[] = $d->degree;
                }
                if ($d->experience_years) {
                    $bits[] = "{$d->experience_years} жил туршлагатай";
                }
                if ($d->branch?->name) {
                    $bits[] = $d->branch->name.' салбар';
                }

                return implode(', ', $bits);
            })->implode("\n");
            $parts[] = "ЭМЧ НАР:\n{$lines}";
        }

        // ── Эмч нарын ойрын ажлын хуваарь (эмч хэзээ ажиллах вэ) ───────────────
        if ($schedule = $this->doctorSchedules($doctors)) {
            $parts[] = $schedule;
        }

        // ── Эмчилгээ + үнэ ────────────────────────────────────────────────────
        $categories = TreatmentCategory::where('is_active', true)
            ->with(['treatments' => fn ($q) => $q->where('is_active', true)->orderBy('order')])
            ->orderBy('order')
            ->get();
        $priceLines = [];
        foreach ($categories as $cat) {
            $items = [];
            foreach ($cat->treatments as $t) {
                $price = $this->price($t->price_min, $t->price_max);
                $items[] = trim("- {$t->title}".($price ? ": {$price}" : ''));
            }
            if ($items) {
                $priceLines[] = "[{$cat->name}]\n".implode("\n", $items);
            }
        }
        if ($priceLines) {
            $parts[] = "ЭМЧИЛГЭЭ БА ҮНЭ:\n".implode("\n", $priceLines);
        }

        // ── Түгээмэл асуулт хариулт (FAQ) ────────────────────────────────────
        $faqs = Faq::where('is_active', true)->orderBy('order')->limit(100)->get();
        if ($faqs->isNotEmpty()) {
            $lines = $faqs->map(fn (Faq $f) => "Асуулт: {$f->question}\nХариу: {$f->answer}")->implode("\n\n");
            $parts[] = "ТҮГЭЭМЭЛ АСУУЛТ ХАРИУЛТ (FAQ):\n{$lines}";
        }

        return implode("\n\n", $parts);
    }

    /**
     * Эмч нарын ойрын 7 хоногийн ажлын хуваарийг (WorkSchedule → employee_id) текст болгоно.
     * "Энэ эмч хэзээ ажиллах вэ" гэсэн асуултад AI хариулна.
     *
     * @param  \Illuminate\Support\Collection<int, Doctor>  $doctors
     */
    private function doctorSchedules($doctors): ?string
    {
        $byEmployee = $doctors->filter(fn ($d) => $d->employee_id)->keyBy('employee_id');
        if ($byEmployee->isEmpty()) {
            return null;
        }

        $rows = WorkSchedule::whereIn('employee_id', $byEmployee->keys()->all())
            ->whereBetween('date', [now()->startOfDay(), now()->copy()->addDays(7)->endOfDay()])
            ->where('shift_type', '!=', 'off')
            ->orderBy('date')
            ->get()
            ->groupBy('employee_id');

        if ($rows->isEmpty()) {
            return null;
        }

        $dayNames = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя']; // Carbon dayOfWeek: 0=Ням
        $lines = [];
        foreach ($rows as $empId => $days) {
            $doctor = $byEmployee[$empId] ?? null;
            if (! $doctor) {
                continue;
            }
            $slots = $days->map(function (WorkSchedule $s) use ($dayNames) {
                $label = $s->date->format('m/d').' ('.$dayNames[$s->date->dayOfWeek].')';
                $start = $s->start_time ? substr((string) $s->start_time, 0, 5) : null;
                $end = $s->end_time ? substr((string) $s->end_time, 0, 5) : null;

                return $start && $end ? "{$label} {$start}-{$end}" : $label.' '.$s->shift_label;
            })->implode('; ');
            $lines[] = "- {$doctor->name}: {$slots}";
        }

        return $lines ? "ЭМЧ НАРЫН АЖЛЫН ХУВААРЬ (ойрын 7 хоног):\n".implode("\n", $lines) : null;
    }

    /** price_min/max-ыг ₮ хэлбэрт хөрвүүлнэ. */
    private function price(mixed $min, mixed $max): ?string
    {
        $min = $min !== null ? (float) $min : null;
        $max = $max !== null ? (float) $max : null;

        if (! $min && ! $max) {
            return null;
        }
        if ($min && $max && $max > $min) {
            return $this->fmt($min).'–'.$this->fmt($max);
        }
        if ($min && $max && $min === $max) {
            return $this->fmt($min);
        }

        return $this->fmt($min ?: $max).($max ? '' : '-аас');
    }

    private function fmt(float $n): string
    {
        return number_format($n, 0, '.', ',').'₮';
    }
}
