<?php

namespace App\Services\Social;

use App\Models\Social\SocialContact;

/**
 * Мессеж доторх {{хувьсагч}}-уудыг хэрэглэгчийн мэдээллээр солино.
 *
 * Дэмжих: {{full_name}} {{first_name}} {{last_name}} {{username}}
 *         + хадгалсан custom талбарууд: {{<талбарын_нэр>}}
 */
class PersonalizationResolver
{
    public function apply(?string $text, SocialContact $contact): string
    {
        if ($text === null || $text === '') {
            return (string) $text;
        }

        $name = trim((string) $contact->name);
        $parts = preg_split('/\s+/', $name, 2) ?: [];

        $builtins = [
            'full_name' => $name,
            'name' => $name,
            'first_name' => $parts[0] ?? '',
            'last_name' => $parts[1] ?? '',
            'username' => (string) $contact->username,
        ];

        $attributes = $contact->attributes ?? [];

        return preg_replace_callback('/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/', function ($m) use ($builtins, $attributes) {
            $key = strtolower($m[1]);

            if (array_key_exists($key, $builtins)) {
                return $builtins[$key];
            }

            // custom талбар (тохиолдол хамаарахгүй)
            foreach ($attributes as $k => $v) {
                if (strtolower((string) $k) === $key) {
                    return is_scalar($v) ? (string) $v : '';
                }
            }

            return '';
        }, $text);
    }

    /** Builder-т санал болгох хувьсагчдын жагсаалт. */
    public static function builtinTokens(): array
    {
        return ['full_name', 'first_name', 'last_name', 'username'];
    }
}
