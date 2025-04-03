import { Logger } from "@/utils/logger/logger";
import DB from "../../../../lib/db/db";
import User from "../../../../lib/db/models/user";
import UserModelInterface from "../../../../lib/db/interfaces/user";
import { APIResponse } from "../../../../lib/server/api_response";
import { StatusCode } from '../../../../entities/http_status';
import mongoose from "mongoose";


export default async function handler(req: Request) {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({
            Ok: false,
            entity: "error",
            message: "Method not allowed"
        }), { status: StatusCode.METHOD_NOT_ALLOWED });
    }
    console.log(mongoose.connections[0].readyState);
    try {
        const { name, phoneNumber } = await req.json();

        if (!name || !phoneNumber) {
            return new Response("", { status: StatusCode.BAD_REQUEST });
        }


        const doc: UserModelInterface = { name, phoneNumber };
        const result = await DB.create(doc, User);

        if (!result) {
            console.log(result);
            return Response.json(
                {
                    status: StatusCode.INTERNAL_SERVER_ERROR, Ok: false,
                    entity: "error",
                    message: "Can't create doc"
                });
        }

        const data: APIResponse<UserModelInterface> = {
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

