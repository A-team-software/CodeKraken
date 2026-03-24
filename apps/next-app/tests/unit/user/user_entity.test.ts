import { expect, test, describe } from "bun:test";
import { UserZodSchema } from "@/lib/user/domain/entity/user_entity";

describe("UserZodSchema", () => {
    test("should validate a valid user", () => {
        const validUser = {
            name: "John Doe",
            email: "john@example.com",
            role: "user",
            onboardingStep: "connect",
        };

        const result = UserZodSchema.safeParse(validUser);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.name).toBe("John Doe");
            expect(result.data.settings.opencode.model).toBe("llama3-70b-8192");
        }
    });

    test("should fail on invalid email", () => {
        const invalidUser = {
            name: "John Doe",
            email: "not-an-email",
            role: "user",
        };

        const result = UserZodSchema.safeParse(invalidUser);
        expect(result.success).toBe(false);
    });

    test("should use default settings if not provided", () => {
        const userWithoutSettings = {
            name: "Jane Doe",
            email: "jane@example.com",
            role: "admin",
        };

        const result = UserZodSchema.safeParse(userWithoutSettings);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.settings.opencode.model).toBe("llama3-70b-8192");
        }
    });
});
