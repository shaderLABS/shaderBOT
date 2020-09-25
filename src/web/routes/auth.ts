import passport from 'passport';
import express from 'express';
const router = express.Router();

router.get('/login', passport.authenticate('discord'));

router.get('/redirect', (req, res, next) => {
    passport.authenticate('discord', (_error, user, info) => {
        if (info && info.error) return res.redirect('http://localhost:5000/?error=' + info.error);
        if (!user) return res.redirect('http://localhost:5000/?error=2');

        req.logIn(user, (err) => {
            if (err) return res.redirect('http://localhost:5000/?error=3');
            return res.redirect('http://localhost:5000');
        });
    })(req, res, next);
});

router.get('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect('http://localhost:5000/');
        });
    } else {
        res.redirect('http://localhost:5000/');
    }
});

export default router;
