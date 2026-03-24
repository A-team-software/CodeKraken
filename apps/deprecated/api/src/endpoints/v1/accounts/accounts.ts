import { Logger, SafeExecute } from "@oliver/utils";
import { AccountInput, DB, ZodAccountSchema } from "@oliver/db";
import { DBAccount, Account } from "@oliver/db";
import { UserInterface } from "@oliver/db";
import { APIResponse, parseRequest } from "../../../interfaces/api_response";
import { StatusCode } from "../../../interfaces/http_status";
import { inspect } from "util";
import { typeToFlattenedError, unknown, ZodError, ZodUndefined } from 'zod';


export default async function handler(req: Request) {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({
            Ok: false,
            entity: "error",
            message: "Method not allowed"
        }), { status: StatusCode.METHOD_NOT_ALLOWED });
    }
    try {

        const [parsedRequest, er] = await SafeExecute.withSync(parseRequest, req);
        if (er !== null) {
            Logger.logError(er);
            return Response.json(
                <APIResponse<null>>{
                    status: StatusCode.BAD_REQUEST,
                    Ok: false,
                    entity: "Error",
                    message: "Invalid request body",
                    data: null,
                });
        }
        if (parsedRequest === null) {
            return Response.json(
                <APIResponse<null>>{
                    status: StatusCode.BAD_REQUEST,
                    Ok: false,
                    entity: "Error",
                    message: "Invalid request body",
                    data: null,
                });
        }
        const [account, err] = SafeExecute.noSync(ZodAccountSchema.parse, parsedRequest);
        if (err instanceof ZodError) {
            return Response.json(
                <APIResponse<typeToFlattenedError<any, string>>>{
                    status: StatusCode.BAD_REQUEST,
                    Ok: false,
                    entity: "Error",
                    message: "Invalid request body",
                    data: err.flatten(),
                })
        }

        if ((err !== null) || (account === null)) {
            Logger.logError(err);
            return Response.json(
                <APIResponse<null>>{
                    status: StatusCode.BAD_REQUEST,
                    Ok: false,
                    entity: "Error",
                    message: "Invalid request body",
                    data: null,
                });
        }
        const { name, profilePicture, permissions, role, firstTime } = account;

        const doc: AccountInput = { name, profilePicture, permissions, role, firstTime };
        const [databaseResponse, error] = await SafeExecute.withSync(DB.create, doc, DBAccount);
        if (error !== null) {
            Logger.logError(error);
            return Response.json(
                {
                    status: StatusCode.INTERNAL_SERVER_ERROR,
                    Ok: false,
                    entity: "Error",
                    message: "Internal server error",
                });
        }
        if (databaseResponse === null) {
            return Response.json(
                <APIResponse<null>>{
                    status: StatusCode.INTERNAL_SERVER_ERROR,
                    Ok: false,
                    entity: "Error",
                    message: "Failed to create account record in the database",
                    data: null,
                });
        }

        const responseData: APIResponse<Account> = {
            Ok: true,
            entity: "Account",
            message: "Success",
            data: databaseResponse,
            status: StatusCode.OK,
        };

        return Response.json(
            responseData,
            {
                headers: { "Content-Type": "application/json" },
                status: StatusCode.OK,
            });
    } catch (error: any) {
        Logger.logError(error);
        return Response.json(
            {
                status: StatusCode.INTERNAL_SERVER_ERROR,
                Ok: false,
                entity: "error",
                message: "INTERNAL_SERVER_ERROR",
            });
    }
}

