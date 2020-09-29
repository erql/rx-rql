/**
 * TODO: setup tests to use marble diagrams
 *
 * A   ---2-----
 * B   --1-3-5--
 * C   -0---4-6-
 *
 *       /ABC/
 *
 *     --234|
 *
 */

import { marbles } from 'rxjs-marbles/jest';
import { exec } from '../src';

describe('End to end', () => {

    test('A', marbles(m => {
        const A = m.hot('^-1-2-3-|')
        const regex = 'A'
        const expected = '^-(1|)'
        const dep = { A };

        const result = exec(regex, dep);
        m.expect(result).toBeObservable(expected);
    }))

})