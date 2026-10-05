<?php

namespace App\Services\Schedule;

use App\Models\HR\Shift;
use Illuminate\Support\Collection;

/**
 * Ноорог + нийтлэгдсэн мөрүүдээс хуваарь гаргагчийн харах "одоогийн" төлөвийг гаргана.
 *
 *   new      — шинээр нэмсэн ноорог (нийтлэгдээгүй)
 *   changed  — нийтлэгдсэн ээлжийг засварласан ноорог (base = хуучин хувилбар)
 *   removed  — нийтлэгдсэн боловч устгахаар тэмдэглэсэн (shift = нийтлэгдсэн мөр)
 *   published — өөрчлөгдөөгүй нийтлэгдсэн
 */
final class EffectiveShifts
{
    /**
     * @param  Collection<int, Shift>  $rows  нэг хугацааны бүх мөр (ноорог + нийтлэгдсэн)
     * @return Collection<int, array{shift: Shift, state: string, base: ?Shift}>
     */
    public static function resolve(Collection $rows): Collection
    {
        $published = $rows->where('status', Shift::STATUS_PUBLISHED)->keyBy('id');
        $drafts = $rows->where('status', Shift::STATUS_DRAFT);
        $replaced = $drafts->pluck('replaces_id')->filter()->flip();

        $out = collect();

        foreach ($drafts as $d) {
            $base = $d->replaces_id ? $published->get($d->replaces_id) : null;

            if ($d->is_removal) {
                if ($base) {
                    $out->push(['shift' => $base, 'state' => 'removed', 'base' => $base, 'draft' => $d]);
                }

                continue;
            }

            $out->push(['shift' => $d, 'state' => $d->replaces_id ? 'changed' : 'new', 'base' => $base, 'draft' => $d]);
        }

        foreach ($published as $id => $p) {
            if (! $replaced->has($id)) {
                $out->push(['shift' => $p, 'state' => 'published', 'base' => null, 'draft' => null]);
            }
        }

        return $out->sortBy(fn ($e) => [$e['shift']->date->toDateString(), $e['shift']->start_time ?? '99'])->values();
    }

    /**
     * Устгагдахаар тэмдэглэснийг хасаад зөвхөн хүчинтэйг үлдээнэ.
     *
     * @param  Collection<int, array{shift: Shift, state: string, base: ?Shift}>  $effective
     * @return Collection<int, Shift>
     */
    public static function live(Collection $effective): Collection
    {
        return $effective->reject(fn ($e) => $e['state'] === 'removed')->pluck('shift')->values();
    }
}
