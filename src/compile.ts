import { AST, ASTNode, ExpressionNode, RepeatNode, StreamNode } from './ast';
import { Dependencies } from '../src';
import { Subject } from 'rxjs';
import { tap } from 'rxjs/operators';

function compileNode(node: ASTNode) {
    if (node.type == 'REPEAT') {
        return compileRepeat(node);
    }

    if (node.type == 'STREAM') {
        return compileStream(node);
    }
}

function compileStream(node: StreamNode) {
    function matchesEmission(key) {
        return key == node.content;
    }

    return {
        type: node.type,
        matchesEmission,
    }
}

function compileRepeat(node: RepeatNode){
    const childNode = compileStream(node.content);

    function matchesEmission(key) {
        return childNode.matchesEmission(key);
    }

    return {
        type: node.type,
        matchesEmission,
    }
}

function compileExpression(node: ExpressionNode) {
    const output = new Subject();
    let currIndex = 0;
    const nodes = node.content.map(compileNode);

    function handleEmission(key, value){
        const currNode = nodes[currIndex];
        let completed = false;

        if (currNode.type == 'STREAM') {
            if (currNode.matchesEmission(key)) {
                output.next(value);
                currIndex += 1;
            }
        }

        if (currNode.type == 'REPEAT') {
            const nextNode = nodes[currIndex + 1];
            if (nextNode && nextNode.matchesEmission(key)) {
                currIndex++;
                return handleEmission(key, value);
            } else if (currNode.matchesEmission(key)) {
                output.next(value);
            }
        }

        // check if capturing group should be completed
        if (currIndex > nodes.length - 1) {
            output.complete();
            completed = true;
        }

        return { completed };
    }

    function matchesEmission() {
        return true;
    }

    return {
        type: node.type,
        matchesEmission,
        output,
        handleEmission
    }
}

function compile(ast: AST, deps: Dependencies) {
    if (ast.root.type != 'EXPRESSION') {
        throw 'root should be an expression';
    }

    const rootNode = compileExpression(ast.root);

    const entries = Object.entries(deps).map(([key, stream]) => {
        const subscription = stream.subscribe({
            next: value => rootNode.handleEmission(key, value),
            complete: () => {
                // hacky way to complete output and unsubscribe all streams
                rootNode.output.complete()
            }
        })

        return {
            key,
            subscription
        }
    });

    return rootNode.output.pipe(
        tap({
            complete() {
                entries.forEach(e => e.subscription.unsubscribe())
            }
        })
    );
}

export { compile }