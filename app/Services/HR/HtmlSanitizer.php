<?php

namespace App\Services\HR;

use DOMDocument;
use DOMElement;
use DOMXPath;

/**
 * Загварын биеийг хадгалахын өмнө цэвэрлэнэ.
 * HR талын засварлагч нь contenteditable тул хэрэглэгчийн буулгасан
 * HTML-д script, style, гадаад агуулга орж ирэх боломжтой.
 */
class HtmlSanitizer
{
    /** Зөвшөөрөгдөх шошгууд — PDF болон дэлгэц дээр найдвартай гардаг цөөн багц. */
    private const ALLOWED_TAGS = [
        'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'hr',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        'sub', 'sup', 'small',
    ];

    /** Шошго тус бүрд үлдээх атрибутууд. */
    private const ALLOWED_ATTRS = [
        'style', 'class', 'colspan', 'rowspan', 'align', 'valign', 'width', 'start',
    ];

    /**
     * Зөвшөөрөгдөх класс — албан бичгийн байрлалыг хангах цөөн хэдэн класс.
     * cl    = дугаарлагдсан заалт (дугаар нь мөрнөөс гарсан догол)
     * plain = хүрээгүй байрлуулах хүснэгт
     * ctr   = голлуулсан догол
     */
    private const ALLOWED_CLASSES = ['cl', 'plain', 'ctr'];

    private const REMOVE_ENTIRELY = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'form', 'input', 'button'];

    public static function clean(?string $html): string
    {
        $html = trim((string) $html);
        if ($html === '') {
            return '';
        }

        $doc = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        $doc->loadHTML(
            '<?xml encoding="UTF-8"?><div id="hr-root">'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $xpath = new DOMXPath($doc);

        // Аюултай шошгуудыг агуулгатай нь хамт устгана
        foreach (self::REMOVE_ENTIRELY as $tag) {
            $nodes = iterator_to_array($doc->getElementsByTagName($tag));
            foreach ($nodes as $node) {
                $node->parentNode?->removeChild($node);
            }
        }

        // Үлдсэн элементүүдийг шүүнэ
        $elements = iterator_to_array($xpath->query('//*') ?: []);
        foreach ($elements as $el) {
            if (! $el instanceof DOMElement) {
                continue;
            }
            $name = strtolower($el->nodeName);
            if ($name === 'div' && $el->getAttribute('id') === 'hr-root') {
                continue;
            }

            if (! in_array($name, self::ALLOWED_TAGS, true)) {
                self::unwrap($el);

                continue;
            }

            foreach (iterator_to_array($el->attributes ?? []) as $attr) {
                $attrName = strtolower($attr->nodeName);

                if (! in_array($attrName, self::ALLOWED_ATTRS, true)) {
                    $el->removeAttribute($attr->nodeName);

                    continue;
                }
                if ($attrName === 'style' && preg_match('/expression|url\s*\(|javascript:/i', $attr->nodeValue ?? '')) {
                    $el->removeAttribute('style');
                }
                if ($attrName === 'class') {
                    $kept = array_values(array_intersect(
                        preg_split('/\s+/', trim((string) $attr->nodeValue)) ?: [],
                        self::ALLOWED_CLASSES
                    ));
                    if ($kept) {
                        $el->setAttribute('class', implode(' ', $kept));
                    } else {
                        $el->removeAttribute('class');
                    }
                }
            }
        }

        $root = $doc->getElementById('hr-root');
        if (! $root) {
            return '';
        }

        $out = '';
        foreach ($root->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }

        return trim($out);
    }

    /** Шошгыг устгаад доторх агуулгыг нь эцэг рүү нь өргөнө. */
    private static function unwrap(DOMElement $el): void
    {
        $parent = $el->parentNode;
        if (! $parent) {
            return;
        }
        while ($el->firstChild) {
            $parent->insertBefore($el->firstChild, $el);
        }
        $parent->removeChild($el);
    }
}
