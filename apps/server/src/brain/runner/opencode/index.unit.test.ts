import { describe, expect, it, vi } from "vitest";

import { ConfigPersistenceLayer } from "../config-persistance-layer";
import { JobPersistenceLayer } from "../job-persistance-layer";
import { OpenCodeRunner } from "./index";

describe("OpenCodeRunner unit", () => {
    it("launches plan mode with plan agent command", async () => {
        const startProcess = vi.fn().mockResolvedValue({ success: true, message: "started" });
        const saveJob = vi.fn().mockResolvedValue(undefined);
        const getTenantConfig = vi.fn().mockResolvedValue(null);

        const runner = new OpenCodeRunner(
            {
                startProcess,
                stopProcess: vi.fn().mockResolvedValue({ success: true }),
                pauseProcess: vi.fn().mockResolvedValue({ success: true }),
                resumeProcess: vi.fn().mockResolvedValue({ success: true })
            },
            {
                saveJob,
                getJob: vi.fn().mockResolvedValue(null),
                deleteJob: vi.fn().mockResolvedValue(undefined)
            } as JobPersistenceLayer,
            {
                getTenantConfig
            } as ConfigPersistenceLayer
        );

        const result = await runner.start({
            repoUrl: "https://example.com/repo.git",
            mode: "plan",
            task: "Draft the implementation plan"
        });

        expect(result.success).toBe(true);
        expect(getTenantConfig).not.toHaveBeenCalled();
        expect(startProcess).toHaveBeenCalledTimes(1);
        expect(startProcess).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: "plan",
                command: "opencode run --format json --agent plan 'Draft the implementation plan'"
            })
        );
        expect(saveJob).toHaveBeenCalledTimes(2);
    });

    it("switches agent mode to plan when tenant incremental PRs are enabled", async () => {
        const startProcess = vi.fn().mockResolvedValue({ success: true, message: "started" });
        const saveJob = vi.fn().mockResolvedValue(undefined);
        const getTenantConfig = vi.fn().mockResolvedValue({ incrementalPrsOn: true });

        const runner = new OpenCodeRunner(
            {
                startProcess,
                stopProcess: vi.fn().mockResolvedValue({ success: true }),
                pauseProcess: vi.fn().mockResolvedValue({ success: true }),
                resumeProcess: vi.fn().mockResolvedValue({ success: true })
            },
            {
                saveJob,
                getJob: vi.fn().mockResolvedValue(null),
                deleteJob: vi.fn().mockResolvedValue(undefined)
            } as JobPersistenceLayer,
            {
                getTenantConfig
            } as ConfigPersistenceLayer
        );

        await runner.start({
            repoUrl: "https://example.com/repo.git",
            mode: "agent",
            task: "Investigate the ticket and create a plan",
            vars: { tenantId: "tenant-123" }
        });

        expect(getTenantConfig).toHaveBeenCalledWith("tenant-123");
        expect(startProcess).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: "plan",
                command: expect.stringContaining("--agent plan")
            })
        );

        const launchedConfig = startProcess.mock.calls[0]?.[0] as { task?: string };
        expect(launchedConfig.task).toContain("PLAN OUTPUT INSTRUCTIONS:");
        expect(launchedConfig.task).toContain(".plans/");
    });
});