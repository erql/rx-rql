import { isObservable, Observable, Subject } from 'rxjs';

function Operator<T>(fn: (node: INode<T>) => RunTimeNode<T>) {
    return (..._inputs: InputValue<T>[]): INode => {
        const inputs = _inputs.map(compileNode);
        const deps = collectDeps(inputs);
        const root = inputs.length > 1
            ? inputs[0]
            : group(...inputs)

        const create = () => fn(root);

        return {
            deps,
            create
        }
    }
}

function collectDeps<T>(nodes: INode<T>[]) {
    const deps = new Set<Observable<T>>();
    nodes.forEach(node => {
        node.deps.forEach(dep => {
            deps.add(dep);
        })
    });
    return deps;
}

type InputValue<T> = Observable<T> | INode<T>;

enum Status {
    greedy = 'greedy',
    unsatisfied = 'unsatisfied',
    done = 'done'
}

interface RunTimeNode<A> {
    status(): Status;
    matchesEmission(o: Observable<A>): boolean;
    handleEmission(o: Observable<A>, value: A, onNext?: (v: A) => void): void;
}

interface INode<A = any> {
    deps: Set<Observable<A>>;
    create(): RunTimeNode<A>;
}

function compileNode<T>(input: InputValue<T>): INode<T> {
    if (isObservable(input)) {
        return one(input);
    }

    return input;
}

export function one<T>(o: Observable<T>): INode<T> {
    const deps = new Set<Observable<T>>();
    deps.add(o);

    return {
        deps,
        create() {
            let status = Status.unsatisfied;

            return {
                status: () => status,
                handleEmission(_, v, onNext) {
                    status = Status.done;
                    onNext(v);
                },
                matchesEmission: s => s === o
            }
        }
    }
}

export const many = Operator(root => {
    let r = root.create();
    let started = false;

    return {
        status() {
            //  status is not greedy if it already started capturing
            if (started){
                return r.status();
            }

            // if it hasn't started -- it's greedy
            return Status.greedy;
        },

        handleEmission(o, value, onNext) {
            if (!r.matchesEmission(o)){
                return;
            }

            started = true;

            // console.log('many:HE', value);
            let hasValue = false;
            let _value = void 0;

            r.handleEmission(o, value, v => {
                hasValue = true;
                _value = v;
            });

            if (r.status() == Status.done) {
                r = root.create();
                started = false;
            }

            if (hasValue) {
                onNext(_value);
            }
        },
        matchesEmission(o) {
            return r.matchesEmission(o);
        }
    }
});

export const mute = Operator((root) => {
    const r = root.create();

    return {
        status: r.status,
        handleEmission(o, value) {
            // console.log('mute:HE', value);
            r.handleEmission(o, value, () => { });
        },
        matchesEmission: r.matchesEmission
    }
});

export function group<T>(..._inputs: InputValue<T>[]): INode<T> {
    const inputs = _inputs.map(compileNode);

    // cut short if its a group of a group
    if (inputs.length == 1) {
        return inputs[0];
    }

    const deps = collectDeps(inputs);

    return {
        deps,
        create,
    }

    function create(){
        const nodes = inputs.map(n => n.create());

        // iteration state
        let currIndex = 0;

        return {
            status,
            handleEmission,
            matchesEmission
        }

        function status() {
            // check if group should be completed
            if (currIndex >= inputs.length) {
                console.log('GROUP STATUS DONE');
                return Status.done;
            }

            let status;
            for (let i = inputs.length - 1; i >= currIndex; i--) {
                const nodeStatus = nodes[currIndex].status();
                if (nodeStatus == Status.unsatisfied) {
                    status = nodeStatus;
                    break;
                }

                if (!status && nodeStatus == Status.greedy) {
                    status = nodeStatus;
                    continue;
                }
            }

            console.log('GROUP STATUS', status);
            return status ?? Status.done;
        }

        function handleEmission(o: Observable<T>, value, onNext): Status {
            if (currIndex > nodes.length - 1) {
                throw new Error(`Index out of bounds ${currIndex} | ${value}`);
            }

            const node = nodes[currIndex];

            const nodeStatus = node.status();
            if (nodeStatus == Status.greedy) {
                const nextNode = nodes[currIndex + 1];

                if (nextNode && nextNode.matchesEmission(o)) {
                    currIndex++;
                    return handleEmission(o, value, onNext);
                }
            }

            if (node.matchesEmission(o)) {
                let hasValue = false;
                let _value = void 0;

                node.handleEmission(o, value, v => {
                    hasValue = true;
                    _value = v;
                });

                if (node.status() == Status.done) {
                    currIndex++;
                }

                if (hasValue){
                    onNext(_value);
                }
            }
        }

        function matchesEmission(o) {
            // Emtpy group matches any emission
            // if (inputs.length == 0) {
            //     return true;
            // }

            // check if first value matches
            // NOTE: this is probably wrong
            for (let i = currIndex; i < nodes.length; i++) {
                const node = nodes[i];
                const status = node.status();
                if (status == Status.unsatisfied) {
                    return node.matchesEmission(o)
                }

                if (status == Status.greedy && node.matchesEmission(o)) {
                    return true;
                }
            }
            return false;
        }
    }
}

/**
 * Query observables
 *
 * ```ts
 * query(A, many(B), C)
 *   .pipe(…)
 *   .subscribe(v => console.log(v));
 * ```
 *
 * @param values Observables or Operators
 */
function query<T>(...values: InputValue<T>[]) {
    // query will immediately subscribe
    // TODO: refactor to new Observable(...)

    const rootGroup = group(...values);
    const r = rootGroup.create();

    const output = new Subject();

    const entries = Array.from(rootGroup.deps.values(), stream => {
        const subscription = stream.subscribe({
            next(value) {
                r.handleEmission(stream, value, (value) => {
                    output.next(value);
                });

                if (r.status() == Status.done) {
                    output.complete();
                    entries.forEach(e => e.subscription.unsubscribe())
                }
            }
            // TODO: hanle errors and completions
        })

        return {
            stream,
            subscription
        }
    });

    // TODO: handle unsubscription
    return output.asObservable();
}

export { query, query as $ };

/** Q:
 * how to handle `(AB)*_AC` ?
 * there are two possible matches at t4:
 * again group `(AB)` or follow `_AC`
 *
 * ˚  0123456789
 * A  --a-a-----
 * B  ---b------
 * C  -----c----
 * =  --ab------
 *
 * A: the decision of emitting or not A
 * should be done when we receive B or C at t5
 *
 */
