import { API_HOST } from "./config.js";

async function api(method, path, data, auth) {
        let headers = {};
        if (data) headers["Content-Type"] = "application/json";
        if (auth && auth.type === "guest") {
                if (path.startsWith("/cert")) {
                        headers = { ...headers, ...auth.certs };
                } else {
                        headers = { ...headers, ...auth.standard };
                }
        }
        const response = await fetch(API_HOST + path, {
                method,
                body: data !== null ? JSON.stringify(data) : undefined,
                //@ts-ignore
                headers,
        });
        return response.json();
}

async function getGuestIdentity(public_key_pem, auth) {
        let params = new URLSearchParams({
                client_public_key: public_key_pem,
        });
        return await api(
                "GET",
                "/api/v1/guests/identity?" + params.toString(),
                null,
                auth
        );
}

async function getGuestDetails(code) {
        const response = await api(
                "GET",
                "/api/v1/guests/sign_in?" +
                        new URLSearchParams({
                                code,
                        })
        );
        const { guest } = response;
        return Object.freeze({
                info: Object.freeze({
                        id: guest.id,
                        eula: guest.eula,
                        is_presenter: guest.is_presenter,
                        room_id: guest.room_id,
                        code: guest.code,
                        token: guest.authentication_token,
                }),
                auth: Object.freeze({
                        type: "guest",
                        certs: {
                                Authorization:
                                        "Basic " +
                                        Buffer.from(
                                                `${guest.code}:${guest.authentication_token}`
                                        ).toString("base64"),
                        },
                        standard: {
                                "X-Guest-Code": guest.code,
                                "X-Guest-Token": guest.authentication_token,
                        },
                }),
        });
}

async function getRoom(room_id, auth) {
        const response = await api(
                "GET",
                `/api/v1/rooms/${room_id}`,
                null,
                auth
        );
        return response.room;
}

export { getGuestIdentity, getGuestDetails, getRoom };
