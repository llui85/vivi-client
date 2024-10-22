"use strict";

import util from "util";
import crypto from "crypto";

import io from "socket.io-client";
import fs from "fs/promises";
import { v4 as uuid } from "uuid";

import { getRoom } from "./api.js";
import { SOCKET_PORT } from "./config.js";

const [privateKeyPEM, identity, guest] = await Promise.all([
        (await fs.readFile("./data/guest_private.pem")).toString(),
        JSON.parse((await fs.readFile("./data/identity.json")).toString()),
        JSON.parse((await fs.readFile("./data/guest.json")).toString()),
]);
const room = await getRoom(guest.info.room_id, guest.auth);

// todo: get the latest version of socket.io-client working here
const client = io.connect(
        // wildcard_hostname format is 10-10-10-10.vivi-box.io
        `https://${room.wildcard_hostname}:${SOCKET_PORT}`,
        {
                path: "/socket.io",
        }
);

(function logIncomingMessages() {
        const { onevent } = client;
        client.onevent = function (packet) {
                const args = packet.data || [];
                const [event, data] = packet.data;
                console.info(
                        "recv message",
                        util.inspect({ event, data }, false, null, true)
                );
                onevent.call(this, packet);
                packet.data = ["*"].concat(args);
                onevent.call(this, packet);
        };
})();

function sendMessage(event, data = {}) {
        const messageData = Object.assign({}, data);
        data.request_id = uuid();
        console.info(
                "send message",
                util.inspect({ event, data }, false, null, true)
        );
        client.emit(event, messageData);
}

const handshake = {
        code: guest.info.code,
        token: guest.info.token,
        name: "Guest", // Can be anything
        session_id: uuid(),
        platform: "windows",
        stream: "webrtc",
        identity,
        client_id: 1,
        features: ["quadrants"],
        room_code: "",
};

client.on("connect", () => {
        sendMessage("handshake_guest", {
                ...handshake,
                challenge: "signedChallenge",
        });
});

client.on("handshake_guest", (data) => {
        if (data.challenge) {
                sendMessage("handshake_guest", {
                        ...handshake,
                        challenge: crypto
                                .sign(
                                        "RSA-SHA256",
                                        new Int8Array(data.challenge),
                                        {
                                                key: privateKeyPEM,
                                                padding: crypto.constants
                                                        .RSA_PKCS1_PSS_PADDING,
                                        }
                                )
                                .toString("base64"),
                });
        } else if (data.success) {
                console.log("Authentication successful.");
                // Requests can now be sent e.g get_screenshot, get_list,
                // display_video, display_stream, display_widget etc.
        } else {
                console.error("Guest handshake error:", data);
        }
});
