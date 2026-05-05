import { NextRequest, NextResponse } from 'next/server';
import { AtlassianConnectService } from '@oliver/application';
import { Logger, SafeExecute } from '@oliver/core';

export async function POST(req: NextRequest) {
    try {
        const [body, bodyError] = await SafeExecute.withSync(async () => req.json()).execute();
        if (bodyError || !body) return NextResponse.json({ error: bodyError?.message || 'Invalid request body' }, { status: 400 });

        const connectService = new AtlassianConnectService();
        const [_, uninstallError] = await SafeExecute.withSync(async () => connectService.handleUninstalled(body)).execute();
        if (uninstallError) return NextResponse.json({ error: uninstallError.message || 'Failed to process uninstallation' }, { status: 500 });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        Logger.error('Failed to handle uninstalled event', error);
        return NextResponse.json(
            { error: 'Failed to process uninstallation' },
            { status: 500 }
        );
    }
}
