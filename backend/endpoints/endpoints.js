function initEndpoints(express) {
    // temp test
    express.get('/', (req, res) => {
        res.send('hello');
    });

    express.get("/get/", getFunc);
    express.post("/post/", postFunc);
    express.delete("/delete/", deleteFunc);
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