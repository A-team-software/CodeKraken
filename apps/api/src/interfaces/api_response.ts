export type APIResponse<T> = {
    Ok?: boolean;
    entity: string;
    message?: string;
    data?: T;
};
