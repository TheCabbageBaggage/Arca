const express = require('express');
const { authenticate, requireScopes } = require('../middleware/auth');
const { inventoryService } = require('../modules/inventory');

const router = express.Router();
const parseId = (id) => { const value = Number(id); return Number.isInteger(value) && value > 0 ? value : null; };

router.post('/items', authenticate, requireScopes('inventory:write'), (req, res, next) => { try { const item = inventoryService.createItem(req.body || {}); res.status(201).json({ item }); } catch (error) { next(error); } });
router.get('/items', authenticate, requireScopes('inventory:read'), (_req, res, next) => { try { const items = inventoryService.listItems(); res.status(200).json({ items }); } catch (error) { next(error); } });
router.get('/items/:id', authenticate, requireScopes('inventory:read'), (req, res, next) => { try { const id = parseId(req.params.id); if (!id) { const error = new Error('Item not found'); error.statusCode = 404; throw error; } const item = inventoryService.getItem(id); if (!item) { const error = new Error('Item not found'); error.statusCode = 404; throw error; } res.status(200).json({ item }); } catch (error) { next(error); } });
router.patch('/items/:id', authenticate, requireScopes('inventory:write'), (req, res, next) => { try { const id = parseId(req.params.id); if (!id) { const error = new Error('Item not found'); error.statusCode = 404; throw error; } const item = inventoryService.updateItem(id, req.body || {}); if (!item) { const error = new Error('Item not found'); error.statusCode = 404; throw error; } res.status(200).json({ item }); } catch (error) { next(error); } });
router.post('/receipts', authenticate, requireScopes('inventory:write'), (req, res, next) => { try { const receipt = inventoryService.receive(req.body || {}, req.user || req.auth?.user || null); res.status(201).json(receipt); } catch (error) { next(error); } });
router.post('/issues', authenticate, requireScopes('inventory:write'), (req, res, next) => { try { const issue = inventoryService.issue(req.body || {}, req.user || req.auth?.user || null); res.status(201).json(issue); } catch (error) { next(error); } });
router.post('/adjustments', authenticate, requireScopes('inventory:write'), (req, res, next) => { try { const adjustment = inventoryService.adjust(req.body || {}, req.user || req.auth?.user || null); res.status(201).json(adjustment); } catch (error) { next(error); } });
router.get('/valuation', authenticate, requireScopes('inventory:read'), (req, res, next) => { try { const valuation = inventoryService.valuation({ as_of: req.query.as_of }); res.status(200).json({ valuation }); } catch (error) { next(error); } });
router.get('/movements', authenticate, requireScopes('inventory:read'), (req, res, next) => { try { const movements = inventoryService.movements({ item_id: req.query.item_id, from: req.query.from, to: req.query.to }); res.status(200).json({ movements }); } catch (error) { next(error); } });

module.exports = router;
