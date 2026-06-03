<?php

namespace App\Services;

/**
 * Өвчтөний нэрийг банкны "Гүйлгээний утга" талбартай ухаалаг тулгана.
 * Латин ↔ Кирилл хөрвүүлэлт, normalization, substring + Levenshtein.
 */
class PatientNameMatcher
{
    /**
     * Латин → Кирилл хөрвүүлэлт.
     * Дарааллын дагуу жижиг үсгээр solidly хийнэ.
     */
    private const TRANSLIT = [
        // 2-3 үсгийн dictionary эхэнд (priority)
        'shch' => 'щ', 'sch' => 'щ', 'shu' => 'шу', 'sho' => 'шо',
        'chi' => 'чи', 'cha' => 'ча', 'che' => 'че', 'cho' => 'чо', 'chu' => 'чу',
        'yo' => 'ё', 'yu' => 'ю', 'ya' => 'я', 'ye' => 'е', 'yi' => 'и',
        'kh' => 'х', 'ts' => 'ц', 'ch' => 'ч', 'sh' => 'ш',
        'zh' => 'ж', 'iy' => 'ий', 'uu' => 'уу', 'oo' => 'оо',
        'ee' => 'ээ', 'aa' => 'аа',
        'a' => 'а', 'b' => 'б', 'v' => 'в', 'g' => 'г', 'd' => 'д',
        'e' => 'э', 'z' => 'з', 'i' => 'и', 'j' => 'ж', 'k' => 'к',
        'l' => 'л', 'm' => 'м', 'n' => 'н', 'o' => 'о', 'p' => 'п',
        'r' => 'р', 's' => 'с', 't' => 'т', 'u' => 'у', 'f' => 'ф',
        'h' => 'х', 'c' => 'ц', 'y' => 'ы', 'w' => 'в', 'q' => 'к', 'x' => 'кс',
    ];

    /**
     * Үндсэн match function.
     *
     * @param  string  $patientName    Системд бичсэн өвчтөний нэр.
     * @param  string  $bankDescription Банкны "Гүйлгээний утга" талбар.
     * @return float  0..1 нийт онооны хувь.
     */
    public function score(string $patientName, string $bankDescription): float
    {
        $a = self::normalize($patientName);
        $b = self::normalize($bankDescription);
        $b2 = self::normalize(self::transliterate($bankDescription));

        if ($a === '' || ($b === '' && $b2 === '')) {
            return 0.0;
        }

        // 1) Шууд тэнцэх (нэр давхар бичсэн тохиолдол)
        if ($a === $b || $a === $b2) {
            return 1.0;
        }

        // 2) Substring containment
        $contains = self::containsAnyToken($b, $a) || self::containsAnyToken($b2, $a);
        if ($contains) {
            return 0.95;
        }

        // 3) similar_text % — ойролцоо
        $best = 0.0;
        foreach ([$b, $b2] as $cand) {
            similar_text($a, $cand, $pct);
            $best = max($best, $pct / 100);
        }
        if ($best >= 0.85) {
            return 0.85;
        }

        // 4) Levenshtein distance — богино нэрэнд тохиромжтой
        $shortest = min(strlen($a), strlen($b), $b2 !== '' ? strlen($b2) : PHP_INT_MAX);
        if ($shortest > 0 && $shortest <= 24) {
            $minDist = PHP_INT_MAX;
            foreach ([$b, $b2] as $cand) {
                if ($cand === '') continue;
                $d = levenshtein($a, $cand);
                if ($d < $minDist) $minDist = $d;
            }
            if ($minDist <= 2 && $shortest >= 4) return 0.80;
            if ($minDist <= 3 && $shortest >= 6) return 0.70;
        }

        // 5) Token-level fuzzy — нэрийн нэг token нь description-д бараг таарах
        $patientTokens = self::tokenize($a);
        $bankTokens    = array_merge(self::tokenize($b), self::tokenize($b2));
        foreach ($patientTokens as $pt) {
            if (strlen($pt) < 3) continue;
            foreach ($bankTokens as $bt) {
                if (strlen($bt) < 3) continue;
                if ($pt === $bt) return 0.75;
                if (str_starts_with($bt, $pt) || str_starts_with($pt, $bt)) return 0.70;
                similar_text($pt, $bt, $tokPct);
                if ($tokPct >= 80) return 0.65;
            }
        }

        return 0.0;
    }

    /**
     * Латин үсгийг кирилл болгож хөрвүүлнэ.
     */
    public static function transliterate(string $input): string
    {
        $lower = mb_strtolower($input);
        // Хэрэв бүгд кирилл бол хувиргахгүй
        if (preg_match('/^[а-яёө\s.,\-\d]+$/u', $lower)) {
            return $lower;
        }
        return strtr($lower, self::TRANSLIT);
    }

    /**
     * Нэрийг normalize хийнэ: жижиг үсэг, овог-н цэг арилгана, нэмэгдэл орооцолдсон тэмдэгтгүй.
     */
    public static function normalize(string $input): string
    {
        $s = mb_strtolower(trim($input));
        // Овог.Нэр хэлбэрийг салгана: "Б.Энэрэл" → "энэрэл"
        // "п. Маралмаа" → "маралмаа"
        if (preg_match('/^[а-яa-z]\.\s*(.+)$/iu', $s, $m)) {
            $s = $m[1];
        }
        // Тэмдэгт цэвэрлэх (зөвхөн үсэг + хоосон зай)
        $s = preg_replace('/[^а-яёөa-z\s]/u', ' ', $s);
        $s = preg_replace('/\s+/u', ' ', $s);
        return trim($s);
    }

    /**
     * Текстийг token-уудад хуваана.
     *
     * @return array<int, string>
     */
    public static function tokenize(string $input): array
    {
        $parts = preg_split('/\s+/u', trim($input)) ?: [];
        return array_values(array_filter($parts, fn ($t) => strlen($t) > 0));
    }

    /**
     * $needle-н ямар нэг token нь $haystack-д орсон уу.
     */
    private static function containsAnyToken(string $haystack, string $needle): bool
    {
        if ($haystack === '' || $needle === '') return false;
        $tokens = self::tokenize($needle);
        foreach ($tokens as $t) {
            if (mb_strlen($t) >= 3 && mb_strpos($haystack, $t) !== false) {
                return true;
            }
        }
        // эсвэл бүхэлд нь
        return mb_strpos($haystack, $needle) !== false;
    }
}
