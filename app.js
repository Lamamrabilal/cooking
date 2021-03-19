const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session")
const passport = require("passport")
const randtoken = require("rand-token")
const nodemailer = require("nodemailer")
const dotenv=require('dotenv').config()
//models
const User = require("./models/user.js");
const Receipe = require("./models/receipe.js");
const Ingredient = require("./models/ingredients.js");
const Favourite = require("./models/favourite.js");
const Schedule = require("./models/schedule.js");

//session
app.use(session({
    secret: "mysecret",
    resave: "false",
    saveUninitialized: "false"
}));
//passport
app.use(passport.initialize());
app.use(passport.session())


mongoose.connect("mongodb+srv://testWeb:test@cluster0.mxbwf.mongodb.net/cooking?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true })

//passport local mongoose
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const ejs = require("ejs");

const flash = require("connect-flash");
app.use(flash());

app.use(function(req,res,next){
    res.locals.currentUser=req.user;
    res.locals.error=req.flash("error");
    res.locals.success=req.flash("success");
    next();
});

const methodOverride = require("method-override");
app.use(methodOverride('_method'));
const bcrypt = require("bcrypt");
//ejs
app.set("view engine", "ejs")

//public folder
app.use(express.static("public"));

//body parser
app.use(bodyParser.urlencoded({ extended: false }))






app.get("/", function (req, res) {
    res.render("index");
});

app.get("/signup", function (req, res) {
    res.render("signup")
});

app.post("/signup", function (req, res) {
    const newUser = new User({
        username: req.body.username
    });
    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.render("signup")
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("signup")
            });
        }
    });
});

app.get("/login", function (req, res) {
    res.render("login")
});
app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err)
        } else {
            passport.authenticate("local")(req, res, function () {
                req.flash("success","congratulation,you are login!!!")
                res.redirect("/dashboard")
            })
        }
    })


});
app.get("/dashboard",isLoggedIn, function (req, res) {
     console.log(req.user)
    res.render("dashboard")

})
app.get("/logout", function (req, res) {
    req.logout();
    req.flash("success","thank you,you are logged out")
    res.redirect("/login")
});
app.get("/forgot", function (req, res) {
    res.render("forgot")
});

app.post("/forgot", function (req, res) {
    User.findOne({ username: req.body.username }, function (err, userFound){
        if (err) {
            console.log(err)
            res.redirect("/login")
        } else {
            const token = randtoken.generate(16)
            Reset.create({
                username: userFound.username,
                resetPasswordToken: token,
                resetPasswordExpires: Date.now() + 3600000
            });
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: "cooking0638@gmail.com",
                    pass: process.env.PWD
                }
            });
            const mailOptions = {
                from: "cooking0638@gmail.com",
                to: req.body.username,
                subject: "link to reset your password",
                text: "click on this link to reset your password:http://localhost:3000/reset/" + token
            }
            console.log("mail est pret a etre envoyer")
            transporter.sendMail(mailOptions, function (err, response) {
                if (err) {
                    console.log(err)
                } else {
                    res.redirect("/login")
                }
            });
        }
        });
    
         });
        app.get("/reset/:token",function(req,res){
            Reset.findOne({
                resetPasswordToken:req.params.token,
                resetPasswordExpires:{$gt:Date.now()}
        },function(err,obj){
            if(err){
                console.log("token expired")
                res.redirect("/login")
            }else{
               res.render("reset",{
                   token:req.params.token
               });
            }
        });

    });
    app.post("/reset/:token",function(req,res){
        Reset.findOne({
            resetPasswordToken:req.params.token,
            resetPasswordExpires:{$gt:Date.now()}
    },function(err,obj){
        if(err){
            console.log("token expired")
            res.redirect("/login")
        }else{
            if(req.body.password==req.body.password2){
                User.findOne({username:obj.username},function(err,user){
                    if(err){
                        console.log(err)
                    }else{
                        user.setPassword(req.body.password,function(err){
                            console.log(err)
                            user.save()
                            const updateReset={
                                resetPasswordToken:null,
                                resetPasswordExpires:null
                            }
                            Reset.findOneAndUpdate({resetPasswordToken:req.body.token},updateReset,function(err,obj1){
                                if(err){
                                    console.log(err)
                                }else{
                                    res.redirect("/login")
                                }
                            });
                        });
                    }
                });
            }
        }
    });
});
// Receipe route 
app.get("/dashboard/myreceipes",isLoggedIn,function(req,res){
    Receipe.find({
        user:req.user.id
    },function(err,receipe){
        if(err){
            console.log(err)
        }else{
            res.render("receipe",{receipe:receipe})
        }
    });
});
app.get("/dashboard/newreceipe",isLoggedIn,function(req,res){
    res.render("newreceipe");
});
app.post("/dashboard/newreceipe",function(req,res){
   const newReceipe={
       name:req.body.receipe,
       image:req.body.logo,
       user:req.user.id
   } 
   Receipe.create(newReceipe,function(err,newReceipe){
       if(err){
           console.log(err)
       }else{
           req.flash("success","new receipe added")
           res.redirect("/dashboard/myreceipes")
       }
   });
});
app.get("/dashboard/myreceipes/:id",function(req,res){
    Receipe.findOne({
        user:req.user.id,
        _id:req.params.id
    },function(err,receipeFound){
        if(err){
            console.log(err)
        }else{
            Ingredient.find({
                user:req.user.id,
                receipe:req.params.id
            },function(err,ingredientFound){
                if(err){
                    console.log(err)
                }else{
                    res.render("ingredients",{
                       ingredient:ingredientFound,
                       receipe:receipeFound 
                    });
                }
            });
        }
    });
});
app.delete("/dashboard/myreceipes/:id",isLoggedIn,function(req,res){
    Receipe.deleteOne({
        _id:req.params.id
    },function(err){
        if(err){
            console.log(err)
        }else{
            req.flash("success","your receipe has been deleted")
            res.redirect("/dashboard/myreceipes")
        }
    })
})
//ingredient route
app.get("/dashboard/myreceipes/:id/newingredient",function(req,res){
Receipe.findById(
    {_id:req.params.id},function(err,found){
        if(err){
            console.log(err)
        }else{
            res.render("newingredient",{receipe:found})
        }
    });
});
app.post("/dashboard/myreceipes/:id",function(req,res){
    const newIngredient={
        name:req.body.name,
        user:req.user.id,
        bestDish:req.body.bestDish,
        quantity:req.body.quantity,
        receipe:req.params.id
    }
    Ingredient.create(newIngredient,function(err,newIngredient){
        if(err){
            console.log(err)
        }else{
            req.flash("success","your ingredient has been added!!!")
            res.redirect("/dashboard/myreceipes/"+req.params.id)
        }
    });
});
app.delete("/dashboard/myreceipes/:id/:ingredientid",isLoggedIn,function(req,res){
    Ingredient.deleteOne({_id:req.params.ingredientid},function(err){
        if(err){
            console.log(err)
        }else{+
            req.flash("success","your ingredient has been deleted")
            res.redirect("/dashboard/myreceipes/"+req.params.id)
        }
    });
});
app.post("/dashboard/myreceipes/:id/:ingredientid/edit",isLoggedIn,function(req,res){
Receipe.findOne({
    user:req.user.id,
    _id:req.params.id
},function(err,receipeFound){
    if(err){
        console.log(err)
    }else{
        Ingredient.findOne({
            _id:req.params.ingredientid,
            receipe:req.params.id
        },function(err,ingredientFound){
            if(err){
                console.log(err)
            }else{
                res.render("edit",{
                    ingredient:ingredientFound,
                    receipe:receipeFound
                });
            }
        });
    }
});
});
app.put("/dashboard/myreceipes/:id/:ingredientid",isLoggedIn,function(req,res){
    const ingredient_update={
        name:req.body.name,
        user:req.user.id,
        bestDish:req.body.dish,
        quantity:req.body.quantity,
        receipe:req.params.id
    }
    Ingredient.findByIdAndUpdate({
       _id:req.params.ingredientid
    },ingredient_update,function(err,updateIngredient){
        if(err){
            console.log(err)
        }else{
            req.flash("success","successfully updated your ingredient")
            res.redirect("/dashboard/myreceipes/"+req.params.id)
        }
    });
});
//favourites route
app.get("/dashboard/favourites",isLoggedIn,function(req,res){
    Favourite.find({
        user:req.user.id
    },function(err,favourite){
        if(err){
            console.log(err)
        }else{
            res.render("favourites",{favourite:favourite})
        }
    });
});
app.get("/dashboard/favourites/newfavourite",isLoggedIn,function(req,res){
    res.render("newfavourite")
});
app.post("/dashboard/favourites",isLoggedIn,function(req,res){
    const newFavourite={
        user:req.user.id,
        title:req.body.title,
        image:req.body.image,
        description:req.body.description
    }
    Favourite.create(newFavourite,function(err,newFavourite){
        if(err){
            console.log(err)
        }else{
            req.flash("success","you just added a new fav!!!")
            res.redirect("/dashboard/favourites")
        }
    });
});
app.delete("/dashboard/favourites/:id",isLoggedIn,function(req,res){
    Favourite.deleteOne({_id:req.params.id},function(err){
        if(err){
            console.log(err)
        }else{
            req.flash("success","your favourite has been deleted")
            res.redirect("/dashboard/favourites")
        }
    });
});
//route schedule
app.get("/dashboard/schedule",isLoggedIn,function(req,res){
    Schedule.find({user:req.user.id},function(err,schedule){
        if(err){
            console.log(err)
        }else{
            res.render("schedule",{schedule:schedule})
        }
    });
});
app.get("/dashboard/schedule/newschedule",isLoggedIn,function(req,res){
    res.render("newSchedule")
});
app.post("/dashboard/schedule",isLoggedIn,function(req,res){
    const newSchedule={
        receipeName:req.body.receipename,
        scheduleDate:req.body.scheduleDate,
        time:req.body.time,
        user:req.user.id
}
Schedule.create(newSchedule,function(err,newSchedule){
    if(err){
        console.log(err)
    }else{
        req.flash("success","your schedule has been added")
        res.redirect("/dashboard/schedule")
    }
});
});
app.delete("/dashboard/schedule/:id",isLoggedIn,function(req,res){
    Schedule.deleteOne({_id:req.params.id},function(err){
        if(err){
            console.log(err)
        }else{
            req.flash("success","your schedule has been deleted")
            res.redirect("/dashboard/schedule")
        }
    })
})
//fonction de connexion
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
     return next();
    }else{
        req.flash("logged in first please!")
        res.redirect("/login")
    }
}
app.listen(3000, function (req, res) {
    console.log("is running")
});
