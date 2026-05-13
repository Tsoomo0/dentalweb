import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function shortDoctorName(name: string): string {
    const p = name.trim().split(/\s+/);
    return p.length >= 2 ? `${p[0][0]}.${p.slice(1).join(' ')}` : name;
}

export function doctorInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
