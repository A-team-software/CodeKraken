export interface EnvConfigValidator {
	validate(): Promise<void>;
}
