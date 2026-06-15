import { Head, useForm } from '@inertiajs/react';
import { Check, Loader2 } from 'lucide-react';

type FieldType = 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select';
interface Field { key: string; label: string; type: FieldType; required: boolean; options?: string[]; }
interface Props {
    form: { id: number; name: string; description: string | null; fields: Field[] };
    ctx: { c?: string | null; conv?: string | null; t?: string | null };
    submitted: boolean;
    success: string | null;
}

export default function PublicSocialForm({ form, ctx, submitted, success }: Props) {
    const initial: Record<string, string> = {};
    form.fields.forEach(f => { initial[f.key] = ''; });
    const { data, setData, post, processing, errors } = useForm<{ data: Record<string, string>; c?: string | null; conv?: string | null; t?: string | null }>({
        data: initial, c: ctx.c, conv: ctx.conv, t: ctx.t,
    });
    const set = (k: string, v: string) => setData('data', { ...data.data, [k]: v });

    function submit(e: React.FormEvent) { e.preventDefault(); post(`/f/${form.id}/submit`); }

    const fieldCls = 'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none transition placeholder:text-zinc-300 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/[0.06]';

    return (
        <div className="font-warm relative flex min-h-svh items-center justify-center overflow-hidden bg-[#f4f4f5] px-4 py-8 sm:py-12">
            <Head title={form.name} />

            {/* Зөөлөн нейтрал ambient гэрэлтэлт */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[560px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-gradient-to-b from-zinc-300/50 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-1/4 h-[300px] w-[300px] translate-y-1/3 rounded-full bg-gradient-to-t from-amber-100/40 to-transparent blur-3xl" />

            <div className="relative w-full max-w-[400px] animate-in fade-in-0 slide-in-from-bottom-3 duration-700">
                <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_24px_60px_-22px_rgba(20,20,30,0.32)]">
                    {/* Дээд графит accent зураас */}
                    <div className="h-[3px] w-full bg-gradient-to-r from-zinc-300 via-zinc-900 to-zinc-300" />

                    {/* Header */}
                    <div className="relative overflow-hidden border-b border-zinc-100 bg-gradient-to-b from-zinc-50 to-white px-7 pb-6 pt-7">
                        <div className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-zinc-200/40 blur-2xl" />
                        <div className="relative">
                            <h1 className="text-[19px] font-semibold tracking-tight text-zinc-900">{form.name}</h1>
                            {form.description && <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{form.description}</p>}
                        </div>
                    </div>

                    {submitted ? (
                        <div className="flex flex-col items-center gap-4 px-7 py-16 text-center">
                            <div className="relative animate-in zoom-in-50 duration-500">
                                <span className="absolute inset-0 animate-ping rounded-full bg-zinc-400/20 [animation-iteration-count:2]" />
                                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 shadow-lg shadow-zinc-900/25 ring-1 ring-white/10">
                                    <Check className="h-8 w-8 text-white" strokeWidth={2.5} />
                                </div>
                            </div>
                            <p className="max-w-[260px] animate-in fade-in-0 slide-in-from-bottom-2 text-[15px] font-medium leading-relaxed text-zinc-900 delay-150 fill-mode-both">{success}</p>
                            <p className="animate-in fade-in-0 text-[13px] text-zinc-400 delay-300 fill-mode-both">Энэ цонхыг хааж болно.</p>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="space-y-5 px-7 py-7">
                            {form.fields.map((f, i) => {
                                const err = errors[`data.${f.key}` as keyof typeof errors];
                                return (
                                    <div key={f.key} className="animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-both" style={{ animationDelay: `${150 + i * 80}ms`, animationDuration: '500ms' }}>
                                        <label className="mb-2 block text-[13px] font-medium text-zinc-700">
                                            {f.label}{f.required && <span className="ml-0.5 text-amber-500">*</span>}
                                        </label>
                                        {f.type === 'textarea' ? (
                                            <textarea value={data.data[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} required={f.required} rows={3} className={`${fieldCls} resize-none`} placeholder="…" />
                                        ) : f.type === 'select' ? (
                                            <select value={data.data[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} required={f.required} className={`${fieldCls} appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-9`} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")" }}>
                                                <option value="">Сонгох</option>
                                                {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : (
                                            <input type={f.type === 'phone' ? 'tel' : f.type} value={data.data[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} required={f.required} className={fieldCls} placeholder={f.type === 'email' ? 'name@example.com' : f.type === 'phone' ? '8800 0000' : '…'} />
                                        )}
                                        {err && <p className="mt-1.5 text-[12px] text-red-500">Энэ талбарыг зөв бөглөнө үү</p>}
                                    </div>
                                );
                            })}

                            <button type="submit" disabled={processing} className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 px-4 py-3 text-[14px] font-semibold text-white shadow-lg shadow-zinc-900/25 ring-1 ring-zinc-900 transition hover:shadow-xl hover:shadow-zinc-900/35 active:scale-[.99] disabled:opacity-50">
                                <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.14] to-transparent" />
                                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                                <span className="relative flex items-center gap-2">{processing && <Loader2 className="h-4 w-4 animate-spin" />} Илгээх</span>
                            </button>
                        </form>
                    )}
                </div>

                <p className="mt-5 text-center text-[11px] text-zinc-400">Таны мэдээлэл найдвартай хадгалагдана</p>
            </div>
        </div>
    );
}
