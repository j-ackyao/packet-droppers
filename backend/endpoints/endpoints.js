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
                        "accuracy": 1
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
                    console.log(json);
                    if (json.verificationResult) {
                        res.status(200).send(`yes, this number is at ${lat}, ${lon}`);
                    } else {
                        res.status(200).send(`nope, this number is NOT at ${lat}, ${lon}`);
                    }
                    return json;
                });
                
            } else {
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


module.exports = initEndpoints;