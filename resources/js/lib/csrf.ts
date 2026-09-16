/**
 * Inertia-аар биш, шууд fetch-ээр хүсэлт илгээхэд шаардагдах CSRF толгойнууд.
 *
 * Laravel нь XSRF-TOKEN cookie болон csrf-token meta хоёрын аль нэгийг
 * хүлээж авдаг тул хоёуланг нь илгээж баталгаатай болгоно.
 */
export function csrfHeaders(): Record<string, string> {
    const xsrf = decodeURIComponent(
        document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '',
    );
    const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

    return {
        'X-XSRF-TOKEN': xsrf,
        'X-CSRF-TOKEN': meta,
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };
}
