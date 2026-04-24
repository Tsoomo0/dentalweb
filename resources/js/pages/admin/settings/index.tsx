import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    CheckCircle2, CreditCard, Eye, EyeOff,
    Globe, Image, Mail, Save, Settings, Shield, ToggleLeft, ToggleRight, Upload, Video, X, XCircle,
} from 'lucide-react';
import { useRef, useState } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface SettingItem {
    id: number;
    key: string;
    value: string | null;
    group: string;
    label: string;
    description: string | null;
    type: 'string' | 'text' | 'boolean' | 'integer' | 'password' | 'image';
    is_sensitive: boolean;
}

interface Props {
    settings: SettingItem[];
    google_connected: boolean;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Тохиргоо', href: '/admin/settings' },
];

const TABS = [
    { id: 'general',  label: 'Ерөнхий',  icon: Globe      },
    { id: 'branding', label: 'Брэнд',    icon: Image      },
    { id: 'payment',  label: 'Төлбөр',   icon: CreditCard },
    { id: 'email',    label: 'Имэйл',    icon: Mail       },
    { id: 'system',   label: 'Систем',   icon: Settings   },
] as const;

type TabId = typeof TABS[number]['id'];

/* ─── BrandingForm ───────────────────────────────────────────────────────── */
function BrandingForm({ logoUrl, faviconUrl }: { logoUrl: string; faviconUrl: string }) {
    const [logoPreview, setLogoPreview]       = useState<string | null>(logoUrl || null);
    const [faviconPreview, setFaviconPreview] = useState<string | null>(faviconUrl || null);
    const logoRef    = useRef<HTMLInputElement>(null);
    const faviconRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing } = useForm<{
        site_logo: File | null;
        site_favicon: File | null;
    }>({ site_logo: null, site_favicon: null });

    function pickFile(field: 'site_logo' | 'site_favicon', file: File | null) {
        if (!file) return;
        setData(field, file);
        const url = URL.createObjectURL(file);
        if (field === 'site_logo')    setLogoPreview(url);
        else                          setFaviconPreview(url);
    }

    function clearField(field: 'site_logo' | 'site_favicon') {
        setData(field, null);
        if (field === 'site_logo') {
            setLogoPreview(logoUrl || null);
            if (logoRef.current) logoRef.current.value = '';
        } else {
            setFaviconPreview(faviconUrl || null);
            if (faviconRef.current) faviconRef.current.value = '';
        }
    }

    function save() {
        post('/admin/settings/branding', { forceFormData: true, preserveScroll: true });
    }

    const hasChanges = data.site_logo !== null || data.site_favicon !== null;

    return (
        <div className="space-y-4">
            {/* Logo */}
            <BrandingCard
                label="Вэбсайтын лого"
                description="Навигац болон имэйлд харагдах лого — PNG, SVG, WEBP, дээд тал нь 2 MB"
                previewUrl={logoPreview}
                previewAlt="Лого"
                previewClass="h-16 object-contain"
                placeholderLabel="Лого"
                acceptedTypes="image/png,image/svg+xml,image/webp,image/jpeg"
                inputRef={logoRef}
                hasNewFile={data.site_logo !== null}
                onPick={f => pickFile('site_logo', f)}
                onClear={() => clearField('site_logo')}
            />

            {/* Favicon */}
            <BrandingCard
                label="Favicon"
                description="Хөтчийн таб дахь дүрс — ICO, PNG — дээд тал нь 512 KB, 32×32 px"
                previewUrl={faviconPreview}
                previewAlt="Favicon"
                previewClass="h-10 w-10 object-contain"
                placeholderLabel="Favicon"
                acceptedTypes="image/png,image/x-icon,image/vnd.microsoft.icon,image/webp"
                inputRef={faviconRef}
                hasNewFile={data.site_favicon !== null}
                onPick={f => pickFile('site_favicon', f)}
                onClear={() => clearField('site_favicon')}
            />

            {/* Save */}
            <div className="flex justify-end pt-2">
                <button
                    onClick={save}
                    disabled={processing || !hasChanges}
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                    <Save className="size-4" />
                    {processing ? 'Хадгалж байна...' : 'Хадгалах'}
                </button>
            </div>
        </div>
    );
}

interface BrandingCardProps {
    label: string;
    description: string;
    previewUrl: string | null;
    previewAlt: string;
    previewClass: string;
    placeholderLabel: string;
    acceptedTypes: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    hasNewFile: boolean;
    onPick: (file: File) => void;
    onClear: () => void;
}

function BrandingCard({
    label, description, previewUrl, previewAlt, previewClass,
    placeholderLabel, acceptedTypes, inputRef, hasNewFile, onPick, onClear,
}: BrandingCardProps) {
    return (
        <div className="flex flex-col gap-4 rounded-xl border bg-card px-5 py-5 sm:flex-row sm:items-start sm:gap-6">
            {/* Label col */}
            <div className="w-full sm:w-64 shrink-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>

            {/* Upload col */}
            <div className="flex-1 flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Preview box */}
                <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-xl border-2 border-dashed bg-muted/40">
                    {previewUrl ? (
                        <img src={previewUrl} alt={previewAlt} className={previewClass} />
                    ) : (
                        <span className="text-xs text-muted-foreground">{placeholderLabel}</span>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept={acceptedTypes}
                        className="hidden"
                        onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) onPick(f);
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="flex items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                    >
                        <Upload className="size-4" />
                        Файл сонгох
                    </button>
                    {hasNewFile && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                            <X className="size-4" />
                            Болих
                        </button>
                    )}
                    {hasNewFile && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            ✓ Шинэ файл сонгогдлоо
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── SettingsForm ───────────────────────────────────────────────────────── */
function SettingsForm({ group, items }: { group: TabId; items: SettingItem[] }) {
    const [values, setValues] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        items.forEach(s => { init[s.key] = s.value ?? ''; });
        return init;
    });
    const [showPass, setShowPass] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState(false);

    function toggle(key: string) {
        setValues(v => ({ ...v, [key]: v[key] === '1' ? '0' : '1' }));
    }

    function save() {
        setSaving(true);
        router.post('/admin/settings', { group, settings: values }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Settings className="mb-3 size-10 opacity-30" />
                <p>Тохиргоо олдсонгүй</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {items.map(s => (
                <div key={s.key}
                    className="flex flex-col gap-2 rounded-xl border bg-card px-5 py-4 sm:flex-row sm:items-start sm:gap-6">
                    {/* Label col */}
                    <div className="w-full sm:w-64 shrink-0">
                        <p className="text-sm font-medium">{s.label}</p>
                        {s.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                        )}
                        {s.is_sensitive && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                                <Shield className="size-3" />
                                Нууц мэдээлэл
                            </span>
                        )}
                    </div>

                    {/* Input col */}
                    <div className="flex-1">
                        {s.type === 'boolean' ? (
                            <button
                                type="button"
                                onClick={() => toggle(s.key)}
                                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                                    values[s.key] === '1'
                                        ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30'
                                        : 'bg-muted text-muted-foreground border'
                                }`}
                            >
                                {values[s.key] === '1'
                                    ? <ToggleRight className="size-5 text-green-500" />
                                    : <ToggleLeft  className="size-5" />
                                }
                                {values[s.key] === '1' ? 'Идэвхтэй' : 'Идэвхгүй'}
                            </button>
                        ) : s.type === 'text' ? (
                            <textarea
                                rows={3}
                                value={values[s.key]}
                                onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        ) : s.type === 'password' ? (
                            <div className="relative">
                                <input
                                    type={showPass[s.key] ? 'text' : 'password'}
                                    value={values[s.key]}
                                    placeholder={s.is_sensitive ? '••••••••  (хоосон орхивол өөрчлөхгүй)' : ''}
                                    onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                                    className="w-full rounded-xl border bg-background py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(p => ({ ...p, [s.key]: !p[s.key] }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPass[s.key] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>
                        ) : (
                            <input
                                type={s.type === 'integer' ? 'number' : 'text'}
                                value={values[s.key]}
                                onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        )}
                    </div>
                </div>
            ))}

            {/* Save button */}
            <div className="flex justify-end pt-2">
                <button
                    onClick={save}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                    <Save className="size-4" />
                    {saving ? 'Хадгалж байна...' : 'Хадгалах'}
                </button>
            </div>
        </div>
    );
}

/* ─── GoogleMeetCard ─────────────────────────────────────────────────────── */
function GoogleMeetCard({ connected }: { connected: boolean }) {
    return (
        <div className="flex flex-col gap-4 rounded-xl border bg-card px-5 py-5 sm:flex-row sm:items-center sm:gap-6">
            <div className="w-full sm:w-64 shrink-0">
                <p className="text-sm font-medium">Google Meet OAuth</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    Төлбөр төлөгдсөний дараа Meet линк автоматаар үүсгэхэд шаардлагатай
                </p>
            </div>
            <div className="flex flex-1 items-center gap-4">
                {connected ? (
                    <span className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-2.5 text-sm font-semibold text-green-700 dark:text-green-400">
                        <CheckCircle2 className="size-4" />
                        Холбогдсон
                    </span>
                ) : (
                    <span className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-700 dark:text-red-400">
                        <XCircle className="size-4" />
                        Холбогдоогүй
                    </span>
                )}
                <a
                    href="/google/redirect"
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                    <Video className="size-4" />
                    {connected ? 'Дахин холбох' : 'Google-тэй холбох'}
                </a>
            </div>
        </div>
    );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function SettingsIndex({ settings, google_connected }: Props) {
    const [activeTab, setActiveTab] = useState<TabId>('general');

    const grouped = Object.fromEntries(
        TABS.map(t => [t.id, settings.filter(s => s.group === t.id)])
    ) as Record<TabId, SettingItem[]>;

    const logoUrl    = settings.find(s => s.key === 'site_logo')?.value    ?? '';
    const faviconUrl = settings.find(s => s.key === 'site_favicon')?.value ?? '';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Тохиргоо" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* Page title */}
                <div>
                    <h1 className="text-2xl font-bold">Системийн тохиргоо</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Вэбсайт, брэнд, төлбөр, имэйл болон системийн бүх тохиргоог энд удирдана
                    </p>
                </div>

                {/* Layout: sidebar tabs + content */}
                <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">

                    {/* Tab sidebar */}
                    <aside className="lg:w-52 shrink-0">
                        <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
                            {TABS.map(tab => {
                                const Icon = tab.icon;
                                const active = activeTab === tab.id;
                                const count  = tab.id === 'branding' ? 2 : (grouped[tab.id]?.length ?? 0);
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex min-w-max items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors lg:w-full ${
                                            active
                                                ? 'bg-red-600 text-white shadow'
                                                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className="size-4 shrink-0" />
                                        <span className="flex-1 text-left">{tab.label}</span>
                                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                            active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                                        }`}>{count}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <TabHeader tab={activeTab} />
                        <div className="mt-4">
                            {activeTab === 'branding' ? (
                                <BrandingForm logoUrl={logoUrl} faviconUrl={faviconUrl} />
                            ) : (
                                <div className="space-y-4">
                                    {activeTab === 'system' && (
                                        <GoogleMeetCard connected={google_connected} />
                                    )}
                                    <SettingsForm
                                        key={activeTab}
                                        group={activeTab}
                                        items={grouped[activeTab] ?? []}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

/* ─── Tab Header ─────────────────────────────────────────────────────────── */
function TabHeader({ tab }: { tab: TabId }) {
    const meta: Record<TabId, { title: string; desc: string; icon: React.ElementType }> = {
        general: {
            title: 'Ерөнхий тохиргоо',
            desc:  'Вэбсайтын нэр, холбоо барих мэдээлэл, нийгмийн сүлжээ',
            icon:  Globe,
        },
        branding: {
            title: 'Брэндийн тохиргоо',
            desc:  'Вэбсайтын лого болон favicon зураг солих',
            icon:  Image,
        },
        payment: {
            title: 'Төлбөрийн тохиргоо',
            desc:  'QPay merchant мэдээлэл, онлайн зөвлөгөөний хураамж',
            icon:  CreditCard,
        },
        email: {
            title: 'Имэйл тохиргоо',
            desc:  'Имэйл илгээгч, мэдэгдэл тохиргоо',
            icon:  Mail,
        },
        system: {
            title: 'Системийн тохиргоо',
            desc:  'Цаг захиалга, засвар горим, Google Meet тохиргоо',
            icon:  Settings,
        },
    };

    const { title, desc, icon: Icon } = meta[tab];

    return (
        <div className="flex items-center gap-4 rounded-xl border bg-muted/30 px-5 py-4">
            <div className="rounded-xl bg-red-600/10 p-2.5">
                <Icon className="size-5 text-red-600" />
            </div>
            <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
        </div>
    );
}
