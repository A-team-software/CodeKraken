import { expect, test, describe, mock } from "bun:test";
import { SynchronizeUserUseCase, SynchronizeUserCommand } from "@/lib/user/application/use_cases/SynchronizeUserUseCase";
import { UserAggregate } from "@/lib/user/domain/aggregates/user_aggregate";
import { UserRepository } from "@/lib/user/domain/repository/UserRepository.interface";

describe("SynchronizeUserUseCase", () => {
    const mockUserRepo: UserRepository = {
        nextIdentity: mock(() => "id-123"),
        findById: mock(async () => null),
        findByEmail: mock(async () => null),
        findByUsername: mock(async () => null),
        findBy: mock(async () => []),
        findByGitId: mock(async () => null),
        save: mock(async (user: UserAggregate) => user),
    };

    const useCase = new SynchronizeUserUseCase(mockUserRepo);

    test("should create a new user if not found", async () => {
        const cmd: SynchronizeUserCommand = {
            email: "new@example.com",
            name: "New User",
            username: "newuser",
        };

        const result = await useCase.execute(cmd);

        expect(result).toBeInstanceOf(UserAggregate);
        expect(result.email).toBe("new@example.com");
        expect(mockUserRepo.save).toHaveBeenCalled();
        expect(mockUserRepo.findByEmail).toHaveBeenCalledWith("new@example.com");
    });

    test("should update existing user if found by email", async () => {
        const existingUser = UserAggregate.create({
            name: "Old Name",
            email: "existing@example.com",
            role: "user",
            url: undefined,
            username: undefined,
            avatarUrl: undefined
        }, "id-existing");

        (mockUserRepo.findByEmail as any).mockImplementation(async () => existingUser);

        const cmd: SynchronizeUserCommand = {
            email: "existing@example.com",
            name: "Updated Name",
        };

        const result = await useCase.execute(cmd);

        expect(result.name).toBe("Updated Name");
        expect(mockUserRepo.save).toHaveBeenCalled();
    });

    test("should find existing user by username if email not found", async () => {
        const existingUser = UserAggregate.create({
            name: "Old Name",
            email: "old@example.com",
            role: "user",
            username: "existing_user",
            url: undefined,
            avatarUrl: undefined
        }, "id-existing");

        (mockUserRepo.findByEmail as any).mockImplementation(async () => null);
        (mockUserRepo.findByUsername as any).mockImplementation(async () => existingUser);

        const cmd: SynchronizeUserCommand = {
            username: "existing_user",
            name: "Updated Name",
        };

        const result = await useCase.execute(cmd);

        expect(result.name).toBe("Updated Name");
        expect(mockUserRepo.findByUsername).toHaveBeenCalledWith("existing_user");
    });
});
