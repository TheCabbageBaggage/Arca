const express = require("express");
const { authenticate, requireScopes } = require("../middleware/auth");
const { fxService } = require("../modules/fx");

const router = express.Router();

router.post("/fx/rates", authenticate, requireScopes("fx:write"), (req, res, next) => {
  try {
    const rate = fxService.createOrUpdateRate(req.body || {});
    res.status(201).json({ rate });
  } catch (error) {
    next(error);
  }
});

router.get("/fx/rates", authenticate, requireScopes("fx:read"), (req, res, next) => {
  try {
    if (req.query.base && req.query.quote) {
      const rate = fxService.getRate(req.query || {});
      return res.status(200).json({ rate });
    }
    const rates = fxService.listRates();
    return res.status(200).json({ rates });
  } catch (error) {
    next(error);
  }
});

router.post("/fx/revalue", authenticate, requireScopes("fx:write"), (req, res, next) => {
  try {
    const asOf = req.query.as_of || req.body?.as_of;
    const result = fxService.revalue(asOf);
    res.status(200).json({ revaluation: result });
  } catch (error) {
    next(error);
  }
});

router.get("/fx/exposure", authenticate, requireScopes("fx:read"), (req, res, next) => {
  try {
    const asOf = req.query.as_of;
    const exposure = fxService.exposure(asOf);
    res.status(200).json({ as_of: asOf || new Date().toISOString().slice(0, 10), exposure });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
