"use strict";

import fs from "fs/promises";
import forge from "node-forge";

import { getGuestDetails, getGuestIdentity, getRoom } from "./api.js";

const [, , code] = process.argv;
if (!code) {
        console.warn("error: no guest code provided as argument");
        process.exit(1);
}

console.log("Generating certificates...");
const { publicKey, privateKey } = forge.pki.rsa.generateKeyPair(1024);

const publicKeyPEM = forge.pki.publicKeyToPem(publicKey);
const privateKeyPEM = forge.pki.privateKeyInfoToPem(
        forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(privateKey))
);

console.log("Fetching guest auth details...");
const guest = await getGuestDetails(code);

console.log("Getting signed client identity...");
const identity = await getGuestIdentity(publicKeyPEM, guest.auth);

console.log("Getting linked room details...");
const room = await getRoom(guest.info.room_id, guest.auth);

await fs.mkdir("./data/").catch(() => null);
await fs.writeFile("./data/guest.json", JSON.stringify(guest));
await fs.writeFile("./data/identity.json", JSON.stringify(identity));
await fs.writeFile("./data/room.json", JSON.stringify(room));
await fs.writeFile("./data/guest_public.pem", publicKeyPEM);
await fs.writeFile("./data/guest_private.pem", privateKeyPEM);

console.log("Done!");
