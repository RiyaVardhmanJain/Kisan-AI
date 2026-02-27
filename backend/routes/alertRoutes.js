const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const { getAll, markRead, resolve } = require('../controllers/alertController');

router.use(protect); // All alert routes require auth

router.get('/', getAll);
router.put('/:id/read', markRead);
router.put('/:id/resolve', resolve);

module.exports = router;
