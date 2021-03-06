var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Portfolio = require('../models/portfolio');
var Profile = require('../models/profile');
var mid = require('../middleware');

// GET /profile
router.get('/profile', mid.requiresLogin, function(req, res, next) {
    User.findById(req.session.userId)
        .exec(function(error, user) {
            if (error) {
                return next(error);
            } else {
                Portfolio.find({ 'id': req.session.userId })
                    .exec(function(error, portfolio) {
                        if (error) {
                            return next(error);
                        } else {
                            portfolio = portfolio[0];
                            Profile.find({ 'id': req.session.userId })
                                .exec(function(error, profile) {
                                    if (error) {
                                        return next(error);
                                    } else {
                                        var userWebsite = ' ';
                                        var userCity = ' ';
                                        try {
                                            profile = profile[0];
                                            if (profile['website']) { userWebsite = profile.website; }
                                            if (profile.city) { userCity = profile.city; }
                                        } catch (err) {}
                                        return res.render('profile', { title: 'profile', name: user.name, btc: portfolio['btc'], lit: portfolio.lit, eth: portfolio.eth, city: userCity, website: userWebsite });


                                    }
                                })



                        }

                    });
            }
        });
});

// GET /logout
router.get('/logout', function(req, res, next) {
    if (req.session) {
        // delete session object
        req.session.destroy(function(err) {
            if (err) {
                return next(err);
            } else {
                return res.redirect('/');
            }
        });
    }
});

// GET /login
router.get('/login', mid.loggedOut, function(req, res, next) {
    return res.render('login', { title: 'Log In' });
});

// POST /login
router.post('/login', function(req, res, next) {
    if (req.body.email && req.body.password) {
        User.authenticate(req.body.email, req.body.password, function(error, user) {
            if (error || !user) {
                var err = new Error('Wrong email or password.');
                err.status = 401;
                return next(err);
            } else {
                req.session.userId = user._id;
                return res.redirect('/dashboard');
            }
        });
    } else {
        var err = new Error('Email and password are required.');
        err.status = 401;
        return next(err);
    }
});






router.get('/register', mid.loggedOut, function(req, res, next) {
    return res.render('register', { title: 'Sign Up' });
});
// GET /register
router.post('/register', function(req, res, next) {
    if (req.body.email &&
        req.body.name &&
        req.body.password &&
        req.body.confirmPassword) {

        // confirm that user typed same password twice
        if (req.body.password !== req.body.confirmPassword) {
            var err = new Error('Passwords do not match.');
            err.status = 400;
            return next(err);
        }

        // create object with form input
        var userData = {
            email: req.body.email,
            name: req.body.name,
            password: req.body.password,
        };
        var err = new Error('Unvaild Sign up.');
        // use schema's `create` method to insert document into Mongo
        User.create(userData, function(error, user) {
            if (error) {
                console.log(error);

                return next(err);
            } else {
                req.session.userId = user._id;
                var userportfolio = {
                    id: user._id,
                    btc: 0,
                    eth: 0,
                    lit: 0,

                };
                Portfolio.create(userportfolio, function(error, user) {
                    if (error) {
                        console.log(error);
                        return next(err);
                    } else {
                        var userprofile = {
                            id: user._id,
                            city: '',
                            website: '',
                        };

                        Profile.create(userprofile, function(error, user) {
                            if (error) {
                                console.log(error);
                                return next(err);
                            } else {
                                // req.session.userId = user._id;
                                return res.redirect('/dashboard');
                            }
                        });
                    }
                });
            }
        });



    } else {
        var err = new Error('All fields required.');
        err.status = 400;
        return next(err);
    }
})


// GET /
router.get('/', function(req, res, next) {
    return res.render('index', { title: 'Home' });
});

// GET /about
router.get('/about', function(req, res, next) {
    return res.render('about', { title: 'About' });
});
// router.get('/news', function(req, res, next) {
//     return res.render('news', { title: 'news' });
// });
// router.get('/dashboard', function (req, res, next) {
//   return res.render('dashboard', { title: 'Dashboard' });
// });
router.get('/dashboard', mid.requiresLogin, function(req, res, next) {
    User.findById(req.session.userId)
        .exec(function(error, user) {
            if (error) {
                return next(error);
            } else {
                // Portfolio.find({})
                Portfolio.find({ 'id': req.session.userId })
                    .exec(function(error, portfolio) {
                        if (error) {
                            console.log(error)
                            return next(error);
                        } else {
                            portfolio = portfolio[0];
                            return res.render('dashboard', { title: 'dashboard', name: user.name, btc: portfolio.btc, lit: portfolio.lit, eth: portfolio.eth });
                        }
                    });
            }
        });
});

router.post('/updateBTC', mid.requiresLogin, function(req, res, next) {
    if (req.body.btc) {
        Portfolio.find({ 'id': req.session.userId })
            .exec(function(error, OldPortfolio) {
                if (error) {
                    console.log(error)
                    return next(error);
                } else {
                    OldPortfolio = OldPortfolio[0];
                    var btc;
                    if (req.body.trade == 'Sell') {
                        btc = parseFloat(OldPortfolio.btc) - parseFloat(req.body.btc);
                        if (btc < 0) { btc = 0 }
                    } else {
                        btc = parseFloat(OldPortfolio.btc) + parseFloat(req.body.btc);
                    }
                    var portfolioData = {
                        id: req.session.userId,
                        btc: btc,
                        lit: OldPortfolio.lit,
                        eth: OldPortfolio.eth,
                    };
                    Portfolio.update({ id: req.session.userId }, portfolioData, { upsert: true }, function(error, user) {
                        if (error) { console.log(error) }
                    });
                    return res.redirect('/profile');
                }

            });
    }
});

router.post('/updateETH', mid.requiresLogin, function(req, res, next) {
    if (req.body.eth) {
        Portfolio.find({ 'id': req.session.userId })
            .exec(function(error, OldPortfolio) {
                if (error) {
                    console.log(error)
                    return next(error);
                } else {
                    OldPortfolio = OldPortfolio[0];
                    var eth;
                    if (req.body.trade == 'Sell') {
                        eth = parseFloat(OldPortfolio.eth) - parseFloat(req.body.eth);
                        if (eth < 0) { eth = 0 }
                    } else {
                        eth = parseFloat(OldPortfolio.eth) + parseFloat(req.body.eth);
                    }
                    var portfolioData = {
                        id: req.session.userId,
                        btc: OldPortfolio.btc,
                        lit: OldPortfolio.lit,
                        eth: eth,
                    };
                    Portfolio.update({ id: req.session.userId }, portfolioData, { upsert: true }, function(error, user) {
                        if (error) { console.log(error) }
                    });

                    return res.redirect('/profile');
                }

            });
    }
});


router.post('/updateLIT', mid.requiresLogin, function(req, res, next) {
    if (req.body.lit) {
        Portfolio.find({ 'id': req.session.userId })
            .exec(function(error, OldPortfolio) {
                if (error) {
                    console.log(error)
                    return next(error);
                } else {
                    OldPortfolio = OldPortfolio[0];
                    var lit;
                    if (req.body.trade == 'Sell') {
                        lit = parseFloat(OldPortfolio.lit) - parseFloat(req.body.lit);
                        if (lit < 0) { lit = 0 }
                    } else {
                        lit = parseFloat(OldPortfolio.lit) + parseFloat(req.body.lit);
                    }
                    var portfolioData = {
                        id: req.session.userId,
                        btc: OldPortfolio.btc,
                        lit: lit,
                        eth: OldPortfolio.eth,
                    };
                    Portfolio.update({ id: req.session.userId }, portfolioData, { upsert: true }, function(error, user) {
                        if (error) { console.log(error) }
                    });

                    return res.redirect('/profile');
                }

            });
    }
});



router.post('/updateProfile', mid.requiresLogin, function(req, res, next) {


    Profile.find({ 'id': req.session.userId })
        .exec(function(error, Oldprofile) {
            if (error) {
                console.log(error)
                return next(error);
            } else {
                Oldprofile = Oldprofile[0];
                var city = req.body.city;
                if (!city) {
                    try { city = Oldprofile.city; } catch (err) { city = ' '; }
                }
                var website = req.body.website;
                if (!website) {
                    try { website = Oldprofile.website; } catch (err) { website = ' '; }
                }
                var profileData = {
                    id: req.session.userId,
                    city: city,
                    website: website,
                };
                Profile.update({ _id: req.session.userId }, profileData, { upsert: true }, function(error, user) {
                    if (error) { console.log(error) }
                });
                return res.redirect('/profile');



            }


        })





});

// GET /contact
router.get('/contact', function(req, res, next) {
    return res.render('contact', { title: 'Contact' });
});


module.exports = router;