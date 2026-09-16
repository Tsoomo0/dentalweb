<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'qpay' => [
        'base_url' => env('QPAY_BASE_URL', 'https://sandbox-merchant.qpay.mn/v2'),
        'username' => env('QPAY_USERNAME', 'TEST_MERCHANT'),
        'password' => env('QPAY_PASSWORD', '123456'),
        'invoice_code' => env('QPAY_INVOICE_CODE', 'TEST_INVOICE'),
        'test_mode' => env('QPAY_TEST_MODE', false),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect_uri' => env('GOOGLE_REDIRECT_URI'),
        'refresh_token' => env('GOOGLE_REFRESH_TOKEN'),
    ],

    'turnstile' => [
        'site_key' => env('TURNSTILE_SITE_KEY'),
        'secret' => env('TURNSTILE_SECRET_KEY'),
    ],

    // Google Gemini (AI чат — Social Bot модулийн ухаалаг fallback)
    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-2.5-flash'),
        'base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta'),
    ],

    // Groq (үнэгүй, өгөөмөр хязгаар — OpenAI-compatible)
    'groq' => [
        'api_key' => env('GROQ_API_KEY'),
        'model' => env('GROQ_MODEL', 'llama-3.3-70b-versatile'),
        'base_url' => env('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
    ],

    // Meta (Facebook Page + Instagram) — Social Bot модуль
    'meta' => [
        'app_id' => env('META_APP_ID'),
        'app_secret' => env('META_APP_SECRET'),
        'verify_token' => env('META_VERIFY_TOKEN'),
        'api_version' => env('META_API_VERSION', 'v21.0'),
        'graph_url' => env('META_GRAPH_URL', 'https://graph.facebook.com'),
        // Карусель/template зургийн нийтийн URL суурь (dev үед HTTPS тунель). Хоосон бол APP_URL.
        'media_url' => env('META_MEDIA_URL'),
    ],

    // LibreOffice — PPT/DOCX хичээлийг PDF болгож хөрвүүлэхэд ашиглана.
    //
    // Замыг .env-ээс өгнө. Windows дээр ихэвчлэн:
    //   LIBREOFFICE_PATH="C:\Program Files\LibreOffice\program\soffice.exe"
    // Linux сервер дээр ихэвчлэн /usr/bin/soffice.
    //
    // Хоосон эсвэл олдохгүй бол хөрвүүлэлт "failed" болж, админд PDF-ээр
    // байршуулахыг зөвлөнө — систем унахгүй, зүгээр л тэр боломж идэвхгүй байна.
    'libreoffice' => [
        'path' => env('LIBREOFFICE_PATH'),
        // Нэг файл хөрвүүлэхэд зөвшөөрөх дээд хугацаа (секунд)
        'timeout' => (int) env('LIBREOFFICE_TIMEOUT', 180),
    ],

    // CallPro — дуудлагын webhook хүлээн авах тохиргоо.
    // CallPro талд signature механизм байхгүй тул нууц түлхүүр + IP whitelist
    // хоёроор хамгаална. Түлхүүрийг бид үүсгээд CallPro-д өгнө.
    'callpro' => [
        'webhook_token' => env('CALLPRO_WEBHOOK_TOKEN'),
        'allowed_ips' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('CALLPRO_ALLOWED_IPS', '')),
        ))),
    ],

];
