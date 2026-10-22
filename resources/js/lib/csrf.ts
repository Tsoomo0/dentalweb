/**
 * Inertia-аар биш, шууд fetch-ээр хүсэлт илгээхэд шаардагдах CSRF толгойнууд.
 *
 * XSRF-TOKEN cookie нь хариу бүрээр шинэчлэгддэг бол csrf-token meta нь зөвхөн
 * хуудас анх ачаалахад бичигдэнэ — Inertia-аар нэвтэрсэн/2FA давсны дараа сесс
 * шинэчлэгдэхэд meta хуучирна. Laravel X-CSRF-TOKEN-г түрүүлж шалгадаг тул
 * хоёуланг нь илгээвэл хуучин meta нь «CSRF token mismatch» өгнө. Иймээс
 * cookie байвал зөвхөн түүнийг, байхгүй үед л meta-г илгээнэ.
 */
export function csrfTokenHeader(): Record<string, string> {
    const xsrf = decodeURIComponent(
        document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '',
    );
    if (xsrf) return { 'X-XSRF-TOKEN': xsrf };

    return { 'X-CSRF-TOKEN': csrfMetaToken() };
}

export function csrfHeaders(): Record<string, string> {
    return {
        ...csrfTokenHeader(),
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };
}

/**
 * sendBeacon толгой нэмж чаддаггүй тул FormData-ийн `_token`-д түүхий токен хэрэгтэй —
 * энэ нь зөвхөн meta-д байдаг (cookie нь шифрлэгдсэн).
 */
export function csrfMetaToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}
