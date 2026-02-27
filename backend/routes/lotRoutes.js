const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getAll,
    create,
    update,
    deleteLot,
    shiftLot,
    getTimeline,
    addEvent,
} = require('../controllers/lotController');

router.use(protect); // All lot routes require auth

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', deleteLot);
router.put('/:id/shift', shiftLot);
router.get('/:id/timeline', getTimeline);
router.post('/:id/events', addEvent);

module.exports = router;
