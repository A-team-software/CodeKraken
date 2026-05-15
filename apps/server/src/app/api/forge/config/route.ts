import { NextRequest, NextResponse } from 'next/server';
import { Logger, SafeExecute } from '@oliver/core';
import { MongoConfigPersistenceLayer } from '@/app/brain/runner/mongo-config-persistence-layer';


export async function GET(request: NextRequest) {
    try {
        const cloudId = request.headers.get('X-Forge-Client-Key');
        if (!cloudId) {
            return NextResponse.json({ error: 'Missing X-Forge-Client-Key header' }, { status: 400 });
        }

        const configLayer = new MongoConfigPersistenceLayer();
        const config = await configLayer.getTenantConfig(cloudId);

        return NextResponse.json({ config: config || { incrementalPrsOn: false } });
    } catch (error: any) {
        Logger.error('Forge config GET failed', error);
        return NextResponse.json({ error: error.message ?? 'Internal error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {


    try {
        const cloudId = request.headers.get('X-Forge-Client-Key');
        if (!cloudId) {
            return NextResponse.json({ error: 'Missing X-Forge-Client-Key header' }, { status: 400 });
        }

        const [body, bodyError] = await SafeExecute.withSync(async () => request.json()).execute();
        if (bodyError) {
            return NextResponse.json({ error: bodyError?.message }, { status: 400 });
        }

        const incrementalPrsOn = body?.incrementalPrsOn;
        if (typeof incrementalPrsOn !== 'boolean') {
            return NextResponse.json({ error: 'Invalid or missing incrementalPrsOn boolean value' }, { status: 400 });
        }

        const configLayer = new MongoConfigPersistenceLayer();
        await configLayer.updateTenantConfig(cloudId, { incrementalPrsOn });

        return NextResponse.json({ success: true, config: { incrementalPrsOn } });
    } catch (error: any) {
        Logger.error('Forge config POST failed', error);
        return NextResponse.json({ error: error.message ?? 'Internal error' }, { status: 500 });
    }
}
