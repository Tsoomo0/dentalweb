<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Лабын видеоны диск
    |--------------------------------------------------------------------------
    |
    | Сургалтын видео аль диск дээр байхыг энд шийднэ. Дараа нь үүлэн хадгалалт
    | руу шилжих бол зөвхөн энэ утгыг солиход хангалттай (жишээ: 's3' → R2).
    |
    */

    'lab_video_disk' => env('LAB_VIDEO_DISK', 'lab_video'),
    'lab_doc_disk' => env('LAB_DOC_DISK', 'lab_doc'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
        ],

        /*
        |----------------------------------------------------------------------
        | Лабын сургалтын видео
        |----------------------------------------------------------------------
        |
        | Видео нь PRIVATE диск дээр байрлана — линк мэддэг хүн шууд татаж
        | чадахгүй, зөвхөн auth хийсэн лаб ажилтан stream route-аар үзнэ.
        |
        | Cloudflare R2 / S3 руу шилжихэд код өөрчлөгдөхгүй:
        |   .env → LAB_VIDEO_DISK=s3  +  AWS_* утгуудаа бөглөнө.
        |
        */

        'lab_video' => [
            'driver' => 'local',
            'root' => storage_path('app/private/lab-videos'),
            'serve' => false,
            'throw' => false,
        ],

        // Баримт хичээлийн файлууд (PDF болон хөрвүүлэхээс өмнөх PPT/DOCX).
        // Видеогоос ТУСДАА диск — хэмжээ, нөөцлөлтийн давтамж, R2 руу шилжих
        // хугацаа нь өөр байх магадлалтай тул эхнээс нь салгасан.
        'lab_doc' => [
            'driver' => 'local',
            'root' => storage_path('app/private/lab-docs'),
            'serve' => false,
            'throw' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
