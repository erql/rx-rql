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

type InputValue<T> = Observable<T> | INode<T>;

enum NodeType {
    one = 'one',
    many = 'many',
    group = 'group',
    mute = 'mute',
}

interface INode<A = any> {
    type: NodeType;
    deps: Set<Observable<A>>;
    output: Subject<A>; // TODO: make it Observable<A>
    handleEmission(o: Observable<A>, value: A): void;
    matchesEmission(o: Observable<A>): boolean;
}

function compileNode<T>(node: InputValue<T>): INode {
    if (isObservable(node)) {
        return one(node);
    }

    return node;
}

export function one<T>(o: Observable<T>): INode<T> {
    const output = new Subject<T>();
    const deps = new Set<Observable<T>>();
    deps.add(o);

    return {
        type: NodeType.one,
        deps,
        output,
        handleEmission: (_, v) => {
            output.next(v);
        },
        matchesEmission: s => s === o
    }
}

export function many<T>(..._nodes: InputValue<T>[]): INode<T> {
    const node = compileGroup(_nodes);

    return {
        type: NodeType.many,
        deps: node.deps,
        output: node.output,
        handleEmission: node.handleEmission,
        matchesEmission: node.matchesEmission
    }
}

export function mute<T>(..._nodes: InputValue<T>[]): INode<T> {
    const group = compileGroup(_nodes);

    return {
        type: NodeType.mute,
        deps: group.deps,
        output: new Subject<T>(),
        handleEmission: () => void 0, // do nothing
        matchesEmission: group.matchesEmission
    }
}

function compileGroup<T>(_nodes: InputValue<T>[]): INode<T> {
    const output = new Subject<T>();
    const nodes = _nodes.map(compileNode);
    const deps = _collectDeps(nodes);

    // iteration state
    let currIndex = 0;

    function handleEmission(o: Observable<T>, value) {
        const node = nodes[currIndex];

        // checking for greedy MANY operator
        if (node.type == NodeType.many) {
            const nextNode = nodes[currIndex + 1];
            if (nextNode && nextNode.matchesEmission(o)) {
                currIndex++;
                return handleEmission(o, value);
            } else if (node.matchesEmission(o)) {
                output.next(value);
            }
        } else {
            if (node.matchesEmission(o)) {
                const sub = node.output.subscribe(v => {
                    output.next(v);
                });
                node.handleEmission(o, value);
                sub.unsubscribe();
                currIndex += 1;
            }
        }

        // check if capturing group should be completed
        if (currIndex > nodes.length - 1) {
            output.complete();
        }
    }

    function matchesEmission(o) {
        // Emtpy group matches any emission
        if (nodes.length == 0) {
            return true;
        }

        // check if first value matches
        return nodes[0].matchesEmission(o);
    }

    return {
        type: NodeType.group,
        deps,
        output,
        matchesEmission,
        handleEmission
    }
}

function query<T>(...values: InputValue<T>[]) {
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
