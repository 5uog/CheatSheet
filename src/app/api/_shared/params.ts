// FILE: src/app/api/_shared/params.ts
export type ParamsLike<T extends Record<string, string>> = { params: T } | { params: Promise<T> };

export async function readParams<T extends Record<string, string>>(ctx: ParamsLike<T>): Promise<T> {
    const p = (ctx as { params: unknown }).params;
    return (p instanceof Promise ? await p : (p as T)) as T;
}
