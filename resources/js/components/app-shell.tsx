import { SidebarProvider } from '@/components/ui/sidebar';
import { useState } from 'react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
    /** Sidebar-ын нийт өргөн (ж: '19rem'). Заагаагүй бол үндсэн 16rem. */
    sidebarWidth?: string;
}

export function AppShell({ children, variant = 'header', sidebarWidth }: AppShellProps) {
    const [isOpen, setIsOpen] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('sidebar') !== 'false' : true));

    const handleSidebarChange = (open: boolean) => {
        setIsOpen(open);

        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar', String(open));
        }
    };

    if (variant === 'header') {
        return <div className="flex min-h-screen w-full flex-col">{children}</div>;
    }

    return (
        <SidebarProvider
            defaultOpen={isOpen}
            open={isOpen}
            onOpenChange={handleSidebarChange}
            style={sidebarWidth ? ({ '--sidebar-width': sidebarWidth } as React.CSSProperties) : undefined}
        >
            {children}
        </SidebarProvider>
    );
}
