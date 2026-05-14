import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findOneMock = vi.fn();
const updateOneMock = vi.fn();

const collectionMock = vi.fn().mockReturnValue({
    findOne: findOneMock,
    updateOne: updateOneMock
});

const getDbMock = vi.fn().mockResolvedValue({
    collection: collectionMock
});

vi.mock("@oliver/db", () => ({
    MongoConnectionManager: {
        getDb: getDbMock
    }
}));

import { MongoConfigPersistenceLayer } from "./mongo-config-persistence-layer";

describe("MongoConfigPersistenceLayer", () => {
    let layer: MongoConfigPersistenceLayer;

    beforeEach(() => {
        vi.clearAllMocks();
        layer = new MongoConfigPersistenceLayer();
    });

    describe("getTenantConfig", () => {
        it("returns null if no config is found", async () => {
            findOneMock.mockResolvedValueOnce(null);

            const result = await layer.getTenantConfig("tenant-1");

            expect(findOneMock).toHaveBeenCalledWith({
                $or: [
                    { _id: "tenant-1" },
                    { tenantId: "tenant-1" },
                    { clientKey: "tenant-1" }
                ]
            });
            expect(result).toBeNull();
        });

        it("returns the config mapped correctly if true", async () => {
            findOneMock.mockResolvedValueOnce({ incrementalPrsOn: true });
            const result = await layer.getTenantConfig("tenant-2");
            expect(result).toEqual({ incrementalPrsOn: true });
        });

        it("returns false if config exists but incrementalPrsOn is not true", async () => {
            findOneMock.mockResolvedValueOnce({ incrementalPrsOn: false });
            const result = await layer.getTenantConfig("tenant-3");
            expect(result).toEqual({ incrementalPrsOn: false });
        });
    });

    describe("updateTenantConfig", () => {
        it("does nothing if update object is empty", async () => {
            await layer.updateTenantConfig("tenant-1", {});
            expect(updateOneMock).not.toHaveBeenCalled();
        });

        it("calls updateOne with upsert and sets incrementalPrsOn", async () => {
            await layer.updateTenantConfig("tenant-1", { incrementalPrsOn: true });

            expect(updateOneMock).toHaveBeenCalledWith(
                { _id: "tenant-1" },
                {
                    $set: { incrementalPrsOn: true },
                    $setOnInsert: { tenantId: "tenant-1", clientKey: "tenant-1" }
                },
                { upsert: true }
            );
        });
    });
});
