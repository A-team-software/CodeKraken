import { StatusCode } from './http_status';
export type APIResponse<T> = {
    Ok?: boolean;
    entity: string;
    message?: string;
    data?: T;
    status: StatusCode,
};

export const parseRequest = async (request: Request) => request.json();
