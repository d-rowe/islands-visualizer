type BBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

class CanvasRenderer {
    canvas?: HTMLCanvasElement;
    container: HTMLDivElement;
    context?: CanvasRenderingContext2D;
    width = 0;
    height = 0;

    constructor(container: HTMLDivElement) {
        this.container = container;
        this.appendCanvas();
    }

    private appendCanvas() {
        this.canvas = createCanvas(this.width, this.height);
        this.context = this.canvas.getContext('2d') || undefined;
        this.container.appendChild(this.canvas);
    }

    loadImage(src: string): Promise<HTMLImageElement> {
        if (!this.context) {
            return Promise.reject('Cannot load image before initializing rendering context');
        }

        const image = new Image();
        image.crossOrigin = 'Anonymous';
        image.src = src;

        return new Promise(resolve => {
            image.onload = () => {
                if (this.canvas) {
                    this.width = image.width;
                    this.height = image.height;
                    this.canvas.height = this.height;
                    this.canvas.width = this.width;
                }
                this.context?.drawImage(image, 0, 0);
                resolve(image);
            }
        });
    }

    getPixelRgba(x: number, y: number): Uint8ClampedArray | null {
        const {data = null} = this.context?.getImageData(x, y, 1, 1) || {};
        return data;
    }

    getImageData(x: number, y: number, width: number, height: number): ImageData | null {
        const image = this.context?.getImageData(x, y, width, height);
        return image || null;
    }

    drawPixel(x: number, y: number, color: string) {
        this.drawRect({x, y, width: 1, height: 1}, color);
    }

    drawRect(bbox: BBox, color: string) {
        if (!this.context) {
            throw new Error('Cannot draw pixel before renderer is initialized');
        }

        const {x, y, width, height} = bbox;

        this.context.fillStyle = color;
        this.context.fillRect(x, y, width, height);
    }

    clear() {
        if (this.context) {
            this.context.clearRect(0, 0, this.width, this.height);
        }
    }
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

export default CanvasRenderer;
