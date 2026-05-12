import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

interface SignaturePadProps {
    height?: number;
    penColor?: string;
    onBegin?: () => void;
}

export interface SignaturePadRef {
    toDataURL: () => string;
    isEmpty:   () => boolean;
    clear:     () => void;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(function SignaturePad(
    { height = 160, penColor = '#1e3a5f', onBegin },
    ref
) {
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const isDrawing    = useRef(false);
    const isEmpty      = useRef(true);
    const lastX        = useRef(0);
    const lastY        = useRef(0);
    const onBeginRef   = useRef(onBegin);
    onBeginRef.current = onBegin;
    const colorRef     = useRef(penColor);
    colorRef.current   = penColor;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // ResizeObserver fires as part of the browser's natural layout cycle —
        // contentRect.width is always the real rendered width, even when
        // clientWidth / getBoundingClientRect() return 0 (StrictMode second run).
        const ro = new ResizeObserver(entries => {
            const w = Math.round(entries[0]?.contentRect.width ?? 0);
            if (w > 0) {
                if (canvas.width !== w || canvas.height !== height) {
                    canvas.width  = w;
                    canvas.height = height;
                    isEmpty.current = true;
                }
                ro.disconnect();
            }
        });
        ro.observe(canvas);

        // Scale CSS coords → buffer coords (safety net when sizes differ).
        function pos(clientX: number, clientY: number) {
            const r      = canvas!.getBoundingClientRect();
            const scaleX = r.width  > 0 ? canvas!.width  / r.width  : 1;
            const scaleY = r.height > 0 ? canvas!.height / r.height : 1;
            return {
                x: (clientX - r.left) * scaleX,
                y: (clientY - r.top)  * scaleY,
            };
        }

        function dot(x: number, y: number) {
            const ctx = canvas!.getContext('2d')!;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = colorRef.current;
            ctx.fill();
        }

        function line(x: number, y: number) {
            const ctx = canvas!.getContext('2d')!;
            ctx.beginPath();
            ctx.moveTo(lastX.current, lastY.current);
            ctx.lineTo(x, y);
            ctx.strokeStyle = colorRef.current;
            ctx.lineWidth   = 2.5;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            ctx.stroke();
            lastX.current = x;
            lastY.current = y;
        }

        function begin(x: number, y: number) {
            isDrawing.current = true;
            lastX.current = x;
            lastY.current = y;
            dot(x, y);
            if (isEmpty.current) {
                isEmpty.current = false;
                onBeginRef.current?.();
            }
        }

        function md(e: MouseEvent) {
            e.preventDefault();
            const { x, y } = pos(e.clientX, e.clientY);
            begin(x, y);
        }
        function mm(e: MouseEvent) {
            if (!isDrawing.current) return;
            const { x, y } = pos(e.clientX, e.clientY);
            line(x, y);
        }
        function mu() { isDrawing.current = false; }

        function ts(e: TouchEvent) {
            if (e.touches.length !== 1) return;
            e.preventDefault();
            const t = e.touches[0];
            const { x, y } = pos(t.clientX, t.clientY);
            begin(x, y);
        }
        function tm(e: TouchEvent) {
            if (!isDrawing.current || e.touches.length !== 1) return;
            e.preventDefault();
            const t = e.touches[0];
            const { x, y } = pos(t.clientX, t.clientY);
            line(x, y);
        }
        function te() { isDrawing.current = false; }

        canvas.addEventListener('mousedown',   md, { passive: false });
        window.addEventListener('mousemove',   mm);
        window.addEventListener('mouseup',     mu);
        canvas.addEventListener('touchstart',  ts, { passive: false });
        canvas.addEventListener('touchmove',   tm, { passive: false });
        canvas.addEventListener('touchend',    te);
        canvas.addEventListener('touchcancel', te);

        return () => {
            ro.disconnect();
            canvas.removeEventListener('mousedown',   md);
            window.removeEventListener('mousemove',   mm);
            window.removeEventListener('mouseup',     mu);
            canvas.removeEventListener('touchstart',  ts);
            canvas.removeEventListener('touchmove',   tm);
            canvas.removeEventListener('touchend',    te);
            canvas.removeEventListener('touchcancel', te);
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
                style={{ display: 'block', width: '100%', height: `${height}px`, cursor: 'crosshair' }}
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
