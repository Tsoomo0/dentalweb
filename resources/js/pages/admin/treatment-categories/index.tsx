import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Edit2, Plus, Save, Tag, Trash2, X } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';

interface TreatmentCategory {
    id: number;
    name: string;
    icon: string | null;
    order: number;
    is_active: boolean;
    treatments_count: number;
}

interface Props {
    categories: TreatmentCategory[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Эмчилгээ', href: '/admin/treatments' },
    { title: 'Ангилал', href: '/admin/treatment-categories' },
];

const EMOJI_LIST = [
    '🦷','😁','🩺','💊','💉','🔬','🏥','🩹','🦴','❤️',
    '✨','👶','👨‍⚕️','👩‍⚕️','🌟','🫀','🧬','🩻','😬','🫁',
];

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="border-input bg-background flex size-11 items-center justify-center rounded-lg border text-2xl hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Emoji сонгох"
            >
                {value || <span className="text-muted-foreground text-sm">😊</span>}
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    {/* Picker */}
                    <div className="absolute left-0 top-12 z-20 w-64 rounded-xl border bg-popover p-3 shadow-lg">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Emoji сонгох</p>
                        <div className="grid grid-cols-7 gap-1">
                            {EMOJI_LIST.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => { onChange(emoji); setOpen(false); }}
                                    className={`flex size-8 items-center justify-center rounded-md text-xl transition-colors hover:bg-muted ${
                                        value === emoji ? 'bg-red-100 ring-1 ring-red-400 dark:bg-red-950' : ''
                                    }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        <div className="mt-2 border-t pt-2">
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                placeholder="Өөр emoji бичих..."
                                maxLength={4}
                                className="border-input bg-background w-full rounded-md border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function TreatmentCategoriesIndex({ categories }: Props) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    const addForm = useForm({ name: '', icon: '' });
    const editForm = useForm({ name: '', icon: '', is_active: true as boolean });

    function startEdit(cat: TreatmentCategory) {
        setEditingId(cat.id);
        editForm.setData({ name: cat.name, icon: cat.icon ?? '', is_active: cat.is_active });
    }

    function submitAdd(e: FormEvent) {
        e.preventDefault();
        addForm.post('/admin/treatment-categories', {
            onSuccess: () => { setShowAddForm(false); addForm.reset(); },
        });
    }

    function submitEdit(e: FormEvent, id: number) {
        e.preventDefault();
        editForm.put(`/admin/treatment-categories/${id}`, {
            onSuccess: () => setEditingId(null),
        });
    }

    function deleteCategory(id: number, name: string) {
        if (confirm(`"${name}" ангилалыг устгах уу? Холбогдох эмчилгээнүүд бас устгагдана.`)) {
            router.delete(`/admin/treatment-categories/${id}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Эмчилгээний ангилал" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-muted-foreground text-sm">Эмчилгээ & Үйлчилгээ</p>
                        <h1 className="text-2xl font-bold">Ангилал удирдах</h1>
                    </div>
                    {!showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                        >
                            <Plus className="size-4" />
                            Шинэ ангилал нэмэх
                        </button>
                    )}
                </div>

                {/* Add Form */}
                {showAddForm && (
                    <form onSubmit={submitAdd} className="rounded-xl border bg-muted/30 p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold">Шинэ ангилал нэмэх</h3>
                            <button
                                type="button"
                                onClick={() => { setShowAddForm(false); addForm.reset(); }}
                                className="rounded-md p-1 hover:bg-muted"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="shrink-0">
                                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Дүрс</p>
                                <EmojiPicker
                                    value={addForm.data.icon}
                                    onChange={(v) => addForm.setData('icon', v)}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Ангилалын нэр *</p>
                                <input
                                    type="text"
                                    value={addForm.data.name}
                                    onChange={(e) => addForm.setData('name', e.target.value)}
                                    placeholder="Жишээ: Мас засал, Гажиг засал..."
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    autoFocus
                                />
                                {addForm.errors.name && (
                                    <p className="mt-1 text-xs text-red-500">{addForm.errors.name}</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button
                                type="submit"
                                disabled={addForm.processing}
                                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                <Save className="size-4" />
                                {addForm.processing ? 'Хадгалж байна...' : 'Хадгалах'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowAddForm(false); addForm.reset(); }}
                                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
                            >
                                Цуцлах
                            </button>
                        </div>
                    </form>
                )}

                {/* Category list */}
                {categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20">
                        <Tag className="size-10 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground text-sm">Ангилал байхгүй байна</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="mt-3 text-sm text-red-600 hover:underline"
                        >
                            + Шинэ ангилал нэмэх
                        </button>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ангилал</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Эмчилгээ</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Төлөв</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Үйлдэл</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {categories.map((cat) => (
                                    <tr key={cat.id} className="transition-colors hover:bg-muted/30">
                                        {editingId === cat.id ? (
                                            <td colSpan={4} className="px-4 py-3">
                                                <form onSubmit={(e) => submitEdit(e, cat.id)}>
                                                    <div className="flex items-start gap-3">
                                                        <div className="shrink-0">
                                                            <EmojiPicker
                                                                value={editForm.data.icon}
                                                                onChange={(v) => editForm.setData('icon', v)}
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <input
                                                                type="text"
                                                                value={editForm.data.name}
                                                                onChange={(e) => editForm.setData('name', e.target.value)}
                                                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <label className="flex shrink-0 items-center gap-2 pt-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={editForm.data.is_active}
                                                                onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                                                className="size-4 accent-red-600"
                                                            />
                                                            Идэвхтэй
                                                        </label>
                                                        <div className="flex shrink-0 gap-2 pt-1">
                                                            <button
                                                                type="submit"
                                                                disabled={editForm.processing}
                                                                className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                                                            >
                                                                <Save className="size-3.5" /> Хадгалах
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingId(null)}
                                                                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                                                            >
                                                                Цуцлах
                                                            </button>
                                                        </div>
                                                    </div>
                                                </form>
                                            </td>
                                        ) : (
                                            <>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-xl">
                                                            {cat.icon || '📁'}
                                                        </span>
                                                        <span className="font-medium">{cat.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-muted-foreground">
                                                    {cat.treatments_count}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                            cat.is_active
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                                        }`}
                                                    >
                                                        {cat.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => startEdit(cat)}
                                                            className="rounded-lg border p-1.5 hover:bg-muted"
                                                        >
                                                            <Edit2 className="size-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteCategory(cat.id, cat.name)}
                                                            className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
