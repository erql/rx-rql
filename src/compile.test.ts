import { marbles } from 'rxjs-marbles/jest';
import { $, group, many, mute } from './compile';

// These tests use string query notation
// ABC   -- select 1 emission from A,B,C streams
// A*    -- select 0 and more emissions from A stream
// _A    -- select 1 emission from A stream, and ignore it
// (AB)  -- a group of A,B streams
describe('Compilation', () => {

    describe('ABC', () => {
        test('A', marbles(m => {
            const A = m.hot('^-1-2-3-|')
            const result = $(A);
            const expectd = '^-(1|)'

            m.expect(result).toBeObservable(expectd);
        }))

        test('AB', marbles(m => {
            const A = m.hot('^-1-----|')
            const B = m.hot('^---2---|')
            const expectd = '^-1-(2|)'
            const result = $(A, B);
            m.expect(result).toBeObservable(expectd);
        }));

        test('ABC', marbles(m => {
            const A = m.hot('^----0----------|')
            const B = m.hot('^-1-2-3-4-5-6-7-|')
            const C = m.hot('^------------0--|')
            const expectd = '^----03------(0|)'
            const result = $(A, B, C);
            m.expect(result).toBeObservable(expectd);
        }));
    })

    describe('AB*C', () => {
        test('A*', marbles(m => {
            const A = m.hot('^-1-2-3-|')
            const expectd = '^-1-2-3-|'
            const result = $(many(A));
            m.expect(result).toBeObservable(expectd);
        }));

        test('A*B', marbles(m => {
            const A = m.hot('^-1-2-3-|')
            const B = m.hot('^----0--|')
            const expectd = '^-1-2(0|)'
            const result = $(many(A), B);
            m.expect(result).toBeObservable(expectd);
        }));

        test('AB*C', marbles(m => {
            const A = m.hot('^----0----------|')
            const B = m.hot('^-1-2-3-4-5-6-7-|')
            const C = m.hot('^------------0--|')
            const expectd = '^----03-4-5-6(0|)'
            const result = $(A, many(B), C);
            m.expect(result).toBeObservable(expectd);
        }));
    });

    describe('_AB*_C', () => {
        test('_A', marbles(m => {
            const A = m.hot('^-1-2-3-|')
            const expectd = '^-|'
            const result = $(mute(A));

            m.expect(result).toBeObservable(expectd);
        }));

        test('_AB', marbles(m => {
            const A = m.hot('^-1-----|')
            const B = m.hot('^---2---|')
            const expectd = '^---(2|)'
            const result = $(mute(A), B);

            m.expect(result).toBeObservable(expectd);
        }));

        test('_AB*_C', marbles(m => {
            const A = m.hot('^----0----------|')
            const B = m.hot('^-1-2-3-4-5-6-7-|')
            const C = m.hot('^------------0--|')
            const expectd = '^-----3-4-5-6|'
            const result = $(mute(A), many(B), mute(C));
            m.expect(result).toBeObservable(expectd);
        }));
    });

    describe('A(BC)', () => {
        test('(A)', marbles(m => {
            const A = m.hot('^-1-----|')
            const expectd = '^-(1|)'
            const result = $(group(A));

            m.expect(result).toBeObservable(expectd);
        }));

        test('A(B)*', marbles(m => {
            const A = m.hot('^-1-----|')
            const B = m.hot('^1-2-3-4|')
            const expectd = '^-12-3-4|'
            const result = $(A, many(group(B)));

            m.expect(result).toBeObservable(expectd);
        }));

        xtest('(_AB*_C)*', marbles(m => {
            const A = m.hot('^----0-----0----|')
            const B = m.hot('^-1-2-3-4-5-6-7-|')
            const C = m.hot('^--------0---0--|')
            const expectd = '^-----3-4---6---|'
            const result = $(
                many(
                    mute(A), many(B), mute(C)
                )
            );
            m.expect(result).toBeObservable(expectd);
        }));

    })
})

