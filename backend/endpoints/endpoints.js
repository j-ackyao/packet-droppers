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
    express.get("/admin/getvoters/", getvoters);


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

async function startvote(req, res) {
    let {sim_swap_date, lat, lon, accuracy, ballot_message} = req.body;
    try {
        let min_swap_date = new Date(sim_swap_date);
    } catch (error) {
        console.log("could not parse sim_swap_date");
        return res.status(300).send("could not process sim swap date");
    }
    let phone_nums = readDatabase()["registered_numbers"];

    // go through the list of numbers, 
    for (let i = 0; i < phone_nums.length; i++) {
        // check sim swap days
        try {
            let phoneNumber = phone_nums[i];
            const apiRes = await fetch('https://pplx.azurewebsites.net/api/rapid/v0/simswap/check', {
                method: "POST",
                body: JSON.stringify({ "phoneNumber": phoneNumber }),
                headers: {
                    "Authorization": "Bearer 166b4a",
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache",
                    "accept": "application/json"
                }
            });

            // Check if the response is OK (status code 200-299)
            if (!apiRes.ok) {
                console.error(`API request failed for ${phoneNumber}:`, apiRes.status, apiRes.statusText);
                continue; // Skip to the next phone number
            }

            // Parse the response body as JSON
            const jsonResponse = await apiRes.json();
            console.log(`Response for ${phoneNumber}:`, jsonResponse);
            
            let simChangeDate = new Date(jsonResponse.latestSimChange);

            if (simChangeDate > min_swap_date) {
                console.log("");
                continue;
            }

            // Check the SIM swap status from the response


            // Send SMS message if necessary
            // TODO: Implement SMS sending logic

        } catch (error) {
            console.error(`Error fetching data for ${phoneNumber}: `, error);
            // Handle the error (e.g., log it, retry, etc.)
        }
        // check the location

        // send SMS message
    }
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


const dbPath = path.join(__dirname, 'database.json');

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

module.exports = initEndpoints;
