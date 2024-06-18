import { connect } from 'cloudflare:sockets';

const env = {
	TOKENS: []
};

function makeResponse(status, data) {
	return new Response(JSON.stringify(data), {
		status: status,
		headers: {
			'Content-Type': 'application/json'
		}
	});
}

/** 
 * @param {string} host
 * @param {number} port
 * @param {WebSocket} websocket 
 * */
async function runProxy(host, port, websocket) {
	try {
		/** @type {{writable: WritableStream, readable: ReadableStream}} */
		const socket = await connect({ hostname: host, port: port });
		const writer = socket.writable.getWriter();
		const reader = socket.readable.getReader();
		websocket.addEventListener('close', async ()=> {
			socket.close();
		});
		websocket.addEventListener('message', async (event) => {
			if(event.data instanceof ArrayBuffer) {
				writer.write(event.data);
			}
		});
		while(true) {
			const {done, value} = await reader.read();
			if(done) {
				websocket.close();
				break;
			}
			websocket.send(value);
		}
		console.log('Proxy closed');
	} catch(err) {
		console.log(err);
		websocket.close(1000, 'Server Error');
	}
}

/** @param {Request} request */
async function handleProxy(request) {
	const url = new URL(request.url);
	const host = url.searchParams.get('host');
	const port = url.searchParams.get('port');
	const access_token = request.headers.get('Authorization') || null;

	if(!host || !port || request.headers.get('Upgrade') != 'websocket') 
		return makeResponse(400, {error: 1, code: 'worker.invalidParams'});
	if(!env.TOKENS.includes(access_token))
		return makeResponse(403, {error: 1, code: 'worker.unauthorized'});

	console.log(`${access_token} requested for proxy`);
	/** @type {[WebSocket,WebSocket]} */
	const [client, server] = Object.values(new WebSocketPair());
	try {
		server.accept();
	} catch(err) {
		console.log(err);
		return makeResponse(500, {error: 1, code: 'worker.serverError'});
	}
	runProxy(host, port, server);
	return new Response(null, {
		status: 101,
		webSocket: client
	});
}

export default {
	/** @param {Request} request  */
	async fetch(request, _env, ctx) {
		Object.assign(env, _env);
		const url = new URL(request.url);
		const paths = url.pathname.split('/');
		switch(paths[1]) {
		case 'proxy':
			return handleProxy(request);
		default:
			return makeResponse(404, {error: 1, code: 'worker.notFound'});
		}
	},
};
