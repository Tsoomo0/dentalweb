<?php

namespace App\Services\HR;

use App\Models\HR\EmployeeDocument;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;
use Mpdf\HTMLParserMode;
use Mpdf\Mpdf;
use Mpdf\Output\Destination;

/**
 * Баталгаажсан гэрээ / ажлын байрны тодорхойлолтыг PDF болгож,
 * хувийн мэдээлэл агуулсан тул private дискэнд хадгална.
 *
 * A4 хэвтээ дээр агуулгыг 2 багана болгож урсгана — нэг хуудсанд
 * хоёр "хуудас" зэрэгцэн харагдаж, цаас хоёр дахин хэмнэнэ.
 */
class EmployeeDocumentPdf
{
    public const DISK = 'local';

    /** PDF-ийн түүхий агуулгыг буцаана. */
    public static function raw(EmployeeDocument $document): string
    {
        $document->loadMissing(['employee.position', 'employee.branch']);

        $html = View::make('hr.employee-document-pdf', ['doc' => $document])->render();

        $mpdf = self::engine();
        $mpdf->WriteHTML($html, HTMLParserMode::DEFAULT_MODE);

        return $mpdf->Output('', Destination::STRING_RETURN);
    }

    /** Тохируулсан mPDF хөдөлгүүр. */
    private static function engine(): Mpdf
    {
        $tempDir = storage_path('app/mpdf');

        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0775, true);
        }

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4-L',
            'margin_left' => 14,
            'margin_right' => 14,
            'margin_top' => 13,
            'margin_bottom' => 16,
            'margin_footer' => 7,
            // Кирилл бүрэн дэмждэг, mPDF-д багтсан фонт
            'default_font' => 'dejavusans',
            'default_font_size' => 10,
            'tempDir' => $tempDir,
        ]);

        $mpdf->SetHTMLFooter(
            '<div style="text-align:center;font-family:dejavusans;font-size:8pt;color:#555">'
            .'Хуудас {PAGENO} - {nbpg}</div>'
        );

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
