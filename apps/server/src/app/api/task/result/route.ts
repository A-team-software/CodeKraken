import { NextRequest, NextResponse } from "next/server";
import { JobConfig, JobResult } from "@/brain/shared";
import { ProjectManagerTaskProcessorFactory } from "../../services/project-manager-task-processor-factory";

type SaveJobRequestBody = {
    config: JobConfig;
    result: JobResult;
};

export async function POST(request: NextRequest) {
    try {
        const jobId = request.nextUrl.searchParams.get("jobId")?.trim();
        if (!jobId) {
            return NextResponse.json(
                { success: false, error: "Missing jobId query parameter." },
                { status: 400 }
            );
        }

        const body = (await request.json()) as Partial<SaveJobRequestBody>;
        if (!body?.config || !body?.result) {
            return NextResponse.json(
                { success: false, error: "Request body must include config and result." },
                { status: 400 }
            );
        }

        const runner = new ProjectManagerTaskProcessorFactory().getRunner();
        await runner.saveJob(jobId, {
            result: body.result
        });

        return NextResponse.json({ success: true, jobId }, { status: 200 });
    } catch (error: any) {
        console.error("Error executing task:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to execute task" },
            { status: 500 }
        );
    }
}
