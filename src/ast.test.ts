import { parse } from "./ast"


describe('Ast', () => {
    test('A', () => {
        const ast = parse('A');

        expect(ast).toEqual({
            root: {
                type: 'EXPRESSION',
                content: [
                    { type: 'STREAM', content: 'A' }
                ]
            }
        });
    })

    test('AB', () => {
        const ast = parse('AB');

        expect(ast).toEqual({
            root: {
                type: 'EXPRESSION',
                content: [
                    { type: 'STREAM', content: 'A' },
                    { type: 'STREAM', content: 'B' }
                ]
            }
        });
    })

    test('XY*Z', () => {
        const ast = parse('XY*Z');

        expect(ast).toEqual({
            root: {
                type: 'EXPRESSION',
                content: [
                    { type: 'STREAM', content: 'X' },
                    {
                        type: 'REPEAT', content:
                            { type: 'STREAM', content: 'Y' }
                    },
                    { type: 'STREAM', content: 'Z' }
                ]
            }
        });
    })
})