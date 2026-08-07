<?php

/**
 * Excel файлын бүх нүдийг (томьёо + утга) текстээр хэвлэнэ.
 *
 * Ашиглах:  php scripts/dump-xlsx.php "docs/эхэн-цалин.xlsx"
 *
 * Томьёотой нүдийг  =ТОМЬЁО  ⇒ бодогдсон утга  хэлбэрээр гаргана.
 */

require __DIR__.'/../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;

$path = $argv[1] ?? null;

if (! $path || ! is_file($path)) {
    fwrite(STDERR, 'Файл олдсонгүй: '.($path ?? '(зам өгөөгүй)')."\n");
    exit(1);
}

$spreadsheet = IOFactory::createReader(IOFactory::identify($path))->load($path);

foreach ($spreadsheet->getAllSheets() as $sheet) {
    echo str_repeat('═', 70)."\n";
    echo 'SHEET: '.$sheet->getTitle()."\n";
    echo str_repeat('═', 70)."\n";

    $merges = $sheet->getMergeCells();
    if ($merges) {
        echo 'Нэгтгэсэн нүд: '.implode(', ', $merges)."\n\n";
    }

    $maxRow = $sheet->getHighestDataRow();
    $maxCol = Coordinate::columnIndexFromString($sheet->getHighestDataColumn());

    for ($row = 1; $row <= $maxRow; $row++) {
        $line = [];

        for ($col = 1; $col <= $maxCol; $col++) {
            $cell = $sheet->getCellByColumnAndRow($col, $row);
            $raw = $cell->getValue();

            if ($raw === null || $raw === '') {
                continue;
            }

            $ref = Coordinate::stringFromColumnIndex($col).$row;

            if (is_string($raw) && str_starts_with($raw, '=')) {
                try {
                    $calc = $cell->getCalculatedValue();
                } catch (Throwable $e) {
                    $calc = '#ERR';
                }
                $line[] = "{$ref}: {$raw}  ⇒ ".(is_scalar($calc) ? $calc : gettype($calc));
            } else {
                $line[] = "{$ref}: ".(is_scalar($raw) ? $raw : gettype($raw));
            }
        }

        if ($line) {
            echo "[мөр {$row}]  ".implode('  |  ', $line)."\n";
        }
    }

    echo "\n";
}
