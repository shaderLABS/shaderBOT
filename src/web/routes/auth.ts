import express from 'express';
import passport from 'passport';
import { URL } from '../server.js';

const router = express.Router();

router.get('/login', passport.authenticate('discord'));

router.get('/redirect', (req, res, next) => {
    passport.authenticate('discord', (_error, user, info) => {
        if (info && info.error) return res.redirect(URL + '/?error=' + info.error);
        if (!user) return res.redirect(URL + '/?error=1');

        req.logIn(user, (err) => {
            if (err) return res.redirect(URL + '/?error=2');
            return res.redirect(URL);
        });
    })(req, res, next);
});

router.get('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect(URL);
        });
    } else {
        res.redirect(URL);
    }
});

export default router;
