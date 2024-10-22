A proof-of-concept library that demonstrates the basic building
blocks needed to authenticate with the Vivi "box" internal API.

Login to the API and download certificates, identity, and room data:
$ npm run setup <GUEST_CODE>

Using the stored data, connect to the box (must be on the same network as the box) and authenticate:
$ npm run start
