import { connection } from 'next/server';

// Wraps a 'use cache' reader so it runs only while handling a request, never while `next build`
// prerenders (there is no database there). connection() is not allowed inside a cache scope, hence the wrapper.
export function requestTime<A extends unknown[], R>(cached: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    await connection();
    return cached(...args);
  };
}
