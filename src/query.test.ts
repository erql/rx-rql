import { marbles } from 'rxjs-marbles/jest';
import { $, many, maybe, mute, some } from './query';

// TODO:
// - test errors
// - test early unsubscription
// - test early completion

// These tests use string query notation
// ABC   -- select 1 emission from A,B,C streams
// A*    -- select 0 and more emissions from A stream
// _A    -- select 1 emission from A stream, and ignore it
// (AB)  -- a group of A,B streams
describe('Compilation', () => {

    describe('ABC', () => {
        test('A', marbles(m => {
            const A = m.hot('^-1-2-3-|')
            const expectd = '^-(1|)'
            const result = $(A);

            m.expect(result).toBeObservable(expectd);
        }))

        test('AA', marbles(m => {
            const A = m.hot('^-1-2-3-|')
            const expectd = '^-1-(2|)'
            const result = $(A, A);

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
        // NOTE: completion with inner Observables is not implemeted yet

        test('A*', marbles(m => {
            const A = m.hot('^-1-2-3-')
            const expectd = '^-1-2-3-'
            const result = $(some(A));
            m.expect(result).toBeObservable(expectd);
        }));

        test('A*B', marbles(m => {
            const A = m.hot('^-1-2-3-|')
            const B = m.hot('^----0--|')
            const expectd = '^-1-2(0|)'
            const result = $(some(A), B);
            m.expect(result).toBeObservable(expectd);
        }));

        test('AB*C', marbles(m => {
            const A = m.hot('^----0----------|')
            const B = m.hot('^-1-2-3-4-5-6-7-|')
            const C = m.hot('^------------0--|')
            const expectd = '^----03-4-5-6(0|)'
            const result = $(A, some(B), C);
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
            const result = $(mute(A), some(B), mute(C));
            m.expect(result).toBeObservable(expectd);
        }));
    });

    describe('(ABC)', () => {
        test('(A)*', marbles(m => {
            const A = m.hot('^-a-a-a-')
            const expectd = '^-a-a-a-'
            const result = $(some(A));

            m.expect(result).toBeObservable(expectd);
        }));

        test('_(A)', marbles(m => {
            const A = m.hot('^-a-a-a-')
            const expectd = '^-|'
            const result = $(mute(A));

            m.expect(result).toBeObservable(expectd);
        }));

        test('_(A*)', marbles(m => {
            const A = m.hot('^1-2-3-4')
            const expectd = '^-------'
            const result = $(mute(some(A)));

            m.expect(result).toBeObservable(expectd);
        }));

        test('(_A)*', marbles(m => {
            const A = m.hot('^1-2-3-4')
            const expectd = '^-------'
            const result = $(some(mute(A)));

            m.expect(result).toBeObservable(expectd);
        }));

        test('A(B)*', marbles(m => {
            const A = m.hot('^-1-----')
            const B = m.hot('^1-2-3-4')
            const expectd = '^-12-3-4'
            const result = $(A, some(B));

            m.expect(result).toBeObservable(expectd);
        }));

        test('(AB)*', marbles(m => {
            const A = m.hot('^--a-a-')
            const B = m.hot('^-b-b-b')
            const expectd = '^--abab'
            const result = $(some(A, B));

            m.expect(result).toBeObservable(expectd);
        }));

        test('(AB)_', marbles(m => {
            const A = m.hot('^-a-a-')
            const B = m.hot('^b-b-b')
            const expectd = '^--|'
            const result = $(mute(A, B));

            m.expect(result).toBeObservable(expectd);
        }));


        test('(ABC)*', marbles(m => {
            const A = m.hot('^----a-----b----')
            const B = m.hot('^-1-2-3-4-5-6-7-')
            const C = m.hot('^--------z---y--')
            const expectd = '^----a3--z-b6y--'
            const result = $(
                some(
                    A, B, C
                )
            );
            m.expect(result).toBeObservable(expectd);
        }));

        test('(_AB*_C)*', marbles(m => {
            const A = m.hot('^----0-----0----')
            const B = m.hot('^-1-2-3-4-5-6-7-')
            const C = m.hot('^--------0---0--')
            const expectd = '^-----3-4---6---'
            const result = $(
                some(
                    mute(A), some(B), mute(C)
                )
            );
            m.expect(result).toBeObservable(expectd);
        }));

        test('(AB)*_A', marbles(m => {
            const A = m.hot('^--a---a-')
            const B = m.hot('^-1-2-3-4')
            const expectd = '^--|'
            const result = $(
                some(A, B)
                , mute(A)
            );
            m.expect(result).toBeObservable(expectd);
        }));
    })

    describe('A{1,2}', () => {
        test('A{1,2}', marbles(m => {
            const A = m.hot('^-a-b-c-d-e-f-');
            const expectd = '^-a-(b|)';
            const result = $(many(1, 2)(A));
            m.expect(result).toBeObservable(expectd);
        }));

        test('A{3, 3}', marbles(m => {
            const A = m.hot('^-0-1-2-3-4-5-');
            const expectd = '^-0-1-(2|)';
            const result = $(many(3, 3)(A));
            m.expect(result).toBeObservable(expectd);
        }));

        test('A{1,3}B', marbles(m => {
            const A = m.hot('^0-1-2-3-4-5-6');
            const B = m.hot('^-------b-b-b-');
            const expectd = '^0-1-2--(b|)';
            const result = $(many(1, 3)(A), B);
            m.expect(result).toBeObservable(expectd);
        }));
    })

    describe('A?', () => {
        test('A?', marbles(m => {
            const A = m.hot('^-0-1-2');
            const B = m.hot('^----b-');
            const expectd = '^-0--(b|)';
            const result = $(maybe(A), B);
            m.expect(result).toBeObservable(expectd);
        }))

        test('A? (case 2)', marbles(m => {
            const A = m.hot('^---0-1-2');
            const B = m.hot('^--b-');
            const expectd = '^--(b|)';
            const result = $(maybe(A), B);
            m.expect(result).toBeObservable(expectd);
        }))
    })
})

