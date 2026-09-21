import { SidebarInset } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import * as React from 'react';

interface AppContentProps extends React.ComponentProps<'div'> {
    variant?: 'header' | 'sidebar';
}

export function AppContent({ variant = 'header', children, className, ...props }: AppContentProps) {
    if (variant === 'sidebar') {
        // app-canvas — брэндийн өнгөний зөөлөн туяа бүхий дэвсгэр (app.css)
        return (
            <SidebarInset className={cn(
                    'app-canvas ring-1 ring-black/5 dark:ring-white/10',
                    'md:peer-data-[variant=inset]:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_24px_60px_-36px_rgba(0,0,0,0.45)]',
                    className,
                )} {...props}>
                {children}
            </SidebarInset>
        );
    }

    return (
        <main className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl" {...props}>
            {children}
        </main>
    );
}
