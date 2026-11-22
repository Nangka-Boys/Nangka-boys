const db = require('../config/db');

// GET /api/admin/audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const { table_name, operation, user_id, limit = 50, page = 1 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
    const fetchLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (table_name) {
      whereClauses.push(`a.table_name = $${paramIndex}`);
      params.push(table_name);
      paramIndex++;
    }

    if (operation) {
      whereClauses.push(`a.operation = $${paramIndex}`);
      params.push(operation);
      paramIndex++;
    }

    if (user_id) {
      whereClauses.push(`a.user_id = $${paramIndex}`);
      params.push(user_id);
      paramIndex++;
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM audit_logs a ${whereStr}`;
    const countRes = await db.query(countQuery, params);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const dataQuery = `
      SELECT 
        a.id,
        a.table_name,
        a.operation,
        a.record_id,
        a.user_id,
        u.full_name AS user_full_name,
        u.email AS user_email,
        a.old_data,
        a.new_data,
        a.description,
        a.ip_address,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereStr}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(fetchLimit, offset);

    const result = await db.query(dataQuery, params);

    return res.json({
      success: true,
      pagination: {
        total: totalCount,
        page: parseInt(page, 10),
        limit: fetchLimit,
        pages: Math.ceil(totalCount / fetchLimit) || 1,
      },
      data: result.rows,
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving audit logs.' });
  }
};

// GET /api/admin/audit-logs/stats
const getAuditLogStats = async (req, res) => {
  try {
    const perTable = await db.query(`
      SELECT table_name, COUNT(*) AS count
      FROM audit_logs
      GROUP BY table_name
      ORDER BY count DESC
    `);

    const perOperation = await db.query(`
      SELECT operation, COUNT(*) AS count
      FROM audit_logs
      GROUP BY operation
      ORDER BY count DESC
    `);

    const totalLogs = await db.query(`SELECT COUNT(*) FROM audit_logs`);

    return res.json({
      success: true,
      data: {
        total_logs: parseInt(totalLogs.rows[0].count, 10),
        by_table: perTable.rows,
        by_operation: perOperation.rows,
      },
    });
  } catch (error) {
    console.error('Audit stats error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving audit statistics.' });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogStats,
};
