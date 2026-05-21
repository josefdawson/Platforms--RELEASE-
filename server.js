const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let players = {};
const PLAYER_COLORS = [
    '#ff4444', // red
    '#44ff44', // green
    '#4488ff', // blue
    '#ffff44', // yellow
    '#ff44ff', // magenta
    '#44ffff', // cyan
    '#ff8844', // orange
    '#ff4488', // pink
    '#88ff44', // lime
    '#8844ff', // purple
    '#44ff88', // mint
    '#ff8888', // salmon
];
let nextColorIndex = 0;

function getColorForPlayer() {
    const color = PLAYER_COLORS[nextColorIndex % PLAYER_COLORS.length];
    nextColorIndex++;
    return color;
}

function broadcastPlayerList() {
    const playerList = {};
    for (const id in players) {
        playerList[id] = {
            x: players[id].x,
            y: players[id].y,
            color: players[id].color
        };
    }
    const message = JSON.stringify({
        type: 'playerList',
        players: playerList
    });
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

wss.on('connection', function connection(ws) {
    console.log('New client connected');

    ws.on('message', function incoming(data) {
        try {
            const msg = JSON.parse(data);

            if (msg.type === 'join') {
                const color = getColorForPlayer();
                players[msg.playerId] = {
                    ws: ws,
                    playerId: msg.playerId,
                    x: 100,
                    y: 100,
                    color: color
                };

                console.log(`Player ${msg.playerId} joined (total: ${Object.keys(players).length})`);

                // Send the new player their assigned color
                ws.send(JSON.stringify({
                    type: 'yourColor',
                    color: color,
                    playerId: msg.playerId
                }));

                // Broadcast full player list to everyone
                broadcastPlayerList();
            }

            if (msg.type === 'playerState') {
                if (players[msg.playerId]) {
                    players[msg.playerId].x = msg.x;
                    players[msg.playerId].y = msg.y;
                }

                // Broadcast this player's state to all OTHER clients
                wss.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN && client !== ws) {
                        client.send(JSON.stringify({
                            type: 'playerState',
                            playerId: msg.playerId,
                            x: msg.x,
                            y: msg.y
                        }));
                    }
                });
            }

            if (msg.type === 'levelComplete') {
                wss.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN && client !== ws) {
                        client.send(JSON.stringify({
                            type: 'levelComplete',
                            playerId: msg.playerId
                        }));
                    }
                });
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', function close() {
        for (let playerId in players) {
            if (players[playerId].ws === ws) {
                console.log(`Player ${playerId} disconnected`);
                delete players[playerId];
                break;
            }
        }
        // Broadcast updated player list to everyone
        broadcastPlayerList();
    });

    ws.on('error', function error(err) {
        console.error('WebSocket error:', err);
    });
});

server.listen(8080, function() {
    console.log('WebSocket server listening on port 8080');
    console.log('Make sure to install ws: npm install ws');
});
