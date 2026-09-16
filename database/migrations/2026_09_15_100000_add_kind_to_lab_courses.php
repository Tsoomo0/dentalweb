<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Сургалтыг өөрийг нь ВИДЕО ба ФАЙЛ гэж хоёр салгана.
 *
 * ЯАГААД: өмнө нь хичээл бүр өөрийн төрөлтэй байсан тул нэг сургалт дотор
 * бичлэг, баримт хоёр холилдож байлаа. Админ талд нэг хуудсанд нийлээд
 * "энэ сургалт юуны тухай вэ" гэдэг нь бүрхэг, ажилтны талд ч бичлэг үзэх
 * гээд орсон хүн PDF-тэй таарч байв. Сургалтыг өөрийг нь ангилснаар хоёр
 * тал дээр ч тусдаа хуудас болж, дүрслэл нь агуулгадаа таарна.
 *
 * ДҮРЭМ: сургалтын kind нь доторх БҮХ хичээлийн kind-ыг тодорхойлно.
 * Хичээл нэмэхэд серверээс сургалтынх нь төрлийг хүчээр оноодог тул
 * цаашид холимог сургалт үүсэхгүй.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_courses', function (Blueprint $table) {
            // video | document — аль хуудсанд харагдахыг заана
            $table->string('kind', 20)->default('video')->after('lab_category_id');
            $table->index('kind');
        });

        $this->classifyExisting();
    }

    public function down(): void
    {
        Schema::table('lab_courses', function (Blueprint $table) {
            $table->dropIndex(['kind']);
            $table->dropColumn('kind');
        });
    }

    /**
     * Хуучин өгөгдлийг хоёр төрөлд хуваарилна.
     *
     * Зөвхөн баримттай сургалт шууд "файл" болно. Холимог байсан сургалтын
     * баримт хичээлүүдийг ХУУЛБАР сургалт руу зөөнө — ингэснээр видео тал нь
     * хэвээрээ үлдэж, баримт нь ч алга болохгүй. Бүлэг нь шинэ сургалтад
     * дагаж очихгүй тул зөөгдсөн хичээлүүд бүлэггүй болно.
     */
    protected function classifyExisting(): void
    {
        $hasKind = fn (string $kind) => fn ($q) => $q
            ->select(DB::raw(1))
            ->from('lab_lessons')
            ->whereColumn('lab_lessons.lab_course_id', 'lab_courses.id')
            ->where('lab_lessons.kind', $kind);

        // 1. Зөвхөн баримттай — байрандаа л төрлөө сольчихно
        DB::table('lab_courses')
            ->whereExists($hasKind('document'))
            ->whereNotExists($hasKind('video'))
            ->update(['kind' => 'document']);

        // 2. Холимог — баримт хэсгийг нь тусдаа сургалт болгож салгана
        $mixed = DB::table('lab_courses')
            ->whereExists($hasKind('document'))
            ->whereExists($hasKind('video'))
            ->get();

        foreach ($mixed as $course) {
            $newId = DB::table('lab_courses')->insertGetId([
                'lab_category_id' => $course->lab_category_id,
                'kind'            => 'document',
                'title'           => $course->title.' (файл)',
                'slug'            => $course->slug.'-fail',
                'description'     => $course->description,
                'cover_image'     => $course->cover_image,
                'order'           => $course->order,
                'is_published'    => $course->is_published,
                'created_by'      => $course->created_by,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);

            // Хэн үзэхийг тодорхойлдог албан тушаалууд хуулбарт дагаж очно —
            // эс тэгвээс салсан хичээлүүд гэнэт бүх ажилтанд нээгдэнэ
            $links = DB::table('lab_course_position')
                ->where('lab_course_id', $course->id)
                ->pluck('position_id')
                ->map(fn ($id) => ['lab_course_id' => $newId, 'position_id' => $id])
                ->all();

            if ($links !== []) {
                DB::table('lab_course_position')->insert($links);
            }

            DB::table('lab_lessons')
                ->where('lab_course_id', $course->id)
                ->where('kind', 'document')
                ->update(['lab_course_id' => $newId, 'lab_section_id' => null]);
        }
    }
};
