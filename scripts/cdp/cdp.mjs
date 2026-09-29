// Minimal CDP driver: headless system Chrome + Node native WebSocket.
import { spawn } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const SHOTS = new URL('./shots/', import.meta.url).pathname;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ width = 1280, height = 800, port = 9333 } = {}) {
	const profile = mkdtempSync(join(tmpdir(), 'cdp-prof-'));
	const proc = spawn(CHROME, [
		'--headless=new',
		`--remote-debugging-port=${port}`,
		`--user-data-dir=${profile}`,
		`--window-size=${width},${height}`,
		'--no-first-run',
		'--no-default-browser-check',
		'--hide-scrollbars',
		'about:blank',
	], { stdio: 'ignore' });
	process.on('exit', () => {
		try { proc.kill('SIGKILL'); } catch {}
		try { rmSync(profile, { recursive: true, force: true }); } catch {}
	});

	let targets;
	for (let i = 0; i < 50; i++) {
		try {
			targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
			if (targets.find((t) => t.type === 'page')) break;
		} catch {}
		await sleep(100);
	}
	const page = targets.find((t) => t.type === 'page');
	const ws = new WebSocket(page.webSocketDebuggerUrl);
	await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

	let id = 0;
	const pending = new Map();
	const listeners = [];
	ws.onmessage = (m) => {
		const msg = JSON.parse(m.data);
		if (msg.id && pending.has(msg.id)) {
			const { resolve, reject } = pending.get(msg.id);
			pending.delete(msg.id);
			msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
		} else if (msg.method) {
			listeners.forEach((l) => l(msg));
		}
	};
	const send = (method, params = {}) => new Promise((resolve, reject) => {
		const mid = ++id;
		pending.set(mid, { resolve, reject });
		ws.send(JSON.stringify({ id: mid, method, params }));
	});

	const errors = [];
	listeners.push((m) => {
		if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
		if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
	});

	await send('Page.enable');
	await send('Runtime.enable');
	await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

	const api = {
		send,
		errors,
		async goto(url) {
			const loaded = new Promise((r) => listeners.push((m) => m.method === 'Page.loadEventFired' && r()));
			await send('Page.navigate', { url });
			await loaded;
			await sleep(800);
		},
		async eval(expr) {
			const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
			if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
			return res.result.value;
		},
		async key(key) {
			const codes = { ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39 };
			const base = { key, code: key, windowsVirtualKeyCode: codes[key], nativeVirtualKeyCode: codes[key] };
			await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
			await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
		},
		async click(x, y) {
			for (const type of ['mousePressed', 'mouseReleased']) {
				await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
			}
		},
		// Real wheel-free scroll: set scrollY, then let ScrollTrigger/scrub settle.
		async scrollTo(y, settle = 700) {
			await api.eval(`window.scrollTo(0, ${y})`);
			await sleep(settle);
		},
		async shot(name) {
			const { data } = await send('Page.captureScreenshot', { format: 'png' });
			const path = SHOTS + name + '.png';
			writeFileSync(path, Buffer.from(data, 'base64'));
			return path;
		},
		async close() {
			try { ws.close(); } catch {}
			proc.kill('SIGKILL');
			await sleep(200);
			rmSync(profile, { recursive: true, force: true });
		},
	};
	return api;
}
