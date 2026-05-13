export function GET(): Response {
	const html = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Oliver Server Status</title>
		<style>
			body {
				margin: 0;
				font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
				background: #f7f7f8;
				color: #111827;
			}
			.wrap {
				max-width: 760px;
				margin: 40px auto;
				padding: 0 16px;
			}
			.card {
				background: #ffffff;
				border: 1px solid #e5e7eb;
				border-radius: 12px;
				padding: 18px;
				margin-bottom: 14px;
			}
			h1 {
				margin: 0 0 8px;
				font-size: 28px;
			}
			.muted {
				color: #6b7280;
				font-size: 14px;
			}
			.ok {
				color: #166534;
				font-weight: 600;
			}
			.ko {
				color: #991b1b;
				font-weight: 600;
			}
			code {
				background: #f3f4f6;
				padding: 2px 6px;
				border-radius: 6px;
			}
		</style>
	</head>
	<body>
		<div class="wrap">
			<h1>Welcome :)</h1>
			<p class="muted">Status refreshes every 10 seconds.</p>

			<div class="card">
				<h2>Tunnel</h2>
				<p>Status: <span id="tunnel-status">Loading...</span></p>
				<p>Enabled: <span id="tunnel-enabled">-</span></p>
				<p>URL: <code id="tunnel-url">-</code></p>
				<p>Port: <code id="tunnel-port">-</code></p>
				<p>Error: <span id="tunnel-error">None</span></p>
			</div>

			<div class="card">
				<h2>Database</h2>
				<p>Status: <span id="db-status">Loading...</span></p>
				<p>Error: <span id="db-error">None</span></p>
			</div>

			<p class="muted">Last update: <span id="last-update">Never</span></p>
		</div>

		<script>
			async function refreshStatus() {
				try {
					const response = await fetch('/api/status', { cache: 'no-store' });
					const payload = await response.json();

					const tunnelOk = payload.tunnel.started;
					const dbOk = payload.database.connected;

					const tunnelStatusEl = document.getElementById('tunnel-status');
					tunnelStatusEl.textContent = tunnelOk ? 'Connected' : 'Not connected';
					tunnelStatusEl.className = tunnelOk ? 'ok' : 'ko';

					document.getElementById('tunnel-enabled').textContent = String(payload.tunnel.enabled);
					document.getElementById('tunnel-url').textContent = payload.tunnel.ngrokUrl;
					document.getElementById('tunnel-port').textContent = String(payload.tunnel.port);
					document.getElementById('tunnel-error').textContent = payload.tunnel.error || 'None';

					const dbStatusEl = document.getElementById('db-status');
					dbStatusEl.textContent = dbOk ? 'Connected' : 'Not connected';
					dbStatusEl.className = dbOk ? 'ok' : 'ko';
					document.getElementById('db-error').textContent = payload.database.error || 'None';

					document.getElementById('last-update').textContent = new Date(payload.timestamp).toLocaleString();
				} catch (error) {
					const tunnelStatusEl = document.getElementById('tunnel-status');
					const dbStatusEl = document.getElementById('db-status');
					tunnelStatusEl.textContent = 'Unavailable';
					dbStatusEl.textContent = 'Unavailable';
					tunnelStatusEl.className = 'ko';
					dbStatusEl.className = 'ko';
					document.getElementById('last-update').textContent = 'Failed to fetch status';
				}
			}

			refreshStatus();
			setInterval(refreshStatus, 10000);
		</script>
	</body>
</html>`;

	return new Response(html, {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}
