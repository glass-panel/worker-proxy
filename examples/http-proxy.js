const { WebSocket } = require('ws');
const http = require('http');

/** @type {{address:string, port:number, proxy:string, token:string}} */
const config = {
    proxy: 'wss://xxx',
    address: '127.0.0.1',
    port: 8089,
    token: 'xxx'
};

const server = http.createServer((req, res) => {
    console.log(req.method, req.headers);
    if(req.method == 'CONNECT')
        return;
    res.writeHead(200, 'OK');
    res.end();
});

server.on('connect', (req, socket, head)=> {
    console.log('CONNECT!', req.headers);
    let [host, port] = req.headers['host'].split(':');
    if(!port) 
        port = 80;
    try {
        const ws = new WebSocket(`${config.proxy}/proxy?host=${host}&port=${port}`, {
            headers: {
                authorization: config.token
            }
        });
        ws.on('open', () => {
            console.log('ws open');
            socket.write(`HTTP/1.1 200 Connection Established\r\n\r\n`);
            ws.on('message', data=> {
                console.log('reply');
                socket.write(data);
            });
            socket.on('data', data=> {
                console.log('forward');
                ws.send(data);
            });
            socket.on('end', ()=>ws.close());
            ws.addEventListener('close', ()=>socket.end());
        });
        socket.on('error', (err)=>{
            console.log(err);
            ws.close();
        });
        ws.on('error', (err) => {
            console.error(err.message, err.stack);
            socket.end();
        });
        ws.on('unexpected-response', (req, res) => {
            console.error(`Unexpected response from ${req.url}: ${res.statusCode}`);
            socket.end();
        });
    } catch(err) {
        console.error(err.message, err.stack);
        socket.end();
    }
});

server.listen(config.port, config.address, () => {
    console.log(`Service start at ${config.address}:${config.port}`);
});
