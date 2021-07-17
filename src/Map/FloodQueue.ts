type Callback = () => void;
type Node = FloodNode | null;

const DEFAULT_BATCH_SIZE = 20;

class FloodQueue {
    first: Node = null;
    last: Node = null;
    length = 0;
    batchSize: number;

    constructor(batchSize?: number) {
        this.batchSize = batchSize || DEFAULT_BATCH_SIZE;
    }

    add(callback: Callback) {
        const node = new FloodNode(callback);
        this.length += 1;

        if (!this.first || !this.last) {
            this.first = node;
            this.last = node;
            return;
        }

        this.last.next = node;
        this.last = node;
    }

    batchFlood() {
        for (let i = 0; i < this.batchSize; i++) {
            const node = this.pop();
            if (node) {
                node.flood();
            } else {
                return;
            }
        }
    }

    pop(): Node {
        const {first} = this;
        if (!first) {
            return null;
        }

        this.length -= 1;
        this.first = first.next;
        return first;
    }
}

class FloodNode {
    flood: Callback;
    next: Node = null;

    constructor(flood: Callback, next?: Node) {
        this.flood = flood;
        if (next) {
            this.next = next;
        }
    }
}

export default FloodQueue;
