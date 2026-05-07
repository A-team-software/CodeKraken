export function assertString(value: unknown, fieldName: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Invalid pull request payload: missing or invalid ${fieldName}.`);
    }

    return value;
}

export function optionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function assertId(value: unknown, fieldName: string): string {
    if (value === undefined || value === null || value === "") {
        throw new Error(`Invalid pull request payload: missing or invalid ${fieldName}.`);
    }

    const str = String(value).trim();
    if (!str) {
        throw new Error(`Invalid pull request payload: missing or invalid ${fieldName}.`);
    }

    return str;
}
