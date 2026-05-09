export interface CodePlatformAuthGate {
    authorizeRequest(headers: Headers): Promise<{ authorized: boolean; platform?: string }>;
}
