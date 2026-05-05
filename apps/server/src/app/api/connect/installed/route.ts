import { NextRequest, NextResponse } from 'next/server';
import { AtlassianConnectService } from '@oliver/application';
import { Logger, SafeExecute } from '@oliver/core';

export async function POST(req: NextRequest) {
    try {
        const [body, bodyError] = await SafeExecute.withSync(async () => req.json()).execute();
        if (bodyError || !body) return NextResponse.json({ error: bodyError?.message || 'Invalid request body' }, { status: 400 });

        const connectService = new AtlassianConnectService();
        const [_, installError] = await SafeExecute.withSync(async () => connectService.handleInstalled(body)).execute();
        if (installError) return NextResponse.json({ error: installError.message || 'Failed to process installation' }, { status: 500 });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        Logger.error('Failed to handle installed event', error);
        return NextResponse.json(
            { error: 'Failed to process installation' },
            { status: 500 }
        );
    }
}
