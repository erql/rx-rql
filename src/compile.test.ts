import { marbles } from 'rxjs-marbles/jest';
import { compile } from './compile';
import { AST } from './ast';

describe('Compilation', () => {

    describe('AB', () => {
        test('A', marbles(m => {
            /**
             *      `A`
             */
            const ast: AST = {
                root: {
                    type: 'EXPRESSION',
                    content: [{ type: 'STREAM', content: 'A' }]
                }
            };

            const A = m.hot('^-1-2-3-|')
            const expected ='^-(1|)'
            const dep = { A };

            const result = compile(ast, dep);
            m.expect(result).toBeObservable(expected);
        }));

        test('AB', marbles(m => {
            /**
             *      `AB`
             */
            const ast: AST = {
                root: {
                    type: 'EXPRESSION',
                    content:
                        [ { type: 'STREAM', content: 'A' }
                        , { type: 'STREAM', content: 'B' }
                        ]
                }
            };

            const A = m.hot('^-1-----|')
            const B = m.hot('^---2---|')
            const expected ='^-1-(2|)'
            const dep = { A, B };

            const result = compile(ast, dep);
            m.expect(result).toBeObservable(expected);
        }));

        // TODO: use jest-in-case
        test('AB', marbles(m => {
            /**
             *      `AB`
             */
            const ast: AST = {
                root: {
                    type: 'EXPRESSION',
                    content:
                        [ { type: 'STREAM', content: 'A' }
                        , { type: 'STREAM', content: 'B' }
                        ]
                }
            };

            const A = m.hot('^-135---|')
            const B = m.hot('^---246-|')
            const expected ='^-1-(2|)'
            const dep = { A, B };

            const result = compile(ast, dep);
            m.expect(result).toBeObservable(expected);
        }));
    });

    describe('AB*C', () => {
        test('A*', marbles(m => {
            /**
             *      `A*`
             */
            const ast: AST = {
                root: {
                    type: 'EXPRESSION',
                    content: [{ type: 'REPEAT', content: { type: 'STREAM', content: 'A' } }]
                }
            };

            const A = m.hot('^-1-2-3-|')
            const expected ='^-1-2-3-|'
            const dep = { A };

            const result = compile(ast, dep);
            m.expect(result).toBeObservable(expected);
        }));
    })

})

