import { isObservable, Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';

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

enum Type {
    one = 'one',
    many = 'many',
    group = 'group',
    mute = 'mute',
}

enum Status {
    greedy = 'greedy',
    unsatisfied = 'unsatisfied',
    done = 'done'
}

interface RunTimeNode<A> {
    output: Subject<A>; // TODO: make it Observable<A>
    status(): Status;
    matchesEmission(o: Observable<A>): boolean;
    handleEmission(o: Observable<A>, value: A): void;
}

interface INode<A = any> {
    type: Type;
    deps: Set<Observable<A>>;
    create(): RunTimeNode<A>;
}

function compileNode<T>(input: InputValue<T>): INode {
    if (isObservable(input)) {
        return one(input);
    }

    return input;
}

export function one<T>(o: Observable<T>): INode<T> {
    const deps = new Set<Observable<T>>();
    deps.add(o);

    return {
        type: Type.one,
        deps,
        create(){
            const output = new Subject<T>();
            let status = Status.unsatisfied;

            return {
                output,
                status: () => status,
                handleEmission(_, v) {
                    status = Status.done;
                    output.next(v);
                },
                matchesEmission: s => s === o
            }
        }
    }
}

export function many<T>(...inputs: InputValue<T>[]): INode<T> {
    const root = group(...inputs);

    return {
        type: Type.many,
        deps: root.deps,
        create() {
            let r = root.create();
            let output = new Subject<T>();

            return {
                output,
                status: () => Status.greedy, // always greedy
                handleEmission(o, value) {
                    const sub = r.output.subscribe(v => {
                        output.next(v);
                    });

                    r.handleEmission(o, value);
                    if (r.status() == Status.done) {
                        r = root.create();
                    }

                    sub.unsubscribe();
                },
                matchesEmission(o){
                    return r.matchesEmission(o);
                }
            }
        }
    }
}

export function mute<T>(...inputs: InputValue<T>[]): INode<T> {
    const root = group(...inputs);

    return {
        type: Type.mute,
        deps: root.deps,
        create(){
            const r = root.create();
            // TODO: complete output
            const output = new Subject<T>();

            return {
                output,
                status: r.status,
                handleEmission: r.handleEmission,
                matchesEmission: r.matchesEmission
            }
        }
    }
}

export function group<T>(...inputs: InputValue<T>[]): INode<T> {
    // cut short if its a group of a group
    if (inputs.length == 1 && !isObservable(inputs[0]) && inputs[0].type == Type.group) {
        return inputs[0];
    }

    const compiled = inputs.map(compileNode);
    const deps = collectDeps(compiled);

    return {
        type: Type.group,
        deps,
        create,
    }

    function create(){
        const output = new Subject<T>();
        const ns = compiled.map(n => n.create());

        // let status = ns.length ? ns[0].status() : Status.done;
        let status = Status.unsatisfied;

        // iteration state
        let currIndex = 0;

        return {
            output,
            status: () => status,
            handleEmission,
            matchesEmission
        }

        function handleEmission(o: Observable<T>, value): Status {
            const n = ns[currIndex];

            const n_status = n.status();
            if (n_status == Status.greedy) {
                const nextNode = ns[currIndex + 1];

                if (nextNode && nextNode.matchesEmission(o)) {
                    currIndex++;
                    return handleEmission(o, value);
                }
            }

            if (n.matchesEmission(o)) {
                const sub = n.output.subscribe(v => {
                    output.next(v);
                });
                n.handleEmission(o, value);
                sub.unsubscribe();

                if (n.status() == Status.done) {
                    currIndex++;
                }
            }


            // if (node.type == Type.many) {
            //     const nextNode = ns[currIndex + 1];
            //     if (nextNode && nextNode.matchesEmission(o)) {
            //         currIndex++;
            //         return handleEmission(o, value);
            //     } else if (n.matchesEmission(o)) {
            //         output.next(value);
            //     }
            // } else {
            //     if (n.matchesEmission(o)) {
            //         const sub = n.output.subscribe(v => {
            //             output.next(v);
            //         });
            //         n.handleEmission(o, value);
            //         sub.unsubscribe();
            //         currIndex += 1;
            //     }
            // }

            // check if capturing group should be completed
            if (currIndex > compiled.length - 1) {
                status = Status.done;
                output.complete();
            } else {
                // TODO: this is doubtful for ABC*
                // at C* we may return greedy
                status = Status.unsatisfied;
            }
        }

        function matchesEmission(o) {
            // Emtpy group matches any emission
            if (compiled.length == 0) {
                return true;
            }

            // check if first value matches
            return ns[0].matchesEmission(o);
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

    const rootGroup = group(...values);
    const r = rootGroup.create();

    const entries = Array.from(rootGroup.deps.values(), stream => {
        const subscription = stream.subscribe({
            next: value => r.handleEmission(stream, value),
            complete: () => {
                // hacky way to complete output and unsubscribe all streams
                r.output.complete()
            }
        })

        return {
            stream,
            subscription
        }
    });

    return r.output.pipe(
        tap({
            complete() {
                entries.forEach(e => e.subscription.unsubscribe())
            }
        })
    );
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
