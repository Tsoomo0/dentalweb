<?php

return [
    'vapid' => [
        'subject' => env('VAPID_SUBJECT', 'mailto:info@cuticul.mn'),
        'public_key' => env('VAPID_PUBLIC_KEY', ''),
        'private_key' => env('VAPID_PRIVATE_KEY', ''),
    ],
    'ttl' => 3600 * 24,
    'urgency' => 'normal',
];
