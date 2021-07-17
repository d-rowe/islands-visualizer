import React, {PureComponent} from "react";

import type {Island as IslandType} from './constants';

type Props = {
    island: IslandType;
}

class Island extends PureComponent<Props> {
    containerRef: React.RefObject<HTMLDivElement> = React.createRef();

    componentDidMount() {
        const {island} = this.props;
        const canvas = createIslandCanvas(island);
        if (canvas) {
            this.containerRef.current?.appendChild(canvas);
        }
    }

    render() {
        return <div ref={this.containerRef} />;
    }
}

function createIslandCanvas(island: IslandType): HTMLCanvasElement | null {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error ('Error retrieving island canvas context');
    }

    if (!island.imageData) {
        return null;
    }

    canvas.width = island.width;
    canvas.height = island.height;
    context.putImageData(island.imageData, 0, 0);

    return canvas;
}

export default Island;
