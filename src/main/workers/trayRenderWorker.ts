/**
 * Tray Render Worker
 * Offloads Resvg SVG rendering to a separate thread to prevent main thread blocking.
 */

import { parentPort } from 'worker_threads';
import { Resvg } from '@resvg/resvg-js';

interface RenderRequest {
    id: number;
    displayText: string;
}

interface RenderResponse {
    id: number;
    buffer: Buffer;
}

if (!parentPort) {
    throw new Error('This module must be run as a Worker Thread');
}

const HEIGHT = 44;
const PADDING = 4;
const FIXED_WIDTH = 160;

function escapeText(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/ /g, '\u00A0')
        .replace(/\u3000/g, '\u00A0\u00A0');
}

function renderToBuffer(displayText: string): Buffer {
    const escapedText = escapeText(displayText);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" height="${HEIGHT}" width="${FIXED_WIDTH}" viewBox="0 0 ${FIXED_WIDTH} ${HEIGHT}">` +
        `<rect width="${FIXED_WIDTH}" height="${HEIGHT}" fill="transparent" />` +
        `<text x="${PADDING}" y="${HEIGHT / 2 + 2}" dominant-baseline="middle" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif" font-size="20" font-weight="500" fill="black">${escapedText}</text>` +
        `</svg>`;

    const resvg = new Resvg(svg, {
        background: 'rgba(0,0,0,0)',
        font: {
            loadSystemFonts: true,
            defaultFontFamily: 'Hiragino Kaku Gothic ProN'
        }
    });

    const pngData = resvg.render();
    return pngData.asPng();
}

parentPort.on('message', (request: RenderRequest) => {
    try {
        const buffer = renderToBuffer(request.displayText);
        const response: RenderResponse = {
            id: request.id,
            buffer
        };
        parentPort!.postMessage(response);
    } catch (error) {
        console.error('[TrayRenderWorker] Render error:', error);
        // Send empty buffer on error
        parentPort!.postMessage({ id: request.id, buffer: Buffer.alloc(0) });
    }
});
