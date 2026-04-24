import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
    DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { type SharedData } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronsUpDown, LogOut, UserRound } from 'lucide-react';

export function NavReceptionUser() {
    const { auth } = usePage<SharedData>().props;
    const user      = auth.user;
    const { state } = useSidebar();
    const isMobile  = useIsMobile();

    if (!user) return null;

    function initials(name: string) {
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }

    const GRADIENTS = [
        'from-blue-500 to-indigo-600',
        'from-emerald-500 to-teal-600',
        'from-violet-500 to-purple-600',
        'from-amber-500 to-orange-600',
        'from-rose-500 to-pink-600',
    ];
    const grad = GRADIENTS[user.name.charCodeAt(0) % GRADIENTS.length];

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent group">
                            <Avatar className="h-8 w-8 overflow-hidden rounded-lg">
                                <AvatarFallback className={`rounded-lg bg-gradient-to-br ${grad} text-white text-xs font-bold`}>
                                    {initials(user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{user.name}</span>
                                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
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
                                    <AvatarFallback className={`rounded-lg bg-gradient-to-br ${grad} text-white text-xs font-bold`}>
                                        {initials(user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{user.name}</span>
                                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link href="/reception/profile" className="cursor-pointer">
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
