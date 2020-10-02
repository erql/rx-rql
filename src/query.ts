import { isObservable, Observable, Subscription } from 'rxjs';

function Operator<T>(fn: (node: INode<T>) => RunTimeNode<T>) {
    return (..._inputs: InputValue<T>[]): INode => {
        const inputs = _inputs.map(compileNode);
        const deps = collectDeps(inputs);
        const root = inputs.length > 1
            ? group(...inputs)
            : inputs[0]

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

const enum Status {
    lazy,
    undone,
    done
}

interface RunTimeNode<A> {
    status(): Status;
    match(o: Observable<A>): boolean;
    next(o: Observable<A>, value: A, onNext?: (v: A) => void): void;
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

/**
 * `A` — capture single A emission
 *
 * @param o Observable to track
 */
export function one<T>(o: Observable<T>): INode<T> {
    const deps = new Set<Observable<T>>();
    deps.add(o);

    return {
        deps,
        create() {
            let status = Status.undone;

            return {
                status: () => status,
                next(_o, v, onNext) {
                    status = Status.done;
                    onNext(v);
                },
                match: s => s === o
            }
        }
    }
}

/**
 * `A{min, max?}` - capture at least min and at most max number of emissions
 *
 * ```ts
 * many(0, 5)(A, B);
 * many(0)(C);
 * ```
 */
export const many = (min = 0, max = Infinity) => Operator(root => {
    if (min < 0 || min > max) {
        throw Error('min must be between 0 and ' + max);
    }

    let r = root.create();
    let started = false;
    let count = 0;

    return {
        status() {
            //  status is not lazy if it already started capturing
            if (started){
                return r.status();
            }

            // undone if < min required emissions
            if (count < min){
                return Status.undone;
            }
            // lazy if min < count < max
            if (count >= min && count < max) {
                return Status.lazy;
            }
            // if count >= max -- we're done
            else {
                return Status.done;
            }
        },

        next(o, value, onNext) {
            started = true;

            let hasValue = false;
            let _value = void 0;

            r.next(o, value, v => {
                hasValue = true;
                _value = v;
            });

            if (r.status() == Status.done) {
                count++;
                r = root.create();
                started = false;
            }

            if (hasValue) {
                onNext(_value);
            }
        },
        match(o) {
            return r.match(o);
        }
    }
})

/**
 * `A*` — capture `0` or more values of `A`
 */
export const some = many(0, Infinity);

/**
 * `A?` - capture `0` or `1` value of `A`
 */
export const maybe = many(0, 1);

/**
 * `A_` — capture one value from `A`, but don't emit it
 */
export const mute = Operator((root) => {
    const r = root.create();

    return {
        status: r.status,
        next(o, value) {
            r.next(o, value, () => { });
        },
        match: r.match
    }
});

/**
 * `(ABC)` — track a group of inputs
 *
 * @param inputs Observables and Operators to track
 */
export function group<T>(...inputs: INode<T>[]): INode<T> {
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
        let index = 0;

        return {
            status,
            next,
            match: (o) => match(index, o)
        }

        function status() {
            // check if group should be completed
            if (index >= inputs.length) {
                return Status.done;
            }

            let status;
            for (let i = inputs.length - 1; i >= index; i--) {
                const nodeStatus = nodes[index].status();
                if (nodeStatus == Status.undone) {
                    status = nodeStatus;
                    break;
                }

                if (nodeStatus == Status.lazy) {
                    status = nodeStatus;
                    continue;
                }
            }

            return status ?? Status.done;
        }

        function next(o: Observable<T>, value, onNext): Status {
            const node = nodes[index];

            if (node.status() == Status.lazy
                && index < nodes.length - 1
                && match(index + 1, o)
            ) {
                index++;
                return next(o, value, onNext);
            }

            if (node.match(o)) {
                let hasValue = false;
                let _value = void 0;

                node.next(o, value, v => {
                    hasValue = true;
                    _value = v;
                });

                if (node.status() == Status.done) {
                    index++;
                }

                if (hasValue){
                    onNext(_value);
                }
            }
        }

        function match(index, o) {
            // check if current or next inputs matches
            for (let i = index; i < nodes.length; i++) {
                const node = nodes[i];
                const status = node.status();
                if (status == Status.undone) {
                    return node.match(o)
                }

                if (status == Status.lazy && node.match(o)) {
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
    return new Observable(observer => {
        const nodes = values.map(compileNode);
        const rootGroup = group(...nodes);

        const r = rootGroup.create();

        const sub = new Subscription();

        rootGroup.deps.forEach(o => {
            const _sub = o.subscribe({
                next(value) {
                    if (!r.match(o)) {
                        return;
                    }

                    r.next(o, value, (value) => {
                        observer.next(value);
                    });

                    if (r.status() == Status.done) {
                        observer.complete();
                    }
                },
                error(err){
                    observer.error(err);
                }
                // TODO: completions
            });

            // unsubscribe with main subscription
            sub.add(_sub);
        });

        // return main subscription
        return sub;
    });
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
