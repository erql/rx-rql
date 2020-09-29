import { StreamKeyType, ExpressionString } from "../src";

// INTERFACES

export interface AST {
    root: ExpressionNode;
}

export interface ExpressionNode {
    type: 'EXPRESSION',
    content: ASTNode[]
}

export type ASTNode = StreamNode | RepeatNode;

export interface StreamNode {
    type: 'STREAM',
    content: StreamKeyType
}

export interface RepeatNode {
    type: 'REPEAT',
    content: StreamNode
}

// IMPLEMENTATION

export function parse(expression: ExpressionString): AST {
    const ast: AST = {
        root: {
            type: 'EXPRESSION',
            content: []
        }
    }

    parseGroup(ast.root, expression);

    return ast;
}

function parseGroup(root: ExpressionNode, expression: ExpressionString) {
    if (!expression.length) {
        return root;
    }

    const match = expression.match(/^([A-Z])(\*)?/);

    if (!match) {
        throw 'invalid expression';
    }

    const isRepeat = !!match[2];

    if (isRepeat) {
        root.content.push({
            type: 'REPEAT',
            content: {
                type: 'STREAM',
                content: match[1] as StreamKeyType
            }
        });

        if (expression.length == 2) {
            return root;
        }
    } else {
        root.content.push({
            type: 'STREAM',
            content: match[1] as StreamKeyType
        })

        if (expression.length == 1) {
            return root;
        }
    }

    return parseGroup(root, expression.slice(isRepeat ? 2 : 1));
}