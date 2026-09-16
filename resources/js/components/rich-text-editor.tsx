import { useEffect, useImperativeHandle, useRef, forwardRef, useState } from 'react';
import {
    Bold, Italic, Underline, List, ListOrdered, Heading2, Heading3,
    AlignLeft, AlignCenter, AlignJustify, Table as TableIcon, Minus, Undo2, Redo2, Braces,
} from 'lucide-react';

export interface RichTextEditorRef {
    getHTML: () => string;
    setHTML: (html: string) => void;
    focus: () => void;
}

interface CatalogItem { key: string; label: string; }
interface CatalogGroup { group: string; items: CatalogItem[]; }

interface Props {
    /** Анхны агуулга — зөвхөн эхний удаад тавигдана (contenteditable-ыг дахин зурахгүй). */
    value: string;
    onChange: (html: string) => void;
    /** «Талбар оруулах» цэсэнд харагдах {{placeholder}}-ууд. */
    catalog?: CatalogGroup[];
    minHeight?: number;
    placeholder?: string;
}

/**
 * Гэрээ, ажлын байрны тодорхойлолт бичих энгийн WYSIWYG засварлагч.
 * Гадны сан ашиглалгүй contenteditable дээр суурилсан — гэрээний текст
 * голдуу гарчиг, догол мөр, жагсаалт, хүснэгтээс бүрддэг тул хангалттай.
 */
const RichTextEditor = forwardRef<RichTextEditorRef, Props>(function RichTextEditor(
    { value, onChange, catalog = [], minHeight = 420, placeholder = 'Гэрээний агуулгаа энд бичнэ үү…' },
    ref
) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showVars, setShowVars] = useState(false);
    const savedRange = useRef<Range | null>(null);

    // Анхны агуулгыг нэг л удаа тавина — цаашид DOM өөрөө эх сурвалж болно,
    // эс тэгвэл бичиж байх үед курсор эхэнд үсэрнэ.
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
        getHTML: () => editorRef.current?.innerHTML ?? '',
        setHTML: (html: string) => {
            if (editorRef.current) {
                editorRef.current.innerHTML = html;
                onChange(html);
            }
        },
        focus: () => editorRef.current?.focus(),
    }), [onChange]);

    function emit() {
        onChange(editorRef.current?.innerHTML ?? '');
    }

    function rememberSelection() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
            savedRange.current = sel.getRangeAt(0).cloneRange();
        }
    }

    function exec(command: string, arg?: string) {
        editorRef.current?.focus();
        document.execCommand(command, false, arg);
        emit();
    }

    /** Курсорын байрлалд {{талбар}} оруулна. */
    function insertVariable(key: string) {
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();

        const sel = window.getSelection();
        if (savedRange.current && sel) {
            sel.removeAllRanges();
            sel.addRange(savedRange.current);
        }
        document.execCommand('insertText', false, `{{${key}}}`);
        setShowVars(false);
        emit();
    }

    function insertTable() {
        const rows = 3;
        const cols = 2;
        let html = '<table style="width:100%;border-collapse:collapse"><tbody>';
        for (let r = 0; r < rows; r++) {
            html += '<tr>';
            for (let c = 0; c < cols; c++) {
                html += '<td style="border:1px solid #cbd5e1;padding:6px 8px">&nbsp;</td>';
            }
            html += '</tr>';
        }
        html += '</tbody></table><p><br /></p>';
        exec('insertHTML', html);
    }

    /** Форматгүй буулгалт — Word-оос хуулахад орж ирдэг хог тагийг таслана. */
    function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        const html = text
            .split(/\n{2,}/)
            .map(block => `<p>${block.replace(/\n/g, '<br />').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))}</p>`)
            .join('');
        document.execCommand('insertHTML', false, html);
        emit();
    }

    const BTN = 'flex items-center justify-center size-8 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors';

    return (
        <div className="rounded-xl border border-input bg-background overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-gray-50 dark:bg-zinc-800/60 px-2 py-1.5">
                <button type="button" title="Тод" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')}><Bold className="size-4" /></button>
                <button type="button" title="Налуу" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('italic')}><Italic className="size-4" /></button>
                <button type="button" title="Доогуур зураас" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('underline')}><Underline className="size-4" /></button>

                <span className="mx-1 h-5 w-px bg-gray-300 dark:bg-zinc-600" />

                <button type="button" title="Гарчиг" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('formatBlock', 'h2')}><Heading2 className="size-4" /></button>
                <button type="button" title="Дэд гарчиг" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('formatBlock', 'h3')}><Heading3 className="size-4" /></button>
                <button type="button" title="Энгийн догол" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('formatBlock', 'p')}><span className="text-xs font-bold">P</span></button>

                <span className="mx-1 h-5 w-px bg-gray-300 dark:bg-zinc-600" />

                <button type="button" title="Цэгтэй жагсаалт" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('insertUnorderedList')}><List className="size-4" /></button>
                <button type="button" title="Дугаартай жагсаалт" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('insertOrderedList')}><ListOrdered className="size-4" /></button>

                <span className="mx-1 h-5 w-px bg-gray-300 dark:bg-zinc-600" />

                <button type="button" title="Зүүн" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('justifyLeft')}><AlignLeft className="size-4" /></button>
                <button type="button" title="Төв" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('justifyCenter')}><AlignCenter className="size-4" /></button>
                <button type="button" title="Тэгшлэх" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('justifyFull')}><AlignJustify className="size-4" /></button>

                <span className="mx-1 h-5 w-px bg-gray-300 dark:bg-zinc-600" />

                <button type="button" title="Хүснэгт" className={BTN} onMouseDown={e => e.preventDefault()} onClick={insertTable}><TableIcon className="size-4" /></button>
                <button type="button" title="Зураас" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('insertHorizontalRule')}><Minus className="size-4" /></button>
                <button type="button" title="Буцаах" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('undo')}><Undo2 className="size-4" /></button>
                <button type="button" title="Дахин" className={BTN} onMouseDown={e => e.preventDefault()} onClick={() => exec('redo')}><Redo2 className="size-4" /></button>

                {catalog.length > 0 && (
                    <div className="relative ml-auto">
                        <button
                            type="button"
                            onMouseDown={e => { e.preventDefault(); rememberSelection(); }}
                            onClick={() => setShowVars(v => !v)}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">
                            <Braces className="size-3.5" /> Талбар оруулах
                        </button>
                        {showVars && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowVars(false)} />
                                <div className="absolute right-0 z-50 mt-1 max-h-80 w-72 overflow-y-auto rounded-xl border border-input bg-background shadow-xl">
                                    {catalog.map(group => (
                                        <div key={group.group}>
                                            <p className="sticky top-0 bg-gray-50 dark:bg-zinc-800 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{group.group}</p>
                                            {group.items.map(item => (
                                                <button
                                                    key={item.key}
                                                    type="button"
                                                    onMouseDown={e => e.preventDefault()}
                                                    onClick={() => insertVariable(item.key)}
                                                    className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                                                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                                                    <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">{`{{${item.key}}}`}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Editing surface */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={emit}
                onBlur={() => { rememberSelection(); emit(); }}
                onKeyUp={rememberSelection}
                onMouseUp={rememberSelection}
                onPaste={handlePaste}
                data-placeholder={placeholder}
                className="hr-rte prose-none w-full overflow-y-auto px-4 py-3 text-sm leading-relaxed text-foreground focus:outline-none"
                style={{ minHeight, maxHeight: 620 }}
            />

            <style>{`
                .hr-rte:empty:before { content: attr(data-placeholder); color: #9ca3af; }
                .hr-rte h1 { font-size: 1.25rem; font-weight: 700; margin: 0.9rem 0 0.4rem; }
                .hr-rte h2 { font-size: 1.05rem; font-weight: 700; margin: 0.9rem 0 0.4rem; }
                .hr-rte h3 { font-size: 0.95rem; font-weight: 700; margin: 0.8rem 0 0.35rem; }
                .hr-rte p  { margin: 0 0 0.45rem; }
                .hr-rte ul { list-style: disc;    margin: 0 0 0.5rem 1.35rem; }
                .hr-rte ol { list-style: decimal; margin: 0 0 0.5rem 1.35rem; }
                .hr-rte li { margin-bottom: 0.2rem; }
                .hr-rte table { width: 100%; border-collapse: collapse; margin-bottom: 0.6rem; }
                .hr-rte td, .hr-rte th { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
                .hr-rte th { background: #f1f5f9; font-weight: 600; }
                .hr-rte hr { border: none; border-top: 1px solid #cbd5e1; margin: 0.8rem 0; }
                .dark .hr-rte td, .dark .hr-rte th { border-color: #3f3f46; }
                .dark .hr-rte th { background: #27272a; }
            `}</style>
        </div>
    );
});

export default RichTextEditor;
