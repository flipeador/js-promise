# JavaScript PromiseEx

Extended promise functionality and utilities.

## Installation

```
npm i flipeador/js-promise#semver:^1.0.0
```

## Examples

<details>
<summary><h5>Basic usage</h5></summary>

```js
import { PromiseEx } from '@flipeador/js-promise';

const promise = new PromiseEx(
    // callback
    (_resolve, _reject) => { ; },
    // options
    {
        onResolve(value, hello, world) {
            this.result = `${hello} ${world}${value}`; // (1)
        },
        args: ['Hello', 'World']
    }
);

promise.resolve('!'); // (2)

console.log('Resolve:', await promise); // (2)
console.log('Result:', promise.result); // (1)
```

```js
Resolve: !
Result: Hello World!
```

</details>

<details>
<summary><h5>Events and Timeout</h5></summary>

`PromiseEx` allows to set callbacks for when the promise is **settled** or **expires**.

```js
import { PromiseEx } from '@flipeador/js-promise';

function onEvent(value)
{
    switch (this.state)
    {
        case 'fulfilled':
            console.log('The promise has been resolved with:', value);
            break;
        case 'rejected':
            console.log('The promise has been rejected with:', value.message);
            break;
        default: // timeout
            // By default, when a promise expires, it is rejected with PromiseTimeout error.
            // This behavior can be changed by calling this#resolve or this#reject before returning.
            console.log(`The promise has expired after ${this.timeout} ms`);
            //this.resolve('I don\'t want an error!'); // (1)
            break;
    }
}

// The 'callback' parameter can be omitted.
const promise = new PromiseEx({ onEvent, timeout: 1000 });

try {
    await promise; // throws after 1000 ms
} catch (error) {
    console.log(error); // PromiseTimeout [Error]
}

console.log('Promise state:', promise.state);
```

```
The promise has expired after 1000 ms
The promise has been rejected with: Promise timed out after 1000 ms
PromiseTimeout [Error]: Promise timed out after 1000 ms
    ...
Promise state: rejected
```

If the line marked with `(1)` is uncommented, the following output will be displayed:

```
The promise has expired after 1000 ms
The promise has been resolved with: I don't want an error!
Promise state: fulfilled
```

</details>

<details>
<summary><h5>Control the concurrency of an async function</h5></summary>

```js
import { PromiseEx, PromiseSync } from '@flipeador/js-promise';

const psync = new PromiseSync();

async function asyncFn(index) {
    console.log(await new Promise(async (resolve) => {
        await PromiseEx.wait(index & 1 ? 100 : 50);
        resolve(`asyncFn: Index #${index}`);
    }));
}

async function asyncSyncFn(index) {
    console.log(await psync.run(async (resolve) => {
        await PromiseEx.wait(index & 1 ? 100 : 50);
        resolve(`asyncSyncFn: Index #${index}`);
    }));
}

for (let i = 1; i <= 5; ++i)
    asyncFn(i);

await PromiseEx.wait(1000);
console.log('-'.repeat(50));

for (let i = 1; i <= 5; ++i)
    asyncSyncFn(i);

await PromiseEx.wait(1000);
console.log('-'.repeat(50));

const asyncSyncFn2 = PromiseSync.wrap(asyncFn);
for (let i = 1; i <= 5; ++i)
    asyncSyncFn2(`${i} (PromiseSync.wrap)`);
```

```
asyncFn: Index #2
asyncFn: Index #4
asyncFn: Index #1
asyncFn: Index #3
asyncFn: Index #5
--------------------------------------------------
asyncSyncFn: Index #1
asyncSyncFn: Index #2
asyncSyncFn: Index #3
asyncSyncFn: Index #4
asyncSyncFn: Index #5
--------------------------------------------------
asyncFn: Index #1 (PromiseSync.wrap)
asyncFn: Index #2 (PromiseSync.wrap)
asyncFn: Index #3 (PromiseSync.wrap)
asyncFn: Index #4 (PromiseSync.wrap)
asyncFn: Index #5 (PromiseSync.wrap)
```

</details>

## License

This project is licensed under the **GNU General Public License v3.0**. See the [license file](LICENSE) for details.
