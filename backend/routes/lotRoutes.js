const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getAll,
    create,
    update,
    getTimeline,
    addEvent,
} = require('../controllers/lotController');

router.use(protect); // All lot routes require auth

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.get('/:id/timeline', getTimeline);
router.post('/:id/events', addEvent);

module.exports = router;
