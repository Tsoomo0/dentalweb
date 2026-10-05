import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

interface SignaturePadProps {
    height?: number;
    penColor?: string;
    onBegin?: () => void;
    /** Нэг зурлага дуусах бүрд дуудагдана — утгыг эцэг рүү дамжуулахад ашиглана. */
    onEnd?: () => void;
}

export interface SignaturePadRef {
    toDataURL: () => string;
    isEmpty:   () => boolean;
    clear:     () => void;
}

/** Зураасны үндсэн зузаан (CSS пиксель). */
const BASE_WIDTH = 2.5;

/**
 * Pointer Events — хулгана, хуруу, stylus, Wacom самбар бүгд нэг кодоор.
 * Үзэг (pointerType === 'pen') даралтаа дамжуулбал зураас нимгэн/зузаан
 * болж жинхэнэ гарын үсэг шиг харагдана; бусад үед жигд зузаантай.
 */
const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(function SignaturePad(
    { height = 160, penColor = '#1e3a5f', onBegin, onEnd },
    ref
) {
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const isEmpty      = useRef(true);
    const onBeginRef   = useRef(onBegin);
    onBeginRef.current = onBegin;
    const onEndRef     = useRef(onEnd);
    onEndRef.current   = onEnd;
    const colorRef     = useRef(penColor);
    colorRef.current   = penColor;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Утасны тод дэлгэцэнд бүдгэрэхгүй — гэхдээ зургийн хэмжээ хэт томрохгүй байхаар 2-оор хязгаарлана
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        // ResizeObserver fires as part of the browser's natural layout cycle —
        // contentRect.width is always the real rendered width, even when
        // clientWidth / getBoundingClientRect() return 0 (StrictMode second run).
        const ro = new ResizeObserver(entries => {
            const w = Math.round((entries[0]?.contentRect.width ?? 0) * dpr);
            const h = Math.round(height * dpr);
            if (w > 0) {
                if (canvas.width !== w || canvas.height !== h) {
                    canvas.width  = w;
                    canvas.height = h;
                    isEmpty.current = true;
                }
                ro.disconnect();
            }
        });
        ro.observe(canvas);

        let drawing: { id: number; x: number; y: number; w: number } | null = null;

        // CSS координатыг canvas-ын буферийн координат руу
        function pos(e: PointerEvent) {
            const r      = canvas!.getBoundingClientRect();
            const scaleX = r.width  > 0 ? canvas!.width  / r.width  : 1;
            const scaleY = r.height > 0 ? canvas!.height / r.height : 1;
            return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
        }

        function widthFor(e: PointerEvent) {
            const pressure = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;
            return BASE_WIDTH * dpr * (0.35 + pressure * 1.3);
        }

        function down(e: PointerEvent) {
            if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
            e.preventDefault();
            canvas!.setPointerCapture(e.pointerId);
            const { x, y } = pos(e);
            const w = widthFor(e);
            drawing = { id: e.pointerId, x, y, w };

            const ctx = canvas!.getContext('2d')!;
            ctx.beginPath();
            ctx.arc(x, y, w / 2, 0, Math.PI * 2);
            ctx.fillStyle = colorRef.current;
            ctx.fill();

            if (isEmpty.current) {
                isEmpty.current = false;
                onBeginRef.current?.();
            }
        }

        function move(e: PointerEvent) {
            if (!drawing || e.pointerId !== drawing.id) return;
            e.preventDefault();
            const ctx = canvas!.getContext('2d')!;
            // Хурдан хөдлөхөд алгассан цэгүүдийг ч зурна (дэмждэг хөтчид)
            const points = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
            for (const p of points.length ? points : [e]) {
                const { x, y } = pos(p);
                // Зузааныг огцом биш зөөлөн өөрчилнө
                const w: number = drawing.w + (widthFor(p) - drawing.w) * 0.35;
                ctx.beginPath();
                ctx.moveTo(drawing.x, drawing.y);
                ctx.lineTo(x, y);
                ctx.strokeStyle = colorRef.current;
                ctx.lineWidth   = w;
                ctx.lineCap     = 'round';
                ctx.lineJoin    = 'round';
                ctx.stroke();
                drawing = { id: drawing.id, x, y, w };
            }
        }

        function up(e: PointerEvent) {
            if (!drawing || e.pointerId !== drawing.id) return;
            drawing = null;
            onEndRef.current?.();
        }

        canvas.addEventListener('pointerdown',   down, { passive: false });
        canvas.addEventListener('pointermove',   move, { passive: false });
        canvas.addEventListener('pointerup',     up);
        canvas.addEventListener('pointercancel', up);

        return () => {
            ro.disconnect();
            canvas.removeEventListener('pointerdown',   down);
            canvas.removeEventListener('pointermove',   move);
            canvas.removeEventListener('pointerup',     up);
            canvas.removeEventListener('pointercancel', up);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
        toDataURL: () => canvasRef.current?.toDataURL('image/png') ?? '',
        isEmpty: () => {
            const c = canvasRef.current;
            if (!c || c.width === 0 || c.height === 0) return true;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            if (!ctx) return true;
            const { data } = ctx.getImageData(0, 0, c.width, c.height);
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] > 0) return false;
            }
            return true;
        },
        clear: () => {
            const c = canvasRef.current;
            if (!c) return;
            c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
            isEmpty.current = true;
        },
    }), []);

    return (
        <div style={{ position: 'relative', background: 'white', overflow: 'hidden', height, touchAction: 'none', userSelect: 'none' }}>
            <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', height: `${height}px`, cursor: 'crosshair', touchAction: 'none' }}
            />
            <span style={{
                pointerEvents: 'none', position: 'absolute', bottom: 4, right: 8,
                fontSize: 12, color: '#d1d5db', userSelect: 'none',
            }}>
                гарын үсэг зурна уу
            </span>
        </div>
    );
});

export default SignaturePad;
