import { NextRequest, NextResponse } from 'next/server';
import { AtlassianConnectService } from '@/lib/application/services/AtlassianConnectService';
import { Logger } from '@/lib/infrastructure/logging/logger';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const connectService = new AtlassianConnectService();
        await connectService.handleUninstalled(body);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        Logger.error('Failed to handle uninstalled event', error);
        return NextResponse.json(
            { error: 'Failed to process uninstallation' },
            { status: 500 }
        );
    }
}
