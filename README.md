<div align="center">
    <br/>
    <code>AB*C</code>
    <br/>
    <code>[A --a--------]</code>
    <br/>
    <code>[B -b-b-b-b-b-]</code>
    <br/>
    <code>[C --------c--]</code>
    <br/>
    <code>[= --ab-b-bc| ]</code>
    <br/>
    <br/>
    <h1>
        Reactive Query Language
        <br/>
        <a href="https://www.npmjs.com/package/rx-rql"><img src="https://img.shields.io/npm/v/rx-rql" alt="NPM"></a>
        <a href="https://bundlephobia.com/result?p=rx-rql@latest"><img src="https://img.shields.io/bundlephobia/minzip/rx-rql?label=gzipped" alt="Bundlephobia"></a>
        <a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/npm/l/rx-rql" alt="MIT license"></a>
    </h1>
</div>

## 📖 Intro

Extract events from multiple streams using [**query commands**](#-api)

## 📦 Install

```
npm i rx-rql
```

It's quite small: just a **[couple of kBs](https://bundlephobia.com/result?p=rx-rql)**!

## ⛱ Example

To create a Drag-n-Drop behavior you can select all _mouse-move_ events, betweeen each _mouse-down_ and _mouse-up_:

```ts
// Mouse DnD implemented using rx-rql
import { fromEvent } from 'rxjs';
import { query, some, mute } from 'rx-rql';

// get dom element to drag
const item = document.getElementById('item');
const updatePosition = p => {
  item.style.left = p.x + 'px';
  item.style.top = p.y + 'px';
};

// capture mouse down, up and move
const down$ = fromEvent(item, 'mousedown');
const move$ = fromEvent(document, 'mousemove');
const up$   = fromEvent(document, 'mouseup');

// (_down, move*, _up)*
// listen to a query & update element position
query(
  some(mute(down$), some(move$), mute(up$))
)
  .subscribe(updatePosition)

```

[**Try this example online**](https://stackblitz.com/edit/rx-rql?file=index.ts)

## 🔧 API

### Query root

Your query should be wrapped in a `query` or `$` function

```ts
query(A, B, C).subscribe(console.log);
```

It returns an Observable of query results!

### `A`, `B`, `C` — single emission

To select a single event from a stream — just pass that stream to the `query` function or one of the operators:

```ts
// $ A
// A ---Hi-----
// = ---(H|)
const A = of('H', 'i');
query(A).subscribe(console.log); // > H

// $ AA
// A ---Hi-----
// = ---H(i|)
query(A, A).subscribe(console.log); // > H > i

// $ AB
// A --H-i-----
// B -W-o-r-l-d
// = --H(o|)
const A = of('H', 'i');
const B = of('W', 'o', 'r', 'l', 'd');
query(A, B).subscribe(console.log); // > H > o
```

### `_A` — mute

Use `mute(…)` to query an event, but suppress its emission:

```ts
// $ A_B
// A --H-i-----
// B -W-o-r-l-d
// = --(H|)
const A = of('H', 'i');
const B = of('W', 'o', 'r', 'l', 'd');
query(A, mute(B)).subscribe(console.log); // > H > W
```

### `A*` — some

Use `some(…)` to select as many events as possible:

```ts
// $ A*
// A Hi--------
// = Hi--------
const A = of('H', 'i');
query(some(A)).subscribe(console.log); // > H > i
```

This operator is *not greedy*, it will select events while it can. You may limit it with another event:

```ts
// A*B
// A 0-1-2-3-4
// B ---b-----
// = 0-1(b|)
const A = timer(0, 10);
const B = of('b').pipe( delay(35) );
query(some(A), B).subscribe(console.log); // > 0 > 1 > b
```

### `A?` — maybe

Use `maybe(…)` to select `0` or `1` events:

```ts
// $ A?B
// A 0-1-2-3-4
// B ---b-----
// = 0--(b|)
const A = timer(0, 10);
const B = of('b').pipe( delay(35) );
query(maybe(A), B).subscribe(console.log); // > 0 > b
```

### `A{min,max}` — many

Use `many(min, max)(…)` to select at least `min` and at most `max` events:

```ts
// $ A{1, 3}
// A 0-1-2-3-4
// B -------b-
// = 0-1-2--(b|)
const A = timer(0, 10);
const B = of('b').pipe( delay(45) );
query(many(1, 3)(A), B).subscribe(console.log); // > 0 > 1 > 2 > b
```

## 🤝 Want to contribute to this project?

That will be awesome!

Please create an issue before submiting a PR — we'll be able to discuss it first!

Thanks!

## Enjoy 🙂
