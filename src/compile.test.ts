import { marbles } from 'rxjs-marbles/jest';
import { many, mute, query } from './compile';

describe('Compilation', () => {

    describe('ABC', () => {
        test('A', marbles(m => {
            const A = m.hot('^-1-2-3-|')
            const result = query(A);
            const expectd = '^-(1|)'

            m.expect(result).toBeObservable(expectd);
        }))

        test('AB', marbles(m => {
            const A = m.hot('^-1-----|')
            const B = m.hot('^---2---|')
            const expectd = '^-1-(2|)'
            const result = query(A, B);
            m.expect(result).toBeObservable(expectd);
        }));

        test('ABC', marbles(m => {
            const A = m.hot('^----0----------|')
            const B = m.hot('^-1-2-3-4-5-6-7-|')
            const C = m.hot('^------------0--|')
            const expectd = '^----03------(0|)'
            const result = query(A, B, C);
            m.expect(result).toBeObservable(expectd);
        }));
    })

    describe('AB*C', () => {
        test('A*', marbles(m => {
            const A = m.hot('^-1-2-3-|')
            const expectd = '^-1-2-3-|'
            const result = query(many(A));
            m.expect(result).toBeObservable(expectd);
        }));

        test('A*B', marbles(m => {
            const A = m.hot('^-1-2-3-|')
            const B = m.hot('^----0--|')
            const expectd = '^-1-2(0|)'
            const result = query(many(A), B);
            m.expect(result).toBeObservable(expectd);
        }));

        test('AB*C', marbles(m => {
            const A = m.hot('^----0----------|')
            const B = m.hot('^-1-2-3-4-5-6-7-|')
            const C = m.hot('^------------0--|')
            const expectd = '^----03-4-5-6(0|)'
            const result = query(A, many(B), C);
            m.expect(result).toBeObservable(expectd);
        }));
    });

    describe('_AB*_C', () => {
        test('_A', marbles(m => {
            const A = m.hot('^-1-2-3-|')
            const expectd = '^-|'
            const result = query(mute(A));

            m.expect(result).toBeObservable(expectd);
        }));

        test('_AB', marbles(m => {
            const A = m.hot('^-1-----|')
            const B = m.hot('^---2---|')
            const expectd = '^---(2|)'
            const result = query(mute(A), B);

            m.expect(result).toBeObservable(expectd);
        }));

        test('_AB*_C', marbles(m => {
            const A = m.hot('^----0----------|')
            const B = m.hot('^-1-2-3-4-5-6-7-|')
            const C = m.hot('^------------0--|')
            const expectd = '^-----3-4-5-6|'
            const result = query(mute(A), many(B), mute(C));
            m.expect(result).toBeObservable(expectd);
        }));
    });
})

