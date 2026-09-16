<?php

namespace App\Services\Lab;

use App\Models\User;
use Illuminate\Support\Str;
use Mpdf\HTMLParserMode;
use Mpdf\Mpdf;
use Mpdf\Output\Destination;

/**
 * Ажилтны сургалтын хувийн хэргийг PDF болгоно.
 *
 * Гүйцэтгэлийн ярилцлага, дотоод шалгалт, албан тушаал ахиулах материалд
 * хавсаргахад зориулав. Файлыг диск рүү ХАДГАЛАХГҮЙ — тухай бүрд шинээр
 * үүсгэж шууд татуулна. Учир нь агуулга нь өдөр бүр өөрчлөгддөг, хадгалсан
 * хуулбар нь хуучирч эхэлмэгц худал мэдээлэл тарааж эхэлнэ.
 */
class TrainingTranscriptPdf
{
    /** PDF-ийн түүхий агуулга. */
    public static function raw(User $user): string
    {
        $html = view('lab.training-transcript-pdf', [
            'data'      => TrainingTranscript::for($user),
            'printedAt' => now()->format('Y-m-d H:i'),
        ])->render();

        $mpdf = self::engine();
        $mpdf->WriteHTML($html, HTMLParserMode::DEFAULT_MODE);

        return $mpdf->Output('', Destination::STRING_RETURN);
    }

    /** Тохируулсан mPDF хөдөлгүүр — А4 босоо, кирилл фонттой. */
    private static function engine(): Mpdf
    {
        $tempDir = storage_path('app/mpdf');

        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0775, true);
        }

        $mpdf = new Mpdf([
            'mode'              => 'utf-8',
            'format'            => 'A4',
            'margin_left'       => 13,
            'margin_right'      => 13,
            'margin_top'        => 12,
            'margin_bottom'     => 15,
            'margin_footer'     => 7,
            // Кирилл бүрэн дэмждэг, mPDF-д багтсан фонт
            'default_font'      => 'dejavusans',
            'default_font_size' => 9,
            'tempDir'           => $tempDir,
        ]);

        $mpdf->SetHTMLFooter(
            '<div style="text-align:center;font-family:dejavusans;font-size:7.5pt;color:#666">'
            .'Cuticul Dental — Дотоод сургалтын хувийн хэрэг · Хуудас {PAGENO} / {nbpg}</div>'
        );

        $mpdf->SetCreator('Cuticul Dental');

        return $mpdf;
    }

    /**
     * Татаж авахад харагдах файлын нэр.
     *
     * Нэрийг ажилтны картаас шууд уншина — бүтэн хувийн хэргийг дахин
     * бүтээвэл ганц файлын нэрийн төлөө хоёр дахин их query явуулна.
     */
    public static function fileName(User $user): string
    {
        $user->loadMissing('employee');
        $e = $user->employee;

        $name = trim(($e?->last_name ?? '').' '.($e?->first_name ?? '')) ?: $user->name;

        return Str::of('Сургалтын хувийн хэрэг — '.$name)
            ->replaceMatches('/[\\\\\/:*?"<>|]+/u', '-')
            ->limit(120, '')
            ->trim()
            ->append('.pdf')
            ->value();
    }
}
