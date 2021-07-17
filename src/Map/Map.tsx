import React, {PureComponent} from 'react';
import Renderer from './Renderer';
import Island from './Island';
import FloodQueue from './FloodQueue';

import type {Island as IslandType} from './constants';

const SELECTION_STEP = 8;
const PADDING = 8;
const SELECTION_BOX_SIZE = 8;
const SELECTION_BOX_BORDER_SIZE = 2;

type Props = {
    imgSrc?: string;
}

type State = {
    selectionX: number;
    selectionY: number;
    showSelection: boolean;
    width: number;
    height: number;
    isLoaded: boolean;
    speedFactor: number;
    islands: IslandType[];
    stage?: string;
}

class Map extends PureComponent<Props, State> {
    renderer?: Renderer;
    containerRef: React.RefObject<HTMLDivElement> = React.createRef();
    islandsContainerRef: React.RefObject<HTMLDivElement> = React.createRef();
    seenPixels: Set<string> = new Set();
    floodQueue = new FloodQueue();

    state = this.getInitialState();

    constructor(props: Props) {
        super(props);
        this.tick = this.tick.bind(this);
    }

    componentDidMount() {
        const {current: container} = this.containerRef;
        if (!container) {
            return;
        }

        this.renderer = new Renderer(container);
        this.loadImage(this.props.imgSrc);
    }

    componentDidUpdate(prevProps: Props) {
        const {imgSrc} = this.props;
        if (prevProps.imgSrc !== imgSrc) {
            this.loadImage(imgSrc);
        }
    }

    async loadImage(imgSrc?: string) {
        if (!this.renderer) {
            throw new Error('Cannot update image before renderer is initialized');
        }

        this.setState({isLoaded: false});

        this.renderer.clear();

        if (!imgSrc) {
            return Promise.resolve();
        }

        return this.renderer.loadImage(imgSrc)
            .then(image => {
                this.setState({
                    isLoaded: true,
                    width: image.width,
                    height: image.height,
                });
                this.tick();
            });

    }

    render() {
        const {imgSrc} = this.props;
        const {
            showSelection,
            width,
            height,
            isLoaded,
            islands,
        } = this.state;

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                flexDirection: 'column',
            }}>
                <p>{this.state.stage}</p>
                <div
                    style={{
                        width: `${width}px`,
                        height: `${height}px`,
                        position: 'relative',
                        padding: `${PADDING}px`,
                    }}
                >
                    <div
                        ref={this.containerRef}
                        style={{
                            width: `${width}px`,
                            height: `${height}px`,
                            position: 'absolute',
                        }}
                    >
                        {!imgSrc && <p>No image...</p>}
                        {!isLoaded && imgSrc && <p>Loading...</p>}
                    </div>
                    {isLoaded && showSelection && this.renderSelectionBox()}
                </div>
                <div
                    style={{
                        display: 'flex',
                        height: '85px'
                    }}
                >
                    {islands.map((island, i) => <Island key={i} island={island} />)}
                </div>
                {islands.map(({area, x, y, width, height}, i) => (
                    <p style={{fontSize: '10px', margin: 0, padding: '2px'}}>
                        {`Island ${i + 1} - area: ${area}, x: ${x}, y: ${y}, width: ${width}, height: ${height}`}
                    </p>
                ))}
            </div>
        );
    }

    renderSelectionBox() {
        const {selectionX, selectionY} = this.state;
        const positionOffset = PADDING - (SELECTION_BOX_SIZE / 2);
        const x = selectionX + positionOffset;
        const y = selectionY + positionOffset;
        const size = SELECTION_BOX_SIZE - (SELECTION_BOX_BORDER_SIZE * 2);
        return (
            <div
                style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    border: `${SELECTION_BOX_BORDER_SIZE}px solid orange`,
                    position: 'absolute',
                    transition: 'all 10ms linear'
                }}
            />
        )
    }

    tick() {
        const {
            selectionX,
            selectionY,
            width,
            height,
            islands
        } = this.state;

        if (this.floodQueue.length) {
            this.floodQueue.batchFlood();
            requestAnimationFrame(this.tick);
            this.setState({stage: `Filling island ${islands.length}...`});
            return;
        }
        this.setState({stage: 'Scanning...'});
        this.startFlood(selectionX, selectionY);

        let newSelectionX = selectionX;
        let newSelectionY = selectionY;

        if (selectionX >= width && selectionY >= height) {
            this.setState({
                selectionX: 0,
                selectionY: 0,
                showSelection: false,
            });
            return;
        }

        if (selectionX >= width) {
            newSelectionX = 0;
            newSelectionY += SELECTION_STEP;
        } else {
            newSelectionX += SELECTION_STEP;
        }

        requestAnimationFrame(this.tick);

        this.setState({
            selectionX: newSelectionX,
            selectionY: newSelectionY,
        });
    }

    startFlood(x: number, y: number) {
        const {
            renderer,
            seenPixels,
            floodQueue,
        } = this;
        const {
            width,
            height,
            islands,
        } = this.state;
        let area = 0
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        if (!shouldFlood(x, y)) {
            return;
        }

        flood(x, y);

        const islandWidth = maxX - minX;
        const islandHeight = maxY - minY;
        let imageData = null;
        if (islandWidth && islandHeight) {
            imageData = this.renderer?.getImageData(minX, minY, islandWidth, islandHeight) || null;
        }

        const island = {
            area,
            x: minX,
            y: minY,
            width: islandWidth,
            height: islandHeight,
            imageData,
        };

        this.setState({
            islands: [
                ...islands,
                island,
            ]
        });

        function flood(newX: number, newY: number) {
            const serializedPosition = serializePosition(newX, newY);
            if (!shouldFlood(newX, newY)) {
                return;
            }

            area += 1;
            if (newX < minX) {
                minX = newX;
            }
            if (newX > maxX) {
                maxX = newX;
            }
            if (newY < minY) {
                minY = newY;
            }
            if (newY > maxY) {
                maxY = newY;
            }

            seenPixels.add(serializedPosition);
            flood(newX, newY - 1);
            flood(newX + 1, newY);
            flood(newX, newY + 1)
            flood(newX - 1, newY);
            floodQueue.add(() => renderer?.drawPixel(newX, newY, '#6E9887'));
        }

        function shouldFlood(newX: number, newY: number): boolean {
            const serializedPosition = serializePosition(newX, newY);
            const rgba = renderer?.getPixelRgba(newX, newY);
            return !!rgba
                && isColorMatch(rgba)
                && newX <= width
                && newY <= height
                && newX >= 0
                && newY >= 0
                && !seenPixels.has(serializedPosition);
        }
    }

    private getInitialState(): State {
        return {
            selectionX: 0,
            selectionY: 0,
            showSelection: true,
            width: 0,
            height: 0,
            isLoaded: false,
            speedFactor: 1,
            islands: [],
        }
    }
}

function isColorMatch(rgba: Uint8ClampedArray): boolean {
    const r = rgba[0];
    const g = rgba[1];
    const b = rgba[2];

    return inRange(r) && inRange(b) && inRange(g);

    function inRange(value: number): boolean {
        return value < 240;
    }
}

function serializePosition(x: number, y: number): string {
    return `${x},${y}`;
}

export default Map;
