import { EMPTY } from 'rxjs';
import { one } from './compile';

describe('Compilation', () => {

    describe('one', () => {
        test('one', () => {
            const a = one(EMPTY);
            const r = a.create();
            expect(r.status()).toBe('undone');
        });
    });

});
