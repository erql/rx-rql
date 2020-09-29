import { Observable, defer } from 'rxjs';
import { parse } from './ast';
import { compile } from './compile';

export type ExpressionString = string;
export type StreamKeyType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
export type Dependencies = Partial<Record<StreamKeyType, Observable<unknown>>>;

function exec(expression: ExpressionString, deps: Dependencies) {
    const ast = parse(expression);
    return defer(() => compile(ast, deps));
}

export { exec }