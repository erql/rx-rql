import { isObservable, Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';

function _collectDeps(nodes: any[]) {
    const deps = new Set<Observable<any>>();
    nodes.forEach(node => {
        node.deps.forEach(dep => {
            deps.add(dep);
        })
    });
    return deps;
}

function compileNode(node) {
    if (isObservable(node)) {
        return {
            type: 'STREAM',
            deps: new Set([node]),
            matchesEmission: s => s === node
        }
    }

    return node;
}

export function many(..._nodes) {
    const node = compileGroup(_nodes);

    return {
        type: 'REPEAT',
        deps: node.deps,
        matchesEmission: node.matchesEmission
    }
}

function compileGroup(_nodes: any[]) {
    const output = new Subject();
    let currIndex = 0;
    const nodes = _nodes.map(compileNode);
    const deps = _collectDeps(nodes);

    function handleEmission(key, value) {
        const currNode = nodes[currIndex];
        let completed = false;

        if (currNode.type == 'STREAM') {
            if (currNode.matchesEmission(key)) {
                output.next(value);
                currIndex += 1;
            }
        }

        if (currNode.type == 'REPEAT') {
            const nextNode = nodes[currIndex + 1];
            if (nextNode && nextNode.matchesEmission(key)) {
                currIndex++;
                return handleEmission(key, value);
            } else if (currNode.matchesEmission(key)) {
                output.next(value);
            }
        }

        // check if capturing group should be completed
        if (currIndex > nodes.length - 1) {
            output.complete();
            completed = true;
        }

        return { completed };
    }

    function matchesEmission() {
        return true;
    }

    return {
        type: 'GROUP',
        matchesEmission,
        deps,
        output,
        handleEmission
    }
}

function query(...values: any[]) {
    const rootGroup = compileGroup(values);

    const entries = Array.from(rootGroup.deps.values(), stream => {
        const subscription = stream.subscribe({
            next: value => rootGroup.handleEmission(stream, value),
            complete: () => {
                // hacky way to complete output and unsubscribe all streams
                rootGroup.output.complete()
            }
        })

        return {
            stream,
            subscription
        }
    });

    return rootGroup.output.pipe(
        tap({
            complete() {
                entries.forEach(e => e.subscription.unsubscribe())
            }
        })
    );
}

export { query };
