const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getAll,
    create,
    update,
    remove,
    getConditions,
} = require('../controllers/warehouseController');

router.use(protect); // All warehouse routes require auth

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.get('/:id/conditions', getConditions);

module.exports = router;
