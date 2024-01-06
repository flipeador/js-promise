/*
    Extended promise functionality and utilities.
    https://github.com/flipeador/js-promise
*/

// import { setTimeout } from 'node:timers';

export class PromiseError extends Error { }

export class PromiseTimeout extends PromiseError {
    constructor(timeout) {
        super(`Promise timed out after ${timeout} ms`);
    }
}

/**
 * Promise object with extended functionality.
 */
export class PromiseEx extends Promise
{
    /** @type {'pending'|'fulfilled'|'rejected'} */
    state = 'pending';
    expired = false;

    /**
     * Create a PromiseEx object.
     * @param {Function} callback `Function(resolveFn, rejectFn)`.
     * @param {Object} options Options.
     * @param {Number} options.timeout Rejects with {@link PromiseTimeout} once the timeout expires.
     * @param {Function} options.onEvent Function called when the promise resolves, rejects or expires.
     * @param {Function} options.onSettled Function called when the promise is fulfilled or rejected.
     * @param {Function} options.onResolve Function called when the promise is fulfilled.
     * @param {Function} options.onReject Function called when the promise is rejected.
     * @param {Function} options.onTimeout Function called when the promise has expired.
     * @param {Array} options.args List of arguments that receive the events.
     */
    constructor(callback, options)
    {
        if (typeof(callback) !== 'function' && options === undefined) {
            options = callback;
            callback = undefined;
        }

        const promise = { };
        super((resolve, reject) => Object.assign(promise, { resolve, reject }));

        if (options?.timeout !== undefined && options.timeout !== null) {
            if (typeof(options.timeout) !== 'number')
                throw new PromiseError('Invalid timeout');
            this.timeout = Math.max(0, options.timeout);
            this.timer = setTimeout(() => {
                this.#emit('onTimeout', options);
                this.reject(new PromiseTimeout(this.timeout));
                this.expired = true;
            }, this.timeout);
        }

        this.resolve = (value) => {
            if (this.state === 'pending') {
                promise.resolve(value);
                return !this.#settled('fulfilled', 'onResolve', value, options);
            }
        };

        this.reject = (error) => {
            if (this.state === 'pending') {
                promise.reject(error);
                return !this.#settled('rejected', 'onReject', error, options);
            }
        };

        callback?.call(this, this.resolve, this.reject);
    }

    tap(handler)
    {
        return this.then(value => (
            new Promise(r => r(handler(value)))
            .then(() => value)
        ));
    }

    static resolve(x, options)
    {
        return (
            typeof(x) === 'object' && typeof(x.then) === 'function'
            ? new this(x.then.bind(x), options)
            : new this(resolve => resolve(x))
        );
    }

    /**
     * Reduce an array of functions down to a promise chain.
     */
    static compose(...funcs)
    {
        return (value) => funcs.reduce(
            (acc, val) => acc.then(val),
            Promise.resolve(value)
        );
    }

    static wait(delay)
    {
        return new Promise(resolve => {
            setTimeout(resolve, delay);
        });
    }

    #emit(event, options, ...value)
    {
        options?.[event]?.call(this, ...value, ...options.args??[]);
        options?.onEvent?.call(this, ...value, ...options.args??[]);
    }

    #settled(state, event, value, options)
    {
        this.state = state;
        this.#emit(event, options, value);
        options?.onSettled?.call(this, value, ...options.args??[]);
        this.resolve = () => null;
        this.reject = () => null;
        clearTimeout(this.timer);
        delete this.timer;
    }
}

/**
 * Control the concurrency of an async function.
 */
export class PromiseSync {
    promise = Promise.resolve();

    /**
     * Execute a function and block until it returns, resolves or rejects.
     * The `callback` is executed after the previous callback has returned.
     * @param {Function} callback `Function(resolve,reject)` to execute.
     * @param {Boolean} resolveOnReturn Whether to resolve when `callback` returns.
     * @return Returns the resolved value or the result of `callback`.
     */
    run(callback, resolveOnReturn)
    {
        return this.#execute(callback, resolveOnReturn);
    }

    /**
     * Try to execute a function and block until it returns, resolves or rejects.
     * The `callback` is executed after the previous callback has returned.
     * @param {Function} callback `Function(resolve,reject)` to execute.
     * @param {Boolean} resolveOnReturn Whether to resolve when `callback` returns.
     * @return Returns the resolved value or the result of `callback`.
     * @remarks Any errors are ignored and set as resolved.
     */
    try(callback, resolveOnReturn)
    {
        return this.#execute(callback, resolveOnReturn, true);
    }

    #execute(callback, resolveOnReturn, resolveOnError)
    {
        if (typeof(callback) !== 'function')
            throw new PromiseError('Invalid callback function');
        return new Promise((resolve, reject) => {
            const reject2 = resolveOnError ? resolve : reject;
            this.promise = this.promise.then(() => {
                return new Promise(async (_resolve) => {
                    try {
                        const retval = await callback(
                            (value) => _resolve(resolve(value)),
                            (value) => _resolve(reject(value))
                        );
                        if (resolveOnReturn) _resolve(resolve(retval));
                    } catch (error) {
                        _resolve(reject2(error));
                    }
                });
            });
        });
    }

    /**
     * Wrap an async function to prevent multiple simultaneous invocations.
     * @param {Function} fn The async function to wrap.
     * @param {Function?} callback Function to be called before blocking.
     * @param {Function?} check Function to check the previous result and determine whether to continue executing `fn`.
     * @return {Function} Returns an async function.
     */
    static wrap(fn, callback, check)
    {
        let promise = Promise.resolve();
        let cache = { result: undefined };
        return async (...args) => {
            if (callback) await callback(...args);
            return promise = promise.then(async () => {
                if (cache && (!check || await check(cache.result)))
                    // eslint-disable-next-line require-atomic-updates
                    return cache.result = await fn(...args);
                // eslint-disable-next-line require-atomic-updates
                cache = undefined;
            });
        };
    }
}

export default {
    PromiseError,
    PromiseTimeout,
    PromiseEx,
    PromiseSync
};
