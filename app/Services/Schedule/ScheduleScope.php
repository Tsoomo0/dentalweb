<?php

namespace App\Services\Schedule;

use App\Models\HR\Employee;

/**
 * Хэн, юуны хуваарийг гаргаж болох вэ.
 *   HR        — бүх салбар, бүх албан тушаал, загвар/дүрэм тохируулна.
 *   Менежер   — My портал: зөвхөн өөрийн салбар, эрх олгосон албан тушаалууд.
 */
final class ScheduleScope
{
    /**
     * @param  list<int>|null  $positionIds  null = бүх албан тушаал
     */
    private function __construct(
        public readonly string $portal,
        public readonly ?int $lockedBranchId,
        public readonly ?array $positionIds,
        public readonly ?Employee $manager = null,
    ) {}

    public static function hr(): self
    {
        return new self('hr', null, null);
    }

    public static function manager(Employee $manager): self
    {
        return new self('my', $manager->branch_id, $manager->schedulablePositionIds(), $manager);
    }

    public function isHr(): bool
    {
        return $this->portal === 'hr';
    }

    /** Хүсэлтээр ирсэн салбарыг эрхийн хүрээнд хязгаарлана (null = бүх салбар). */
    public function branch(?int $requested): ?int
    {
        return $this->lockedBranchId ?? $requested;
    }

    public function allowsPosition(?int $positionId): bool
    {
        return $this->positionIds === null || ($positionId !== null && in_array($positionId, $this->positionIds, true));
    }

    public function allows(Employee $employee): bool
    {
        if ($this->lockedBranchId !== null && $employee->branch_id !== $this->lockedBranchId) {
            return false;
        }

        return $this->allowsPosition($employee->position_id);
    }

    /** Ээлжийг энэ салбарт тавьж болох эсэх (менежер өөр салбарт ээлж үүсгэхгүй). */
    public function allowsBranch(?int $branchId): bool
    {
        return $this->lockedBranchId === null || $branchId === null || $branchId === $this->lockedBranchId;
    }

    public function routeBase(): string
    {
        return $this->isHr() ? '/hr/schedule' : '/my/schedule-manage';
    }
}
