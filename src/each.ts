import { isFunc, isArrayLike, isIterable } from '@benzed/types'

import { EachIterable } from './each-iterable'

import { eachObjectInPrototypeChain } from './generators'
import { EachEnumerableInheritedKey } from './each-key'
import {
    eachIndex,
    Indexable,
    IndexesOf,
    IndexesOfOptionsSignature
} from './index-generator'

//// EsLint ////
/* eslint-disable 
    @typescript-eslint/no-explicit-any
*/

//// Helper Types ////

type EachYield<T extends any[]> = T extends [infer F, ...infer R]
    ? F extends
          | Iterable<infer Tx>
          | ArrayLike<infer Tx>
          | Record<PropertyKey, infer Tx>
        ? Tx | EachYield<R>
        : F | EachYield<R>
    : never

//// Hero Type ////

interface Each extends Omit<EachEnumerableInheritedKey, '_options'> {
    /**
     * Iterate through each value on an array like.
     */
    <T>(arrayLike: ArrayLike<T>): EachIterable<T>

    /**
     * Iterate given a factory function that returns an iterable.
     */
    <T>(iterableFactory: () => Iterable<T>): EachIterable<T>

    /**
     * Iterate through each value on an object.
     */
    <T extends object>(object: T): EachIterable<T[keyof T]>

    /**
     * Iterate each element of any number of iterables
     */
    <T extends any[]>(...targets: T): EachIterable<EachYield<T>>

    /**
     * Iterate through each prototype chain of any number of objects
     */
    prototypeOf(...objects: object[]): EachIterable<object>

    indexOf<T extends Indexable>(
        arrayLike: T,
        ...options: IndexesOfOptionsSignature
    ): EachIterable<IndexesOf<T>>
}

//// Hero signature ////

function each(...items: any[]) {
    const isIterableGetter = isFunc<() => Iterable<unknown>>

    for (const index of eachIndex(items)) {
        const item = items[index]

        // cast to iterable
        if (!isIterable(item)) {
            items[index] = isArrayLike(item)
                ? Array.from(item)
                : isIterableGetter(item)
                ? item()
                : [item]
        }
    }

    return new EachIterable(...items)
}

/** Hero {@link Each} interface implementation */
{
    each satisfies Each

    // 1. Assignments for the type system
    each.own = EachEnumerableInheritedKey.prototype.own
    each.defined = EachEnumerableInheritedKey.prototype.defined
    each.keyOf = EachEnumerableInheritedKey.prototype.keyOf
    each.nameOf = EachEnumerableInheritedKey.prototype.nameOf
    each.symbolOf = EachEnumerableInheritedKey.prototype.symbolOf
    each.descriptorOf = EachEnumerableInheritedKey.prototype.descriptorOf
    each.valueOf = EachEnumerableInheritedKey.prototype.valueOf
    each.entryOf = EachEnumerableInheritedKey.prototype.entryOf

    each.prototypeOf = function prototypeOf<T extends object[]>(
        ...objects: T
    ): EachIterable<object> {
        return new EachIterable(objects.map(eachObjectInPrototypeChain))
    }

    each.indexOf = function indexOf<T extends Indexable>(
        arrayLike: T,
        ...options: IndexesOfOptionsSignature
    ): EachIterable<IndexesOf<T>> {
        const indexGenerator = (eachIndex as any)(arrayLike, ...options)
        return new EachIterable([indexGenerator])
    }

    // 2. Assignments for runtime

    Object.defineProperties(each, {
        //  State
        _options: {
            value: {
                enumerable: true,
                own: false
            },
            enumerable: false,
            writable: false,
            configurable: false
        },

        //  Getters
        own: Object.getOwnPropertyDescriptor(
            EachEnumerableInheritedKey.prototype,
            'own'
        ) as PropertyDescriptor,

        defined: Object.getOwnPropertyDescriptor(
            EachEnumerableInheritedKey.prototype,
            'defined'
        ) as PropertyDescriptor
    })

    for (const [key, value] of each.entryOf(each)) {
        const isInterfaceMethod = isFunc(value)
        if (isInterfaceMethod) {
            each[key] = value.bind(each) as any
        }
    }
}

//// Exports ////

export default each as Each
