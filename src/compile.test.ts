import { marbles } from 'rxjs-marbles/jest';
import { many, query } from './compile';

describe('Compilation', () => {

    test('A', marbles(m => {
        const A = m.hot('^-1-2-3-|')
        const result  = query(A);
        const expected = '^-(1|)'

        m.expect(result).toBeObservable(expected);
    }))

    test('AB', marbles(m => {
        const A = m.hot('^-1-----|')
        const B = m.hot('^---2---|')
        const expected ='^-1-(2|)'
        const result = query(A, B);
        m.expect(result).toBeObservable(expected);
    }));

    describe('AB*C', () => {
        test('A*', marbles(m => {
            const A = m.hot('^-1-2-3-|')
            const expected ='^-1-2-3-|'
            const result = query(many(A));
            m.expect(result).toBeObservable(expected);
		}));

        test('A*B', marbles(m => {
            const A = m.hot('^-1-2-3-|')
            const B = m.hot('^----0--|')
            const expected ='^-1-2(0|)'
			const result = query(many(A), B);
            m.expect(result).toBeObservable(expected);
		}));

        test('AB*C', marbles(m => {
			const A = m.hot('^----0----------|')
			const B = m.hot('^-1-2-3-4-5-6-7-|')
			const C = m.hot('^------------0--|')
			const expected= '^----03-4-5-6(0|)'
			const result = query(A, many(B), C);
            m.expect(result).toBeObservable(expected);
        }));
    });

})

