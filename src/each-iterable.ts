import { nil } from '@benzed/types'

import {
    priorityFind,
    priorityFindIndex,
    unique,
    shuffle,
    first,
    last,
    nth
} from '@benzed/array'

import { eachIndex } from './index-generator'

//// Types ////

type Mapper<T, O = unknown> = (value: T, index: number, array: T[]) => O

type WithEach<T> = Mapper<T, unknown>
type Predicate<T> = Mapper<T, boolean>

type Sorter<T> = (a: T, b: T) => number

//// Class ////

export class EachIterable<T> {
    private _current: Iterator<T> | nil
    private _iterables: Iterable<T>[]
    constructor(...iterables: Iterable<T>[]) {
        this._current = nil
        this._iterables = iterables
    }

    //// Iterator Implementation ////

    next(): IteratorResult<T> {
        const current = (this._current ??= this._iterables
            .shift()
            ?.[Symbol.iterator]())
        if (!current) return { value: nil, done: true }

        const result = current.next()
        if (result.done) {
            this._current = nil
            return this.next()
        }

        return result
    }

    //// Iterable Implementation ////

    [Symbol.iterator]() {
        return this
    }

    //// Convenience Methods ////

    toArray(): T[] {
        return Array.from(this)
    }

    filter(...filters: [Predicate<T>, ...Predicate<T>[]]): EachIterable<T> {
        const array = this._applyAsArray()
        for (const filter of filters) {
            for (const index of eachIndex(array, true)) {
                if (!filter(array[index], index, array)) {
                    array.splice(index, 1)
                }
            }
        }
        return this
    }

    map<R>(mapper: Mapper<T, R>): EachIterable<R> {
        const output = this._applyAsArray().map(mapper)
        return new EachIterable(output)
    }

    sort(sorter: Sorter<T>): EachIterable<T> {
        const array = this._applyAsArray()
        array.sort(sorter)
        return this
    }

    unique(): EachIterable<T> {
        return this.filter(unique)
    }

    shuffle(): EachIterable<T> {
        const array = this._applyAsArray()
        shuffle(array)
        return this
    }

    at(index: number): T {
        return nth(this._applyAsArray(), index)
    }

    first(): T {
        return first(this._applyAsArray())
    }

    last(): T {
        return last(this._applyAsArray())
    }

    // TODO: return each Collection
    do(...withEach: [WithEach<T>, ...WithEach<T>[]]): EachIterable<T> {
        const array = this._applyAsArray()
        for (const method of withEach) array.forEach(method)

        return this
    }
    find<Tx extends T>(typeGuard: (value: T) => value is Tx): Tx | nil
    find(...predicates: [Predicate<T>, ...Predicate<T>[]]): T | nil
    find(...predicates: Predicate<T>[]) {
        return priorityFind(this.toArray(), ...predicates)
    }

    assert<Tx extends T>(typeGuard: (value: T) => value is Tx): Tx
    assert(...predicates: [Predicate<T>, ...Predicate<T>[]]): T
    assert(...predicates: Predicate<T>[]) {
        const array = this.toArray()
        const index = priorityFindIndex(this.toArray(), ...predicates)
        if (index < 0)
            throw new Error(
                `Predicate ${
                    predicates.length > 1 ? 'methods' : 'method'
                } did not find a result.`
            )
        return array[index]
    }

    // TODO:
    // pluck
    // at // index or function returning index
    // adjacent

    count(): number {
        const array = this._applyAsArray()
        return array.length
    }

    /// Helper

    /**
     * Get an array from each of the elements
     * in this collection, re-inserting the result
     * into {@link _iterables}, allowing this
     * instance to be re-iterated.
     *
     * Returns the mutable array.
     */
    private _applyAsArray() {
        const array = this.toArray()
        this._iterables.push(array)
        return array
    }
}
