const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json()); //default middleware function..it recougnizing
const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const Logger = (request, response, next) => {
  const tokenone = request.headers["authorization"];
  if (tokenone !== undefined) {
    const jwtFormat = tokenone.split(" ")[1];
    // console.log(jwtToken);
    if (jwtFormat !== undefined) {
      jwt.verify(jwtFormat, "secret_key", async (error, payload) => {
        if (error) {
          response.send("No Token");
        } else {
          request.username = payload.username;
          next();
        }
      });
    } else {
      response.status(401);
      response.send("No Token");
    }
  } else {
    response.status(401);
    response.send("No Token");
  }
};

// Get Books API
app.get("/users/", Logger, async (request, response) => {
  const getBooksQuery = `
  SELECT
    *
  FROM
    user`;

  const booksArray = await db.all(getBooksQuery);
  response.send(booksArray);
});

app.post("/users/", async (request, response) => {
  const { name, username, password, gender, location } = request.body;
  const encryptedPasword = await bcrypt.hash(password, 10);
  const identifyUser = `SELECT * FROM user WHERE username = '${username}'`;
  const userPresentOrnot = await db.get(identifyUser);
  console.log(userPresentOrnot);
  if (userPresentOrnot !== undefined) {
    response.status(400); //This one is represented the bad request
    response.send("User is Already exist");
  } else {
    const InsertNewUserData = `
     INSERT INTO user(name,username,password,gender,location)
     VALUES
     ('${name}','${username}','${encryptedPasword}','${gender}','${location}')
    `;
    await db.run(InsertNewUserData);
    response.send("New User is added succesffully");
  }
});

app.post("/login/", async (request, response) => {
  //   console.log("Hello");
  const { username, password } = request.body;
  const loginuserPresentOrNot = `SELECT * FROM user WHERE username = '${username}'`;
  const userData = await db.get(loginuserPresentOrNot);
  if (userData === undefined) {
    response.status(400);
    response.send("User is not Found");
  } else {
    // console.log("Hello");
    const passwordcompare = await bcrypt.compare(password, userData.password);
    if (passwordcompare === true) {
      const payload = {
        username,
      };
      const jwtToken = jwt.sign(payload, "secret_key");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Password is Wrong");
    }
  }
});
