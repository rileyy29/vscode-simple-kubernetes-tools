export class AsyncLock<T> {
    private pending: Promise<T> | null = null;

    async run(factory: () => Promise<T>): Promise<T> {
        if (this.pending) {
            return this.pending;
        }

        this.pending = factory();

        return this.pending.finally(() => {
            this.pending = null;
        });
    }
}
