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
        <br/>
    </h1>
</div>

## 📖 Intro

Query events from multiple streams

## 📦 Install

```
npm i rx-rql
```

Or [**try it online**](https://stackblitz.com/edit/rx-rql?file=index.ts)

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
