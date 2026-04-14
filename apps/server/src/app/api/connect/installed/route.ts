import { NextRequest, NextResponse } from 'next/server';
import { AtlassianConnectService } from '@oliver/application';
import { Logger } from '@oliver/core';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const connectService = new AtlassianConnectService();
        await connectService.handleInstalled(body);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        Logger.error('Failed to handle installed event', error);
        return NextResponse.json(
            { error: 'Failed to process installation' },
            { status: 500 }
        );
    }
}
