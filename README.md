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

Your query should be wrapped in a `query` or `$` function. It returns an Observable of query results:

```ts
query(A, B, C).subscribe(console.log);
```

### A, B, C

To select a single event on a stream — just pass that stream to the `query` or one of the operators:

```ts
// A Hi--------
// = H---------
const A = of('H', 'i');
query(A).subscribe(console.log); // > H
query(A, A).subscribe(console.log); // > H > i

// A Hi--------
// B World-----
// = (HW)------
const A = of('H', 'i');
const B = of('W', 'o', 'r', 'l', 'd');
query(A, B).subscribe(console.log); // > H > W
```

### some

To select as many events from a stream or other operator as possible — use `some(...)`:

```ts
// A Hi--------
// = Hi--------
const A = of('H', 'i');
query(some(A)).subscribe(console.log); // > H > i
```

This operator is *greedy*, it will select events while it can. You may limit it with another event:

```ts
// A 0-1-2-3-4
// B ---b-----
// = 0-1(b|)
const A = timer(0, 10);
const B = of('b').pipe( delay(35) );
query(some(A), B).subscribe(console.log); // > 0 > 1 > b
```

### mute

`mute` will select an event from a stream, but will not emit it's value:

```ts
// A 0-1-2-3-4
// B ---b-----
// = 0-1|
const A = timer(0, 10);
const B = of('b').pipe( delay(35) );
query(some(A), B).subscribe(console.log); // > 0 > 1 > b
```

## 🤝 Want to contribute to this project?

That will be awesome!

Please create an issue before submiting a PR — we'll be able to discuss it first!

Thanks!

## Enjoy 🙂
