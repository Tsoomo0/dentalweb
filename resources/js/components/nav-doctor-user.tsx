import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
    DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronsUpDown, LogOut, UserRound } from 'lucide-react';

export function NavDoctorUser() {
    const { auth } = usePage<{
        auth: {
            doctor: {
                name: string;
                email: string;
                specialization?: string | null;
                photo_url: string | null;
            } | null;
        };
    }>().props;

    const doctor = auth.doctor;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    if (!doctor) return null;

    function initials(name: string) {
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent group">
                            <Avatar className="h-8 w-8 overflow-hidden rounded-lg">
                                <AvatarImage src={doctor.photo_url ?? undefined} alt={doctor.name} className="object-cover object-top" />
                                <AvatarFallback className="rounded-lg bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 text-xs font-bold">
                                    {initials(doctor.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{doctor.name}</span>
                                {doctor.specialization && (
                                    <span className="truncate text-xs text-muted-foreground">{doctor.specialization}</span>
                                )}
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="end"
                        side={isMobile ? 'bottom' : state === 'collapsed' ? 'left' : 'bottom'}>

                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-2 py-2">
                                <Avatar className="h-8 w-8 rounded-lg overflow-hidden">
                                    <AvatarImage src={doctor.photo_url ?? undefined} className="object-cover object-top" />
                                    <AvatarFallback className="rounded-lg bg-red-100 text-red-700 text-xs font-bold">
                                        {initials(doctor.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{doctor.name}</span>
                                    <span className="truncate text-xs text-muted-foreground">{doctor.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link href="/doctor/profile" className="cursor-pointer">
                                    <UserRound className="mr-2 size-4" />
                                    Профайл
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            onClick={() => router.post('/logout')}
                            className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400">
                            <LogOut className="mr-2 size-4" />
                            Гарах
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
