<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Тамга / захирлын гарын үсгийн PIN түгжээг нээнэ.
     *
     * HR талын тамга солих, гэрээнд гарын үсэг зурах маршрутууд `seal`
     * middleware-тэй тул тэдгээрийг шалгахын өмнө нэг удаа дуудна.
     */
    protected function unlockSeal(): static
    {
        return $this->withSession(['hr.seal_unlocked_at' => time()]);
    }
}
