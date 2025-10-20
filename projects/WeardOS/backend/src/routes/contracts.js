const express = require('express');
const router = express.Router();

// 获取合约信息
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // 临时返回模拟数据
    res.json({
      success: true,
      data: {
        address,
        name: 'Sample Contract',
        verified: true,
        riskLevel: 'medium'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;