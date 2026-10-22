<?php

namespace App\Services\HR;

use App\Models\HR\EmployeeDocument;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;
use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;
use Mpdf\HTMLParserMode;
use Mpdf\Mpdf;
use Mpdf\Output\Destination;
use setasign\Fpdi\PdfParser\StreamReader;

/**
 * Баталгаажсан гэрээ / ажлын байрны тодорхойлолтыг PDF болгож,
 * хувийн мэдээлэл агуулсан тул private дискэнд хадгална.
 *
 * Агуулгыг эхлээд A5 босоо хуудсуудаар (Arial, толгой/хөлтэй) гаргаад,
 * дараа нь A4 хэвтээ цаасан дээр 2-оор нь зэрэгцүүлж байрлуулна — хэвлээд
 * голоор нь хуваахад бие даасан A5 хуудсууд болж, цаас хоёр дахин хэмнэнэ.
 * Хуудас бүрийн хөлд талуудын гарын үсгийг (парафыг) давтан тавина.
 */
class EmployeeDocumentPdf
{
    public const DISK = 'local';

    /** PDF-ийн түүхий агуулгыг буцаана. */
    public static function raw(EmployeeDocument $document): string
    {
        $document->loadMissing(['employee.position', 'employee.branch']);

        $html = View::make('hr.employee-document-pdf', [
            'doc' => $document,
            'logo' => self::logo(),
            // Агуулгын хяналтын код — хэвлэсэн хувийг системийн хувьтай тулгахад
            'checksum' => strtoupper(substr(hash('sha256', $document->id.'|'.$document->body), 0, 16)),
        ])->render();

        $a5 = self::engine([
            'format' => 'A5',
            // Зүүн талд хавтаслах зай
            'margin_left' => 16,
            'margin_right' => 11,
            'margin_top' => 17,
            'margin_bottom' => 17,
            'margin_header' => 7,
            'margin_footer' => 6,
            'default_font_size' => 9,
        ]);
        $a5->WriteHTML($html, HTMLParserMode::DEFAULT_MODE);

        return self::twoUp($a5->Output('', Destination::STRING_RETURN), $document->title);
    }

    /** A5 хуудсуудыг A4 хэвтээ цаасны зүүн, баруун талд дарааллаар нь байрлуулна. */
    private static function twoUp(string $a5Pdf, string $title): string
    {
        $sheet = self::engine([
            'format' => 'A4-L',
            'margin_left' => 0,
            'margin_right' => 0,
            'margin_top' => 0,
            'margin_bottom' => 0,
        ]);
        $sheet->SetTitle($title);

        $pages = $sheet->setSourceFile(StreamReader::createByString($a5Pdf));
        $half = $sheet->w / 2;

        for ($i = 1; $i <= $pages; $i += 2) {
            $sheet->AddPage();
            $sheet->useTemplate($sheet->importPage($i), 0, 0, $half);

            if ($i + 1 <= $pages) {
                $sheet->useTemplate($sheet->importPage($i + 1), $half, 0, $half);
            }

            // Хуваах шугам — тасархай, цайвар
            $sheet->SetDrawColor(190, 190, 190);
            $sheet->SetLineWidth(0.2);
            $sheet->SetDash(1.5, 1.5);
            $sheet->Line($half, 5, $half, $sheet->h - 5);
            $sheet->SetDash();
        }

        return $sheet->Output('', Destination::STRING_RETURN);
    }

    /** Arial-тай mPDF хөдөлгүүр; хуудасны хэмжээ, захыг $config-оор өгнө. */
    private static function engine(array $config): Mpdf
    {
        $tempDir = storage_path('app/mpdf');

        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0775, true);
        }

        $defaultFonts = (new FontVariables)->getDefaults();

        $mpdf = new Mpdf($config + [
            'mode' => 'utf-8',
            'fontDir' => [...(new ConfigVariables)->getDefaults()['fontDir'], resource_path('fonts/arial')],
            'fontdata' => $defaultFonts['fontdata'] + [
                'arial' => [
                    'R' => 'arial.ttf',
                    'B' => 'arialbd.ttf',
                    'I' => 'ariali.ttf',
                    'BI' => 'arialbi.ttf',
                ],
            ],
            'default_font' => 'arial',
            'tempDir' => $tempDir,
        ]);

        $mpdf->SetCreator('Cuticul Dental HR');

        return $mpdf;
    }

    /**
     * PDF-ийг диск рүү бичиж, замыг нь баримт дээр хадгална.
     * Дахин дуудвал өмнөх файлыг дарж бичнэ.
     */
    public static function store(EmployeeDocument $document): string
    {
        $path = $document->pdf_path ?: 'hr-documents/'.$document->id.'-'.Str::random(12).'.pdf';

        Storage::disk(self::DISK)->put($path, self::raw($document));

        if ($document->pdf_path !== $path) {
            $document->forceFill(['pdf_path' => $path])->save();
        }

        return $path;
    }

    /** Толгойн лого — data URI (mPDF зам шийдэхээс хамаарахгүй). */
    private static function logo(): ?string
    {
        $path = resource_path('pdf/cuticul-logo.png');

        return is_file($path) ? 'data:image/png;base64,'.base64_encode(file_get_contents($path)) : null;
    }

    /** Татаж авахад харагдах файлын нэр. */
    public static function fileName(EmployeeDocument $document): string
    {
        $name = $document->employee_name ?: $document->employee?->full_name ?: 'Ажилтан';

        return Str::of($document->title.' — '.$name)
            ->replaceMatches('/[\\\\\/:*?"<>|]+/u', '-')
            ->limit(120, '')
            ->trim()
            ->append('.pdf')
            ->value();
    }
}
