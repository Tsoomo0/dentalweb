<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Загваруудын толгой дээрх огноо "2026 оны ____ дугаар сарын ____-ны өдөр"
 * гэж хоосон зураасаар үлддэг байсныг {{doc_month}} / {{doc_day}} талбараар
 * сольж, гэрээ үүсгэхэд сар, өдөр нь автоматаар бөглөгддөг болгоно.
 */
return new class extends Migration
{
    /** [хайх, солих] хосууд — загварт бичигдсэн байдлаар нь яг таарсныг л сольно. */
    private const REPLACEMENTS = [
        ['{{doc_year}} оны ____ дугаар<br />сарын _____-ны өдөр', '{{doc_year}} оны {{doc_month}} дугаар<br />сарын {{doc_day}}-ны өдөр'],
        ['{{doc_year}} оны __ сарын __ өдөр', '{{doc_year}} оны {{doc_month}} сарын {{doc_day}} өдөр'],
        ['{{doc_year}} оны ......-р сарын<br />......-ны өдөр', '{{doc_year}} оны {{doc_month}}-р сарын<br />{{doc_day}}-ны өдөр'],
        ['{{doc_year}} оны ....-р сарын ....-ны өдөр', '{{doc_year}} оны {{doc_month}}-р сарын {{doc_day}}-ны өдөр'],
    ];

    public function up(): void
    {
        $this->apply(array_column(self::REPLACEMENTS, 0), array_column(self::REPLACEMENTS, 1));
    }

    public function down(): void
    {
        $this->apply(array_column(self::REPLACEMENTS, 1), array_column(self::REPLACEMENTS, 0));
    }

    /**
     * @param  array<int, string>  $search
     * @param  array<int, string>  $replace
     */
    private function apply(array $search, array $replace): void
    {
        DB::table('hr_document_templates')
            ->select('id', 'body')
            ->orderBy('id')
            ->chunk(50, function ($rows) use ($search, $replace) {
                foreach ($rows as $row) {
                    $body = str_replace($search, $replace, (string) $row->body);

                    if ($body !== $row->body) {
                        DB::table('hr_document_templates')
                            ->where('id', $row->id)
                            ->update(['body' => $body]);
                    }
                }
            });
    }
};
