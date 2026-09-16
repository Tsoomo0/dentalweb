import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

/**
 * Гар утсанд гүйлгэх талбар.
 *
 * MyLayout нь утсан дээр бүтэн дэлгэцийн өндөртэй, `<main>` нь
 * `overflow: hidden` — тиймээс хуудас бүр ӨӨРӨӨ гүйлгэх талбараа зарлах
 * ёстой. Эс тэгвээс дэлгэцэнд багтаагүй агуулга руу хэзээ ч хүрэхгүй.
 *
 * Мөн доод талд хөвөгч цэс суудаг тул төгсгөлийн агуулга түүний дор дарагдахгүйн
 * тулд зай үлдээнэ.
 *
 * Ширээний дэлгэцэнд AppContent өөрөө гүйлгэдэг тул энэ нь ердийн блок болж,
 * нэмэлт зай ч алга болно.
 */
export default function MyScroll({ children, className }: {
    children: ReactNode;
    /** Дотоод агуулгын зай — хуудасны өөрийн padding энд орно. */
    className?: string;
}) {
    return (
        <div
            className="min-h-0 flex-1 overflow-y-auto pb-[calc(88px+env(safe-area-inset-bottom,0px))] md:flex-none md:overflow-visible md:pb-0"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
            <div className={cn(className)}>{children}</div>
        </div>
    );
}
