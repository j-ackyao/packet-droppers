const fs = require('fs');
const path = require('path');


function initEndpoints(express) {
    // temp test
    express.get('/', (req, res) => {
        res.send('hello');
    });

    // example requests
    express.get("/get/", getFunc);
    express.post("/post/", postFunc);
    express.delete("/delete/", deleteFunc);
    // frontend app makes request to our /getLocationStatus endpoint, and we request from given API

    //register with phone number and id, to verify the phone, allow the admins to input parameter for sim swapping and location
    express.post("/register/", registering);


    express.post("/admin/startvote/", startvote);
    express.get("/admin/getvoters/", getvoters);
   
    // not the best practice to use routing for GET params, but will do :thumbs_up:
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
            // callback hell
            if (ApiRes.ok) {
                ApiRes.json().then((json) => {
                    // this is what the API response body is like
                    console.log("API OK");
                    console.log(json);
                    if (json.verificationResult == null) {
                        console.log("malformed request body");
                        res.sendStatus(400);
                    } else if (json.verificationResult) {
                        res.status(200).send(`yes, this number is at ${lat}, ${lon}`);
                    } else if (!json.verificationResult) {
                        res.status(200).send(`nope, this number is NOT at ${lat}, ${lon}`);
                    }
                });
            } else {
                console.log("API !OK");
                console.log(ApiRes);
                res.sendStatus(400).send("bad request response, something went wrong");
            }
        });
    })
}

function getFunc(req, res) {
    res.status(200).send("received get request");
}

function postFunc(req, res) {
    res.status(200).send(req.body);
}

function deleteFunc(req, res) {
    // for whatever reason you need to delete something
    res.sendStatus(200);
}

function registering(req, res) {
    let phoneNumber = req.body.phone_num;
    let deviceId = req.body.id;

    if (!phoneNumber || !id) {
        return res.status(400).send("Phone number and device ID are required");
    }

    console.log(`Received registration request with phone number: ${phoneNumber} and ID: ${deviceId}, running checks...`);



}
const dbPath = path.join(__dirname, 'database.json');


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
    voters = readDatabase()["registered_numbers"];
    return res.status(200).send(voters);
}

function voteradd(req, res) {
    let {userToken, phoneNumber} = req.body;

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


module.exports = initEndpoints;