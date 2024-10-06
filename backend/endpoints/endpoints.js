const fs = require('fs');
const path = require('path');

function initEndpoints(express) {
    // Temp test
    express.get('/', (req, res) => {
        res.send('hello');
    });

    // Example requests
    express.get("/get/", getFunc);
    express.post("/post/", postFunc);
    express.delete("/delete/", deleteFunc);
    // Frontend app makes request to our /getLocationStatus endpoint, and we request from given API

    // Register with phone number and ID, with number verification only
    express.post("/register/", registering);

    // Admin endpoints
    express.post("/admin/startvote/", startvote);
    express.post("/admin/addvoter/", voteradd);
    express.get("/admin/getvoters/:token", getvoters);

    // Get location status
    express.get("/getLocationStatus/:lat/:lon", (req, res) => {
        let lat = req.params.lat;
        let lon = req.params.lon;
        if (!lat || !lon) {
            res.status(400).send("bad request, missing lat and/or lon")
            return;
        }

        fetch('https://pplx.azurewebsites.net/api/rapid/v0/location-verification/verify', {
            method: "POST",
            body: JSON.stringify(
                {
                    "device": {
                        "phoneNumber": "14372307313"
                    },
                    "area": {
                        "type": "Circle",
                        "location": { "latitude": lat, "longitude": lon },
                        "accuracy": 1,
                    }
                }
            ),
            headers: {
                "Authorization": "Bearer 166b4a",
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
                "accept": "application/json"
            }
        }).then((ApiRes) => {
            if (ApiRes.ok) {
                return ApiRes.json();
            } else {
                console.log("API response was not ok:", ApiRes.status);
                throw new Error("API response was not ok");
            }
        }).then((json) => {
            if (json.verificationResult == null) {
                console.log("Malformed request body");
                res.status(400).send("Malformed request body from API");
            } else if (json.verificationResult) {
                res.status(200).send(`yes, this number is at ${lat}, ${lon}`);
            } else if (!json.verificationResult) {
                res.status(200).send(`nope, this number is NOT at ${lat}, ${lon}`);
            }
        }).catch((error) => {
            console.error("Fetch error:", error.message);
            res.status(500).send("Internal server error: " + error.message);
        });
    });
}

// Function for registration endpoint with number verification only
async function registering(req, res) {
    const { phoneNumber } = req.body;

    const authorizationHeader = req.headers['authorization'];
    if (!authorizationHeader) {
        console.error('Missing Authorization header');
        return res.status(400).send('Authorization header is required');
    }

    const deviceId = authorizationHeader.split(' ')[1];
    if (!deviceId) {
        console.error('Invalid Authorization header format');
        return res.status(400).send('Bearer token is required in the Authorization header');
    }

    // Validate input
    if (!phoneNumber) {
        console.error('Missing phone number');
        return res.status(400).send('Phone number and device ID are required for registration');
    }

    try {
        // Number Verification
        const verifyRes = await fetch('https://pplx.azurewebsites.net/api/rapid/v0/number-verification/verify', {
            method: 'POST',
            body: JSON.stringify({ phoneNumber }),
            headers: {
                'Authorization': `Bearer ${deviceId}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('Number Verification Status:', verifyRes.status);
        const verifyData = await verifyRes.json();
        console.log('Number Verification Response:', verifyData);

        if (verifyRes.status !== 200 || verifyData.message !== 'poc request successful') {
            return res.status(400).send('Phone number verification unsuccessful');
        }

        // Registration successful
        res.status(200).send('Registration successful');

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Internal server error');
    }
}

function getFunc(req, res) {
    res.status(200).send("received get request");
}

function postFunc(req, res) {
    res.status(200).send(req.body);
}

function deleteFunc(req, res) {
    // For whatever reason you need to delete something
    res.sendStatus(200);
}

function startvote(req, res) {
    // Implement voting start functionality here
}

function getvoters(req, res) {
    token = req.params.token;
    console.log(typeof token);
    console.log(token);
    if (!token) {
        return res.status(300).send("no token found");
    }

    data = readDatabase();
    let voters = data[token];
    return res.status(200).send(voters);
}

function voteradd(req, res) {
    let { userToken, phoneNumber } = req.body;

    console.log(userToken);
    console.log(phoneNumber);

    let data = readDatabase();
    if (data.hasOwnProperty(userToken)) {
        if (!data[userToken].includes(phoneNumber)) {
            data[userToken].push(phoneNumber);
            writeDatabase(data);
            res.status(200).send(`Phone number '${phoneNumber}' added to user '${userToken}'.`);
        } else {
            res.status(400).send(`Phone number '${phoneNumber}' already exists for user '${userToken}'.`);
        }
    } else {
        res.status(404).send('User not found.');
    }
}

// Function to read data from the JSON file
function readDatabase() {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading database:', err);
        return {};
    }
}

// Function to write data to the JSON file
function writeDatabase(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));
    } catch (err) {
        console.error('Error writing to database:', err);
    }
}

const dbPath = path.join(__dirname, 'database.json');
module.exports = initEndpoints;
