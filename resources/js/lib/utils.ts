import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function shortDoctorName(name: string): string {
    const p = name.trim().split(/\s+/);
    if (p.length < 2) return name.trim();
    /* овог нь аль хэдийн "Б." хэлбэртэй байвал давхар цэг үүсгэхгүй */
    const surname = p[0].replace(/\.+$/, '');
    return `${surname.charAt(0)}.${p.slice(1).join(' ')}`;
}

export function doctorInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
