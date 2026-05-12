import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    BookOpen, Edit2, Plus, Tag, Trash2, X, BookMarked, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Category { id: number; name: string; color: string }
interface RentedBy  { id: number; name: string }
interface Book {
    id: number;
    title: string;
    author: string | null;
    isbn: string | null;
    cover_url: string | null;
    total_copies: number;
    available_copies: number;
    description: string | null;
    category_id: number | null;
    category_name: string | null;
    category_color: string;
    rented_by: RentedBy[];
}
interface Props { books: Book[]; categories: Category[] }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/employees' },
    { title: 'Номын сан', href: '/hr/books' },
];

const COLOR_MAP: Record<string, string> = {
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    red:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    teal:   'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    gray:   'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
};

const AVAIL_COLORS = [
    { label: 'Цэнхэр',  value: 'blue' },
    { label: 'Ногоон',  value: 'green' },
    { label: 'Ягаан',   value: 'purple' },
    { label: 'Улаан',   value: 'red' },
    { label: 'Улбар',   value: 'orange' },
    { label: 'Бирюза',  value: 'teal' },
    { label: 'Шар',     value: 'yellow' },
    { label: 'Саарал',  value: 'gray' },
];

function CategoryBadge({ name, color }: { name: string | null; color: string }) {
    if (!name) return <span className="text-muted-foreground text-xs">—</span>;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_MAP[color] ?? COLOR_MAP.blue}`}>
            <Tag className="size-3" /> {name}
        </span>
    );
}

function BookCover({ url, title }: { url: string | null; title: string }) {
    const ini = title.slice(0, 2).toUpperCase();
    return url
        ? <img src={url} alt={title} className="size-12 rounded-lg object-cover shrink-0 shadow-sm border border-border/30" />
        : <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-600 text-sm font-bold border border-border/30">
            {ini}
          </div>;
}

export default function HrBooks({ books, categories }: Props) {
    const [showBookForm, setShowBookForm] = useState(false);
    const [editBook, setEditBook] = useState<Book | null>(null);
    const [deleteBookId, setDeleteBookId] = useState<number | null>(null);
    const [showCatPanel, setShowCatPanel] = useState(false);
    const [editCat, setEditCat] = useState<Category | null>(null);
    const [deleteCatId, setDeleteCatId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const coverRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const t = setInterval(() => router.reload({ only: ['books', 'categories'] }), 15_000);
        return () => clearInterval(t);
    }, []);

    // ── Book form ────────────────────────────────────────────────────────────
    const bookForm = useForm({
        title: '',
        author: '',
        isbn: '',
        book_category_id: '' as string | number,
        total_copies: 1,
        description: '',
        cover: null as File | null,
    });

    function openAddBook() {
        bookForm.reset();
        bookForm.setData({
            title: '', author: '', isbn: '',
            book_category_id: '',
            total_copies: 1,
            description: '',
            cover: null,
        });
        setEditBook(null);
        setShowBookForm(true);
    }

    function openEditBook(b: Book) {
        bookForm.setData({
            title: b.title,
            author: b.author ?? '',
            isbn: b.isbn ?? '',
            book_category_id: b.category_id ?? '',
            total_copies: b.total_copies,
            description: b.description ?? '',
            cover: null,
        });
        setEditBook(b);
        setShowBookForm(true);
    }

    function submitBook(e: React.FormEvent) {
        e.preventDefault();
        if (editBook) {
            bookForm.transform(data => ({ ...data, _method: 'PUT' }));
            (bookForm as any).post(`/hr/books/${editBook.id}`, {
                forceFormData: true,
                onSuccess: () => { setShowBookForm(false); setEditBook(null); },
            });
        } else {
            bookForm.post('/hr/books', {
                forceFormData: true,
                onSuccess: () => { setShowBookForm(false); },
            });
        }
    }

    function confirmDeleteBook(id: number) { setDeleteBookId(id); }
    function doDeleteBook() {
        if (!deleteBookId) return;
        router.delete(`/hr/books/${deleteBookId}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteBookId(null),
        });
    }

    // ── Category form ────────────────────────────────────────────────────────
    const catForm = useForm({ name: '', color: 'blue' });

    function openAddCat() {
        catForm.reset();
        catForm.setData({ name: '', color: 'blue' });
        setEditCat(null);
    }

    function openEditCat(c: Category) {
        catForm.setData({ name: c.name, color: c.color });
        setEditCat(c);
    }

    function submitCat(e: React.FormEvent) {
        e.preventDefault();
        if (editCat) {
            catForm.put(`/hr/book-categories/${editCat.id}`, {
                preserveScroll: true,
                onSuccess: () => { setEditCat(null); catForm.reset(); catForm.setData({ name: '', color: 'blue' }); },
            });
        } else {
            catForm.post('/hr/book-categories', {
                preserveScroll: true,
                onSuccess: () => { catForm.reset(); catForm.setData({ name: '', color: 'blue' }); },
            });
        }
    }

    function doDeleteCat() {
        if (!deleteCatId) return;
        router.delete(`/hr/book-categories/${deleteCatId}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteCatId(null),
        });
    }

    const inp = 'w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-400 transition-shadow';

    const filtered = search.trim()
        ? books.filter(b =>
            b.title.toLowerCase().includes(search.toLowerCase()) ||
            (b.author ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (b.isbn ?? '').toLowerCase().includes(search.toLowerCase())
          )
        : books;

    const pending = books.reduce((acc, b) => acc, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Номын сан" />

            <div className="flex flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Номын сан</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {books.length} ном · {books.reduce((s, b) => s + b.total_copies, 0)} нийт хувь
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowCatPanel(v => !v)}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                showCatPanel
                                    ? 'bg-violet-600 text-white border-violet-600'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}>
                            <Tag className="size-3.5" />
                            Ангилал
                            {showCatPanel ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        </button>
                        <a href="/hr/book-rentals"
                            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                            <BookMarked className="size-3.5" /> Түрээсийн хүсэлт
                        </a>
                        <button
                            onClick={openAddBook}
                            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors">
                            <Plus className="size-3.5" /> Ном нэмэх
                        </button>
                    </div>
                </div>

                {/* Category panel */}
                {showCatPanel && (
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ангилал удирдах</p>
                        </div>
                        <div className="p-5">
                            <form onSubmit={submitCat} className="flex items-end gap-3 mb-4">
                                <div className="flex-1">
                                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Ангиллын нэр *</label>
                                    <input
                                        value={catForm.data.name}
                                        onChange={e => catForm.setData('name', e.target.value)}
                                        placeholder="Жишээ: Мэргэжлийн ном..."
                                        className={inp} />
                                    {catForm.errors.name && <p className="mt-1 text-xs text-red-500">{catForm.errors.name}</p>}
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Өнгө</label>
                                    <select value={catForm.data.color} onChange={e => catForm.setData('color', e.target.value)} className={inp}>
                                        {AVAIL_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <button type="submit" disabled={catForm.processing}
                                    className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors shrink-0">
                                    {editCat ? 'Хадгалах' : <><Plus className="size-3.5" /> Нэмэх</>}
                                </button>
                                {editCat && (
                                    <button type="button"
                                        onClick={() => { setEditCat(null); catForm.reset(); catForm.setData({ name: '', color: 'blue' }); }}
                                        className="rounded-xl border px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors">
                                        <X className="size-4" />
                                    </button>
                                )}
                            </form>

                            {categories.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">Ангилал байхгүй байна</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(c => (
                                        <div key={c.id} className="flex items-center gap-2 rounded-full border bg-muted/30 pl-3 pr-1.5 py-1">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_MAP[c.color] ?? COLOR_MAP.blue}`}>
                                                {c.name}
                                            </span>
                                            <button onClick={() => openEditCat(c)}
                                                className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                                <Edit2 className="size-3" />
                                            </button>
                                            <button onClick={() => setDeleteCatId(c.id)}
                                                className="rounded-full p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                                                <Trash2 className="size-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="flex items-center gap-3">
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Номын нэр, зохиолч, ISBN-р хайх..."
                        className="flex-1 rounded-xl border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    {search && (
                        <button onClick={() => setSearch('')}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors">
                            <X className="size-4" />
                        </button>
                    )}
                </div>

                {/* Books table */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="py-20 text-center">
                            <BookOpen className="size-10 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                {search ? 'Хайлтанд тохирох ном олдсонгүй' : 'Ном байхгүй байна'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="border-b bg-muted/40">
                                <tr className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <th className="px-5 py-3 text-left">НОМ</th>
                                    <th className="px-4 py-3 text-left">АНГИЛАЛ</th>
                                    <th className="px-4 py-3 text-center">НИЙТ</th>
                                    <th className="px-4 py-3 text-center">БОЛОМЖИТ</th>
                                    <th className="px-4 py-3 text-left">ХЭНД БАЙГАА</th>
                                    <th className="px-4 py-3 text-right">ҮЙЛДЭЛ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filtered.map(b => (
                                    <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                                        {/* Book info */}
                                        <td className="px-5 py-3">
                                            <div className="flex items-start gap-3">
                                                <BookCover url={b.cover_url} title={b.title} />
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-foreground leading-snug">{b.title}</p>
                                                    {b.author && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {b.author}{b.isbn ? ` • ISBN: ${b.isbn}` : ''}
                                                        </p>
                                                    )}
                                                    <span className="mt-1 inline-block text-[10px] font-medium text-muted-foreground/60 bg-muted/50 rounded px-1.5 py-0.5">
                                                        Эх хувь
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Category */}
                                        <td className="px-4 py-3">
                                            <CategoryBadge name={b.category_name} color={b.category_color} />
                                        </td>

                                        {/* Total */}
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-semibold text-foreground">{b.total_copies}</span>
                                        </td>

                                        {/* Available */}
                                        <td className="px-4 py-3 text-center">
                                            {b.available_copies > 0 ? (
                                                <span className="inline-flex items-center justify-center size-7 rounded-full bg-teal-500 text-white text-xs font-bold">
                                                    {b.available_copies}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center justify-center size-7 rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold">
                                                    0
                                                </span>
                                            )}
                                        </td>

                                        {/* Who has it */}
                                        <td className="px-4 py-3">
                                            {b.rented_by.length === 0 ? (
                                                <span className="text-muted-foreground">—</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {b.rented_by.map(r => (
                                                        <span key={r.id} className="rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 px-2.5 py-0.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
                                                            {r.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={() => openEditBook(b)}
                                                    className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                                                    <Edit2 className="size-3" /> Засах
                                                </button>
                                                <button onClick={() => confirmDeleteBook(b.id)}
                                                    className="flex items-center gap-1 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors">
                                                    <Trash2 className="size-3" /> Устгах
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <ToastContainer />

            {/* Book form modal */}
            {showBookForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl border bg-card shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h3 className="font-bold text-foreground">
                                {editBook ? 'Ном засах' : 'Шинэ ном нэмэх'}
                            </h3>
                            <button onClick={() => { setShowBookForm(false); setEditBook(null); bookForm.reset(); }}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>

                        <form onSubmit={submitBook} className="p-6 space-y-4">
                            {/* Cover upload */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Зургийн хавтас</label>
                                <div className="flex items-center gap-3">
                                    {(bookForm.data.cover
                                        ? URL.createObjectURL(bookForm.data.cover)
                                        : editBook?.cover_url) && (
                                        <img
                                            src={bookForm.data.cover
                                                ? URL.createObjectURL(bookForm.data.cover)
                                                : editBook!.cover_url!}
                                            alt="cover"
                                            className="size-16 rounded-lg object-cover border border-border/40" />
                                    )}
                                    <input
                                        ref={coverRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => bookForm.setData('cover', e.target.files?.[0] ?? null)} />
                                    <button type="button"
                                        onClick={() => coverRef.current?.click()}
                                        className="flex-1 rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground hover:bg-muted text-center transition-colors">
                                        {bookForm.data.cover ? bookForm.data.cover.name : 'Зураг сонгох (заавал биш)'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Номын нэр *</label>
                                    <input
                                        value={bookForm.data.title}
                                        onChange={e => bookForm.setData('title', e.target.value)}
                                        placeholder="Номын гарчиг..."
                                        className={inp} />
                                    {bookForm.errors.title && <p className="mt-1 text-xs text-red-500">{bookForm.errors.title}</p>}
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Зохиолч</label>
                                    <input
                                        value={bookForm.data.author}
                                        onChange={e => bookForm.setData('author', e.target.value)}
                                        placeholder="Зохиолчийн нэр..."
                                        className={inp} />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">ISBN</label>
                                    <input
                                        value={bookForm.data.isbn}
                                        onChange={e => bookForm.setData('isbn', e.target.value)}
                                        placeholder="ISBN код..."
                                        className={inp} />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Ангилал</label>
                                    <select
                                        value={bookForm.data.book_category_id}
                                        onChange={e => bookForm.setData('book_category_id', e.target.value)}
                                        className={inp}>
                                        <option value="">Ангилалгүй</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Нийт хувь *</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={999}
                                        value={bookForm.data.total_copies}
                                        onChange={e => bookForm.setData('total_copies', parseInt(e.target.value) || 1)}
                                        className={inp} />
                                    {bookForm.errors.total_copies && <p className="mt-1 text-xs text-red-500">{bookForm.errors.total_copies}</p>}
                                </div>
                                <div className="col-span-2">
                                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Тайлбар</label>
                                    <textarea
                                        value={bookForm.data.description}
                                        onChange={e => bookForm.setData('description', e.target.value)}
                                        rows={2}
                                        placeholder="Номын товч тайлбар..."
                                        className={inp + ' resize-none'} />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button type="submit"
                                    disabled={bookForm.processing}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                                    {bookForm.processing
                                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        : <BookOpen className="size-4" />}
                                    {editBook ? 'Хадгалах' : 'Нэмэх'}
                                </button>
                                <button type="button"
                                    onClick={() => { setShowBookForm(false); setEditBook(null); bookForm.reset(); }}
                                    className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                                    Болих
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete book confirm */}
            {deleteBookId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border bg-card shadow-2xl p-6">
                        <h3 className="font-bold text-foreground mb-2">Ном устгах</h3>
                        <p className="text-sm text-muted-foreground mb-5">
                            Энэ номыг устгахдаа итгэлтэй байна уу? Устгасны дараа сэргээх боломжгүй.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={doDeleteBook}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors">
                                <Trash2 className="size-4" /> Устгах
                            </button>
                            <button onClick={() => setDeleteBookId(null)}
                                className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                                Болих
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete category confirm */}
            {deleteCatId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border bg-card shadow-2xl p-6">
                        <h3 className="font-bold text-foreground mb-2">Ангилал устгах</h3>
                        <p className="text-sm text-muted-foreground mb-5">
                            Энэ ангилалд ном байхгүй тохиолдолд л устгана.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={doDeleteCat}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors">
                                <Trash2 className="size-4" /> Устгах
                            </button>
                            <button onClick={() => setDeleteCatId(null)}
                                className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                                Болих
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
