import { AtlassianConnectService } from '@oliver/application';
import { SafeExecute } from '@oliver/core';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';

export const POST = wrapRoute({}, async (req, ctx) => {
    const [body, bodyError] = await SafeExecute.withSync(async () => req.json()).execute();
    if (bodyError || !body) return ApiRes.badRequest(bodyError?.message || 'Invalid request body');

    const connectService = new AtlassianConnectService();
    const [_, uninstallError] = await SafeExecute.withSync(async () => connectService.handleUninstalled(body)).execute();
    if (uninstallError) return ApiRes.error(uninstallError.message || 'Failed to process uninstallation');

    return { processed: true };
});
