/**
 * Гарын үсэг, тамганы зургийг баримтад суулгахад бэлэн PNG болгоно.
 *
 * `removeBackground` үед цайвар дэвсгэрийг тунгалаг болгоно — цаасан дээр
 * зурсан гарын үсэг, тамгыг гар утсаар зураг авахад дэвсгэр нь арилж,
 * гэрээн дээр цэвэрхэн суудаг.
 */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function fileToTransparentPng(
    file: File,
    removeBackground: boolean,
    maxWidth = 900,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Файлыг уншиж чадсангүй'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('Зургийг нээж чадсангүй'));
            img.onload = () => {
                const scale = Math.min(1, maxWidth / img.width);
                const w = Math.max(1, Math.round(img.width * scale));
                const h = Math.max(1, Math.round(img.height * scale));

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) {
                    reject(new Error('Хөтөч зураг боловсруулж чадахгүй байна'));

                    return;
                }

                ctx.drawImage(img, 0, 0, w, h);

                if (removeBackground) {
                    const data = ctx.getImageData(0, 0, w, h);
                    const px = data.data;
                    for (let i = 0; i < px.length; i += 4) {
                        // Гэрэлтэлт өндөр байх тусам тунгалаг болгоно
                        const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
                        if (lum >= 235) {
                            px[i + 3] = 0;
                        } else if (lum > 170) {
                            px[i + 3] = Math.round(px[i + 3] * (1 - (lum - 170) / 65));
                        }
                    }
                    ctx.putImageData(data, 0, 0);
                }

                resolve(canvas.toDataURL('image/png'));
            };
            img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
    });
}

/** Оруулсан файл зураг мөн эсэх, хэмжээ таарч байгаа эсэхийг шалгана. */
export function validateImageFile(file: File): string | null {
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
        return 'Зөвхөн PNG, JPG, WEBP зураг оруулна уу.';
    }
    if (file.size > MAX_IMAGE_BYTES) {
        return 'Зураг 8MB-аас бага байх ёстой.';
    }

    return null;
}
