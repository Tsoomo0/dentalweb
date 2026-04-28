import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { props } = usePage<{ site_settings?: { site_logo?: string; site_name?: string } }>();
    const logoUrl  = props.site_settings?.site_logo  || '/img/black.png';
    const siteName = props.site_settings?.site_name  || 'Кутикул Админ';

    return (
        <>
            <div className="bg-sidebar-primary flex aspect-square size-8 items-center justify-center rounded-md">
                <img src={logoUrl} alt={siteName} className="size-20 object-contain" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-semibold">{siteName}</span>
            </div>
        </>
    );
}
