import { isFunc, isArrayLike, isIterable } from '@benzed/types'

import { EachIterable } from './each-iterable'

import { eachObjectInPrototypeChain, eachValue } from './generators'
import { EachEnumerableInheritedKey } from './each-key-interface'
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

type Iterables = Iterable<any>[]

type IterableYield<T extends Iterables> = T[number] extends Iterable<infer Tx>
    ? Tx
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
     * Iterate each element of any number of iterables
     */
    <T extends Iterables>(...items: T): EachIterable<IterableYield<T>>

    /**
     * Iterate through each value on an object.
     */
    <T extends object>(object: T): EachIterable<T[keyof T]>

    /**
     * Iterate through each prototype chain of any number of objects
     */
    prototypeOf<T extends object[]>(...objects: T): EachIterable<object>

    indexOf<T extends Indexable>(
        arrayLike: T,
        ...options: IndexesOfOptionsSignature
    ): EachIterable<IndexesOf<T>>
}

//// Hero signature ////

function each(...items: Iterables | [ArrayLike<unknown>] | [object]) {
    for (const index of eachIndex(items)) {
        const item = items[index]

        if (!isIterable(item)) {
            items[index] = isArrayLike(item)
                ? Array.from(item)
                : isFunc(item)
                ? item()
                : eachValue(item)
        }
    }

    return new EachIterable(items as Iterables)
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
