import { Logger } from "@oliver/utils";
import { DatabaseClient, DB } from "@oliver/db";
import { User } from "@oliver/db";
import { UserInterface } from "@oliver/db";
import { APIResponse } from "../../../interfaces/api_response";
import { StatusCode } from "../../../interfaces/http_status";


export default async function handler(req: Request) {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({
            Ok: false,
            entity: "error",
            message: "Method not allowed"
        }), { status: StatusCode.METHOD_NOT_ALLOWED });
    }
    try {
        const { name, phoneNumber } = await req.json();

        if (!name || !phoneNumber) {
            return new Response("", { status: StatusCode.BAD_REQUEST });
        }

        const doc: UserInterface = { name, phoneNumber };
        const result = await DB.create(doc, User);

        if (!result) {
            console.log("result");
            return Response.json(
                {
                    status: StatusCode.INTERNAL_SERVER_ERROR, Ok: false,
                    entity: "error",
                    message: "INTERNAL_SERVER_ERROR",
                });
        }

        const data: APIResponse<UserInterface> = {
            Ok: true,
            entity: "User",
            message: "Success",
            data: result,
        };
        console.log(result);

        return Response.json(
            data,
            {
                headers: { "Content-Type": "application/json" },
                status: StatusCode.OK,
            });
    } catch (error: any) {
        Logger.logError(error);
        return new Response()
    }
}

