export default function AppLogo() {
    return (
        <>
            <div className="bg-sidebar-primary flex aspect-square size-8 items-center justify-center rounded-md">
                <img src="/img/black.png" alt="Кутикул лого" className="size-20 object-contain" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-semibold">Кутикул Админ</span>
            </div>
        </>
    );
}
