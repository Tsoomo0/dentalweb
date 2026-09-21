import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

/** Цэсний мөрийн нийтлэг загвар — идэвхтэй үед зүүн ирмэг өнгөтэй болно. */
const ITEM_CLS =
    'relative h-9 rounded-xl transition-all duration-200 hover:translate-x-0.5 ' +
    'data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/15 data-[active=true]:via-primary/5 data-[active=true]:to-transparent ' +
    'data-[active=true]:font-semibold data-[active=true]:text-primary ' +
    'data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:left-0 ' +
    'data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-primary ' +
    '[&>svg]:text-sidebar-foreground/60 data-[active=true]:[&>svg]:text-primary';

export function NavMain({ items = [], label }: { items: NavItem[]; label?: string }) {
    const page = usePage();

    return (
        <SidebarGroup className="px-2 py-0">
            {label && (
                <SidebarGroupLabel className="gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/45">
                    <span aria-hidden className="h-2.5 w-0.5 rounded-full bg-gradient-to-b from-primary to-primary/40" />
                    {label}
                </SidebarGroupLabel>
            )}
            <SidebarMenu>
                {items.map((item) =>
                    item.children && item.children.length > 0 ? (
                        <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen={item.children.some((child) => child.url === page.url) || item.url === page.url}
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        isActive={item.url === page.url}
                                        tooltip={item.title}
                                        className={ITEM_CLS}
                                    >
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.children.map((child) => (
                                            <SidebarMenuSubItem key={child.title}>
                                                <SidebarMenuSubButton asChild isActive={child.url === page.url}
                                                    className="rounded-lg transition-colors data-[active=true]:bg-primary/10 data-[active=true]:font-semibold data-[active=true]:text-primary">
                                                    <Link href={child.url}>
                                                        {child.icon && <child.icon />}
                                                        <span>{child.title}</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    ) : (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={item.url === page.url} tooltip={item.title} className={ITEM_CLS}>
                                <Link href={item.url}>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                    {!!item.badge && (
                                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-b from-red-500 to-red-600 px-1 text-[10px] font-bold tabular-nums text-white shadow-sm ring-1 ring-inset ring-white/20">
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    )}
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ),
                )}
            </SidebarMenu>
        </SidebarGroup>
    );
}
