const express = require('express');
const session = require('express-session');
const massive = require('massive');
const bcrypt = require('bcrypt');
// const bodyParser = require('body-parser');

//bring in passport
const passport = require('passport');
//bring in passport local class
const LocalStrategy = require('passport-local').Strategy;

const app = express();
app.use(express.json());

//db connection uri
const databaseConnectionString = "postgres://uhxxanqgiryloe:7cfe779b8db1589fd140ed2d09e186f2fd2b16c0e4c86381307ac906b8011947@ec2-184-73-216-48.compute-1.amazonaws.com:5432/dcfe0lbgdodgpu?ssl=true";

//db connection using massive
/* make sure to get your connection string from your own db */
massive(databaseConnectionString, { scripts: __dirname + '/db' }).then(dbInstance => {
    app.set('db', dbInstance);
    console.log('db connected')
}).catch(error => {
    console.warn(error);
});


//Sessions
//configure sessions with saveUninitialized: false, resave: false, secret: *Some random string*
app.use(session({
    saveUninitialized: false,
    resave: false,
    secret: "SHHHHH IT'S A SECRET"
}));

//This will always be used when passport is used
app.use(passport.initialize());
//This will be used when using the session
app.use(passport.session());

//passport config
//takes in the middleware name and new Strategy
passport.use('login', new LocalStrategy({
    //use an email field for auth
    usernameField: 'email',
    //the second argument is a cb that accepts the username, password and done function, in this case an email address instead of username
}, (email, password, done) => {
    //check to make sure email and password exists
    if (!email || !password) {
        //if they do not exist, send an error message
        return done({ message: 'email and password are required' });
    };

    //store the db instance in a variable called db
    const db = app.get('db');

    //same as -> SELECT * FROM "Users" WHERE email = ${email}
    db.Users.find({ email }).then(userResults => {
        //if user is not found
        if (userResults.length == 0) {
            //return an error message
            return done(JSON.stringify({ message: 'Username or password is invalid' }))
        };

        //if we do find the user,
        //store the user
        const user = userResults[0];

        //store the users password
        const storedPassword = user.password;

        //if the storedPassword for the user doesn't match the password typed in the input field, send an error message
        if (!bcrypt.compareSync(password, storedPassword)) {
            return done(JSON.stringify({ message: 'Username or password is invalid' }));
        };

        //remove the user password so we don't send it back
        delete user.password;

        //if we successfully find the user, invoke done() and pass in null for the err and the user to return to the client
        done(null, userResults[0]);

        //dont forget to write a catch function to find the error if this auth function fails
    }).catch(err => {
        console.warn(err);
        done(JSON.stringify({ message: 'Unknown error occured. Please try again' }));
    });
}));

//Register a User
passport.use('register', new LocalStrategy({
    usernameField: 'email',
}, (email, password, done) => {
    //store the db instance in a variable called db
    const db = app.get('db');

    //creating a hashed password using bcrypt
    //never do less than 12 rounds
    const hashedPassword = bcrypt.hashSync(password, 15);

    db.Users.find({ email })
        .then(userResults => {
            //checks to sewe if there is already a username in use
            if (userResults > 0) {
                return done(JSON.stringify({ message: 'username is already in use' }));
            };

            //inserts the new user into the db with the hashed password
            return db.Users.insert({
                email,
                password: hashedPassword,
            });
        })
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            console.warn(err);
            done(JSON.stringify({ message: 'Unknown error occured. Please try again' }));
        });
}));

//serialize the user to store in to session
//we can choose what gets stored in the session
passport.serializeUser(function (user, done) {

    //use done passing in null for the first param and the user.id as the second param to store the user id in the session
    done(null, user.id);
});

//this will deserialize the user
passport.deserializeUser(function (id, done) {
    done(null, id);
});

//Endpoints
//We will be using postman to test the endpoints since we do not have any UI setup

//We will use passport as middleware
app.post('/auth/login', passport.authenticate('login'), (req, res) => {
    return res.send({ message: 'Congrats! You are authenticated' });
});

app.post('/auth/register', passport.authenticate('register'), (req, res) => {
    return res.send({ message: 'logged in' });
})


//Server is listening
const port = 3000;
app.listen(port, () => { console.log(`Server listening on port ${port}`); });