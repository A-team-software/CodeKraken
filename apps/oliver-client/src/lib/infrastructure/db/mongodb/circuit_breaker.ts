export class DBCircuitBreaker {
    private failures = 0;
    private lastFailureTime = 0;

    constructor(
        private readonly failureThreshold = 5,
        private readonly resetTimeoutMs = 10_000
    ) { }

    canExecute(): boolean {
        if (this.failures < this.failureThreshold) return true;

        const elapsed = Date.now() - this.lastFailureTime;

        if (elapsed > this.resetTimeoutMs) {
            this.failures = 0;
            return true;
        }

        return false;
    }

    recordSuccess() {
        this.failures = 0;
    }

    recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
    }
}
