const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../../config/keys");
const passport = require("passport");
const nodemailer = require("nodemailer");


// Load input validation
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");

// Load User model
const User = require("../../models/User");

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.email, // generated ethereal user
    pass: process.env.emailKey // generated ethereal password
  }
});



// CRUD
router.get("/", (req, res) => {
  res.send("SERVER");
});

router.get("/usuarios", (req, res) => {
  User.find()
    .then(user => res.status(200).send(user))
    .catch(err => res.send({ msj: "Error en get", res: err }));
});

// @route POST api/users/register
// @desc Register user
// @access Public
router.post("/register", (req, res) => {
  // Form validation

  const { errors, isValid } = validateRegisterInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email: req.body.email }).then(user => {
    if (user) {
      return res.status(400).json({ email: "Email already exists" });
    } else {
      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
      });

      // Hash password before saving in database
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then(user => {res.json(user) 
              let info =  transporter.sendMail({
                from: process.env.email, // sender address
                to: user.email, // list of receivers
                subject: `Gracias ${user.name} por crear tu correo `, // Subject line
                text: "Gracias por crear tu correo ", // plain text body
                html: `<div> 
                  <h1>Gracias ${user.name} por crear tu correo</h1>
                  <p>Gracias por unirte 💌 y que tengas un feliz día</p>
                  <p> Tu nombre es ${user.name} ♥ </p>
                  <p> Tu email es ${user.email} </p>
                  </div>` // html body

              });
            })
            .catch(err => console.log(err));
        });
      });
    }
  });
});

// @route POST api/users/login
// @desc Login user and return JWT token
// @access Public
router.post("/login", (req, res) => {
  // Form validation

  const { errors, isValid } = validateLoginInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  // Find user by email
  User.findOne({ email }).then(user => {
    // Check if user exists
    if (!user) {
      return res.status(404).json({ emailnotfound: "Email not found" });
    }

    // Check password
    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        // User matched
        // Create JWT Payload
        const payload = {
          id: user.id,
          name: user.name
        };

        // Sign token
        jwt.sign(
          payload,
          keys.secretOrKey,
          {
            expiresIn: 3600 // 1 hour in seconds
          },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token
            });
          }
        );
      } else {
        return res
          .status(400)
          .json({ passwordincorrect: "Password incorrect" });
      }
    });
  });
});

module.exports = router;
