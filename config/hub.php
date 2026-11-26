<?php

/*
| Cuticul Hub (hub.cuticul.mn) — ажилчдын дотоод хэрэгсэл.
| ERP-д нэвтэрсэн ажилтан Hub руу нэвтрэлтгүйгээр шууд орно (SSO).
| HUB_SSO_SECRET нь Hub-ийн .env дахь утгатай яг ижил, 32+ тэмдэгт байна.
*/

return [
    'url' => rtrim((string) env('HUB_URL', ''), '/'),
    'sso_secret' => (string) env('HUB_SSO_SECRET', ''),
];
