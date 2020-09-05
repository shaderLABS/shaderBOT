import passport from 'passport';
import express from 'express';
const router = express.Router();

router.get('/', passport.authenticate('discord'));
router.get('/redirect', passport.authenticate('discord'), (req, res) => {
    res.sendStatus(200);
});
router.get('/me', (req, res) => {
    if (req.user) {
        res.send(req.user);
    } else {
        res.sendStatus(401);
    }
});

export default router;
